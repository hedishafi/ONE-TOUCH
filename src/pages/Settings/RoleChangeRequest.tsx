import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Textarea,
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
  const [reason, setReason] = useState('');
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
    if (!reason.trim() || reason.length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    if (reason.length > 1000) {
      setError('Reason is too long (maximum 1000 characters)');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await api.post('/user/role-change-request/', {
        requested_role: requestedRole,
        reason: reason.trim()
      });

      notifications.show({
        title: 'Request Submitted',
        message: 'Your role change request has been submitted. Admin will review it soon.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setReason('');
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

          {/* Show role switcher info for users with multiple roles */}
          {hasMultipleRoles && (
            <Alert icon={<IconSwitchHorizontal size={16} />} color="green" title="Multiple Roles Active">
              <Text size="sm" mb="sm">
                You currently have access to both <strong>Client</strong> and <strong>Service Provider</strong> roles.
              </Text>
              <Text size="sm" mb="sm">
                Use the <strong>Role Switcher</strong> in the sidebar to instantly switch between your roles without logging out.
              </Text>
              <Text size="sm" mb="md">
                Your current active role: <strong>{getRoleLabel(currentRole)}</strong>
              </Text>
              <Button
                onClick={() => navigate(currentRole === 'client' ? '/client/dashboard' : '/provider/dashboard')}
                variant="light"
                color="green"
                leftSection={<IconArrowRight size={16} />}
              >
                Go to Dashboard
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
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Why do you want to add the {getRoleLabel(requestedRole)} role? *
                </Text>
                <Textarea
                  placeholder={`Please explain why you want to add ${getRoleLabel(requestedRole)} access to your account. Be specific about your reasons.`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  minRows={4}
                  maxRows={8}
                  error={error}
                  disabled={submitting}
                />
                <Text size="xs" c="dimmed" mt="xs">
                  {reason.length}/1000 characters (minimum 10 characters)
                </Text>
              </div>

              <Group justify="flex-end">
                <Button variant="default" onClick={() => navigate(-1)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={reason.length < 10}
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
