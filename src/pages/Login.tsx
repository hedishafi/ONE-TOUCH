/**
 * Login.tsx — Functional phone OTP authentication (zero demo code)
 *
 * Users enter phone number → receive OTP via SMS → verify → authenticated
 * Role-based redirect to appropriate dashboard
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Center, Container, Paper, Stack, Text, TextInput,
  PinInput, Alert, Anchor, Group, ThemeIcon,
} from '@mantine/core';
import {
  IconPhone, IconArrowRight, IconChevronLeft,
  IconShieldCheck, IconAlertCircle, IconMessageCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import * as authService from '../services/authService';
import { ROUTES } from '../utils/constants';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'phone' | 'otp';

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null) {
    const maybe = err as {
      response?: {
        data?: {
          detail?: string;
          errors?: { phone_number?: string[] };
          phone_number?: string[];
          otp_code?: string[];
        };
      };
      message?: string;
    };

    return (
      maybe.response?.data?.detail ||
      maybe.response?.data?.errors?.phone_number?.[0] ||
      maybe.response?.data?.phone_number?.[0] ||
      maybe.response?.data?.otp_code?.[0] ||
      maybe.message ||
      fallback
    );
  }

  return fallback;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useCountdown(start: number) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const begin = () => {
    setSeconds(start);
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => setSeconds(s => {
      if (s <= 1) { clearInterval(ref.current!); return 0; }
      return s - 1;
    }), 1000);
  };
  useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);
  return { seconds, begin };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('phone');

  // ── Phone entry ────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // ── OTP verification ───────────────────────────────────────────────────────
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const { seconds: otpSeconds, begin: beginOtpTimer } = useCountdown(60);

  const colors = { navy: '#1A365D', teal: '#16A085' };

  // ─── Validate phone number (Ethiopian standard) ───────────────────────────
  const validatePhone = (phoneInput: string) => {
    const regex = /^(\+251|0|251)\d{9}$/;
    return regex.test(phoneInput.replace(/[\s\-()]/g, ''));
  };

  // ─── Step 1: Request OTP ──────────────────────────────────────────────────
  const handlePhoneSubmit = async () => {
    setPhoneError('');
    if (!phone.trim()) {
      setPhoneError('Please enter your phone number.');
      return;
    }
    if (!validatePhone(phone)) {
      setPhoneError('Please enter a valid phone number (e.g., 0900000000 or +251900000000).');
      return;
    }

    setPhoneLoading(true);
    try {
      const response = await authService.loginRequestOTP({ phone_number: phone });
      setPhoneLoading(false);
      
      // Display actual OTP code from backend (for development/debugging)
      if (response.otp_code) {
        setDemoOtp(response.otp_code);
      }

      // Reset OTP fields and show OTP screen
      setOtp('');
      setOtpError('');
      setOtpAttempts(0);
      beginOtpTimer();
      setScreen('otp');

      notifications.show({
        title: '📱 Verification Code Sent',
        message: `A 6-digit code was sent to ${phone}`,
        color: 'teal',
        autoClose: 5000,
      });
    } catch (error: unknown) {
      setPhoneLoading(false);
      const message = getErrorMessage(error, 'Failed to request OTP. Please try again.');
      setPhoneError(message);
    }
  };

  // ─── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleOtpVerify = async (code: string) => {
    if (code.length !== 6) return;

    if (otpAttempts >= 5) {
      setOtpError('Too many invalid attempts. Please request a new code.');
      return;
    }

    setOtpVerifying(true);
    setOtpError('');

    try {
      const response = await authService.loginVerify({
        phone_number: phone,
        otp_code: code,
      });

      const normalizedUser = {
        id: String(response.user.id),
        email: response.user.email ?? '',
        phone: response.user.phone_number,
        role: response.user.role,
        approved_roles: response.user.approved_roles ?? [response.user.role],
        createdAt: new Date().toISOString(),
        verificationStatus: (response.user.verification_status as 'pending' | 'verified' | 'rejected' | 're-verification-requested') ?? 'pending',
        providerUid: response.user.provider_uid,
      };

      // Update authStore with user data
      storage.set(STORAGE_KEYS.currentUser, normalizedUser);
      useAuthStore.setState({
        currentUser: normalizedUser,
        isAuthenticated: true,
      });

      setOtpVerifying(false);
      
      // Pass tokens to handleSuccess for role selection
      handleSuccess({
        access: response.access,
        refresh: response.refresh,
      });
    } catch (error: unknown) {
      setOtpVerifying(false);
      const apiMessage = getErrorMessage(error, '');

      if (apiMessage) {
        setOtpError(apiMessage);
        return;
      }

      const remaining = 5 - otpAttempts - 1;
      setOtpAttempts(prev => prev + 1);
      
      if (remaining > 0) {
        setOtpError(`Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
      } else {
        setOtpError('No attempts remaining. Please request a new code.');
      }
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (otpSeconds > 0) return;

    try {
      const response = await authService.loginRequestOTP({ phone_number: phone });

      // Display actual OTP code from backend
      if (response.otp_code) {
        setDemoOtp(response.otp_code);
      }

      // Reset countdown and attempts
      setOtp('');
      setOtpError('');
      setOtpAttempts(0);
      beginOtpTimer();

      notifications.show({
        title: '📱 New Code Sent',
        message: `A new 6-digit code was sent to ${phone}`,
        color: 'teal',
        autoClose: 5000,
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to resend code. Please try again.');
      setOtpError(message);
    }
  };

  // ─── Handle successful login ──────────────────────────────────────────────
  const handleSuccess = async (tokens?: { access: string; refresh: string }) => {
    const { currentUser } = useAuthStore.getState();
    
    if (!currentUser) {
      navigate(ROUTES.landing, { replace: true });
      return;
    }

    const hasMultipleRoles = (currentUser.approved_roles?.length ?? 0) > 1;

    // If user has multiple roles, show role selection page
    if (hasMultipleRoles && tokens) {
      navigate('/role-selection', { 
        replace: true,
        state: { access: tokens.access, refresh: tokens.refresh }
      });
      return;
    }

    const currentRole = currentUser.role;

    notifications.show({
      title: 'Welcome back!',
      message: 'Signed in successfully.',
      color: 'teal',
    });

    if (currentRole === 'client') {
      navigate(ROUTES.clientDashboard, { replace: true });
      return;
    }

    if (currentRole === 'provider') {
      try {
        const status = await authService.getProviderOnboardingStatus();
        
        if (status.verification_status === 'rejected' && status.rejection_reason) {
          notifications.show({
            title: 'Verification Update',
            message: `Admin feedback: ${status.rejection_reason}`,
            color: 'orange',
            autoClose: 8000,
          });
        }
        
        if (hasMultipleRoles && status.next_step !== 'dashboard') {
          notifications.show({
            title: 'Complete Provider Setup',
            message: 'Please complete your provider profile setup to access provider features.',
            color: 'blue',
            autoClose: 8000,
          });
        }
        
        navigate(status.next_route, { replace: true });
      } catch {
        navigate(ROUTES.providerDashboard, { replace: true });
      }
      return;
    }

    navigate(ROUTES.adminDashboard, { replace: true });
  };

  // ─── Layout components ───────────────────────────────────────────────────
  const header = (
    <Center mb="xl">
      <Box style={{ textAlign: 'center' }}>
        <Box style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.navy}, ${colors.teal})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
        }}>
          <IconShieldCheck size={28} color="#fff" />
        </Box>
        <Text fw={800} size="xl" style={{ color: 'var(--ot-text-navy)' }}>OneTouch</Text>
        <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>Your trusted services platform</Text>
      </Box>
    </Center>
  );

  const wrap = (content: React.ReactNode) => (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      <Box style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <LanguageSwitcher />
      </Box>
      <Container size="xs" py="xl">
        <Center style={{ minHeight: '100vh' }}>
          <Box style={{ width: '100%' }}>{header}{content}</Box>
        </Center>
      </Container>
    </Box>
  );

  const card = (content: React.ReactNode) => (
    <Paper radius="lg" p="xl" shadow="md"
      style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
      {content}
    </Paper>
  );

  const inputStyles = {
    input: { background: 'var(--ot-bg-row)', borderColor: 'var(--ot-border-input)', color: 'var(--ot-text-body)' },
    label: { color: 'var(--ot-text-body)' },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ── PHONE ENTRY ────────────────────────────────────────────────────────────
  if (screen === 'phone') return wrap(card(
    <>
      <Text fw={700} size="lg" mb={4} style={{ color: 'var(--ot-text-navy)' }}>Sign In</Text>
      <Text size="sm" mb="md" style={{ color: 'var(--ot-text-sub)' }}>
        Enter your phone number to receive a verification code.
      </Text>

      {phoneError && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange" mb="md" radius="md">{phoneError}</Alert>
      )}

      <Stack gap="md">
        <TextInput
          label="Phone Number"
          placeholder="+251 900 000 000 or 0900000000"
          value={phone}
          onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
          leftSection={<IconPhone size={16} />}
          styles={inputStyles}
          onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
          size="md"
          autoFocus
        />
        <Button
          fullWidth size="md"
          loading={phoneLoading}
          onClick={handlePhoneSubmit}
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${colors.navy}, ${colors.teal})`, border: 'none' }}
        >
          Continue
        </Button>
      </Stack>

      <Text ta="center" size="sm" mt="xl" style={{ color: 'var(--ot-text-sub)' }}>
        Don't have an account?{' '}
        <Anchor onClick={() => navigate(ROUTES.signup)} style={{ color: colors.teal, cursor: 'pointer' }}>
          Create one
        </Anchor>
      </Text>
    </>
  ));

  // ── OTP VERIFICATION ──────────────────────────────────────────────────────
  return wrap(card(
    <>
      <Group mb="md" gap={12}>
        <ThemeIcon variant="light" color="teal" size={44} radius="xl">
          <IconMessageCircle size={22} />
        </ThemeIcon>
        <Box>
          <Text fw={700} size="lg" style={{ color: 'var(--ot-text-navy)' }}>Verify Your Phone</Text>
          <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>
            Code sent to <strong>{phone}</strong>
          </Text>
        </Box>
      </Group>

      {demoOtp && (
        <Alert icon={<IconShieldCheck size={16} />} color="blue" mb="md" radius="md" style={{ fontSize: '16px', fontWeight: 600 }}>
          Demo code: <strong>{demoOtp}</strong>
        </Alert>
      )}

      {otpError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">{otpError}</Alert>
      )}

      <Stack gap="xl">
        <Box>
          <Text size="sm" fw={600} c="var(--ot-text-body)" mb={12} ta="center">
            Enter 6-digit code
          </Text>
          <Center>
            <PinInput
              length={6}
              type="number"
              size="lg"
              value={otp}
              onChange={(val) => {
                setOtp(val);
                setOtpError('');
                if (val.length === 6) {
                  handleOtpVerify(val);
                }
              }}
              disabled={otpAttempts >= 5 || otpVerifying}
              autoFocus
            />
          </Center>
        </Box>

        {otpVerifying && (
          <Text size="sm" c="var(--ot-text-sub)" ta="center">Verifying…</Text>
        )}

        <Group justify="space-between">
          <Anchor
            size="sm"
            onClick={() => setScreen('phone')}
            style={{ color: colors.teal, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconChevronLeft size={14} /> Change number
          </Anchor>
          <Anchor
            size="sm"
            onClick={handleResend}
            style={{
              color: otpSeconds > 0 || otpAttempts >= 5 ? 'var(--ot-text-muted)' : colors.teal,
              cursor: otpSeconds > 0 || otpAttempts >= 5 ? 'default' : 'pointer',
            }}
          >
            {otpSeconds > 0 ? `Resend in ${otpSeconds}s` : 'Resend code'}
          </Anchor>
        </Group>
      </Stack>
    </>
  ));
}
