/**
 * Login.tsx — Phone + Password authentication with OTP-based forgot-password flow.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Center, Container, Paper, Stack, Text, TextInput,
  PasswordInput, PinInput, Progress, Alert, Anchor, Group, ThemeIcon,
} from '@mantine/core';
import {
  IconPhone, IconLock, IconArrowRight, IconChevronLeft,
  IconShieldCheck, IconAlertCircle, IconKey, IconDeviceMobile,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES, MOCK_OTP } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// ─── Screens ──────────────────────────────────────────────────────────────────
type Screen = 'login' | 'forgot-phone' | 'forgot-otp';

// ─── Password strength ────────────────────────────────────────────────────────
function getStrength(pw: string) {
  if (pw.length === 0) return { value: 0, label: '', color: 'gray' };
  if (pw.length < 6) return { value: 20, label: 'Too short', color: 'red' };
  if (pw.length < 8) return { value: 50, label: 'Weak', color: 'orange' };
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { value: 100, label: 'Strong', color: 'teal' };
  return { value: 75, label: 'Fair', color: 'yellow' };
}

// ─── Resend countdown ─────────────────────────────────────────────────────────
function useCountdown(start: number) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const begin = () => {
    setSeconds(start);
    if (ref.current) clearInterval(ref.current);
    ref.current = setInterval(() => setSeconds(s => { if (s <= 1) { clearInterval(ref.current!); return 0; } return s - 1; }), 1000);
  };
  useEffect(() => () => { if (ref.current) clearInterval(ref.current); }, []);
  return { seconds, begin };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { loginByPhone, resetPassword } = useAuthStore();

  const [screen, setScreen] = useState<Screen>('login');

  // Login form
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot-phone screen
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotPhoneError, setForgotPhoneError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  // Forgot-otp screen
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const { seconds, begin: beginCountdown } = useCountdown(60);

  const strength = getStrength(newPw);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const normPhone = (p: string) => p.replace(/[\s\-()]/g, '');

  function goForgot() {
    setForgotPhone(phone);
    setForgotPhoneError('');
    setScreen('forgot-phone');
  }

  // ── Screen 1: Sign in ─────────────────────────────────────────────────────
  function handleLogin() {
    setLoginError('');
    if (!phone.trim()) { setLoginError('Please enter your phone number.'); return; }
    if (!password) { setLoginError('Please enter your password.'); return; }
    setLoginLoading(true);
    setTimeout(() => {
      const result = loginByPhone(normPhone(phone), password);
      setLoginLoading(false);
      if (!result.success) {
        setLoginError(result.error ?? 'Sign in failed.');
        return;
      }
      const { currentUser } = useAuthStore.getState();
      notifications.show({ title: 'Welcome back!', message: 'Signed in successfully.', color: 'teal' });
      if (currentUser?.role === 'client') navigate(ROUTES.clientDashboard, { replace: true });
      else if (currentUser?.role === 'provider') navigate(ROUTES.providerDashboard, { replace: true });
      else if (currentUser?.role === 'admin') navigate(ROUTES.adminDashboard, { replace: true });
    }, 600);
  }

  // ── Screen 2: Send OTP ────────────────────────────────────────────────────
  function handleSendCode() {
    setForgotPhoneError('');
    if (!forgotPhone.trim()) { setForgotPhoneError('Please enter your phone number.'); return; }
    setSendingCode(true);
    setTimeout(() => {
      setSendingCode(false);
      setOtp('');
      setOtpError('');
      setNewPw('');
      setConfirmPw('');
      setResetError('');
      beginCountdown();
      setScreen('forgot-otp');
    }, 900);
  }

  // ── Screen 3: Verify OTP + reset password ─────────────────────────────────
  function handleReset() {
    setResetError('');
    if (otp.length < 6) { setResetError('Please enter the 6-digit code.'); return; }
    if (otp !== MOCK_OTP) { setOtpError('Incorrect code. Try ' + MOCK_OTP + ' for demo.'); return; }
    if (newPw.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setResetError('Passwords do not match.'); return; }
    setResetting(true);
    setTimeout(() => {
      const result = resetPassword(normPhone(forgotPhone), newPw);
      setResetting(false);
      if (!result.success) { setResetError(result.error ?? 'Reset failed.'); return; }
      notifications.show({ title: 'Password reset!', message: 'You can now sign in with your new password.', color: 'teal' });
      setPhone(forgotPhone);
      setPassword('');
      setScreen('login');
    }, 700);
  }

  // ── Layout shell ──────────────────────────────────────────────────────────
  const navy = COLORS.navyBlue;
  const teal = COLORS.tealBlue;

  const headerSection = (
    <Center mb="xl">
      <Box style={{ textAlign: 'center' }}>
        <Box
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `linear-gradient(135deg, ${navy}, ${teal})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <IconShieldCheck size={28} color="#fff" />
        </Box>
        <Text fw={800} size="xl" style={{ color: 'var(--ot-text-navy)' }}>OneTouch</Text>
        <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>Your trusted services platform</Text>
      </Box>
    </Center>
  );

  // ── SCREEN 1: Login ───────────────────────────────────────────────────────
  if (screen === 'login') return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      <Box style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <LanguageSwitcher />
      </Box>
      <Container size="xs" py="xl">
        <Center style={{ minHeight: '100vh' }}>
          <Box style={{ width: '100%' }}>
            {headerSection}
            <Paper radius="lg" p="xl" shadow="md" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
              <Text fw={700} size="lg" mb="xs" style={{ color: 'var(--ot-text-navy)' }}>Sign In</Text>
              <Text size="sm" mb="xl" style={{ color: 'var(--ot-text-sub)' }}>Enter your phone number and password to continue.</Text>

              {loginError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">
                  {loginError}
                </Alert>
              )}

              <Stack gap="md">
                <TextInput
                  label="Phone Number"
                  placeholder="+251 9XX XXX XXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  leftSection={<IconPhone size={16} />}
                  styles={{ input: { background: 'var(--ot-bg-row)', borderColor: 'var(--ot-border-input)', color: 'var(--ot-text-body)' }, label: { color: 'var(--ot-text-body)' } }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  size="md"
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  leftSection={<IconLock size={16} />}
                  styles={{ input: { background: 'var(--ot-bg-row)', borderColor: 'var(--ot-border-input)', color: 'var(--ot-text-body)' }, label: { color: 'var(--ot-text-body)' } }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  size="md"
                />

                <Group justify="flex-end">
                  <Anchor size="sm" onClick={goForgot} style={{ color: teal, cursor: 'pointer' }}>
                    Forgot password?
                  </Anchor>
                </Group>

                <Button
                  fullWidth
                  size="md"
                  loading={loginLoading}
                  onClick={handleLogin}
                  rightSection={<IconArrowRight size={16} />}
                  style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
                >
                  Sign In
                </Button>
              </Stack>

              <Text ta="center" size="sm" mt="xl" style={{ color: 'var(--ot-text-sub)' }}>
                Don't have an account?{' '}
                <Anchor onClick={() => navigate(ROUTES.signup)} style={{ color: teal, cursor: 'pointer' }}>
                  Create one
                </Anchor>
              </Text>
            </Paper>

            <Text ta="center" size="xs" mt="lg" style={{ color: 'var(--ot-text-muted)' }}>
              Demo — Client: <strong>+1-555-0101</strong> · Provider: <strong>+1-555-0201</strong> · Admin: <strong>+1-555-0001</strong>
              <br />Password for all: <strong>demo123</strong>
            </Text>
          </Box>
        </Center>
      </Container>
    </Box>
  );

  // ── SCREEN 2: Forgot password — enter phone ───────────────────────────────
  if (screen === 'forgot-phone') return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      <Box style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <LanguageSwitcher />
      </Box>
      <Container size="xs" py="xl">
        <Center style={{ minHeight: '100vh' }}>
          <Box style={{ width: '100%' }}>
            {headerSection}
            <Paper radius="lg" p="xl" shadow="md" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
              <Group mb="lg">
                <ThemeIcon variant="light" color="teal" size="lg" radius="xl">
                  <IconDeviceMobile size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={700} size="lg" style={{ color: 'var(--ot-text-navy)' }}>Reset Password</Text>
                  <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>We'll send a verification code to your phone.</Text>
                </Box>
              </Group>

              {forgotPhoneError && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">
                  {forgotPhoneError}
                </Alert>
              )}

              <Stack gap="md">
                <TextInput
                  label="Phone Number"
                  placeholder="+251 9XX XXX XXX"
                  value={forgotPhone}
                  onChange={e => setForgotPhone(e.target.value)}
                  leftSection={<IconPhone size={16} />}
                  styles={{ input: { background: 'var(--ot-bg-row)', borderColor: 'var(--ot-border-input)', color: 'var(--ot-text-body)' }, label: { color: 'var(--ot-text-body)' } }}
                  onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                  size="md"
                />

                <Button
                  fullWidth
                  size="md"
                  loading={sendingCode}
                  onClick={handleSendCode}
                  rightSection={<IconArrowRight size={16} />}
                  style={{ background: `linear-gradient(135deg, ${navy}, ${teal})`, border: 'none' }}
                >
                  Send Code
                </Button>

                <Anchor
                  size="sm"
                  onClick={() => setScreen('login')}
                  style={{ color: teal, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <IconChevronLeft size={14} /> Back to sign in
                </Anchor>
              </Stack>
            </Paper>
          </Box>
        </Center>
      </Container>
    </Box>
  );

  // ── SCREEN 3: Forgot password — OTP + new password ────────────────────────
  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)' }}>
      <Box style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <LanguageSwitcher />
      </Box>
      <Container size="xs" py="xl">
        <Center style={{ minHeight: '100vh' }}>
          <Box style={{ width: '100%' }}>
            {headerSection}
            <Paper radius="lg" p="xl" shadow="md" style={{ background: 'var(--ot-bg-card)', border: '1px solid var(--ot-border)' }}>
              <Group mb="lg">
                <ThemeIcon variant="light" color="teal" size="lg" radius="xl">
                  <IconKey size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={700} size="lg" style={{ color: 'var(--ot-text-navy)' }}>Verify & Reset</Text>
                  <Text size="sm" style={{ color: 'var(--ot-text-sub)' }}>
                    Code sent to <strong>{forgotPhone}</strong>
                  </Text>
                </Box>
              </Group>

              {/* Demo hint */}
              <Alert icon={<IconShieldCheck size={14} />} color="teal" mb="md" radius="md" variant="light">
                Demo verification code: <strong>{MOCK_OTP}</strong>
              </Alert>

              {(otpError || resetError) && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" radius="md">
                  {otpError || resetError}
                </Alert>
              )}

              <Stack gap="md">
                <Box>
                  <Text size="sm" fw={500} mb={6} style={{ color: 'var(--ot-text-body)' }}>Verification Code</Text>
                  <Center>
                    <PinInput
                      length={6}
                      type="number"
                      value={otp}
                      onChange={v => { setOtp(v); setOtpError(''); }}
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
                  styles={{ input: { background: 'var(--ot-bg-row)', borderColor: 'var(--ot-border-input)', color: 'var(--ot-text-body)' }, label: { color: 'var(--ot-text-body)' } }}
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
                  styles={{ input: { background: 'var(--ot-bg-row)', borderColor: 'var(--ot-border-input)', color: 'var(--ot-text-body)' }, label: { color: 'var(--ot-text-body)' } }}
                  size="md"
                />

                <Button
                  fullWidth
                  size="md"
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
                    onClick={() => { if (seconds === 0) handleSendCode(); }}
                    style={{ color: seconds > 0 ? 'var(--ot-text-muted)' : teal, cursor: seconds > 0 ? 'default' : 'pointer' }}
                  >
                    {seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}
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
            </Paper>
          </Box>
        </Center>
      </Container>
    </Box>
  );
}
