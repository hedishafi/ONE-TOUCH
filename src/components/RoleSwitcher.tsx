/**
 * RoleSwitcher Component
 * 
 * Allows users with multiple roles to seamlessly switch between Client and Service Provider modes.
 * Positioned in the sidebar below the user profile section.
 * 
 * Features:
 * - Displays current active role
 * - Validates onboarding completion for provider access
 * - Shows confirmation dialog for client switch
 * - Provides clear feedback on success/error
 * - Updates UI instantly after switch
 */

import { useState, useEffect } from 'react';
import { Button, Text, Stack, Group, Badge, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { IconSwitchHorizontal, IconUser, IconBriefcase } from '@tabler/icons-react';
import { useAuthStore } from '../store/authStore';
import * as authService from '../services/authService';

export const RoleSwitcher: React.FC = () => {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [autoRefreshed, setAutoRefreshed] = useState(false);

  // Auto-refresh user data if multi-role fields are missing
  useEffect(() => {
    const needsRefresh = 
      currentUser && 
      !autoRefreshed &&
      (currentUser.has_provider_role === undefined || currentUser.has_client_role === undefined);
    
    if (needsRefresh) {
      authService.getProfile()
        .then(() => {
          setAutoRefreshed(true);
        })
        .catch((error) => {
          console.error('Failed to refresh user data:', error);
        });
    }
  }, [currentUser, autoRefreshed]);

  // Check if user has multiple roles
  const hasProviderRole = currentUser?.has_provider_role || false;
  const hasClientRole = currentUser?.has_client_role !== false; // Default to true
  const hasMultipleRoles = hasProviderRole && hasClientRole;
  
  // Don't render if user doesn't have multiple roles
  if (!hasMultipleRoles) {
    return null;
  }

  const currentRole = currentUser?.role;
  const targetRole = currentRole === 'client' ? 'provider' : 'client';

  /**
   * Handle role switch button click
   * Direct switch without confirmation for smooth UX
   */
  const handleRoleSwitch = async () => {
    await switchRole(targetRole);
  };

  /**
   * Execute role switch
   * - Calls backend API
   * - Updates localStorage
   * - Handles onboarding redirects
   * - Shows appropriate feedback
   */
  const switchRole = async (role: 'client' | 'provider') => {
    try {
      setLoading(true);
      
      // Call backend API to switch role
      const response = await authService.switchRole(role);
      
      // Refresh user profile to get updated role
      const updatedProfile = await authService.getProfile();
      
      // Update localStorage with new user data
      const currentUserData = localStorage.getItem('user');
      if (currentUserData) {
        const userData = JSON.parse(currentUserData);
        const updatedUser = { ...userData, role: updatedProfile.role };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      // Show success notification (brief, non-intrusive)
      notifications.show({
        title: 'Role Switched',
        message: `Switched to ${role === 'provider' ? 'Service Provider' : 'Client'} successfully`,
        color: 'teal',
        autoClose: 2000,
      });
      
      // Smooth redirect to appropriate dashboard
      setTimeout(() => {
        window.location.href = response.redirect;
      }, 300);
      
    } catch (error: any) {
      // Handle onboarding requirement
      if (error.response?.data?.onboarding_required) {
        notifications.show({
          title: 'Complete Onboarding',
          message: error.response.data.error,
          color: 'orange',
          autoClose: 4000,
        });
        
        // Redirect to appropriate onboarding step
        setTimeout(() => {
          window.location.href = error.response.data.redirect;
        }, 500);
      } else {
        // Handle other errors
        notifications.show({
          title: 'Switch Failed',
          message: error.response?.data?.error || 'Failed to switch role. Please try again.',
          color: 'red',
          autoClose: 4000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Current Role Display */}
      <Box mb="xs">
        <Text size="xs" c="dimmed" mb={4}>Current Role</Text>
        <Badge
          size="sm"
          variant="light"
          color={currentRole === 'provider' ? 'blue' : 'green'}
          leftSection={currentRole === 'provider' ? <IconBriefcase size={12} /> : <IconUser size={12} />}
        >
          {currentRole === 'provider' ? 'Service Provider' : 'Client'}
        </Badge>
      </Box>

      {/* Switch Role Button */}
      <Button
        variant="light"
        fullWidth
        leftSection={<IconSwitchHorizontal size={16} />}
        onClick={handleRoleSwitch}
        loading={loading}
        disabled={loading}
      >
        Switch to {targetRole === 'provider' ? 'Service Provider' : 'Client'}
      </Button>
    </>
  );
};
