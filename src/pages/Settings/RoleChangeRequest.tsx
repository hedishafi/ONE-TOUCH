import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Alert,
  Card,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX, IconArrowRight, IconSwitchHorizontal, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { useRoleUpdateChecker } from '../../hooks/useRoleUpdateChecker';

interface RoleChangeRequest {
  id: number;
  current_role: string;
  requested_role: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  rejection_message: string;
  created_at: string;
}

export const RoleChangeRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  // Check for role updates periodically
  useRoleUpdateChecker();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<RoleChangeRequest | null>(null);
  const [error, setError] = useState('');

  // Determine what role to request
  const currentRole = currentUser?.role || 'client';
  const requestedRole = currentRole === 'provider' ? 'client' : 'provider';

  // Check if user already has multiple roles
  const hasMultipleRoles = (currentUser?.approved_roles?.length ?? 0) > 1;

  useEffect(() => {
    loadPendingRequest();
  }, []);

  const loadPendingRequest = async () => {
    try {
      setLoading(true);
      
      // First, refresh the user profile to get latest approved_roles
      try {
        const profileResponse = await api.get('/auth/profile/');
        const { setCurrentUser } = useAuthStore.getState();
        setCurrentUser(profileResponse.data);
      } catch (err) {
        console.error('Failed to refresh profile:', err);
      }
      
      // Then load the request status
      const response = await api.get('/user/role-change-request/');
      const requests = response.data.requests || [];
      
      // Only get the most recent pending or rejected request
      const pending = requests.find((req: RoleChangeRequest) => req.status === 'pending');
      const rejected = requests.find((req: RoleChangeRequest) => req.status === 'rejected');
      
      setPendingRequest(pending || rejected || null);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError('');
      
      await api.post('/user/role-change-request/', {
        requested_role: requestedRole,
        reason: 'User requested role change'
      });

      notifications.show({
        title: 'Request Submitted',
        message: 'Your role change request has been submitted. Admin will review it soon.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      loadPendingRequest();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to submit request';
      setError(errorMsg);
      notifications.show({
        title: 'Submission Failed',
        message: errorMsg,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'provider' ? 'Service Provider' : 'Client';
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Center style={{ minHeight: 400 }}>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group justify="space-between" align="center">
            <div>
              <Title order={2}>Role Management</Title>
              <Text c="dimmed" size="sm" mt="xs">
                {hasMultipleRoles 
                  ? 'You have access to multiple roles. Use the role switcher in the sidebar to switch between them.'
                  : 'Request to add an additional role to your account.'}
              </Text>
            </div>
            <Tooltip label="Refresh status">
              <ActionIcon 
                variant="light" 
                size="lg" 
                onClick={loadPendingRequest}
                loading={loading}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Show setup button for users with multiple roles who haven't completed onboarding */}
          {hasMultipleRoles && currentRole === 'client' && (
            <Alert icon={<IconSwitchHorizontal size={16} />} color="blue" title="Provider Role Approved">
              <Text size="sm" mb="md">
                Your Service Provider role has been approved. Complete your provider account setup to start receiving job requests.
              </Text>
              <Button
                onClick={() => navigate('/client/role-approved')}
                variant="filled"
                color="blue"
                leftSection={<IconArrowRight size={16} />}
              >
                Setup Provider Account
              </Button>
            </Alert>
          )}

          {/* Current Role Info - Only show if user doesn't have multiple roles */}
          {!hasMultipleRoles && (
            <Card withBorder padding="md" radius="md" style={{ background: '#f8f9fa' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" c="dimmed">Current Role</Text>
                  <Text size="lg" fw={600}>{getRoleLabel(currentRole)}</Text>
                </div>
                <IconArrowRight size={24} color="#868e96" />
                <div>
                  <Text size="sm" c="dimmed">Request Access To</Text>
                  <Text size="lg" fw={600} c="blue">{getRoleLabel(requestedRole)}</Text>
                </div>
              </Group>
            </Card>
          )}

          {/* Show pending request alert */}
          {pendingRequest?.status === 'pending' && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Pending Request">
              <Text size="sm" mb="xs">
                You have a pending role change request to become a <strong>{getRoleLabel(pendingRequest.requested_role)}</strong>.
              </Text>
              <Text size="sm" c="dimmed">
                Submitted: {new Date(pendingRequest.created_at).toLocaleDateString()}
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Please wait for admin review. Once approved, you'll be able to switch between roles using the role switcher in the sidebar.
              </Text>
            </Alert>
          )}

          {/* Show rejected request alert */}
          {pendingRequest?.status === 'rejected' && (
            <Alert icon={<IconX size={16} />} color="red" title="Request Rejected">
              <Text size="sm" mb="xs">
                Your previous role change request was rejected.
              </Text>
              {pendingRequest.rejection_message && (
                <>
                  <Text size="sm" fw={500} mb="xs">Reason:</Text>
                  <Text size="sm" c="dimmed" mb="sm">{pendingRequest.rejection_message}</Text>
                </>
              )}
              <Text size="sm">
                You can submit a new request below.
              </Text>
            </Alert>
          )}

          {/* Request Form - Only show if user doesn't have multiple roles and no pending request */}
          {!hasMultipleRoles && pendingRequest?.status !== 'pending' && (
            <>
              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
                  {error}
                </Alert>
              )}

              <Group justify="flex-end">
                <Button variant="default" onClick={() => navigate(-1)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  Submit Request
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};
