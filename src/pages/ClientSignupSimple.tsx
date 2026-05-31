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
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import * as authService from '../services/authService';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { useAuthStore } from '../store/authStore';

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null) {
    const maybe = err as {
      message?: string;
      response?: {
        data?: {
          detail?: string;
          errors?: { phone_number?: string[]; otp_code?: string[] };
          phone_number?: string[];
          phone?: string[];
          non_field_errors?: string[];
          otp_code?: string[];
        };
      };
    };

    return (
      maybe.response?.data?.detail ||
      maybe.response?.data?.errors?.phone_number?.[0] ||
      maybe.response?.data?.errors?.otp_code?.[0] ||
      maybe.response?.data?.phone_number?.[0] ||
      maybe.response?.data?.phone?.[0] ||
      maybe.response?.data?.non_field_errors?.[0] ||
      maybe.response?.data?.otp_code?.[0] ||
      maybe.message ||
      fallback
    );
  }
  return fallback;
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Enter Phone
// ─────────────────────────────────────────────────────────────────────────────

interface Step1Props {
  onPhoneSubmit: (phone: string) => void;
  loading: boolean;
  error: string | null;
}

const Step1PhoneEntry: React.FC<Step1Props> = ({ onPhoneSubmit, loading, error }) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^(\+251|0)\d{9}$/;
    if (!phoneRegex.test(phone)) {
      notifications.show({
        title: t('clientSignup.invalid_phone_title'),
        message: t('clientSignup.invalid_phone_msg'),
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
            <Title order={3}>{t('clientSignup.phone_title')}</Title>
            <Text size="sm" color="dimmed">
              {t('clientSignup.phone_sub')}
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
              label={t('clientSignup.phone_label')}
              placeholder={t('clientSignup.phone_placeholder')}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.currentTarget.value)}
              disabled={loading}
              description={t('clientSignup.phone_description')}
              leftSection={<IconPhone size={16} />}
            />

            <Group justify="flex-end">
              <Button
                type="submit"
                disabled={!phone || loading}
                loading={loading}
              >
                {loading ? t('clientSignup.sending') : t('clientSignup.send_otp')}
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
  demoOtp?: string | null;
}

const Step2OTPVerify: React.FC<Step2Props> = ({ phone, onBack, onSuccess, loading, error, demoOtp }) => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      const response = await authService.signupVerify({
        phone,
        otp_code: code,
        role: 'client',
      });

      const normalizedUser = {
        id: String(response.user.id),
        email: response.user.email ?? '',
        phone: response.user.phone_number,
        role: response.user.role,
        createdAt: new Date().toISOString(),
        verificationStatus: (response.user.verification_status as 'pending' | 'verified' | 'rejected' | 're-verification-requested') ?? 'verified',
        providerUid: response.user.provider_uid,
      };

      storage.set(STORAGE_KEYS.currentUser, normalizedUser);
      useAuthStore.setState({
        currentUser: normalizedUser,
        isAuthenticated: true,
        clientProfile: null,
        providerProfile: null,
      });

      notifications.show({
        title: t('clientSignup.success_title'),
        message: t('clientSignup.success_msg'),
        color: 'green',
      });

      onSuccess();
    } catch (err: unknown) {
      const message = getErrorMessage(err, t('clientSignup.invalid_otp_fallback'));

      notifications.show({
        title: t('clientSignup.verify_failed_title'),
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
      await authService.signupRequestOTP({ phone, role: 'client' });
      setSeconds(60);
      setOtp('');
      notifications.show({
        title: t('clientSignup.resent_title'),
        message: t('clientSignup.resent_msg', { phone }),
        color: 'blue',
      });
    } catch (err: unknown) {
      notifications.show({
        title: t('clientSignup.resend_failed_title'),
        message: getErrorMessage(err, t('clientSignup.resend_failed_fallback')),
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
            <Title order={3}>{t('clientSignup.verify_title')}</Title>
            <Text size="sm" color="dimmed">
              {t('clientSignup.verify_sub', { phone })}
            </Text>
          </Stack>
        </Group>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        {demoOtp && (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" title={t('clientSignup.demo_mode_title')}>
            {t('clientSignup.demo_mode_msg', { otp: demoOtp })}
            <br />
            <Text size="xs" mt={6}>{t('clientSignup.demo_mode_note')}</Text>
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
              <IconChevronLeft size={16} /> {t('clientSignup.back')}
            </Button>
            <Stack gap={4} align="flex-end">
              <Button
                onClick={() => handleOtpVerify(otp)}
                disabled={otp.length !== 6 || verifying || loading}
                loading={verifying}
              >
                {verifying ? t('clientSignup.verifying') : t('clientSignup.verify_btn')}
              </Button>
              {seconds > 0 ? (
                <Text size="xs" color="dimmed">
                  {t('clientSignup.resend_in', { seconds })}
                </Text>
              ) : (
                <Button variant="subtle" size="xs" onClick={handleResend}>
                  {t('clientSignup.resend_code')}
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
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const handlePhoneSubmit = async (phoneInput: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.signupRequestOTP({ phone: phoneInput, role: 'client' });

      setPhone(phoneInput);
      setStep(2);

      if (response.otp_code) {
        setDemoOtp(response.otp_code);
      }

      notifications.show({
        title: t('clientSignup.otp_sent_title'),
        message: t('clientSignup.otp_sent_msg'),
        color: 'blue',
      });
    } catch (err: unknown) {
      const message = getErrorMessage(err, t('clientSignup.failed_send_otp'));
      setError(message);
      notifications.show({
        title: t('clientSignup.error_title'),
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    notifications.show({
      title: t('clientSignup.welcome_title'),
      message: t('clientSignup.welcome_msg'),
      color: 'green',
    });
    setTimeout(() => {
      navigate('/client/dashboard');
    }, 800);
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Box ta="center">
          <Title order={2}>{t('clientSignup.page_title')}</Title>
          <Text size="sm" color="dimmed" mt={8}>
            {t('clientSignup.page_sub')}
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
            demoOtp={demoOtp}
            onBack={() => {
              setStep(1);
              setError(null);
              setDemoOtp(null);
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
