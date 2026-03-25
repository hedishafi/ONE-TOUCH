import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  Alert,
  Box,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconMessageCircle,
  IconChevronLeft,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import * as providerService from '../../services/providerOnboardingService';

interface LocationState {
  sessionId: string;
  phone: string;
}

export const ProviderOnboardingStep3OTPVerify: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) || {};

  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessionId = state.sessionId || '';
  const phone = state.phone || '';

  // Start OTP timer
  useEffect(() => {
    setSeconds(60);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!sessionId || !phone) {
    return (
      <Container size="md" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Session Error">
          Invalid session. Please start the onboarding process again.
        </Alert>
        <Button mt="xl" onClick={() => navigate('/provider/onboarding/step1')}>
          Start Over
        </Button>
      </Container>
    );
  }

  const handleOtpVerify = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verify OTP with backend
      await providerService.providerOTPVerify({
        session_id: sessionId,
        otp_code: otp,
      });

      notifications.show({
        title: 'Success',
        message: 'Phone number verified!',
        color: 'green',
      });

      // Move to step 4 (biometrics)
      setTimeout(() => {
        navigate('/provider/onboarding/step4', {
          state: { sessionId },
        });
      }, 800);
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Failed to verify OTP';
      setError(message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;

    try {
      await providerService.providerOTPRequest({
        session_id: sessionId,
        phone: phone,
      });
      setSeconds(60);
      setOtp('');
      notifications.show({
        title: 'Code Resent',
        message: `New OTP sent to ${phone}`,
        color: 'blue',
      });
    } catch (err: any) {
      notifications.show({
        title: 'Resend Failed',
        message: err.response?.data?.detail || 'Could not resend OTP',
        color: 'red',
      });
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group gap={12} align="flex-start">
            <Box
              w={44}
              h={44}
              style={{
                borderRadius: 12,
                background: 'rgba(0, 128, 128, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconMessageCircle size={24} color="#008080" />
            </Box>
            <Stack gap={2}>
              <Title order={3}>Verify Your Phone</Title>
              <Text size="sm" color="dimmed">
                Enter the 6-digit code we sent to {phone}
              </Text>
            </Stack>
          </Group>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}

          <Stack gap="lg">
            <TextInput
              label="Enter OTP Code"
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                const value = e.currentTarget.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
              }}
              maxLength={6}
              size="lg"
              disabled={loading}
            />
            <Text color="dimmed" size="sm">
              Enter the 6-digit code sent to your phone
            </Text>

            <Group justify="space-between">
              <Button
                variant="default"
                onClick={() => navigate('/provider/onboarding/phone-choice')}
                disabled={loading}
              >
                <IconChevronLeft size={16} /> Back
              </Button>
              <Stack gap={4} align="flex-end">
                <Button
                  onClick={handleOtpVerify}
                  disabled={otp.length !== 6 || loading}
                  loading={loading}
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </Button>
                {seconds > 0 ? (
                  <Text size="xs" color="dimmed">
                    Resend in {seconds}s
                  </Text>
                ) : (
                  <Button variant="subtle" size="xs" onClick={handleResend}>
                    Resend Code
                  </Button>
                )}
              </Stack>
            </Group>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default ProviderOnboardingStep3OTPVerify;
