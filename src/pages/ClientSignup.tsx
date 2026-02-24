/**
 * ClientSignup.tsx – Refined, light-mode client onboarding.
 * Step 1  Personal Info (name, email, password, 1–2 phones)
 * Step 2  Phone OTP Verification
 * Step 3  Success → Client Dashboard
 */
import { useState } from 'react';
import {
  Box, Button, Center, Container, Group, Paper, PasswordInput,
  PinInput, Stack, Text, TextInput, ThemeIcon, ActionIcon, Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconShieldCheck, IconArrowRight, IconArrowLeft, IconMail, IconLock,
  IconPhone, IconUser, IconPlus, IconTrash, IconMessageCircle,
  IconCircleCheck, IconAlertCircle, IconLock as IconLockBrand,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, MOCK_OTP, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { useAuthStore } from '../store/authStore';

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = `
@keyframes csIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
.cs-in { animation: csIn 0.4s ease both; }
`;

// ─── Step progress dots ───────────────────────────────────────────────────────
const STEP_LABELS = ['Your Info', 'Verify Phone', 'Done'];

function StepDots({ current }: { current: number }) {
  return (
    <Group justify="center" gap={0} mb={32}>
      {STEP_LABELS.map((label, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        return (
          <Group key={label} gap={0} align="center">
            <Stack gap={4} align="center">
              <Box
                w={32} h={32}
                style={{
                  borderRadius: '50%',
                  background: done ? COLORS.tealBlue : active ? COLORS.navyBlue : '#E4E9F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s',
                  boxShadow: active ? `0 2px 12px ${COLORS.navyBlue}40` : 'none',
                }}
              >
                {done
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <Text size="11px" fw={700} c={active ? 'white' : '#A0AEC0'}>{i + 1}</Text>
                }
              </Box>
              <Text size="10px" fw={600} c={active ? COLORS.navyBlue : done ? COLORS.tealBlue : '#A0AEC0'}>{label}</Text>
            </Stack>
            {i < STEP_LABELS.length - 1 && (
              <Box
                w={48} h={2} mx={6} mb={18}
                style={{ background: done ? COLORS.tealBlue : '#E4E9F2', transition: 'all 0.3s', borderRadius: 2 }}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

// ─── Shared page shell ────────────────────────────────────────────────────────
function Shell({ children, step }: { children: React.ReactNode; step: number }) {
  const navigate = useNavigate();
  return (
    <Box style={{ minHeight: '100vh', background: '#F7F8FC', display: 'flex', flexDirection: 'column' }}>
      <style>{S}</style>

      {/* Navbar */}
      <Box style={{ background: 'white', borderBottom: '1px solid #EEF0F7' }}>
        <Container size={640}>
          <Group justify="space-between" py={14}>
            <Group gap={10} onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
              <Box w={34} h={34} style={{ borderRadius: 9, background: COLORS.navyBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconLockBrand size={15} color={COLORS.lemonYellow} strokeWidth={2.5} />
              </Box>
              <Text fw={900} size="sm" c={COLORS.navyBlue}>ONE TOUCH</Text>
            </Group>
            <Group gap={10}>
              <LanguageSwitcher />
              <Button variant="subtle" size="xs" color="gray" onClick={() => navigate(ROUTES.login)}>Sign In</Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Thin teal progress bar */}
      <Box style={{ height: 3, background: '#EEF0F7' }}>
        <Box style={{ height: '100%', width: `${(step / 3) * 100}%`, background: COLORS.tealBlue, transition: 'width 0.4s ease', borderRadius: '0 2px 2px 0' }} />
      </Box>

      <Center flex={1} py={40} px={16}>
        <Container size={500} w="100%">
          <StepDots current={step} />
          {children}
        </Container>
      </Center>
      <AIHelpCenter />
    </Box>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      radius={20} p={36}
      style={{ border: '1px solid #EEF0F7', boxShadow: '0 4px 24px rgba(0,0,128,0.07)' }}
      className="cs-in"
    >
      {children}
    </Paper>
  );
}

// ── STEP 1 Personal Info ──────────────────────────────────────────────────────
function StepInfo({ onNext }: { onNext: (d: { fullName: string; email: string; password: string; phones: string[] }) => void }) {
  const [phones, setPhones] = useState(['']);

  const form = useForm({
    initialValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    validate: {
      fullName:        v => (v.trim().length >= 2 ? null : 'Full name is required'),
      email:           v => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email address'),
      password:        v => (v.length >= 6 ? null : 'Minimum 6 characters'),
      confirmPassword: (v, vals) => (v === vals.password ? null : 'Passwords do not match'),
    },
  });

  const setPhone = (i: number, v: string) => { const a = [...phones]; a[i] = v; setPhones(a); };

  const handleSubmit = (values: typeof form.values) => {
    const valid = phones.filter(p => p.trim().length >= 7);
    if (!valid.length) { notifications.show({ title: 'Phone required', message: 'Enter at least one valid phone number.', color: 'yellow' }); return; }
    onNext({ ...values, phones: valid });
  };

  return (
    <Card>
      <Stack gap={24}>
        {/* Header */}
        <Stack gap={8}>
          <Group gap={10}>
            <Box w={40} h={40} style={{ borderRadius: 12, background: '#EEF0F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconUser size={20} color={COLORS.navyBlue} />
            </Box>
            <Stack gap={0}>
              <Text fw={800} size="lg" c={COLORS.navyBlue}>Personal Information</Text>
              <Text size="xs" c="#718096">Create your ONE TOUCH account</Text>
            </Stack>
          </Group>
        </Stack>

        <Box style={{ height: 1, background: '#F0F2F7' }} />

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap={16}>
            <TextInput
              label="Full Name"
              placeholder="e.g. Almaz Tesfaye"
              leftSection={<IconUser size={15} color="#A0AEC0" />}
              styles={{ label: { fontWeight: 600, fontSize: 13, color: COLORS.navyBlue, marginBottom: 5 }, input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
              {...form.getInputProps('fullName')}
            />
            <TextInput
              label="Email Address"
              placeholder="you@example.com"
              leftSection={<IconMail size={15} color="#A0AEC0" />}
              styles={{ label: { fontWeight: 600, fontSize: 13, color: COLORS.navyBlue, marginBottom: 5 }, input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
              {...form.getInputProps('email')}
            />

            {/* Phone(s) */}
            <Stack gap={8}>
              <Text size="13px" fw={600} c={COLORS.navyBlue}>Phone Number</Text>
              {phones.map((phone, i) => (
                <Group key={i} gap={8} wrap="nowrap">
                  <TextInput
                    flex={1}
                    placeholder={i === 0 ? '+251 9XX XXX XXX' : 'Secondary phone (optional)'}
                    leftSection={<IconPhone size={15} color="#A0AEC0" />}
                    value={phone}
                    onChange={e => setPhone(i, e.currentTarget.value)}
                    styles={{ input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
                  />
                  {i > 0 && (
                    <ActionIcon variant="light" color="red" radius={10} size={36} onClick={() => setPhones(phones.filter((_, idx) => idx !== i))}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
              {phones.length < 2 && (
                <Button
                  variant="subtle" color="teal" size="xs"
                  leftSection={<IconPlus size={12} />}
                  onClick={() => setPhones([...phones, ''])}
                  style={{ alignSelf: 'flex-start', paddingLeft: 4 }}
                >
                  Add a second phone number
                </Button>
              )}
            </Stack>

            <PasswordInput
              label="Password"
              placeholder="At least 6 characters"
              leftSection={<IconLock size={15} color="#A0AEC0" />}
              styles={{ label: { fontWeight: 600, fontSize: 13, color: COLORS.navyBlue, marginBottom: 5 }, input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
              {...form.getInputProps('password')}
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Repeat your password"
              leftSection={<IconLock size={15} color="#A0AEC0" />}
              styles={{ label: { fontWeight: 600, fontSize: 13, color: COLORS.navyBlue, marginBottom: 5 }, input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
              {...form.getInputProps('confirmPassword')}
            />

            <Button
              type="submit" fullWidth size="md" radius="xl" mt={6}
              style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})`, fontWeight: 700 }}
              rightSection={<IconArrowRight size={16} />}
            >
              Continue to Phone Verification
            </Button>
          </Stack>
        </form>
      </Stack>
    </Card>
  );
}

// ── STEP 2 OTP Verification ───────────────────────────────────────────────────
function StepOtp({ phone, onVerified, onBack }: { phone: string; onVerified: () => void; onBack: () => void }) {
  const [otp, setOtp]             = useState('');
  const [sent, setSent]           = useState(false);
  const [sending, setSending]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]         = useState('');

  const sendOtp = () => {
    setSending(true); setError('');
    setTimeout(() => {
      setSending(false); setSent(true);
      notifications.show({ title: 'Code sent', message: `OTP sent to ${phone}. Demo: ${MOCK_OTP}`, color: 'teal', icon: <IconMessageCircle size={16} /> });
    }, 1100);
  };

  const verify = () => {
    if (otp.length < 6) { setError('Enter the full 6-digit code.'); return; }
    setVerifying(true); setError('');
    setTimeout(() => {
      setVerifying(false);
      if (otp === MOCK_OTP) { onVerified(); }
      else { setError('Incorrect code — please try again.'); }
    }, 900);
  };

  return (
    <Card>
      <Stack gap={24}>
        <Group gap={10}>
          <ActionIcon variant="subtle" radius={10} onClick={onBack}><IconArrowLeft size={16} /></ActionIcon>
          <Stack gap={0}>
            <Text fw={800} size="lg" c={COLORS.navyBlue}>Phone Verification</Text>
            <Text size="xs" c="#718096">We'll send a one-time code to confirm your number</Text>
          </Stack>
        </Group>

        <Box style={{ height: 1, background: '#F0F2F7' }} />

        {/* Phone display */}
        <Box p={14} style={{ borderRadius: 12, background: '#F7F8FC', border: '1px solid #E4E9F2', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Box w={32} h={32} style={{ borderRadius: 8, background: `${COLORS.tealBlue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconPhone size={15} color={COLORS.tealBlue} />
          </Box>
          <Stack gap={0}>
            <Text size="10px" fw={600} c="#A0AEC0" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Sending code to</Text>
            <Text fw={700} size="sm" c={COLORS.navyBlue}>{phone}</Text>
          </Stack>
        </Box>

        {!sent ? (
          <Button
            fullWidth size="md" radius="xl" loading={sending}
            leftSection={<IconMessageCircle size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, fontWeight: 700 }}
            onClick={sendOtp}
          >
            Send Verification Code
          </Button>
        ) : (
          <Stack gap={20}>
            <Stack gap={12} align="center">
              <Text size="sm" fw={600} c={COLORS.navyBlue}>Enter the 6-digit code</Text>
              <PinInput length={6} type="number" size="lg" value={otp} onChange={setOtp} oneTimeCode />
              {error && (
                <Alert color="red" radius={10} icon={<IconAlertCircle size={14} />} p={10} w="100%">
                  <Text size="xs">{error}</Text>
                </Alert>
              )}
            </Stack>
            <Button
              fullWidth size="md" radius="xl" loading={verifying}
              style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, fontWeight: 700 }}
              rightSection={<IconArrowRight size={16} />}
              onClick={verify}
            >
              Verify &amp; Create Account
            </Button>
            <Text size="xs" ta="center" c="#A0AEC0">
              Didn't receive it?{' '}
              <Text span fw={700} c={COLORS.tealBlue} style={{ cursor: 'pointer' }} onClick={sendOtp}>Resend code</Text>
            </Text>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

// ── STEP 3 Success ────────────────────────────────────────────────────────────
function StepSuccess() {
  return (
    <Card>
      <Stack align="center" gap={24} ta="center" py={16}>
        <Box
          w={88} h={88}
          style={{ borderRadius: '50%', background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <IconCircleCheck size={48} color={COLORS.tealBlue} strokeWidth={1.5} />
        </Box>
        <Stack gap={6}>
          <Text fw={900} size="xl" c={COLORS.navyBlue}>Account Created!</Text>
          <Text size="sm" c="#718096" maw={320}>You're all set. Redirecting you to your dashboard…</Text>
        </Stack>
        <Box w="100%" style={{ height: 6, borderRadius: 3, background: '#E4E9F2', overflow: 'hidden' }}>
          <Box style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, animation: 'csIn 0.1s ease both' }} />
        </Box>
      </Stack>
    </Card>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
export function ClientSignup() {
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<{ fullName: string; email: string; password: string; phones: string[] } | null>(null);

  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const onInfo = (d: typeof data) => { setData(d); go(2); };

  const onVerified = () => {
    if (!data) return;
    signup({ email: data.email, password: data.password, phone: data.phones[0], role: 'client' });
    go(3);
    setTimeout(() => navigate(ROUTES.clientDashboard), 2400);
  };

  return (
    <Shell step={step}>
      {step === 1 && <StepInfo onNext={onInfo} />}
      {step === 2 && data && <StepOtp phone={data.phones[0]} onVerified={onVerified} onBack={() => go(1)} />}
      {step === 3 && <StepSuccess />}
    </Shell>
  );
}

