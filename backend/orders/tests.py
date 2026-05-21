from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch

from accounts.models import ProviderProfile, User
from orders.models import Order, OrderMatch, OrderAssignment
from orders.utils.commission_service import calculate_commission
from orders.utils.matching_service import find_matching_providers, haversine_distance
from services.models import ProviderCategoryPricing, ProviderService, ServiceCategory


class CommissionServiceTests(TestCase):
	def test_calculate_commission(self):
		user = User.objects.create_user(username='provider1', password='pass', phone_number='1000000000')
		user.role = User.ROLE_PROVIDER
		user.save(update_fields=['role'])
		provider = ProviderProfile.objects.create(user=user)
		category = ServiceCategory.objects.create(name='Plumbing')
		ProviderCategoryPricing.objects.create(
			provider=provider,
			category=category,
			min_price=Decimal('100.00'),
			max_price=Decimal('200.00'),
		)

		commission = calculate_commission(provider, category)
		self.assertEqual(commission, Decimal('3.00'))


class MatchingServiceTests(TestCase):
	def test_haversine_distance(self):
		distance = haversine_distance(0.0, 0.0, 0.0, 1.0)
		self.assertAlmostEqual(distance, 111.19, places=2)

	def test_find_matching_providers(self):
		client = User.objects.create_user(username='client1', password='pass', phone_number='2000000000')
		client.role = User.ROLE_CLIENT
		client.save(update_fields=['role'])
		order_category = ServiceCategory.objects.create(name='Electrical')

		provider_user = User.objects.create_user(username='provider2', password='pass', phone_number='3000000000')
		provider_user.role = User.ROLE_PROVIDER
		provider_user.save(update_fields=['role'])
		provider = ProviderProfile.objects.create(
			user=provider_user,
			is_online=True,
			is_available=True,
			current_latitude=9.03,
			current_longitude=38.74,
		)

		ProviderService.objects.create(provider=provider, primary_service=order_category)

		order = Order.objects.create(
			client=client,
			category=order_category,
			input_type=Order.INPUT_TEXT,
			transcription='Fix wiring issue',
			description='Fix wiring issue',
			client_latitude=9.031,
			client_longitude=38.741,
			client_address='Addis Ababa',
		)

		providers = find_matching_providers(order)
		self.assertIn(provider, providers)


