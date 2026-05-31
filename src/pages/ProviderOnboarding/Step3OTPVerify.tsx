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
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import * as providerService from '../../services/providerOnboardingService';

interface LocationState {
  sessionId: string;
  phone: string;
}

export const ProviderOnboardingStep3OTPVerify: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const state = (location.state as LocationState) || {};

  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sessionId = state.sessionId || '';
  const phone = state.phone || '';

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
        <Alert icon={<IconAlertCircle size={16} />} color="red" title={t('providerOnboarding.session_error_title')}>
          {t('providerOnboarding.session_error_msg')}
        </Alert>
        <Button mt="xl" onClick={() => navigate('/provider/onboarding/step1')}>
          {t('providerOnboarding.start_over')}
        </Button>
      </Container>
    );
  }

  const handleOtpVerify = async () => {
    if (!otp || otp.length !== 6) {
      setError(t('providerOnboarding.err_invalid_otp'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await providerService.providerOTPVerify({
        session_id: sessionId,
        otp_code: otp,
      });

      notifications.show({
        title: t('providerOnboarding.verify_success_title'),
        message: t('providerOnboarding.verify_success_msg'),
        color: 'green',
      });

      setTimeout(() => {
        navigate('/provider/onboarding/step4', { state: { sessionId } });
      }, 800);
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { detail?: string; error?: string } } };
      const message =
        maybe.response?.data?.detail ||
        maybe.response?.data?.error ||
        t('providerOnboarding.err_verify_fallback');
      setError(message);
      notifications.show({
        title: t('providerOnboarding.verify_error_title'),
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
      await providerService.providerOTPRequest({ session_id: sessionId, phone });
      setSeconds(60);
      setOtp('');
      notifications.show({
        title: t('providerOnboarding.resent_title'),
        message: t('providerOnboarding.resent_msg', { phone }),
        color: 'blue',
      });
    } catch (err: unknown) {
      const maybe = err as { response?: { data?: { detail?: string } } };
      notifications.show({
        title: t('providerOnboarding.resend_failed_title'),
        message: maybe.response?.data?.detail || t('providerOnboarding.resend_failed_fallback'),
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
              <Title order={3}>{t('providerOnboarding.step3_title')}</Title>
              <Text size="sm" color="dimmed">
                {t('providerOnboarding.step3_sub', { phone })}
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
              label={t('providerOnboarding.otp_label')}
              placeholder={t('providerOnboarding.otp_placeholder')}
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
              {t('providerOnboarding.otp_hint')}
            </Text>

            <Group justify="space-between">
              <Button
                variant="default"
                onClick={() => navigate('/provider/onboarding/phone-choice')}
                disabled={loading}
              >
                <IconChevronLeft size={16} /> {t('providerOnboarding.back_btn')}
              </Button>
              <Stack gap={4} align="flex-end">
                <Button
                  onClick={handleOtpVerify}
                  disabled={otp.length !== 6 || loading}
                  loading={loading}
                >
                  {loading ? t('providerOnboarding.verifying') : t('providerOnboarding.verify_btn')}
                </Button>
                {seconds > 0 ? (
                  <Text size="xs" color="dimmed">
                    {t('providerOnboarding.resend_in', { seconds })}
                  </Text>
                ) : (
                  <Button variant="subtle" size="xs" onClick={handleResend}>
                    {t('providerOnboarding.resend_code')}
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
