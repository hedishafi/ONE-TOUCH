from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from accounts.models import ProviderProfile
from .models import ProviderCategoryPricing, ProviderSkill, Service, ServiceCategory, Skill


class ServiceCategorySerializer(serializers.ModelSerializer):
	class Meta:
		model = ServiceCategory
		fields = ['id', 'name', 'slug', 'icon', 'description', 'created_at']
		read_only_fields = ['id', 'slug', 'created_at']


class SkillSerializer(serializers.ModelSerializer):
	class Meta:
		model = Skill
		fields = ['id', 'name', 'slug', 'created_at']
		read_only_fields = ['id', 'slug', 'created_at']


class ProviderBriefSerializer(serializers.ModelSerializer):
	username = serializers.CharField(source='user.username', read_only=True)

	class Meta:
		model = ProviderProfile
		fields = ['id', 'username']


class ProviderSkillSerializer(serializers.ModelSerializer):
	provider = ProviderBriefSerializer(read_only=True)
	provider_id = serializers.PrimaryKeyRelatedField(
		source='provider', queryset=ProviderProfile.objects.all(), write_only=True, required=False
	)
	skill = SkillSerializer(read_only=True)
	skill_id = serializers.PrimaryKeyRelatedField(source='skill', queryset=Skill.objects.all(), write_only=True)

	class Meta:
		model = ProviderSkill
		fields = ['id', 'provider', 'provider_id', 'skill', 'skill_id', 'created_at']
		read_only_fields = ['id', 'created_at']


class ProviderCategoryPricingSerializer(serializers.ModelSerializer):
	provider = ProviderBriefSerializer(read_only=True)
	provider_id = serializers.PrimaryKeyRelatedField(
		source='provider', queryset=ProviderProfile.objects.all(), write_only=True, required=False
	)
	category = ServiceCategorySerializer(read_only=True)
	category_id = serializers.PrimaryKeyRelatedField(source='category', queryset=ServiceCategory.objects.all(), write_only=True)

	class Meta:
		model = ProviderCategoryPricing
		validators = []
		fields = [
			'id',
			'provider',
			'provider_id',
			'category',
			'category_id',
			'min_price',
			'max_price',
			'created_at',
			'updated_at',
		]
		read_only_fields = ['id', 'created_at', 'updated_at']

	def validate(self, attrs):
		instance = self.instance
		provider = attrs.get('provider') or (instance.provider if instance else None)
		category = attrs.get('category') or (instance.category if instance else None)
		min_price = attrs.get('min_price', instance.min_price if instance else None)
		max_price = attrs.get('max_price', instance.max_price if instance else None)

		if min_price is not None and max_price is not None:
			if min_price >= max_price:
				raise serializers.ValidationError('Minimum price must be less than maximum price.')
			# Ensure reasonable gap for comparison (e.g., max price no more than 50% above min price)
			if max_price > min_price * Decimal('1.5'):
				raise serializers.ValidationError('Price range gap is too large for reasonable comparison. Maximum price cannot exceed 50% above minimum price.')

		# Only validate uniqueness if provider and category are available
		if provider and category:
			temp = ProviderCategoryPricing(
				provider=provider,
				category=category,
				min_price=min_price,
				max_price=max_price,
			)
			try:
				temp.validate_unique()
			except DjangoValidationError as exc:
				raise serializers.ValidationError(exc.message)

		return attrs


class ServiceSerializer(serializers.ModelSerializer):
	category = ServiceCategorySerializer(read_only=True)
	category_id = serializers.PrimaryKeyRelatedField(
		source='category', queryset=ServiceCategory.objects.all(), write_only=True
	)
	providers = ProviderBriefSerializer(many=True, read_only=True)
	provider_ids = serializers.PrimaryKeyRelatedField(
		source='providers', queryset=ProviderProfile.objects.all(), many=True, write_only=True, required=False
	)

	class Meta:
		model = Service
		fields = [
			'id',
			'category',
			'category_id',
			'title',
			'description',
			'base_price',
			'providers',
			'provider_ids',
			'created_at',
			'updated_at',
		]
		read_only_fields = ['id', 'created_at', 'updated_at']

	def _request_provider_profile(self):
		request = self.context.get('request')
		if not request or not request.user or not request.user.is_authenticated:
			return None
		return ProviderProfile.objects.filter(user=request.user).first()

	def _validate_provider_ranges(self, category, base_price, providers):
		missing = []
		out_of_range = []

		for provider in providers:
			pricing = ProviderCategoryPricing.objects.filter(
				provider=provider,
				category=category,
			).first()
			if not pricing:
				missing.append(provider.user.username)
				continue
			if not (pricing.min_price <= base_price <= pricing.max_price):
				out_of_range.append(provider.user.username)

		errors = {}
		if missing:
			errors['provider_ids'] = (
				'Each provider must configure category pricing first. Missing for: '
				+ ', '.join(missing)
			)
		if out_of_range:
			errors['base_price'] = (
				'base_price must be within provider pricing range for this category. Out of range for: '
				+ ', '.join(out_of_range)
			)
		if errors:
			raise serializers.ValidationError(errors)

	def validate(self, attrs):
		request = self.context.get('request')
		instance = self.instance

		category = attrs.get('category') or (instance.category if instance else None)
		base_price = attrs.get('base_price', instance.base_price if instance else None)

		providers = attrs.get('providers')
		if providers is None:
			if instance is not None:
				providers = list(instance.providers.all())
			else:
				providers = []

		if request and request.user.is_authenticated and request.user.role == request.user.ROLE_PROVIDER:
			provider_profile = self._request_provider_profile()
			if not provider_profile:
				raise serializers.ValidationError('Provider profile not found for this user.')
			if not providers:
				providers = [provider_profile]
				attrs['providers'] = providers
			elif provider_profile not in providers:
				raise serializers.ValidationError(
					{'provider_ids': 'You can only create or update services that include your own provider profile.'}
				)

		if not providers:
			raise serializers.ValidationError({'provider_ids': 'At least one provider must be selected.'})

		if category is not None and base_price is not None:
			self._validate_provider_ranges(category, base_price, providers)
		return attrs

	def create(self, validated_data):
		providers = validated_data.pop('providers', [])
		service = Service.objects.create(**validated_data)
		if providers:
			service.providers.set(providers)
		return service

	def update(self, instance, validated_data):
		providers = validated_data.pop('providers', None)
		for attr, value in validated_data.items():
			setattr(instance, attr, value)
		instance.save()
		if providers is not None:
			instance.providers.set(providers)
		return instance
