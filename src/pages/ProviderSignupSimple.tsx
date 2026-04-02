import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Center,
  Container,
  Group,
  Paper,
  PinInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconChevronLeft, IconMessageCircle, IconPhone } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';

const PHONE_REGEX = /^(\+251|0)\d{9}$/;

export default function ProviderSignupSimple() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [phoneRegistered, setPhoneRegistered] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setSeconds(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async () => {
    if (!PHONE_REGEX.test(phone.trim())) {
      setError('Please enter a valid Ethiopian phone number (+251911223344 or 0911223344).');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPhoneRegistered(false);
      const response = await authService.signupRequestOTP({ phone, role: 'provider' });
      setDemoOtp(response.otp_code ?? null);
      setStep(2);
      startTimer();
      notifications.show({ title: 'OTP sent', message: 'Verification code sent successfully.', color: 'green' });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.errors?.phone_number?.[0] ||
        err?.response?.data?.phone_number?.[0] ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Failed to send OTP. Please try again.';
      setError(message);
      setPhoneRegistered(message.toLowerCase().includes('already registered'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const finalCode = (code ?? otp).trim();
    if (finalCode.length !== 6) return;

    try {
      setVerifying(true);
      setError(null);
      await authService.signupVerify({
        phone,
        otp_code: finalCode,
        role: 'provider',
      });
      notifications.show({ title: 'Success', message: 'Phone verified successfully.', color: 'green' });
      navigate('/provider/profile-setup');
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.errors?.otp_code?.[0] ||
        err?.response?.data?.otp_code?.[0] ||
        'Failed to verify OTP. Please try again.';
      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (seconds > 0) return;
    try {
      setLoading(true);
      setError(null);
      const response = await authService.signupResendOTP({ phone, role: 'provider' });
      setDemoOtp(response.otp_code ?? null);
      setOtp('');
      startTimer();
      notifications.show({ title: 'Code resent', message: 'A new OTP has been sent.', color: 'blue' });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          {step === 1 ? (
            <>
              <Group gap={12} align="flex-start">
                <Box w={44} h={44} style={{ borderRadius: 12, background: 'rgba(0, 128, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPhone size={24} color="#008080" />
                </Box>
                <Stack gap={2}>
                  <Title order={3}>Service Provider Signup</Title>
                  <Text size="sm" c="dimmed">Enter your phone number to receive verification code.</Text>
                </Stack>
              </Group>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
              )}

              {phoneRegistered && (
                <Button variant="light" onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              )}

              <TextInput
                label="Phone Number"
                placeholder="+251911223344 or 0911223344"
                value={phone}
                onChange={(event) => setPhone(event.currentTarget.value)}
                leftSection={<IconPhone size={16} />}
                disabled={loading}
              />

              <Group justify="flex-end">
                <Button onClick={handleRequestOtp} disabled={!phone || loading} loading={loading}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </Button>
              </Group>
            </>
          ) : (
            <>
              <Group gap={12} align="flex-start">
                <Box w={44} h={44} style={{ borderRadius: 12, background: 'rgba(0, 128, 128, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconMessageCircle size={24} color="#008080" />
                </Box>
                <Stack gap={2}>
                  <Title order={3}>Verify OTP</Title>
                  <Text size="sm" c="dimmed">Enter the 6-digit code sent to {phone}</Text>
                </Stack>
              </Group>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
              )}

              {demoOtp && (
                <Alert icon={<IconAlertCircle size={16} />} color="blue" title="Demo mode">
                  OTP code: <strong>{demoOtp}</strong>
                </Alert>
              )}

              <Center py="md">
                <PinInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={handleVerifyOtp}
                  type="number"
                  oneTimeCode
                  disabled={loading || verifying}
                />
              </Center>

              <Group justify="space-between">
                <Button
                  variant="default"
                  leftSection={<IconChevronLeft size={16} />}
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setError(null);
                  }}
                  disabled={loading || verifying}
                >
                  Back
                </Button>

                <Stack gap={4} align="flex-end">
                  <Button
                    onClick={() => handleVerifyOtp()}
                    disabled={otp.length !== 6 || loading || verifying}
                    loading={verifying}
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </Button>
                  {seconds > 0 ? (
                    <Text size="xs" c="dimmed">Resend in {seconds}s</Text>
                  ) : (
                    <Button variant="subtle" size="xs" onClick={handleResendOtp} disabled={loading || verifying}>
                      Resend code
                    </Button>
                  )}
                </Stack>
              </Group>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
