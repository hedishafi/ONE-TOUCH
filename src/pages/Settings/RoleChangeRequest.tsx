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
  Badge,
  Card,
  Loader,
  Center,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX, IconArrowRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

interface RoleChangeRequest {
  id: number;
  current_role: string;
  requested_role: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  admin_notes: string;
  rejection_message: string;
  created_at: string;
  reviewed_at: string | null;
}

export const RoleChangeRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Determine what role to request
  const currentRole = currentUser?.role || 'client';
  const requestedRole = currentRole === 'provider' ? 'client' : 'provider';

  // Check if there's a pending request
  const hasPendingRequest = requests.some(req => req.status === 'pending');
  
  // Check if there's an approved request that hasn't been acted upon yet
  // Only show if the approved role matches the CURRENT role (meaning they haven't logged in with new role yet)
  const approvedRequest = requests.find(
    req => req.status === 'approved' && req.requested_role !== currentRole
  );

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/role-change-request/');
      console.log('Loaded requests:', response.data);
      setRequests(response.data.requests || []);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
      console.error('Error response:', err.response?.data);
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
      
      console.log('Submitting role change request:', {
        requested_role: requestedRole,
        reason: reason.trim()
      });
      
      const response = await api.post('/user/role-change-request/', {
        requested_role: requestedRole,
        reason: reason.trim()
      });

      console.log('Response:', response.data);

      notifications.show({
        title: 'Request Submitted',
        message: 'Your role change request has been submitted. Admin will review it soon.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setReason('');
      loadRequests();
    } catch (err: any) {
      console.error('Error submitting role change:', err);
      console.error('Error response:', err.response?.data);
      
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to submit request';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  const getRoleLabel = (role: string) => {
    return role === 'provider' ? 'Service Provider' : 'Client';
  };

  const handleContinueAsNewRole = async () => {
    if (!approvedRequest) return;
    
    const newRole = approvedRequest.requested_role;
    
    // Different messages based on the new role
    if (newRole === 'provider') {
      notifications.show({
        title: 'Role Changed to Service Provider',
        message: 'Please log in again and complete the provider onboarding process (profile setup, identity verification, etc.)',
        color: 'green',
        icon: <IconCheck size={16} />,
        autoClose: 8000,
      });
    } else {
      notifications.show({
        title: 'Role Changed to Client',
        message: 'Please log in again to access your client dashboard.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    }
    
    // Log out and redirect to login
    await logout();
    navigate('/login');
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
          <div>
            <Title order={2}>Role Change Request</Title>
            <Text c="dimmed" size="sm" mt="xs">
              Request to change your account role. Admin will review and approve/reject your request.
            </Text>
          </div>

          {/* Current Role Info */}
          <Card withBorder padding="md" radius="md" style={{ background: '#f8f9fa' }}>
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed">Current Role</Text>
                <Text size="lg" fw={600}>{getRoleLabel(currentRole)}</Text>
              </div>
              <IconArrowRight size={24} color="#868e96" />
              <div>
                <Text size="sm" c="dimmed">Requested Role</Text>
                <Text size="lg" fw={600} c="blue">{getRoleLabel(requestedRole)}</Text>
              </div>
            </Group>
          </Card>

          {/* Show pending request alert */}
          {hasPendingRequest && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Pending Request">
              You already have a pending role change request. Please wait for admin review.
            </Alert>
          )}
          
          {/* Show approved request alert with action button */}
          {approvedRequest && (
            <Alert icon={<IconCheck size={16} />} color="green" title="Request Approved!">
              <Text size="sm" mb="md">
                Your role change request has been approved! You are now registered as a{' '}
                <strong>{getRoleLabel(approvedRequest.requested_role)}</strong>.
              </Text>
              {approvedRequest.requested_role === 'provider' ? (
                <>
                  <Text size="sm" mb="md">
                    Click the button below to log out and log back in. You will then need to complete the provider onboarding process:
                  </Text>
                  <Text size="sm" mb="md" component="ul" style={{ paddingLeft: 20 }}>
                    <li>Profile Setup (bio, services, pricing)</li>
                    <li>Identity Verification (ID upload, selfie)</li>
                    <li>Service Selection</li>
                  </Text>
                </>
              ) : (
                <Text size="sm" mb="md">
                  Click the button below to log out and log back in with your new client role.
                </Text>
              )}
              <Button
                onClick={handleContinueAsNewRole}
                color="green"
                leftSection={<IconArrowRight size={16} />}
              >
                {approvedRequest.requested_role === 'provider' 
                  ? 'Sign Up as Service Provider' 
                  : 'Continue as Client'}
              </Button>
            </Alert>
          )}

          {/* Request Form */}
          {!hasPendingRequest && (
            <>
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Why do you want to change your role? *
                </Text>
                <Textarea
                  placeholder="Please explain why you want to change from a service provider to a client (or vice versa). Be specific about your reasons."
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

          {/* Previous Requests */}
          {requests.length > 0 && (
            <div>
              <Title order={4} mb="md">Request History</Title>
              <Stack gap="md">
                {requests.map((request) => (
                  <Card key={request.id} withBorder padding="md" radius="md">
                    <Group justify="space-between" mb="sm">
                      <div>
                        <Text size="sm" c="dimmed">
                          {getRoleLabel(request.current_role)} → {getRoleLabel(request.requested_role)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Submitted: {new Date(request.created_at).toLocaleDateString()}
                        </Text>
                      </div>
                      <Badge color={getStatusColor(request.status)} size="lg">
                        {request.status.toUpperCase()}
                      </Badge>
                    </Group>

                    <Text size="sm" mb="xs" fw={500}>Reason:</Text>
                    <Text size="sm" c="dimmed" mb="sm">{request.reason}</Text>

                    {request.status === 'rejected' && request.rejection_message && (
                      <Alert icon={<IconX size={16} />} color="red" title="Rejection Reason" mb="sm">
                        <Text size="sm">{request.rejection_message}</Text>
                      </Alert>
                    )}

                    {request.status === 'approved' && (
                      <Alert icon={<IconCheck size={16} />} color="green" mb="sm">
                        <Text size="sm">
                          Your request was approved. You are now a {getRoleLabel(request.requested_role)}.
                        </Text>
                      </Alert>
                    )}

                    {request.admin_notes && (
                      <>
                        <Text size="sm" mb="xs" fw={500} c="blue">Admin Notes:</Text>
                        <Text size="sm" c="dimmed">{request.admin_notes}</Text>
                      </>
                    )}

                    {request.reviewed_at && (
                      <Text size="xs" c="dimmed" mt="sm">
                        Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}
                      </Text>
                    )}
                  </Card>
                ))}
              </Stack>
            </div>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};
