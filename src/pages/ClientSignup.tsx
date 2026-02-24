/**
 * ClientSignup.tsx
 * Simplified client onboarding:
 *   Step 1 – Personal information (name, email, password, phone/s)
 *   Step 2 – OTP phone verification
 *   Step 3 – Account created → redirect to Client Dashboard
 */
import { useState } from 'react';
import {
  Box, Button, Center, Container, Group, Paper, PasswordInput,
  PinInput, Progress, Stack, Text, TextInput, ThemeIcon, ActionIcon,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconShieldCheck, IconArrowRight, IconArrowLeft, IconMail, IconLock,
  IconPhone, IconUser, IconPlus, IconTrash, IconMessageCircle,
  IconCircleCheck, IconAlertCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, MOCK_OTP, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { useAuthStore } from '../store/authStore';

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
.cs-enter { animation: fadeUp 0.45s ease both; }
`;

// ─── Shell (shared layout) ────────────────────────────────────────────────────
function Shell({ children, step, totalSteps }: { children: React.ReactNode; step: number; totalSteps: number }) {
  const navigate = useNavigate();
  const progress = ((step) / totalSteps) * 100;

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: `linear-gradient(150deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 45%, ${COLORS.tealBlue}35 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{STYLES}</style>

      {/* Top bar */}
      <Group justify="space-between" p="md" px="xl">
        <Group gap="sm" onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
          <Box w={38} h={38} style={{ borderRadius: 12, background: COLORS.lemonYellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconShieldCheck size={20} color={COLORS.navyBlue} stroke={2.5} />
          </Box>
          <Text fw={800} size="lg" c="white">ONE TOUCH</Text>
        </Group>
        <LanguageSwitcher />
      </Group>

      {/* Progress bar */}
      <Progress value={progress} size="xs" color="teal" style={{ borderRadius: 0 }} />

      <Center flex={1} py={32} px="md">
        <Container size={520} w="100%">
          {children}
        </Container>
      </Center>

      <AIHelpCenter />
    </Box>
  );
}

// ─── Step indicator label ─────────────────────────────────────────────────────
function StepLabel({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <Stack gap={4} align="center" mb={4}>
      <Text size="xs" c="rgba(255,255,255,0.55)" fw={500}>Step {current} of {total}</Text>
      <Text fw={800} size="xl" c="white">{label}</Text>
    </Stack>
  );
}

// ─── STEP 1 – Personal info ───────────────────────────────────────────────────
function StepInfo({ onNext }: { onNext: (data: { fullName: string; email: string; password: string; phones: string[] }) => void }) {
  const [phones, setPhones] = useState(['']);

  const form = useForm({
    initialValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    validate: {
      fullName:        (v) => (v.trim().length >= 2 ? null : 'Full name is required'),
      email:           (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email'),
      password:        (v) => (v.length >= 6 ? null : 'Minimum 6 characters'),
      confirmPassword: (v, vals) => (v === vals.password ? null : 'Passwords do not match'),
    },
  });

  const addPhone = () => {
    if (phones.length < 2) setPhones([...phones, '']);
  };
  const removePhone = (i: number) => setPhones(phones.filter((_, idx) => idx !== i));
  const setPhone = (i: number, v: string) => {
    const arr = [...phones];
    arr[i] = v;
    setPhones(arr);
  };

  const handleSubmit = (values: typeof form.values) => {
    const validPhones = phones.filter(p => p.trim().length >= 7);
    if (validPhones.length === 0) {
      notifications.show({ title: 'Phone required', message: 'Add at least one valid phone number.', color: 'yellow' });
      return;
    }
    onNext({ ...values, phones: validPhones });
  };

  return (
    <Paper shadow="xl" radius="xl" p={40} className="cs-enter">
      <Stack gap="lg">
        <Stack gap={4} align="center">
          <ThemeIcon size={56} radius="xl" color="navy" variant="light">
            <IconUser size={28} />
          </ThemeIcon>
          <Text fw={800} size="xl" c={COLORS.navyBlue}>Personal Information</Text>
          <Text c="dimmed" size="sm" ta="center">Tell us a bit about yourself to get started</Text>
        </Stack>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Full Name"
              placeholder="e.g. Almaz Tesfaye"
              leftSection={<IconUser size={16} />}
              {...form.getInputProps('fullName')}
            />
            <TextInput
              label="Email Address"
              placeholder="you@example.com"
              leftSection={<IconMail size={16} />}
              {...form.getInputProps('email')}
            />

            {/* Dynamic phone field(s) */}
            <Stack gap={8}>
              <Text size="sm" fw={600} c={COLORS.navyBlue}>Phone Number(s)</Text>
              {phones.map((phone, i) => (
                <Group key={i} gap="xs" wrap="nowrap">
                  <TextInput
                    flex={1}
                    placeholder={i === 0 ? '+251 9XX XXX XXX' : 'Secondary phone (optional)'}
                    leftSection={<IconPhone size={16} />}
                    value={phone}
                    onChange={e => setPhone(i, e.currentTarget.value)}
                  />
                  {i > 0 && (
                    <ActionIcon variant="light" color="red" radius="md" onClick={() => removePhone(i)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
              {phones.length < 2 && (
                <Button
                  variant="subtle" color="teal" size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={addPhone}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Add another phone number
                </Button>
              )}
            </Stack>

            <PasswordInput
              label="Password"
              placeholder="Minimum 6 characters"
              leftSection={<IconLock size={16} />}
              {...form.getInputProps('password')}
            />
            <PasswordInput
              label="Confirm Password"
              placeholder="Repeat your password"
              leftSection={<IconLock size={16} />}
              {...form.getInputProps('confirmPassword')}
            />

            <Button
              type="submit" fullWidth size="md" radius="xl" mt={4}
              style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
              rightSection={<IconArrowRight size={16} />}
            >
              Continue
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
}

// ─── STEP 2 – OTP verification ────────────────────────────────────────────────
function StepOtp({
  phone,
  onVerified,
  onBack,
}: {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [otp, setOtp]           = useState('');
  const [sent, setSent]          = useState(false);
  const [sending, setSending]    = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError]        = useState('');

  const sendOtp = () => {
    setSending(true);
    setError('');
    setTimeout(() => {
      setSending(false);
      setSent(true);
      notifications.show({
        title: 'OTP Sent',
        message: `Verification code sent to ${phone}. (Demo code: ${MOCK_OTP})`,
        color: 'teal',
        icon: <IconMessageCircle size={18} />,
      });
    }, 1200);
  };

  const verifyOtp = () => {
    if (otp.length < 6) { setError('Please enter the full 6-digit code.'); return; }
    setVerifying(true);
    setError('');
    setTimeout(() => {
      setVerifying(false);
      if (otp === MOCK_OTP) {
        onVerified();
      } else {
        setError('Incorrect code. Please try again.');
      }
    }, 900);
  };

  return (
    <Paper shadow="xl" radius="xl" p={40} className="cs-enter">
      <Stack gap="lg">
        <Group>
          <ActionIcon variant="subtle" onClick={onBack}><IconArrowLeft size={18} /></ActionIcon>
          <Stack gap={2} flex={1}>
            <Text fw={800} size="xl" c={COLORS.navyBlue}>Phone Verification</Text>
            <Text size="sm" c="dimmed">We'll send a 6-digit code to your phone</Text>
          </Stack>
        </Group>

        <Box
          p="md"
          style={{ borderRadius: 14, background: `${COLORS.tealBlue}08`, border: `1px solid ${COLORS.tealBlue}25` }}
        >
          <Group gap="sm">
            <IconPhone size={20} color={COLORS.tealBlue} />
            <Text fw={600} size="sm" c={COLORS.navyBlue}>{phone}</Text>
          </Group>
        </Box>

        {!sent ? (
          <Button
            fullWidth size="md" radius="xl"
            loading={sending}
            leftSection={<IconMessageCircle size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
            onClick={sendOtp}
          >
            Send Verification Code
          </Button>
        ) : (
          <Stack gap="md">
            <Stack gap={8} align="center">
              <Text size="sm" fw={500} c={COLORS.navyBlue}>Enter the 6-digit code sent to your phone</Text>
              <PinInput
                length={6}
                type="number"
                size="lg"
                value={otp}
                onChange={setOtp}
                oneTimeCode
              />
              {error && (
                <Alert color="red" radius="md" icon={<IconAlertCircle size={16} />} p="xs">
                  {error}
                </Alert>
              )}
            </Stack>

            <Button
              fullWidth size="md" radius="xl"
              loading={verifying}
              style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
              rightSection={<IconArrowRight size={16} />}
              onClick={verifyOtp}
            >
              Verify &amp; Continue
            </Button>

            <Text size="xs" ta="center" c="dimmed">
              Didn't receive it?{' '}
              <Text span fw={600} c={COLORS.tealBlue} style={{ cursor: 'pointer' }} onClick={sendOtp}>
                Resend code
              </Text>
            </Text>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

// ─── STEP 3 – Success ─────────────────────────────────────────────────────────
function StepSuccess() {
  return (
    <Paper shadow="xl" radius="xl" p={48} className="cs-enter">
      <Stack align="center" gap="lg" ta="center">
        <ThemeIcon size={96} radius="xl" color="teal" variant="light">
          <IconCircleCheck size={52} />
        </ThemeIcon>
        <Stack gap={6}>
          <Text fw={900} size="xl" c={COLORS.navyBlue}>Account Created!</Text>
          <Text c="dimmed" size="sm">You're all set. Redirecting to your dashboard…</Text>
        </Stack>
        <Progress value={100} size="sm" color="teal" w="100%" animated />
      </Stack>
    </Paper>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export function ClientSignup() {
  const navigate = useNavigate();
  const { signup } = useAuthStore();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<{
    fullName: string; email: string; password: string; phones: string[];
  } | null>(null);

  const handleInfoNext = (data: typeof formData) => {
    setFormData(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOtpVerified = () => {
    if (!formData) return;
    // Create account in the store
    signup({
      email: formData.email,
      password: formData.password,
      phone: formData.phones[0],
      role: 'client',
    });
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => navigate(ROUTES.clientDashboard), 2200);
  };

  const stepTitles = ['Personal Information', 'Phone Verification', 'Account Created'];
  const TOTAL = 3;

  return (
    <Shell step={step} totalSteps={TOTAL}>
      <Stack gap={20}>
        <StepLabel current={step} total={TOTAL} label={stepTitles[step - 1]} />

        {step === 1 && <StepInfo onNext={handleInfoNext} />}
        {step === 2 && formData && (
          <StepOtp
            phone={formData.phones[0]}
            onVerified={handleOtpVerified}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && <StepSuccess />}
      </Stack>
    </Shell>
  );
}
