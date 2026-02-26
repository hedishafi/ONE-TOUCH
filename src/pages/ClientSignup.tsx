/**
 * ClientSignup.tsx — Streamlined 2-step client onboarding
 * Step 1: Identity scan + OCR extraction + phone selection
 * Step 2: Phone OTP verification → account created → dashboard
 *
 * No biometric face scan. No password entry. Frictionless and fast.
 */
import { useState, useRef, useEffect } from 'react';
import {
  Box, Button, Center, Group, PinInput,
  Progress, Stack, Text, ThemeIcon, Alert, Anchor, Badge,
} from '@mantine/core';
import {
  IconShieldCheck, IconMessageCircle, IconArrowRight,
  IconChevronLeft, IconAlertCircle, IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES, MOCK_OTP } from '../utils/constants';
import { storage, STORAGE_KEYS } from '../utils/storage';
import type { User, ClientProfile } from '../types';
import {
  Shell, Card, CardHeader,
  StepIdentity,
  type IdentityResult,
} from './signup/shared';

// ─── Countdown hook ────────────────────────────────────────────────────────────
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

// ─── Step 2 – Phone OTP Verification ──────────────────────────────────────────
function StepPhoneOTP({
  idResult,
  onBack,
  onSuccess,
}: {
  idResult: IdentityResult;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState('');
  const [attempts, setAttempts] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const { seconds, begin }      = useCountdown(60);
  const { loginByPhoneOTP }     = useAuthStore();

  const MAX_ATTEMPTS = 5;
  const phone = idResult.selectedPhone;

  useEffect(() => { begin(); }, []); // start countdown on mount

  const createClientAccount = () => {
    const userId = `client-${Date.now()}`;
    const placeholderEmail = `client_${userId}@onetouch.local`;

    // Persist user
    const users = storage.get<User[]>(STORAGE_KEYS.users, []);
    const newUser: User = {
      id: userId,
      email: placeholderEmail,
      phone,
      role: 'client',
      createdAt: new Date().toISOString(),
      verificationStatus: 'verified',
    };
    users.push(newUser);
    storage.set(STORAGE_KEYS.users, users);

    // Persist client profile (all data from ID)
    const profiles = storage.get<ClientProfile[]>(STORAGE_KEYS.clientProfiles, []);
    profiles.push({
      userId,
      clientType: 'individual',
      fullName: idResult.extracted.fullName ?? 'User',
      idNumber: idResult.extracted.idNumber ?? idResult.extracted.passportNumber ?? idResult.extracted.licenseNumber ?? '',
      loyaltyTier: 'bronze',
      walletBalance: 0,
      totalBookings: 0,
    });
    storage.set(STORAGE_KEYS.clientProfiles, profiles);

    return phone;
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    setError('');
    if (val.length === 6) verify(val);
  };

  const verify = (code: string) => {
    if (attempts >= MAX_ATTEMPTS) {
      setError('Too many attempts. Please request a new code.');
      return;
    }
    if (code !== MOCK_OTP) {
      const remaining = MAX_ATTEMPTS - attempts - 1;
      setAttempts(a => a + 1);
      setError(`Incorrect code.${remaining > 0 ? ` ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : ' Please resend.'}`);
      return;
    }

    setVerifying(true);
    setTimeout(() => {
      const accountPhone = createClientAccount();
      const result = loginByPhoneOTP(accountPhone);
      setVerifying(false);
      if (!result.success) {
        setError(result.error ?? 'Sign in failed after verification.');
        return;
      }
      onSuccess();
    }, 600);
  };

  const handleResend = () => {
    if (seconds > 0) return;
    setOtp('');
    setError('');
    setAttempts(0);
    begin();
  };

  const locked = attempts >= MAX_ATTEMPTS;

  return (
    <Card>
      <CardHeader
        icon={<IconMessageCircle size={22} color={COLORS.tealBlue} />}
        title="Verify Your Phone"
        sub={`We sent a 6-digit code to ${phone}`}
      />

      {/* Demo hint */}
      <Alert
        icon={<IconShieldCheck size={14} />}
        color="teal"
        variant="light"
        radius="md"
        mb="lg"
      >
        Demo verification code: <strong>{MOCK_OTP}</strong>
      </Alert>

      {error && (
        <Alert icon={<IconAlertCircle size={14} />} color="red" radius="md" mb="lg">
          {error}
        </Alert>
      )}

      <Stack gap="xl">
        {/* OTP input */}
        <Box>
          <Text size="sm" fw={600} c="var(--ot-text-navy)" mb={12} ta="center">
            Enter 6-digit code
          </Text>
          <Center>
            <PinInput
              length={6}
              type="number"
              size="lg"
              value={otp}
              onChange={handleOtpChange}
              disabled={locked || verifying}
              autoFocus
            />
          </Center>
        </Box>

        {verifying && (
          <Box ta="center">
            <Text size="sm" c="var(--ot-text-sub)">Verifying…</Text>
          </Box>
        )}

        {/* Actions */}
        <Group justify="space-between">
          <Anchor
            size="sm"
            onClick={onBack}
            style={{ color: COLORS.tealBlue, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <IconChevronLeft size={14} /> Change number
          </Anchor>
          <Anchor
            size="sm"
            onClick={handleResend}
            style={{
              color: seconds > 0 || locked ? 'var(--ot-text-muted)' : COLORS.tealBlue,
              cursor: seconds > 0 || locked ? 'default' : 'pointer',
            }}
          >
            {seconds > 0 ? `Resend in ${seconds}s` : locked ? 'Max attempts reached' : 'Resend code'}
          </Anchor>
        </Group>

        {/* Security note */}
        <Box
          p={12}
          style={{ borderRadius: 10, background: 'var(--ot-bg-row)', border: '1px solid var(--ot-border)' }}
        >
          <Group gap={8} wrap="nowrap">
            <IconCheck size={14} color={COLORS.tealBlue} style={{ flexShrink: 0 }} />
            <Text size="xs" c="var(--ot-text-muted)">
              Your identity was verified from the scanned document. No additional steps required after this.
            </Text>
          </Group>
        </Box>
      </Stack>
    </Card>
  );
}

// ─── Done Screen ──────────────────────────────────────────────────────────────
function StepDone({ name }: { name: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setPct(p => { if (p >= 100) { clearInterval(iv); return 100; } return p + 5; }), 110);
    return () => clearInterval(iv);
  }, []);
  return (
    <Card>
      <Stack align="center" gap={24} py={12}>
        <Box
          w={80} h={80}
          style={{
            borderRadius: '50%',
            background: `${COLORS.tealBlue}14`,
            border: `2.5px solid ${COLORS.tealBlue}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <IconShieldCheck size={40} color={COLORS.tealBlue} />
        </Box>
        <Stack gap={6} align="center">
          <Text fw={900} size="xl" c={COLORS.navyBlue}>Welcome, {name.split(' ')[0]}!</Text>
          <Text size="sm" c="var(--ot-text-sub)" ta="center">
            Your account is ready. Taking you to your dashboard…
          </Text>
        </Stack>
        <Stack gap={10} w="100%">
          {[
            'Identity document verified',
            'Phone number confirmed',
            'Profile created from your ID',
          ].map(label => (
            <Group key={label} gap={8}>
              <Box
                w={20} h={20}
                style={{
                  borderRadius: '50%',
                  background: `${COLORS.tealBlue}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <IconCheck size={11} color={COLORS.tealBlue} strokeWidth={3} />
              </Box>
              <Text size="sm" c="var(--ot-text-sub)">{label}</Text>
            </Group>
          ))}
        </Stack>
        <Box w="100%">
          <Progress value={pct} color="teal" radius="xl" size="sm" animated />
        </Box>
      </Stack>
    </Card>
  );
}

// ─── ClientSignup Orchestrator ────────────────────────────────────────────────
export function ClientSignup() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(1);
  const [idResult, setIdResult]     = useState<IdentityResult | null>(null);
  const [profileName, setProfileName] = useState('');
  const [done, setDone]             = useState(false);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const go = (n: number) => { setStep(n); scrollTop(); };

  const handleIdentityDone = (r: IdentityResult) => {
    setIdResult(r);
    go(2);
  };

  const handleOtpSuccess = () => {
    const name = idResult?.extracted.fullName ?? 'User';
    setProfileName(name);
    setDone(true);
    scrollTop();
    setTimeout(() => navigate(ROUTES.clientDashboard, { replace: true }), 2200);
  };

  return (
    <Shell step={done ? 3 : step} labels={['Identity', 'Phone Verify', 'Complete']}>
      {done ? (
        <StepDone name={profileName} />
      ) : step === 1 ? (
        <StepIdentity onNext={handleIdentityDone} />
      ) : step === 2 && idResult ? (
        <StepPhoneOTP
          idResult={idResult}
          onBack={() => go(1)}
          onSuccess={handleOtpSuccess}
        />
      ) : null}
    </Shell>
  );
}
