/**
 * Login.tsx — Role-aware authentication
 *
 * All users:       enter phone number → role detected automatically
 * Clients:         phone → OTP → dashboard  (passwordless, frictionless)
 * Providers/Admin: phone → password → dashboard  (+ forgot-password via OTP reset)
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Center, Container, Paper, Stack, Text, TextInput,
  PasswordInput, PinInput, Progress, Alert, Anchor, Group, ThemeIcon, Badge,
} from '@mantine/core';
import {
  IconPhone, IconLock, IconArrowRight, IconChevronLeft,
  IconShieldCheck, IconAlertCircle, IconKey, IconDeviceMobile,
  IconMessageCircle, IconUser,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES, MOCK_OTP } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = 'phone' | 'client-otp' | 'password' | 'forgot-phone' | 'forgot-otp';

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

function getStrength(pw: string) {
  if (!pw) return { value: 0, label: '', color: 'gray' };
  if (pw.length < 6) return { value: 20, label: 'Too short', color: 'red' };
  if (pw.length < 8) return { value: 50, label: 'Weak', color: 'orange' };
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { value: 100, label: 'Strong', color: 'teal' };
  return { value: 75, label: 'Fair', color: 'yellow' };
}

const normPhone = (p: string) => p.replace(/[\s\-()]/g, '');

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { loginByPhone, loginByPhoneOTP, lookupPhoneRole, resetPassword } = useAuthStore();
  const navy = COLORS.navyBlue;
  const teal = COLORS.tealBlue;

  const [screen, setScreen]           = useState<Screen>('phone');
  const [detectedRole, setDetectedRole] = useState<'client' | 'provider' | 'admin' | null>(null);

  // ── Phone entry ────────────────────────────────────────────────────────────
  const [phone, setPhone]             = useState('');
  const [phoneError, setPhoneError]   = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // ── Client OTP ─────────────────────────────────────────────────────────────
  const [clientOtp, setClientOtp]         = useState('');
  const [clientOtpError, setClientOtpError] = useState('');
  const [clientAttempts, setClientAttempts] = useState(0);
  const [otpVerifying, setOtpVerifying]   = useState(false);
  const { seconds: otpSeconds, begin: beginOtp } = useCountdown(60);

  // ── Password (provider / admin) ────────────────────────────────────────────
  const [password, setPassword]         = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── Forgot-password ────────────────────────────────────────────────────────
  const [forgotPhone, setForgotPhone]     = useState('');
  const [forgotPhoneError, setForgotPhoneError] = useState('');
  const [sendingCode, setSendingCode]     = useState(false);
  const [resetOtp, setResetOtp]           = useState('');
  const [resetOtpError, setResetOtpError] = useState('');
  const [newPw, setNewPw]                 = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [resetError, setResetError]       = useState('');
  const [resetting, setResetting]         = useState(false);
  const { seconds: resetSeconds, begin: beginReset } = useCountdown(60);
  const strength = getStrength(newPw);

  // ── Shared helpers ─────────────────────────────────────────────────────────
  const goAfterLogin = () => {
    const { currentUser } = useAuthStore.getState();
    notifications.show({ title: 'Welcome back!', message: 'Signed in successfully.', color: 'teal' });
    if (currentUser?.role === 'client')   navigate(ROUTES.clientDashboard, { replace: true });
    else if (currentUser?.role === 'provider') navigate(ROUTES.providerDashboard, { replace: true });
    else navigate(ROUTES.adminDashboard, { replace: true });
  };

  // ── Screen: phone → continue ───────────────────────────────────────────────
  function handleContinue() {
    setPhoneError('');
    if (!phone.trim()) { setPhoneError('Please enter your phone number.'); return; }
    setPhoneLoading(true);
    setTimeout(() => {
      const role = lookupPhoneRole(normPhone(phone));
      setPhoneLoading(false);
      if (!role) { setPhoneError('No account found with this phone number. Try +1-555-0101 (client) or +1-555-0201 (provider).'); return; }
      setDetectedRole(role);
      if (role === 'client') {
        setClientOtp('');
        setClientOtpError('');
        setClientAttempts(0);
        beginOtp();
        // Simulate SMS being sent — show demo OTP clearly
        notifications.show({
          title: '📱 Verification Code Sent',
          message: `A 6-digit code was sent to ${phone}.\n\n🔑 Demo code: ${MOCK_OTP}`,
          color: 'teal',
          autoClose: 12000,
        });
        setScreen('client-otp');
      } else {
        setPassword('');
        setPasswordError('');
        notifications.show({
          title: '🔒 Enter your password',
          message: `Welcome back! Demo password: demo123`,
          color: 'blue',
          autoClose: 8000,
        });
        setScreen('password');
      }
    }, 500);
  }

  // ── Screen: client-otp ────────────────────────────────────────────────────
  const MAX_OTP_ATTEMPTS = 5;

  function handleClientOtpChange(val: string) {
    setClientOtp(val);
    setClientOtpError('');
    if (val.length === 6) verifyClientOtp(val);
  }

  function verifyClientOtp(code: string) {
    if (clientAttempts >= MAX_OTP_ATTEMPTS) {
      setClientOtpError('Too many incorrect attempts. Please request a new code.');
      return;
    }
    if (code !== MOCK_OTP) {
      const remaining = MAX_OTP_ATTEMPTS - clientAttempts - 1;
      setClientAttempts(a => a + 1);
      setClientOtpError(
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'No attempts remaining. Please resend.'
      );
      return;
    }
    setOtpVerifying(true);
    setTimeout(() => {
      const result = loginByPhoneOTP(normPhone(phone));
      setOtpVerifying(false);
      if (!result.success) { setClientOtpError(result.error ?? 'Sign in failed.'); return; }
      goAfterLogin();
    }, 500);
  }

  function handleResendClientOtp() {
    if (otpSeconds > 0 || clientAttempts >= MAX_OTP_ATTEMPTS) return;
    setClientOtp('');
    setClientOtpError('');
    setClientAttempts(0);
    beginOtp();
    notifications.show({
      title: '📱 New Code Sent',
      message: `A new 6-digit code was sent to ${phone}.\n\n🔑 Demo code: ${MOCK_OTP}`,
      color: 'teal',
      autoClose: 12000,
    });
  }

  // ── Screen: password ──────────────────────────────────────────────────────
  function handlePasswordLogin() {
    setPasswordError('');
    if (!password) { setPasswordError('Please enter your password.'); return; }
    setPasswordLoading(true);
    setTimeout(() => {
      const result = loginByPhone(normPhone(phone), password);
      setPasswordLoading(false);
      if (!result.success) { setPasswordError(result.error ?? 'Sign in failed.'); return; }
      goAfterLogin();
    }, 500);
  }

  // ── Screen: forgot-phone ──────────────────────────────────────────────────
  function handleSendResetCode() {
    setForgotPhoneError('');
    if (!forgotPhone.trim()) { setForgotPhoneError('Please enter your phone number.'); return; }
    setSendingCode(true);
    setTimeout(() => {
      setSendingCode(false);
      setResetOtp('');
      setResetOtpError('');
      setNewPw('');
      setConfirmPw('');
      setResetError('');
      beginReset();
      setScreen('forgot-otp');
    }, 800);
  }

  // ── Screen: forgot-otp ────────────────────────────────────────────────────
  function handleReset() {
    setResetError('');
    if (resetOtp.length < 6) { setResetError('Please enter the 6-digit code.'); return; }
    if (resetOtp !== MOCK_OTP) { setResetOtpError(`Incorrect code. Demo code: ${MOCK_OTP}`); return; }
    if (newPw.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setResetError('Passwords do not match.'); return; }
    setResetting(true);
    setTimeout(() => {
      const result = resetPassword(normPhone(forgotPhone), newPw);
      setResetting(false);
      if (!result.success) { setResetError(result.error ?? 'Reset failed.'); return; }
      notifications.show({ title: 'Password updated!', message: 'You can now sign in with your new password.', color: 'teal' });
      setPhone(forgotPhone);
      setPassword('');
      setScreen('password');
    }, 700);
  }

  // ── Shared layout ─────────────────────────────────────────────────────────
  const header = (
    <Center mb="xl">
      <Box style={{ textAlign: 'center' }}>
        <Box style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${navy}, ${teal})`,
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
      <Text size="sm" mb="xl" style={{ color: 'var(--ot-text-sub)' }}>
        Enter your registered phone number to continue.
      </Text>

      {phoneError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">{phoneError}</Alert>
      )}

      <Stack gap="md">
        <TextInput
          label="Phone Number"
          placeholder="+251 9XX XXX XXX"
          value={phone}
          onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
          leftSection={<IconPhone size={16} />}
          styles={inputStyles}
          onKeyDown={e => e.key === 'Enter' && handleContinue()}
          size="md"
          autoFocus
        />
        <Button
          fullWidth size="md"
          loading={phoneLoading}
          onClick={handleContinue}
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
        >
          Continue
        </Button>
      </Stack>

      <Text ta="center" size="sm" mt="xl" style={{ color: 'var(--ot-text-sub)' }}>
        Don't have an account?{' '}
        <Anchor onClick={() => navigate(ROUTES.signup)} style={{ color: teal, cursor: 'pointer' }}>
          Create one
        </Anchor>
      </Text>

      <Box mt="lg" p={12} style={{ borderRadius: 10, background: 'var(--ot-bg-row)', border: '1px solid var(--ot-border)' }}>
        <Text size="xs" c="var(--ot-text-muted)" fw={600} mb={6}>Demo accounts</Text>
        <Stack gap={4}>
          <Text size="xs" c="var(--ot-text-muted)">Client (OTP login): <strong>+1-555-0101</strong></Text>
          <Text size="xs" c="var(--ot-text-muted)">Provider (password): <strong>+1-555-0201</strong> · pw: <strong>demo123</strong></Text>
        </Stack>
      </Box>
    </>
  ));

  // ── CLIENT OTP ─────────────────────────────────────────────────────────────
  if (screen === 'client-otp') return wrap(card(
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

      <Badge color="teal" variant="light" size="sm" mb="lg" leftSection={<IconShieldCheck size={11} />}>
        Demo code: {MOCK_OTP}
      </Badge>

      {clientOtpError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">{clientOtpError}</Alert>
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
              value={clientOtp}
              onChange={handleClientOtpChange}
              disabled={clientAttempts >= MAX_OTP_ATTEMPTS || otpVerifying}
              autoFocus
            />
          </Center>
        </Box>

        {otpVerifying && (
          <Text size="sm" c="var(--ot-text-sub)" ta="center">Signing you in…</Text>
        )}

        <Group justify="space-between">
          <Anchor
            size="sm"
            onClick={() => setScreen('phone')}
            style={{ color: teal, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconChevronLeft size={14} /> Change number
          </Anchor>
          <Anchor
            size="sm"
            onClick={handleResendClientOtp}
            style={{
              color: otpSeconds > 0 || clientAttempts >= MAX_OTP_ATTEMPTS ? 'var(--ot-text-muted)' : teal,
              cursor: otpSeconds > 0 || clientAttempts >= MAX_OTP_ATTEMPTS ? 'default' : 'pointer',
            }}
          >
            {otpSeconds > 0 ? `Resend in ${otpSeconds}s` : 'Resend code'}
          </Anchor>
        </Group>
      </Stack>
    </>
  ));

  // ── PASSWORD (PROVIDER / ADMIN) ────────────────────────────────────────────
  if (screen === 'password') return wrap(card(
    <>
      <Group mb="lg" gap={12}>
        <ThemeIcon variant="light" color="blue" size={44} radius="xl">
          <IconUser size={22} />
        </ThemeIcon>
        <Box>
          <Text fw={700} size="lg" style={{ color: 'var(--ot-text-navy)' }}>Enter Password</Text>
          <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>
            {detectedRole === 'admin' ? 'Admin' : 'Provider'} account · {phone}
          </Text>
        </Box>
      </Group>

      {passwordError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">{passwordError}</Alert>
      )}

      <Stack gap="md">
        <PasswordInput
          label="Password"
          placeholder="Your password"
          value={password}
          onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
          leftSection={<IconLock size={16} />}
          styles={inputStyles}
          onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()}
          size="md"
          autoFocus
        />

        <Group justify="space-between">
          <Anchor
            size="sm"
            onClick={() => setScreen('phone')}
            style={{ color: teal, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconChevronLeft size={14} /> Back
          </Anchor>
          <Anchor
            size="sm"
            onClick={() => { setForgotPhone(phone); setForgotPhoneError(''); setScreen('forgot-phone'); }}
            style={{ color: teal, cursor: 'pointer' }}
          >
            Forgot password?
          </Anchor>
        </Group>

        <Button
          fullWidth size="md"
          loading={passwordLoading}
          onClick={handlePasswordLogin}
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
        >
          Sign In
        </Button>
      </Stack>
    </>
  ));

  // ── FORGOT PASSWORD — ENTER PHONE ─────────────────────────────────────────
  if (screen === 'forgot-phone') return wrap(card(
    <>
      <Group mb="lg" gap={12}>
        <ThemeIcon variant="light" color="teal" size={44} radius="xl">
          <IconDeviceMobile size={22} />
        </ThemeIcon>
        <Box>
          <Text fw={700} size="lg" style={{ color: 'var(--ot-text-navy)' }}>Reset Password</Text>
          <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>
            We'll send a verification code to your registered number.
          </Text>
        </Box>
      </Group>

      {forgotPhoneError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">{forgotPhoneError}</Alert>
      )}

      <Stack gap="md">
        <TextInput
          label="Phone Number"
          placeholder="+251 9XX XXX XXX"
          value={forgotPhone}
          onChange={e => setForgotPhone(e.target.value)}
          leftSection={<IconPhone size={16} />}
          styles={inputStyles}
          onKeyDown={e => e.key === 'Enter' && handleSendResetCode()}
          size="md"
        />
        <Button
          fullWidth size="md"
          loading={sendingCode}
          onClick={handleSendResetCode}
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
        >
          Send Code
        </Button>
        <Anchor
          size="sm"
          onClick={() => setScreen('password')}
          style={{ color: teal, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <IconChevronLeft size={14} /> Back to sign in
        </Anchor>
      </Stack>
    </>
  ));

  // ── FORGOT PASSWORD — OTP + NEW PASSWORD ──────────────────────────────────
  return wrap(card(
    <>
      <Group mb="lg" gap={12}>
        <ThemeIcon variant="light" color="teal" size={44} radius="xl">
          <IconKey size={22} />
        </ThemeIcon>
        <Box>
          <Text fw={700} size="lg" style={{ color: 'var(--ot-text-navy)' }}>Verify & Reset</Text>
          <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>
            Code sent to <strong>{forgotPhone}</strong>
          </Text>
        </Box>
      </Group>

      <Alert icon={<IconShieldCheck size={14} />} color="teal" mb="md" radius="md" variant="light">
        Demo verification code: <strong>{MOCK_OTP}</strong>
      </Alert>

      {(resetOtpError || resetError) && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">
          {resetOtpError || resetError}
        </Alert>
      )}

      <Stack gap="md">
        <Box>
          <Text size="sm" fw={500} mb={8} style={{ color: 'var(--ot-text-body)' }}>Verification Code</Text>
          <Center>
            <PinInput
              length={6}
              type="number"
              value={resetOtp}
              onChange={v => { setResetOtp(v); setResetOtpError(''); }}
              size="md"
            />
          </Center>
        </Box>

        <PasswordInput
          label="New Password"
          placeholder="At least 6 characters"
          value={newPw}
          onChange={e => { setNewPw(e.target.value); setResetError(''); }}
          leftSection={<IconLock size={16} />}
          styles={inputStyles}
          size="md"
        />
        {newPw.length > 0 && (
          <Box>
            <Progress value={strength.value} color={strength.color} size="xs" radius="xl" mb={4} />
            <Text size="xs" style={{ color: 'var(--ot-text-muted)' }}>{strength.label}</Text>
          </Box>
        )}
        <PasswordInput
          label="Confirm Password"
          placeholder="Repeat your new password"
          value={confirmPw}
          onChange={e => { setConfirmPw(e.target.value); setResetError(''); }}
          leftSection={<IconLock size={16} />}
          styles={inputStyles}
          size="md"
        />

        <Button
          fullWidth size="md"
          loading={resetting}
          onClick={handleReset}
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
        >
          Reset Password
        </Button>

        <Group justify="space-between">
          <Anchor
            size="sm"
            onClick={() => { if (resetSeconds === 0) handleSendResetCode(); }}
            style={{
              color: resetSeconds > 0 ? 'var(--ot-text-muted)' : teal,
              cursor: resetSeconds > 0 ? 'default' : 'pointer',
            }}
          >
            {resetSeconds > 0 ? `Resend in ${resetSeconds}s` : 'Resend code'}
          </Anchor>
          <Anchor
            size="sm"
            onClick={() => setScreen('forgot-phone')}
            style={{ color: teal, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconChevronLeft size={14} /> Change number
          </Anchor>
        </Group>
      </Stack>
    </>
  ));
}
