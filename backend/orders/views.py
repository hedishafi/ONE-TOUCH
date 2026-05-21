from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User, ProviderProfile
from orders.models import Order, OrderAssignment, OrderMatch, OrderStatusLog
from orders.permissions import IsClient, IsProvider
from orders.serializers import (
	OrderCreateSerializer,
	OrderSerializer,
	OrderStatusLogSerializer,
)
from orders.utils.commission_service import calculate_commission
from orders.utils.matching_service import find_matching_providers, haversine_distance, notify_providers
from orders.utils.ollama_service import categorise_order, match_category_to_db
from orders.utils.whisper_service import transcribe_audio
from services.models import ProviderService


class OrderViewSet(viewsets.ModelViewSet):
	queryset = Order.objects.all().select_related('category', 'sub_service', 'client')
	serializer_class = OrderSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		if user.is_staff or user.role == User.ROLE_ADMIN:
			return self.queryset

		if user.role == User.ROLE_CLIENT:
			return self.queryset.filter(client=user)

		if user.role == User.ROLE_PROVIDER:
			provider = ProviderProfile.objects.filter(user=user).first()
			if not provider:
				return self.queryset.none()
			return self.queryset.filter(
				Q(assignment__provider=provider) | Q(matches__provider=provider)
			).distinct()

		return self.queryset.none()

	def get_serializer_class(self):
		if self.action == 'create':
			return OrderCreateSerializer
		return OrderSerializer

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		if request.user.role != User.ROLE_CLIENT:
			return Response({'detail': 'Only clients can create orders.'}, status=status.HTTP_403_FORBIDDEN)

		input_type = serializer.validated_data['input_type']
		transcription = serializer.validated_data.get('transcription', '')
		voice_file = serializer.validated_data.get('voice_file')

		order = Order.objects.create(
			client=request.user,
			input_type=input_type,
			voice_file=voice_file if input_type == Order.INPUT_VOICE else None,
			transcription=transcription if input_type == Order.INPUT_TEXT else '',
			description='',
			client_latitude=serializer.validated_data['client_latitude'],
			client_longitude=serializer.validated_data['client_longitude'],
			client_address=serializer.validated_data.get('client_address', ''),
		)

		if input_type == Order.INPUT_VOICE and order.voice_file:
			transcription = transcribe_audio(order.voice_file.path)
			order.transcription = transcription

		categorised = categorise_order(transcription)
		mapping = match_category_to_db(
			categorised.get('category_name'),
			categorised.get('sub_service_name'),
		)
		order.category_id = mapping.get('category_id')
		order.sub_service_id = mapping.get('sub_service_id')
		order.description = categorised.get('cleaned_description') or transcription
		order.save(update_fields=['transcription', 'category', 'sub_service', 'description', 'updated_at'])

		providers = find_matching_providers(order)
		notified_count = notify_providers(order, providers)

		return Response(
			{
				'order_id': order.id,
				'status': order.status,
				'category': order.category.name if order.category else None,
				'sub_service': order.sub_service.name if order.sub_service else None,
				'matched_provider_count': notified_count,
			},
			status=status.HTTP_201_CREATED,
		)

	@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsClient])
	def my_orders(self, request):
		orders = self.queryset.filter(client=request.user).order_by('-created_at')
		page = self.paginate_queryset(orders)
		if page is not None:
			return self.get_paginated_response(OrderSerializer(page, many=True).data)
		return Response(OrderSerializer(orders, many=True).data)

	@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated, IsProvider])
	def available(self, request):
		provider = ProviderProfile.objects.filter(user=request.user).first()
		if not provider or provider.current_latitude is None or provider.current_longitude is None:
			return Response([], status=status.HTTP_200_OK)

		service = ProviderService.objects.filter(provider=provider).first()
		if not service:
			return Response([], status=status.HTTP_200_OK)

		candidates = Order.objects.filter(
			status=Order.STATUS_MATCHING,
			expires_at__gte=timezone.now(),
		).select_related('category', 'sub_service')

		nearby_orders = []
		for order in candidates:
			distance_km = haversine_distance(
				provider.current_latitude,
				provider.current_longitude,
				order.client_latitude,
				order.client_longitude,
			)
			if distance_km > 5:
				continue

			if order.category and service.primary_service_id == order.category_id:
				nearby_orders.append(order)
				continue

			if order.sub_service and service.subservices.filter(id=order.sub_service_id).exists():
				nearby_orders.append(order)

		return Response(OrderSerializer(nearby_orders, many=True).data)

	@action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProvider])
	def accept(self, request, pk=None):
		order = get_object_or_404(Order, pk=pk)
		provider = get_object_or_404(ProviderProfile, user=request.user)

		match = OrderMatch.objects.filter(
			order=order,
			provider=provider,
			status=OrderMatch.STATUS_NOTIFIED,
		).first()
		if not match:
			return Response({'detail': 'No pending match for this order.'}, status=status.HTTP_400_BAD_REQUEST)

		commission_fee = calculate_commission(provider, order.category)

		with transaction.atomic():
			OrderAssignment.objects.create(
				order=order,
				provider=provider,
				commission_fee=commission_fee,
			)

			match.status = OrderMatch.STATUS_ACCEPTED
			match.responded_at = timezone.now()
			match.save(update_fields=['status', 'responded_at'])

			OrderMatch.objects.filter(order=order).exclude(provider=provider).update(
				status=OrderMatch.STATUS_DECLINED,
				responded_at=timezone.now(),
			)

			order.status = Order.STATUS_ACCEPTED
			order._status_log_changed_by = request.user
			order._status_log_note = 'Order accepted by provider.'
			order.save(update_fields=['status', 'updated_at'])

		return Response(
			{
				'assignment_id': order.assignment.id,
				'commission_fee': str(commission_fee),
				'order_id': order.id,
			},
			status=status.HTTP_200_OK,
		)

	@action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProvider])
	def decline(self, request, pk=None):
		order = get_object_or_404(Order, pk=pk)
		provider = get_object_or_404(ProviderProfile, user=request.user)

		match = OrderMatch.objects.filter(order=order, provider=provider).first()
		if not match:
			return Response({'detail': 'No match for this order.'}, status=status.HTTP_400_BAD_REQUEST)

		match.status = OrderMatch.STATUS_DECLINED
		match.responded_at = timezone.now()
		match.save(update_fields=['status', 'responded_at'])

		return Response({'status': match.status}, status=status.HTTP_200_OK)

	@action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
	def complete(self, request, pk=None):
		order = get_object_or_404(Order, pk=pk)
		order.status = Order.STATUS_COMPLETED
		order._status_log_changed_by = request.user
		order._status_log_note = 'Order marked as completed.'
		order.save(update_fields=['status', 'updated_at'])

		return Response({'order_id': order.id, 'status': order.status}, status=status.HTTP_200_OK)

	@action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
	def status_log(self, request, pk=None):
		order = get_object_or_404(Order, pk=pk)
		logs = OrderStatusLog.objects.filter(order=order).order_by('created_at')
		return Response(OrderStatusLogSerializer(logs, many=True).data)

	@action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsClient])
	def cancel(self, request, pk=None):
		order = get_object_or_404(Order, pk=pk)

		if order.client != request.user:
			return Response({'detail': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

		if order.status != Order.STATUS_PENDING:
			return Response({'detail': 'Can only cancel pending orders.'}, status=status.HTTP_400_BAD_REQUEST)

		order.status = Order.STATUS_CANCELLED
		order._status_log_changed_by = request.user
		order._status_log_note = 'Order cancelled by client.'
		order.save(update_fields=['status', 'updated_at'])

		return Response({'order_id': order.id, 'status': order.status}, status=status.HTTP_200_OK)

	@action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsProvider])
	def start(self, request, pk=None):
		order = get_object_or_404(Order, pk=pk)
		provider = get_object_or_404(ProviderProfile, user=request.user)

		if not hasattr(order, 'assignment') or order.assignment is None or order.assignment.provider != provider:
			return Response({'detail': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

		if order.status != Order.STATUS_ACCEPTED:
			return Response({'detail': 'Can only mark accepted orders as in progress.'}, status=status.HTTP_400_BAD_REQUEST)

		order.status = Order.STATUS_IN_PROGRESS
		order._status_log_changed_by = request.user
		order._status_log_note = 'Order marked as in progress.'
		order.save(update_fields=['status', 'updated_at'])

		return Response({'order_id': order.id, 'status': order.status}, status=status.HTTP_200_OK)
