from django.apps import apps
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ProviderCategoryPricingFilter, ServiceFilter
from .models import ProviderCategoryPricing, ProviderSkill, Service, ServiceCategory, Skill, SubService
from .permissions import (
	CanManageService,
	IsAdminOrReadOnly,
	IsPricingOwnerOrAdmin,
	IsProviderOrAdmin,
	IsProviderSkillOwnerOrAdmin,
)
from .serializers import (
	ProviderCategoryPricingSerializer,
	ProviderSkillSerializer,
	ServiceCategorySerializer,
	ServiceSerializer,
	SubServiceSerializer,
	SkillSerializer,
)


class ServiceCategoryViewSet(viewsets.ModelViewSet):
	queryset = ServiceCategory.objects.all().order_by('name')
	serializer_class = ServiceCategorySerializer
	pagination_class = None
	search_fields = ['name', 'description']
	ordering_fields = ['name', 'created_at']

	def get_queryset(self):
		qs = super().get_queryset()
		if self.action in ['list', 'retrieve']:
			return qs.filter(is_active=True)
		return qs

	def get_permissions(self):
		if self.action in ['list', 'retrieve']:
			return [AllowAny()]
		return [IsAdminOrReadOnly()]


class SkillViewSet(viewsets.ModelViewSet):
	queryset = Skill.objects.all().order_by('name')
	serializer_class = SkillSerializer
	search_fields = ['name']
	ordering_fields = ['name', 'created_at']

	def get_permissions(self):
		if self.action in ['list', 'retrieve']:
			return [AllowAny()]
		return [IsAdminOrReadOnly()]


class ServiceSubServiceListView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		category_id = request.query_params.get('category')
		queryset = SubService.objects.filter(is_active=True)
		if category_id:
			queryset = queryset.filter(category_id=category_id)
		serializer = SubServiceSerializer(queryset, many=True)
		return Response(serializer.data)


class ProviderSkillViewSet(viewsets.ModelViewSet):
	queryset = ProviderSkill.objects.select_related('provider__user', 'skill').all()
	serializer_class = ProviderSkillSerializer
	permission_classes = [IsProviderOrAdmin, IsProviderSkillOwnerOrAdmin]
	filterset_fields = ['provider_id', 'skill_id']
	ordering_fields = ['created_at']

	def get_queryset(self):
		qs = super().get_queryset()
		user = self.request.user
		if user.is_staff or user.role == user.ROLE_ADMIN:
			return qs
		provider_model = apps.get_model('accounts', 'ProviderProfile')
		provider = provider_model.objects.filter(user=user).first()
		if not provider:
			return qs.none()
		return qs.filter(provider=provider)

	def perform_create(self, serializer):
		user = self.request.user
		if user.is_staff or user.role == user.ROLE_ADMIN:
			serializer.save()
			return
		provider_model = apps.get_model('accounts', 'ProviderProfile')
		provider = provider_model.objects.filter(user=user).first()
		serializer.save(provider=provider)


class ProviderCategoryPricingViewSet(viewsets.ModelViewSet):
	queryset = ProviderCategoryPricing.objects.select_related('provider__user', 'category').all()
	serializer_class = ProviderCategoryPricingSerializer
	permission_classes = [IsProviderOrAdmin, IsPricingOwnerOrAdmin]
	filterset_class = ProviderCategoryPricingFilter
	ordering_fields = ['created_at', 'updated_at', 'min_price', 'max_price']

	def get_queryset(self):
		qs = super().get_queryset()
		user = self.request.user
		if user.is_staff or user.role == user.ROLE_ADMIN:
			return qs
		provider_model = apps.get_model('accounts', 'ProviderProfile')
		provider = provider_model.objects.filter(user=user).first()
		if not provider:
			return qs.none()
		return qs.filter(provider=provider)

	def perform_create(self, serializer):
		user = self.request.user
		if user.is_staff or user.role == user.ROLE_ADMIN:
			serializer.save()
			return
		provider_model = apps.get_model('accounts', 'ProviderProfile')
		provider = provider_model.objects.filter(user=user).first()
		serializer.save(provider=provider)


class ServiceViewSet(viewsets.ModelViewSet):
	queryset = Service.objects.select_related('category').prefetch_related('providers__user').all()
	serializer_class = ServiceSerializer
	filterset_class = ServiceFilter
	search_fields = ['title', 'description', 'category__name', 'providers__user__username']
	ordering_fields = ['created_at', 'updated_at', 'base_price', 'title']

	def get_permissions(self):
		if self.action in ['list', 'retrieve']:
			return [AllowAny()]
		return [IsAuthenticated(), IsProviderOrAdmin(), CanManageService()]
