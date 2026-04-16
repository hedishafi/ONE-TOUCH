import React, { useEffect, useState } from 'react';
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
  Loader,
  Center,
} from '@mantine/core';
import { IconCheck, IconArrowRight, IconBriefcase } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { COLORS } from '../utils/constants';

/**
 * RoleApprovalSuccess - Shown after admin approves role change request
 * 
 * This page appears when:
 * 1. User's role change request is approved
 * 2. User has new role in approved_roles but hasn't switched yet
 * 3. User needs to complete provider onboarding
 */
export const RoleApprovalSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, setTokens } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    // If user doesn't have multiple roles, redirect to dashboard
    if (!currentUser || (currentUser.approved_roles?.length ?? 0) <= 1) {
      navigate(currentUser?.role === 'provider' ? '/provider/dashboard' : '/client/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleLoginAsProvider = async () => {
    if (!currentUser) return;

    setSwitching(true);
    setLoading(true);

    try {
      // Switch to provider role
      const response = await api.post('/user/role-switch/', { role: 'provider' });

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

      // Check onboarding status
      try {
        const statusResponse = await api.get('/provider/onboarding/status/');
        const status = statusResponse.data;

        // Redirect to appropriate step
        navigate(status.next_route, { replace: true });
      } catch {
        // If status check fails, go to profile setup
        navigate('/provider/profile-setup', { replace: true });
      }
    } catch (error: any) {
      console.error('Role switch error:', error);
      setSwitching(false);
      setLoading(false);
      
      // If switch fails, show error and redirect to dashboard
      navigate('/client/dashboard', { replace: true });
    }
  };

  const handleStayAsClient = () => {
    // User chooses to stay as client - don't enable role switching yet
    // Role switcher will only appear after they start provider onboarding
    navigate('/client/dashboard', { replace: true });
  };

  if (!currentUser) {
    return (
      <Container size="md" py="xl">
        <Center style={{ minHeight: 400 }}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)', display: 'flex', alignItems: 'center' }}>
      <Container size="sm" py="xl">
        <Paper p="xl" radius="lg" shadow="md" withBorder>
          <Stack gap="xl" align="center">
            {/* Success Icon */}
            <ThemeIcon
              size={80}
              radius="xl"
              variant="light"
              color="green"
              style={{
                background: `linear-gradient(135deg, ${COLORS.success}20, ${COLORS.success}10)`,
              }}
            >
              <IconCheck size={40} color={COLORS.success} />
            </ThemeIcon>

            {/* Title */}
            <Stack gap="xs" align="center">
              <Title order={2} ta="center" c={COLORS.navyBlue}>
                Your Request Has Been Approved!
              </Title>
              <Text size="lg" c="dimmed" ta="center">
                Congratulations! You can now access Service Provider features.
              </Text>
            </Stack>

            {/* Instructions */}
            <Paper p="md" radius="md" style={{ background: '#F8F9FA', width: '100%' }}>
              <Stack gap="sm">
                <Group gap="xs">
                  <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                    <Text size="xs" fw={700}>1</Text>
                  </ThemeIcon>
                  <Text size="sm" fw={500}>
                    Click "Login as Service Provider" below
                  </Text>
                </Group>
                <Group gap="xs">
                  <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                    <Text size="xs" fw={700}>2</Text>
                  </ThemeIcon>
                  <Text size="sm" fw={500}>
                    Complete your provider profile setup
                  </Text>
                </Group>
                <Group gap="xs">
                  <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                    <Text size="xs" fw={700}>3</Text>
                  </ThemeIcon>
                  <Text size="sm" fw={500}>
                    Upload identity verification documents
                  </Text>
                </Group>
                <Group gap="xs">
                  <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                    <Text size="xs" fw={700}>4</Text>
                  </ThemeIcon>
                  <Text size="sm" fw={500}>
                    Start receiving job requests!
                  </Text>
                </Group>
              </Stack>
            </Paper>

            {/* Action Buttons */}
            <Stack gap="md" style={{ width: '100%' }}>
              <Button
                size="lg"
                fullWidth
                leftSection={<IconBriefcase size={20} />}
                rightSection={<IconArrowRight size={20} />}
                onClick={handleLoginAsProvider}
                loading={switching}
                disabled={loading}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.tealBlue})`,
                  border: 'none',
                }}
              >
                {switching ? 'Switching to Provider...' : 'Login as Service Provider'}
              </Button>

              <Button
                size="md"
                fullWidth
                variant="subtle"
                onClick={handleStayAsClient}
                disabled={loading}
              >
                Continue as Client for Now
              </Button>
            </Stack>

            {/* Info Text */}
            <Text size="xs" c="dimmed" ta="center">
              You can switch between Client and Service Provider roles anytime using the role switcher in the sidebar.
            </Text>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
