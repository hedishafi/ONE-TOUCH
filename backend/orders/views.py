import logging

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from rest_framework import serializers as drf_serializers

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
from services.models import ProviderCategoryPricing

logger = logging.getLogger(__name__)


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

		logger.info(f'Order create called with input_type: {input_type}, transcription: {transcription}')
		logger.info('Calling Ollama categorisation...')
		categorised = categorise_order(transcription)
		logger.info(f'Ollama result: {categorised}')
		mapping = match_category_to_db(
			categorised.get('category_name'),
			categorised.get('sub_service_name'),
		)
		logger.info(f'DB match result: {mapping}')
		order.category_id = mapping.get('category_id')
		order.sub_service_id = mapping.get('sub_service_id')
		logger.info(f'Final sub_service_id: {order.sub_service_id}')
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

		# ── Diagnostic logging ────────────────────────────────────────────────
		all_matches = OrderMatch.objects.filter(order=order)
		logger.info(
			'Accept attempt | order=%s | provider=%s | order_status=%s | total_matches=%s',
			order.id, provider.id, order.status, all_matches.count(),
		)
		for m in all_matches:
			logger.info(
				'  Match record | id=%s | provider=%s | status=%s | commission_paid=%s',
				m.id, m.provider_id, m.status, m.commission_paid,
			)

		provider_match = all_matches.filter(provider=provider).first()
		if not provider_match:
			logger.warning(
				'No OrderMatch found for order=%s provider=%s — creating one now',
				order.id, provider.id,
			)
			# Auto-create a match so providers can always accept visible orders
			provider_match = OrderMatch.objects.create(
				order=order,
				provider=provider,
				status=OrderMatch.STATUS_NOTIFIED,
			)

		if provider_match.status not in (OrderMatch.STATUS_NOTIFIED, OrderMatch.STATUS_ACCEPTED):
			logger.warning(
				'Match status is %s for order=%s provider=%s — resetting to notified',
				provider_match.status, order.id, provider.id,
			)
			provider_match.status = OrderMatch.STATUS_NOTIFIED
			provider_match.save(update_fields=['status'])

		commission_fee = calculate_commission(provider, order.category)

		with transaction.atomic():
			# Create or update the assignment — commission is always marked paid
			# (no payment gate: providers accept freely, commission is deducted from earnings)
			assignment, _ = OrderAssignment.objects.get_or_create(
				order=order,
				defaults={
					'provider': provider,
					'commission_fee': commission_fee,
					'commission_paid': True,
					'client_contact_released': True,
					'contact_released_at': timezone.now(),
				},
			)
			if not assignment.commission_paid:
				assignment.commission_paid = True
				assignment.client_contact_released = True
				assignment.contact_released_at = timezone.now()
				assignment.save(update_fields=['commission_paid', 'client_contact_released', 'contact_released_at'])

			provider_match.status = OrderMatch.STATUS_ACCEPTED
			provider_match.commission_paid = True
			provider_match.responded_at = timezone.now()
			provider_match.save(update_fields=['status', 'commission_paid', 'responded_at'])

			# Decline all other providers for this order
			OrderMatch.objects.filter(order=order).exclude(provider=provider).update(
				status=OrderMatch.STATUS_DECLINED,
				responded_at=timezone.now(),
			)

			order.status = Order.STATUS_ACCEPTED
			order._status_log_changed_by = request.user
			order._status_log_note = 'Order accepted by provider.'
			order.save(update_fields=['status', 'updated_at'])

			# Decrement free_jobs_remaining (floor at 0)
			if provider.free_jobs_remaining > 0:
				provider.free_jobs_remaining = max(0, provider.free_jobs_remaining - 1)
				provider.save(update_fields=['free_jobs_remaining'])
				logger.info(
					'Free jobs remaining for provider=%s: %s',
					provider.id, provider.free_jobs_remaining,
				)

		logger.info(
			'Order accepted | order=%s | provider=%s | commission_fee=%s | client_phone=%s',
			order.id, provider.id, commission_fee, request.user.phone_number,
		)

		return Response(
			{
				'assignment_id': assignment.id,
				'commission_fee': str(commission_fee),
				'order_id': order.id,
				'client_phone': order.client.phone_number,
				'free_jobs_remaining': provider.free_jobs_remaining,
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

		if order.status not in (Order.STATUS_PENDING, Order.STATUS_MATCHING, Order.STATUS_PROVIDER_SELECTED, Order.STATUS_ACCEPTED):
			return Response({'detail': 'Order cannot be cancelled at this stage.'}, status=status.HTTP_400_BAD_REQUEST)

		order.status = Order.STATUS_CANCELLED
		order._status_log_changed_by = request.user
		order._status_log_note = 'Order cancelled by client.'
		order.save(update_fields=['status', 'updated_at'])

		return Response({'order_id': order.id, 'status': order.status}, status=status.HTTP_200_OK)


	# ── NEW: suggested providers for client ──────────────────────────────────
	@action(detail=True, methods=['get'], url_path='suggested-providers',
	        permission_classes=[IsAuthenticated, IsClient])
	def suggested_providers(self, request, pk=None):
		"""
		GET /api/v1/orders/{id}/suggested-providers/
		Returns up to 3 nearest providers that match the order category,
		sorted by distance. Uses the existing haversine_distance utility.
		"""
		order = get_object_or_404(Order, pk=pk)

		if order.client != request.user:
			return Response({'detail': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

		def _build_provider_data(provider, distance_km):
			service = ProviderService.objects.filter(provider=provider).first()
			if not service:
				return None
			category_match = order.category and service.primary_service_id == order.category_id
			sub_match = (
				order.sub_service
				and service.subservices.filter(id=order.sub_service_id).exists()
			)
			if not (category_match or sub_match):
				return None
			# Look up real price range from ProviderCategoryPricing
			pricing = None
			if order.category:
				pricing = ProviderCategoryPricing.objects.filter(
					provider=provider,
					category=order.category,
				).first()
			if pricing is None and service.primary_service:
				# Fallback: use pricing for the provider's primary service category
				pricing = ProviderCategoryPricing.objects.filter(
					provider=provider,
					category=service.primary_service,
				).first()
			if pricing is None:
				# Last fallback: any pricing record for this provider
				pricing = ProviderCategoryPricing.objects.filter(provider=provider).first()
			if pricing is not None:
				price_range = f'ETB {int(pricing.min_price)}\u2013{int(pricing.max_price)}'
			else:
				price_range = 'Negotiable'
			service_names = []
			if service.primary_service:
				service_names.append(service.primary_service.name)
			for sub in service.subservices.all()[:3]:
				service_names.append(sub.name)
			profile_picture_url = None
			if provider.profile_picture:
				try:
					profile_picture_url = request.build_absolute_uri(provider.profile_picture.url)
				except Exception:
					pass
			return {
				'id': provider.id,
				'full_name': provider.user.get_full_name() or provider.user.username,
				'bio': provider.bio or '',
				'profile_picture': profile_picture_url,
				'rating': round(provider.avg_rating, 1),
				'total_reviews': provider.total_reviews,
				'distance_km': round(distance_km, 2),
				'price_range': price_range,
				'services': service_names,
				'years_of_experience': provider.years_of_experience,
			}

		def _score_queryset(qs):
			scored = []
			for provider in qs.select_related('user'):
				dist = haversine_distance(
					order.client_latitude, order.client_longitude,
					provider.current_latitude, provider.current_longitude,
				)
				data = _build_provider_data(provider, dist)
				if data:
					scored.append((dist, data))
			scored.sort(key=lambda x: x[0])
			return [d for _, d in scored[:3]]

		# First try: online + available providers
		online_qs = ProviderProfile.objects.filter(
			is_online=True, is_available=True,
			current_latitude__isnull=False, current_longitude__isnull=False,
		)
		result = _score_queryset(online_qs)

		# Fallback: any provider with coordinates
		if not result:
			fallback_qs = ProviderProfile.objects.filter(
				current_latitude__isnull=False, current_longitude__isnull=False,
			)
			result = _score_queryset(fallback_qs)

		return Response(result, status=status.HTTP_200_OK)

	# ── NEW: client selects a specific provider ───────────────────────────────
	@action(detail=True, methods=['post'], url_path='select-provider',
	        permission_classes=[IsAuthenticated, IsClient])
	def select_provider(self, request, pk=None):
		"""
		POST /api/v1/orders/{id}/select-provider/
		Body: { "provider_id": <int> }
		Assigns the chosen provider, changes status to provider_selected,
		and ensures an OrderMatch record exists for that provider.
		"""
		order = get_object_or_404(Order, pk=pk)

		if order.client != request.user:
			return Response({'detail': 'Unauthorized.'}, status=status.HTTP_403_FORBIDDEN)

		if order.status not in (Order.STATUS_MATCHING, Order.STATUS_PENDING):
			return Response(
				{'detail': f'Cannot select provider for order with status "{order.status}".'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		provider_id = request.data.get('provider_id')
		if not provider_id:
			return Response({'detail': 'provider_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

		provider = get_object_or_404(ProviderProfile, pk=provider_id)

		with transaction.atomic():
			# Ensure an OrderMatch exists for this provider
			OrderMatch.objects.get_or_create(
				order=order,
				provider=provider,
				defaults={'status': OrderMatch.STATUS_NOTIFIED},
			)
			# Decline all other existing matches
			OrderMatch.objects.filter(order=order).exclude(provider=provider).update(
				status=OrderMatch.STATUS_DECLINED,
				responded_at=timezone.now(),
			)
			order.status = Order.STATUS_PROVIDER_SELECTED
			order._status_log_changed_by = request.user
			order._status_log_note = f'Client selected provider #{provider_id}.'
			order.save(update_fields=['status', 'updated_at'])

		logger.info(
			'Provider selected | order=%s | provider=%s | client=%s',
			order.id, provider.id, request.user.id,
		)

		return Response(
			{
				'order_id': order.id,
				'status': order.status,
				'provider_id': provider.id,
				'provider_name': provider.user.get_full_name() or provider.user.username,
			},
			status=status.HTTP_200_OK,
		)

	@action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsClient])
	def transcribe(self, request):
		"""
		Transcribe an uploaded audio file using Whisper and return the text.
		Accepts multipart/form-data with:
		  - voice_file (required): the audio file
		  - language   (optional): BCP-47 language code, e.g. 'en' or 'am'.
		                           Omit or pass empty string for auto-detect.
		"""
		import tempfile, os
		voice_file = request.FILES.get('voice_file')
		if not voice_file:
			return Response({'detail': 'voice_file is required.'}, status=status.HTTP_400_BAD_REQUEST)

		# Optional language hint — None means Whisper auto-detects
		language = request.data.get('language') or None

		# Write to a temp file so Whisper can read it from disk
		suffix = os.path.splitext(voice_file.name)[1] or '.wav'
		with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
			for chunk in voice_file.chunks():
				tmp.write(chunk)
			tmp_path = tmp.name

		try:
			text = transcribe_audio(tmp_path, language=language)
		finally:
			try:
				os.unlink(tmp_path)
			except OSError:
				pass

		if not text:
			return Response(
				{'detail': 'Transcription failed. Please try again or type your request.'},
				status=status.HTTP_422_UNPROCESSABLE_ENTITY,
			)

		return Response({'transcription': text}, status=status.HTTP_200_OK)

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