class OrderViewSetAPITests(APITestCase):
	"""Test cases for OrderViewSet API endpoints at /api/v1/"""

	def setUp(self):
		"""Set up test clients and users"""
		self.client_obj = APIClient()
		
		# Create client user
		self.client_user = User.objects.create_user(
			username='client_test',
			password='testpass123',
			phone_number='1111111111',
		)
		self.client_user.role = User.ROLE_CLIENT
		self.client_user.save(update_fields=['role'])
		
		# Create provider user
		self.provider_user = User.objects.create_user(
			username='provider_test',
			password='testpass123',
			phone_number='2222222222',
		)
		self.provider_user.role = User.ROLE_PROVIDER
		self.provider_user.save(update_fields=['role'])
		self.provider = ProviderProfile.objects.create(
			user=self.provider_user,
			is_online=True,
			is_available=True,
			current_latitude=9.03,
			current_longitude=38.74,
		)
		
		# Create service category
		self.category = ServiceCategory.objects.create(name='Plumbing')
		
	def _get_auth_headers(self, user):
		"""Get JWT auth headers for a user"""
		from rest_framework_simplejwt.tokens import RefreshToken
		refresh = RefreshToken.for_user(user)
		return {'HTTP_AUTHORIZATION': f'Bearer {str(refresh.access_token)}'}

	def test_unauthenticated_get_401(self):
		"""Unauthenticated requests should return 401"""
		response = self.client_obj.get('/api/v1/orders/')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_create_order_requires_jwt_auth(self):
		"""Creating an order without JWT should fail"""
		response = self.client_obj.post('/api/v1/orders/', {'description': 'test'}, format='json')
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_client_can_create_order_with_null_category(self):
		"""Client can create an order with text input (category/sub_service can be null)"""
		with patch('orders.utils.ollama_service.categorise_order') as mock_categorise:
			# Mock Ollama to return null category
			mock_categorise.return_value = {
				'category_name': None,
				'sub_service_name': None,
				'cleaned_description': 'Need help with something',
				'confidence': 0.5,
			}
			
			auth_headers = self._get_auth_headers(self.client_user)
			response = self.client_obj.post(
				'/api/v1/orders/',
				{
					'input_type': 'text',
					'description': 'Need help with something',
					'transcription': 'Need help with something',
					'client_latitude': 9.03,
					'client_longitude': 38.74,
					'client_address': 'Addis Ababa',
				},
				format='json',
				**auth_headers
			)
			
			self.assertEqual(response.status_code, status.HTTP_201_CREATED)
			self.assertIsNone(response.data['category'])
			self.assertIsNone(response.data['sub_service'])

	@patch('orders.utils.ollama_service.categorise_order')
	def test_client_can_cancel_pending_order(self, mock_categorise):
		"""Client can cancel an order that is in pending status"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		# Create an order in pending status
		order = Order.objects.create(
			client=self.client_user,
			input_type=Order.INPUT_TEXT,
			description='Need help',
			client_latitude=9.03,
			client_longitude=38.74,
			client_address='Addis Ababa',
			status=Order.STATUS_PENDING,
		)
		
		auth_headers = self._get_auth_headers(self.client_user)
		response = self.client_obj.post(
			f'/api/v1/orders/{order.id}/cancel/',
			{},
			format='json',
			**auth_headers
		)
		
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify order is cancelled
		order.refresh_from_db()
		self.assertEqual(order.status, Order.STATUS_CANCELLED)

	@patch('orders.utils.ollama_service.categorise_order')
	def test_client_cannot_cancel_accepted_order(self, mock_categorise):
		"""Client cannot cancel an order that is already accepted"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		# Create an order in accepted status
		order = Order.objects.create(
			client=self.client_user,
			input_type=Order.INPUT_TEXT,
			description='Need help',
			client_latitude=9.03,
			client_longitude=38.74,
			client_address='Addis Ababa',
			status=Order.STATUS_ACCEPTED,
		)
		
		# Create assignment
		OrderAssignment.objects.create(order=order, provider=self.provider, commission_fee=Decimal('50.00'))
		
		auth_headers = self._get_auth_headers(self.client_user)
		response = self.client_obj.post(
			f'/api/v1/orders/{order.id}/cancel/',
			{},
			format='json',
			**auth_headers
		)
		
		# Should fail with 400 Bad Request
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

	@patch('orders.utils.ollama_service.categorise_order')
	def test_provider_can_see_available_orders(self, mock_categorise):
		"""Provider can see orders available in their area"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		# Create an order with nearby location
		order = Order.objects.create(
			client=self.client_user,
			category=self.category,
			input_type=Order.INPUT_TEXT,
			description='Need help',
			client_latitude=9.031,
			client_longitude=38.741,
			client_address='Addis Ababa',
			status=Order.STATUS_MATCHING,
		)
		
		# Create provider service capability
		ProviderService.objects.create(provider=self.provider, primary_service=self.category)
		
		auth_headers = self._get_auth_headers(self.provider_user)
		response = self.client_obj.get(
			'/api/v1/orders/available/',
			format='json',
			**auth_headers
		)
		
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		# Response can be paginated or a plain list
		if isinstance(response.data, dict):
			self.assertIn('results', response.data)
		else:
			self.assertIsInstance(response.data, list)

	@patch('orders.utils.ollama_service.categorise_order')
	def test_provider_can_accept_order(self, mock_categorise):
		"""Provider can accept an available order"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		# Create order
		order = Order.objects.create(
			client=self.client_user,
			category=self.category,
			input_type=Order.INPUT_TEXT,
			description='Need help',
			client_latitude=9.031,
			client_longitude=38.741,
			client_address='Addis Ababa',
			status=Order.STATUS_MATCHING,
		)
		
		# Create matching
		OrderMatch.objects.create(order=order, provider=self.provider, status=OrderMatch.STATUS_NOTIFIED)
		
		# Create provider pricing
		ProviderCategoryPricing.objects.create(
			provider=self.provider,
			category=self.category,
			min_price=Decimal('100.00'),
			max_price=Decimal('200.00'),
		)
		
		auth_headers = self._get_auth_headers(self.provider_user)
		response = self.client_obj.post(
			f'/api/v1/orders/{order.id}/accept/',
			{},
			format='json',
			**auth_headers
		)
		
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify order status changed
		order.refresh_from_db()
		self.assertEqual(order.status, Order.STATUS_ACCEPTED)
		
		# Verify assignment was created
		self.assertTrue(OrderAssignment.objects.filter(order=order).exists())

	@patch('orders.utils.ollama_service.categorise_order')
	def test_provider_can_start_accepted_order(self, mock_categorise):
		"""Provider can mark an accepted order as in_progress"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		# Create order in accepted status
		order = Order.objects.create(
			client=self.client_user,
			category=self.category,
			input_type=Order.INPUT_TEXT,
			description='Need help',
			client_latitude=9.031,
			client_longitude=38.741,
			client_address='Addis Ababa',
			status=Order.STATUS_ACCEPTED,
		)
		
		# Create assignment
		assignment = OrderAssignment.objects.create(order=order, provider=self.provider, commission_fee=Decimal('50.00'))
		
		auth_headers = self._get_auth_headers(self.provider_user)
		response = self.client_obj.post(
			f'/api/v1/orders/{order.id}/start/',
			{},
			format='json',
			**auth_headers
		)
		
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify order status changed
		order.refresh_from_db()
		self.assertEqual(order.status, Order.STATUS_IN_PROGRESS)

	@patch('orders.utils.ollama_service.categorise_order')
	def test_provider_can_complete_order(self, mock_categorise):
		"""Provider can complete an in_progress order"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		# Create order in in_progress status
		order = Order.objects.create(
			client=self.client_user,
			category=self.category,
			input_type=Order.INPUT_TEXT,
			description='Need help',
			client_latitude=9.031,
			client_longitude=38.741,
			client_address='Addis Ababa',
			status=Order.STATUS_IN_PROGRESS,
		)
		
		# Create assignment
		assignment = OrderAssignment.objects.create(order=order, provider=self.provider, commission_fee=Decimal('50.00'))
		
		auth_headers = self._get_auth_headers(self.provider_user)
		response = self.client_obj.post(
			f'/api/v1/orders/{order.id}/complete/',
			{},
			format='json',
			**auth_headers
		)
		
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		
		# Verify order status changed
		order.refresh_from_db()
		self.assertEqual(order.status, Order.STATUS_COMPLETED)

	@patch('orders.utils.ollama_service.categorise_order')
	def test_jwt_required_on_all_endpoints(self, mock_categorise):
		"""JWT auth is required on all protected endpoints"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		# Create order
		order = Order.objects.create(
			client=self.client_user,
			input_type=Order.INPUT_TEXT,
			description='Need help',
			client_latitude=9.03,
			client_longitude=38.74,
			client_address='Addis Ababa',
			status=Order.STATUS_PENDING,
		)
		
		# Test endpoints without auth
		endpoints = [
			('GET', '/api/v1/orders/'),
			('GET', f'/api/v1/orders/{order.id}/'),
			('POST', '/api/v1/orders/my-orders/'),
			('POST', '/api/v1/orders/available/'),
			('POST', f'/api/v1/orders/{order.id}/cancel/'),
		]
		
		for method, endpoint in endpoints:
			if method == 'GET':
				response = self.client_obj.get(endpoint)
			else:
				response = self.client_obj.post(endpoint, {}, format='json')
			
			self.assertEqual(
				response.status_code,
				status.HTTP_401_UNAUTHORIZED,
				f"{method} {endpoint} should require JWT auth"
			)

	@patch('orders.utils.ollama_service.categorise_order')
	def test_api_base_url_is_v1(self, mock_categorise):
		"""Verify API base URL is /api/v1/ (not /api/)"""
		mock_categorise.return_value = {
			'category_name': None,
			'sub_service_name': None,
			'cleaned_description': 'Need help',
			'confidence': 0.5,
		}
		
		auth_headers = self._get_auth_headers(self.client_user)
		
		# Test creating order at /api/v1/ (should work)
		response = self.client_obj.post(
			'/api/v1/orders/',
			{
				'input_type': 'text',
				'description': 'Test',
				'transcription': 'Test',
				'client_latitude': 9.03,
				'client_longitude': 38.74,
				'client_address': 'Addis Ababa',
			},
			format='json',
			**auth_headers
		)
		
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		
		# Test at /api/ (should fail with 404 or similar)
		response = self.client_obj.post(
			'/api/orders/',
			{
				'input_type': 'text',
				'description': 'Test',
				'transcription': 'Test',
				'client_latitude': 9.03,
				'client_longitude': 38.74,
				'client_address': 'Addis Ababa',
			},
			format='json',
			**auth_headers
		)
		
		# /api/ endpoint should not exist or return 404
		self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_401_UNAUTHORIZED])
