import django_filters

from .models import ProviderCategoryPricing, Service


class ServiceFilter(django_filters.FilterSet):
	category_id = django_filters.NumberFilter(field_name='category_id')
	provider_id = django_filters.NumberFilter(field_name='providers__id')
	min_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='gte')
	max_price = django_filters.NumberFilter(field_name='base_price', lookup_expr='lte')

	class Meta:
		model = Service
		fields = ['category_id', 'provider_id', 'min_price', 'max_price']


class ProviderCategoryPricingFilter(django_filters.FilterSet):
	category_id = django_filters.NumberFilter(field_name='category_id')
	provider_id = django_filters.NumberFilter(field_name='provider_id')
	min_price = django_filters.NumberFilter(field_name='min_price', lookup_expr='gte')
	max_price = django_filters.NumberFilter(field_name='max_price', lookup_expr='lte')

	class Meta:
		model = ProviderCategoryPricing
		fields = ['category_id', 'provider_id', 'min_price', 'max_price']
