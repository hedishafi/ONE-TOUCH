import React, { useState } from 'react';
import { Menu, Text, Group, ThemeIcon, Loader, UnstyledButton } from '@mantine/core';
import { IconSwitchHorizontal, IconChevronDown, IconBriefcase, IconShoppingCart } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

interface RoleSwitcherProps {
  variant?: 'button' | 'compact';
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ variant = 'button' }) => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, setTokens } = useAuthStore();
  const [switching, setSwitching] = useState(false);

  if (!currentUser?.approved_roles || currentUser.approved_roles.length <= 1) {
    return null;
  }

  const availableRoles = currentUser.approved_roles.filter(
    (role) => role !== currentUser.role
  );

  if (availableRoles.length === 0) {
    return null;
  }

  const getRoleLabel = (role: string) => {
    return role === 'provider' ? 'Service Provider' : 'Client';
  };

  const getRoleIcon = (role: string) => {
    return role === 'provider' ? IconBriefcase : IconShoppingCart;
  };

  const getRoleColor = (role: string) => {
    return role === 'provider' ? 'blue' : 'teal';
  };

  const handleRoleSwitch = async (newRole: string) => {
    if (switching) return;

    setSwitching(true);

    try {
      const response = await api.post('/user/role-switch/', { role: newRole });

      // Update tokens
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }

      // Update auth store
      setTokens(response.data.access, response.data.refresh);
      setCurrentUser(response.data.user);

      // Show success notification
      notifications.show({
        title: 'Role Switched',
        message: `Successfully switched to ${getRoleLabel(newRole)}`,
        color: 'green',
        icon: <IconSwitchHorizontal size={16} />,
      });

      // Redirect to appropriate dashboard
      if (newRole === 'provider') {
        // Check if provider needs to complete onboarding
        try {
          const statusResponse = await api.get('/provider/onboarding/status/');
          navigate(statusResponse.data.next_route, { replace: true });
        } catch {
          navigate('/provider/dashboard', { replace: true });
        }
      } else {
        navigate('/client/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Role switch error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || 'Failed to switch role';
      notifications.show({
        title: 'Switch Failed',
        message: errorMsg,
        color: 'red',
      });
    } finally {
      setSwitching(false);
    }
  };

  const CurrentRoleIcon = getRoleIcon(currentUser.role);
  const currentRoleColor = getRoleColor(currentUser.role);

  if (variant === 'compact') {
    return (
      <Menu shadow="md" width={220} position="bottom-end">
        <Menu.Target>
          <UnstyledButton
            disabled={switching}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: switching ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              background: 'transparent',
              border: 'none',
              fontWeight: 500,
              fontSize: '14px',
              color: 'var(--mantine-color-text)',
            }}
            onMouseEnter={(e) => {
              if (!switching) {
                e.currentTarget.style.background = 'var(--mantine-color-gray-1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <CurrentRoleIcon size={18} />
            <span>{getRoleLabel(currentUser.role)}</span>
            <IconChevronDown size={14} />
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Switch Role</Menu.Label>
          {availableRoles.map((role) => {
            const RoleIcon = getRoleIcon(role);
            const roleColor = getRoleColor(role);
            return (
              <Menu.Item
                key={role}
                leftSection={
                  <ThemeIcon variant="light" color={roleColor} size="sm">
                    <RoleIcon size={16} />
                  </ThemeIcon>
                }
                onClick={() => handleRoleSwitch(role)}
                disabled={switching}
              >
                {switching ? (
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="sm">Switching...</Text>
                  </Group>
                ) : (
                  <Text size="sm">{getRoleLabel(role)}</Text>
                )}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Menu shadow="md" width={260} position="bottom-start">
      <Menu.Target>
        <UnstyledButton
          disabled={switching}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: switching ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            background: `var(--mantine-color-${currentRoleColor}-light)`,
            border: `1px solid var(--mantine-color-${currentRoleColor}-outline)`,
            minHeight: '48px',
          }}
          onMouseEnter={(e) => {
            if (!switching) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <Group gap="xs">
            <CurrentRoleIcon size={20} />
            <div style={{ textAlign: 'left' }}>
              <Text size="xs" c="dimmed" fw={500}>
                Current Role
              </Text>
              <Text size="sm" fw={600}>
                {getRoleLabel(currentUser.role)}
              </Text>
            </div>
          </Group>
          <IconChevronDown size={16} />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Group gap="xs">
            <IconSwitchHorizontal size={14} />
            <Text size="xs">Switch to</Text>
          </Group>
        </Menu.Label>
        {availableRoles.map((role) => {
          const RoleIcon = getRoleIcon(role);
          const roleColor = getRoleColor(role);
          return (
            <Menu.Item
              key={role}
              leftSection={
                <ThemeIcon variant="light" color={roleColor} size="md">
                  <RoleIcon size={18} />
                </ThemeIcon>
              }
              onClick={() => handleRoleSwitch(role)}
              disabled={switching}
              style={{ padding: '12px 16px' }}
            >
              {switching ? (
                <Group gap="xs">
                  <Loader size="sm" />
                  <Text size="sm">Switching...</Text>
                </Group>
              ) : (
                <div>
                  <Text size="sm" fw={600}>
                    {getRoleLabel(role)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Access {role === 'provider' ? 'provider tools and dashboard' : 'booking and services'}
                  </Text>
                </div>
              )}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
};
