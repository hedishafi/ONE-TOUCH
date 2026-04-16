from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User


class RoleSwitchingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        self.user = User.objects.create(
            username='testuser',
            phone_number='+251912345678',
            role=User.ROLE_CLIENT,
            approved_roles=[User.ROLE_CLIENT, User.ROLE_PROVIDER],
        )
        self.user.set_unusable_password()
        self.user.save()
        
        self.client.force_authenticate(user=self.user)
    
    def test_user_can_switch_to_approved_role(self):
        response = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_PROVIDER},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['new_role'], User.ROLE_PROVIDER)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.ROLE_PROVIDER)
    
    def test_user_cannot_switch_to_unapproved_role(self):
        self.user.approved_roles = [User.ROLE_CLIENT]
        self.user.save()
        
        response = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_PROVIDER},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('permission', response.data['error'].lower())
    
    def test_user_cannot_switch_to_current_role(self):
        response = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_CLIENT},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already', response.data['error'].lower())
    
    def test_get_available_roles(self):
        response = self.client.get(reverse('role-switch'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_role'], User.ROLE_CLIENT)
        self.assertEqual(response.data['approved_roles'], [User.ROLE_CLIENT, User.ROLE_PROVIDER])
        self.assertEqual(response.data['available_roles'], [User.ROLE_PROVIDER])
        self.assertTrue(response.data['can_switch'])
    
    def test_user_with_single_role_cannot_switch(self):
        self.user.approved_roles = [User.ROLE_CLIENT]
        self.user.save()
        
        response = self.client.get(reverse('role-switch'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['available_roles'], [])
        self.assertFalse(response.data['can_switch'])
    
    def test_switch_requires_authentication(self):
        self.client.force_authenticate(user=None)
        
        response = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_PROVIDER},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_switch_validates_role_parameter(self):
        response = self.client.post(
            reverse('role-switch'),
            {'role': 'invalid_role'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_switch_requires_role_parameter(self):
        response = self.client.post(
            reverse('role-switch'),
            {},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('required', response.data['error'].lower())
    
    def test_multiple_switches_work(self):
        response1 = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_PROVIDER},
            format='json'
        )
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.ROLE_PROVIDER)
        
        response2 = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_CLIENT},
            format='json'
        )
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.ROLE_CLIENT)
    
    def test_new_tokens_generated_on_switch(self):
        response1 = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_PROVIDER},
            format='json'
        )
        token1 = response1.data['access']
        
        self.user.role = User.ROLE_CLIENT
        self.user.save()
        
        response2 = self.client.post(
            reverse('role-switch'),
            {'role': User.ROLE_PROVIDER},
            format='json'
        )
        token2 = response2.data['access']
        
        self.assertNotEqual(token1, token2)
