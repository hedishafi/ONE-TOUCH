/**
 * ClientSignupSimple.tsx
 * 
 * Simplified client onboarding:
 * Step 1: Enter phone number
 * Step 2: Verify OTP → Account created → Dashboard
 * 
 * No profile setup, no identity verification, no biometrics.
 */

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
  PinInput,
  Alert,
  Center,
  Box,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconPhone,
  IconMessageCircle,
  IconChevronLeft,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import * as authService from '../services/authService';

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Enter Phone
// ─────────────────────────────────────────────────────────────────────────────

interface Step1Props {
  onPhoneSubmit: (phone: string) => void;
  loading: boolean;
  error: string | null;
}

const Step1PhoneEntry: React.FC<Step1Props> = ({ onPhoneSubmit, loading, error }) => {
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone format: +251XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+251|0)\d{9}$/;
    if (!phoneRegex.test(phone)) {
      notifications.show({
        title: 'Invalid Phone',
        message: 'Please enter a valid Ethiopian phone number (+251911223344 or 0911223344)',
        color: 'red',
      });
      return;
    }

    onPhoneSubmit(phone);
  };

  return (
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
            <IconPhone size={24} color="#008080" />
          </Box>
          <Stack gap={2}>
            <Title order={3}>Enter Your Phone Number</Title>
            <Text size="sm" color="dimmed">
              We'll send you a one-time code to verify your phone
            </Text>
          </Stack>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            <TextInput
              label="Phone Number"
              placeholder="+251911223344 or 0911223344"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.currentTarget.value)}
              disabled={loading}
              description="Ethiopian phone numbers only"
              leftSection={<IconPhone size={16} />}
            />

            <Group justify="flex-end">
              <Button
                type="submit"
                disabled={!phone || loading}
                loading={loading}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Verify OTP
// ─────────────────────────────────────────────────────────────────────────────

interface Step2Props {
  phone: string;
  onBack: () => void;
  onSuccess: () => void;
  loading: boolean;
  error: string | null;
}

const Step2OTPVerify: React.FC<Step2Props> = ({ phone, onBack, onSuccess, loading, error }) => {
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleOtpVerify = async (code: string) => {
    if (code.length !== 6) return;

    try {
      setVerifying(true);

      // Verify OTP with backend
      await authService.signupVerify({
        phone,
        otp_code: code,
      });

      notifications.show({
        title: 'Success',
        message: 'Welcome! Your account has been created.',
        color: 'green',
      });

      onSuccess();
    } catch (err: any) {
      const message =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.otp_code?.[0] ||
        err.response?.data?.detail ||
        'Invalid OTP. Please try again.';

      notifications.show({
        title: 'Verification Failed',
        message,
        color: 'red',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (seconds > 0) return;

    try {
      await authService.signupRequestOTP({ phone });
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
          <Center py="lg">
            <PinInput
              length={6}
              type="number"
              oneTimeCode
              value={otp}
              onChange={setOtp}
              onComplete={handleOtpVerify}
              disabled={verifying || loading}
            />
          </Center>

          <Group justify="space-between">
            <Button variant="default" onClick={onBack} disabled={verifying || loading}>
              <IconChevronLeft size={16} /> Back
            </Button>
            <Stack gap={4} align="flex-end">
              <Button
                onClick={() => handleOtpVerify(otp)}
                disabled={otp.length !== 6 || verifying || loading}
                loading={verifying}
              >
                {verifying ? 'Verifying...' : 'Verify'}
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
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const ClientSignupSimple: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneSubmit = async (phoneInput: string) => {
    try {
      setLoading(true);
      setError(null);

      // Request OTP from backend
      await authService.signupRequestOTP({ phone: phoneInput });

      setPhone(phoneInput);
      setStep(2);

      notifications.show({
        title: 'OTP Sent',
        message: `Check your phone for the code`,
        color: 'blue',
      });
    } catch (err: any) {
      const message =
        err.response?.data?.phone_number?.[0] ||
        err.response?.data?.phone?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to send OTP. Please try again.';
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

  const handleSuccess = () => {
    notifications.show({
      title: 'Welcome to OneTouch',
      message: 'Redirecting to your dashboard...',
      color: 'green',
    });
    // Redirect to client dashboard
    setTimeout(() => {
      navigate('/client/dashboard');
    }, 800);
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={2}>
            Client Sign Up
          </Title>
          <Text size="sm" color="dimmed" mt={8}>
            Simple, secure, and fast
          </Text>
        </Box>

        {step === 1 && (
          <Step1PhoneEntry
            onPhoneSubmit={handlePhoneSubmit}
            loading={loading}
            error={error}
          />
        )}

        {step === 2 && (
          <Step2OTPVerify
            phone={phone}
            onBack={() => {
              setStep(1);
              setError(null);
            }}
            onSuccess={handleSuccess}
            loading={loading}
            error={error}
          />
        )}
      </Stack>
    </Container>
  );
};

export default ClientSignupSimple;
