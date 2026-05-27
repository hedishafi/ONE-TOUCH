from rest_framework import serializers

from orders.models import Order, OrderAssignment, OrderStatusLog


class OrderAssignmentSerializer(serializers.ModelSerializer):
	provider_phone = serializers.SerializerMethodField()

	class Meta:
		model = OrderAssignment
		fields = [
			'id',
			'provider',
			'provider_phone',
			'commission_fee',
			'commission_paid',
			'commission_paid_at',
			'client_contact_released',
			'contact_released_at',
			'assigned_at',
		]

	def get_provider_phone(self, obj):
		return obj.provider.user.phone_number if obj.provider and obj.provider.user else None


class OrderStatusLogSerializer(serializers.ModelSerializer):
	class Meta:
		model = OrderStatusLog
		fields = ['id', 'old_status', 'new_status', 'changed_by', 'note', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
	client_name = serializers.SerializerMethodField()
	client_phone = serializers.SerializerMethodField()
	category_name = serializers.SerializerMethodField()
	sub_service_name = serializers.SerializerMethodField()
	assignment = OrderAssignmentSerializer(read_only=True)

	class Meta:
		model = Order
		fields = [
			'id',
			'client',
			'client_name',
			'client_phone',
			'category',
			'category_name',
			'sub_service',
			'sub_service_name',
			'input_type',
			'voice_file',
			'transcription',
			'description',
			'client_latitude',
			'client_longitude',
			'client_address',
			'status',
			'created_at',
			'updated_at',
			'expires_at',
			'assignment',
		]

	def get_client_name(self, obj):
		if not obj.client:
			return None
		return obj.client.get_full_name() or obj.client.username

	def get_client_phone(self, obj):
		return obj.client.phone_number if obj.client else None

	def get_category_name(self, obj):
		return obj.category.name if obj.category else None

	def get_sub_service_name(self, obj):
		return obj.sub_service.name if obj.sub_service else None


class OrderCreateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Order
		fields = [
			'input_type',
			'transcription',
			'voice_file',
			'client_latitude',
			'client_longitude',
			'client_address',
		]

	def validate(self, attrs):
		input_type = attrs.get('input_type')
		transcription = attrs.get('transcription')
		voice_file = attrs.get('voice_file')

		if input_type == Order.INPUT_VOICE and not voice_file:
			raise serializers.ValidationError({'voice_file': 'Voice file is required for voice input.'})

		if input_type == Order.INPUT_TEXT and not transcription:
			raise serializers.ValidationError({'transcription': 'Transcription text is required for text input.'})

		return attrs
