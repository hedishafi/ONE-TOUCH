import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { IconBriefcase, IconShoppingCart } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { COLORS } from '../utils/constants';

export const RoleSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, setCurrentUser, setTokens } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'client' | 'provider' | null>(null);

  // Get tokens from location state (passed from login)
  const { access, refresh } = location.state || {};

  const handleRoleSelection = async (role: 'client' | 'provider') => {
    if (!access || !refresh) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setSelectedRole(role);

    try {
      // Switch to selected role
      const response = await api.post('/user/role-switch/', { role }, {
        headers: {
          'Authorization': `Bearer ${access}`,
        },
      });

      // Update tokens
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }

      setTokens(response.data.access, response.data.refresh);
      setCurrentUser(response.data.user);

      // Navigate to appropriate dashboard
      if (role === 'provider') {
        // Check if provider needs to complete onboarding
        try {
          const statusResponse = await api.get('/provider/onboarding/status/', {
            headers: {
              'Authorization': `Bearer ${response.data.access}`,
            },
          });
          const status = statusResponse.data;
          navigate(status.next_route, { replace: true });
        } catch {
          navigate('/provider/dashboard', { replace: true });
        }
      } else {
        navigate('/client/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Role selection error:', error);
      // Fallback: just set tokens and navigate
      setTokens(access, refresh);
      if (currentUser) {
        setCurrentUser({ ...currentUser, role });
      }
      navigate(role === 'provider' ? '/provider/dashboard' : '/client/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !currentUser.approved_roles || currentUser.approved_roles.length <= 1) {
    // Shouldn't reach here, but redirect to login if no multi-role
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)', display: 'flex', alignItems: 'center' }}>
      <Container size="sm" py="xl">
        <Paper p="xl" radius="lg" shadow="md" withBorder>
          <Stack gap="xl" align="center">
            {/* Title */}
            <Stack gap="xs" align="center">
              <Title order={2} ta="center" c={COLORS.navyBlue}>
                Select Your Role
              </Title>
              <Text size="md" c="dimmed" ta="center">
                You have access to multiple roles. Choose how you want to continue.
              </Text>
            </Stack>

            {/* Role Options */}
            <Stack gap="md" style={{ width: '100%' }}>
              {/* Client Option */}
              <Paper
                p="lg"
                radius="md"
                withBorder
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  border: `2px solid ${selectedRole === 'client' ? COLORS.tealBlue : 'var(--ot-border)'}`,
                  opacity: loading && selectedRole !== 'client' ? 0.5 : 1,
                }}
                onClick={() => !loading && handleRoleSelection('client')}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon
                    size={60}
                    radius="md"
                    variant="light"
                    color="teal"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.tealBlue}20, ${COLORS.tealBlue}10)`,
                    }}
                  >
                    <IconShoppingCart size={30} color={COLORS.tealBlue} />
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text size="lg" fw={700} c={COLORS.navyBlue}>
                      Continue as Client
                    </Text>
                    <Text size="sm" c="dimmed">
                      Book services, manage requests, and track orders
                    </Text>
                  </Box>
                </Group>
              </Paper>

              {/* Provider Option */}
              <Paper
                p="lg"
                radius="md"
                withBorder
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  border: `2px solid ${selectedRole === 'provider' ? COLORS.navyBlue : 'var(--ot-border)'}`,
                  opacity: loading && selectedRole !== 'provider' ? 0.5 : 1,
                }}
                onClick={() => !loading && handleRoleSelection('provider')}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon
                    size={60}
                    radius="md"
                    variant="light"
                    color="blue"
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.navyBlue}20, ${COLORS.navyBlue}10)`,
                    }}
                  >
                    <IconBriefcase size={30} color={COLORS.navyBlue} />
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text size="lg" fw={700} c={COLORS.navyBlue}>
                      Continue as Service Provider
                    </Text>
                    <Text size="sm" c="dimmed">
                      Receive job requests, manage services, and earn income
                    </Text>
                  </Box>
                </Group>
              </Paper>
            </Stack>

            {/* Info Text */}
            <Text size="xs" c="dimmed" ta="center" style={{ maxWidth: 400 }}>
              You can switch between roles anytime using the <strong>role switcher</strong> in the sidebar after logging in.
            </Text>

            {loading && (
              <Text size="sm" c={COLORS.tealBlue} fw={600}>
                Loading {selectedRole === 'client' ? 'Client' : 'Service Provider'} dashboard...
              </Text>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
