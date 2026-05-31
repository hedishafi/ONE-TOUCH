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
import { useTranslation } from 'react-i18next';
import * as authService from '../services/authService';

const PHONE_REGEX = /^(\+251|0)\d{9}$/;

export default function ProviderSignupSimple() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      setError(t('providerSignupSimple.err_invalid_phone'));
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
      notifications.show({ title: t('providerSignupSimple.otp_sent_title'), message: t('providerSignupSimple.otp_sent_msg'), color: 'green' });
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.errors?.phone_number?.[0] ||
        err?.response?.data?.phone_number?.[0] ||
        err?.response?.data?.non_field_errors?.[0] ||
        t('providerSignupSimple.err_send_otp');
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
      notifications.show({ title: t('providerSignupSimple.verify_success_title'), message: t('providerSignupSimple.verify_success_msg'), color: 'green' });
      navigate('/provider/profile-setup');
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.detail ||
        err?.response?.data?.errors?.otp_code?.[0] ||
        err?.response?.data?.otp_code?.[0] ||
        t('providerSignupSimple.err_verify_otp');
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
      notifications.show({ title: t('providerSignupSimple.resent_title'), message: t('providerSignupSimple.resent_msg'), color: 'blue' });
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.detail || t('providerSignupSimple.err_resend'));
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
                  <Title order={3}>{t('providerSignupSimple.title')}</Title>
                  <Text size="sm" c="dimmed">{t('providerSignupSimple.subtitle')}</Text>
                </Stack>
              </Group>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
              )}

              {phoneRegistered && (
                <Button variant="light" onClick={() => navigate('/login')}>
                  {t('providerSignupSimple.go_to_login')}
                </Button>
              )}

              <TextInput
                label={t('providerSignupSimple.phone_label')}
                placeholder={t('providerSignupSimple.phone_placeholder')}
                value={phone}
                onChange={(event) => setPhone(event.currentTarget.value)}
                leftSection={<IconPhone size={16} />}
                disabled={loading}
              />

              <Group justify="flex-end">
                <Button onClick={handleRequestOtp} disabled={!phone || loading} loading={loading}>
                  {loading ? t('providerSignupSimple.sending') : t('providerSignupSimple.send_otp')}
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
                  <Title order={3}>{t('providerSignupSimple.verify_title')}</Title>
                  <Text size="sm" c="dimmed">{t('providerSignupSimple.verify_sub', { phone })}</Text>
                </Stack>
              </Group>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
              )}

              {demoOtp && (
                <Alert icon={<IconAlertCircle size={16} />} color="blue" title={t('providerSignupSimple.demo_title')}>
                  {t('providerSignupSimple.demo_otp_label')} <strong>{demoOtp}</strong>
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
                  {t('providerSignupSimple.back')}
                </Button>

                <Stack gap={4} align="flex-end">
                  <Button
                    onClick={() => handleVerifyOtp()}
                    disabled={otp.length !== 6 || loading || verifying}
                    loading={verifying}
                  >
                    {verifying ? t('providerSignupSimple.verifying') : t('providerSignupSimple.verify')}
                  </Button>
                  {seconds > 0 ? (
                    <Text size="xs" c="dimmed">{t('providerSignupSimple.resend_in', { seconds })}</Text>
                  ) : (
                    <Button variant="subtle" size="xs" onClick={handleResendOtp} disabled={loading || verifying}>
                      {t('providerSignupSimple.resend_code')}
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
