/**
 * ClientSignup.tsx — 3-step client onboarding
 * Step 1: Identity  | Step 2: Phone & Biometric | Step 3: Password + Photo
 *
 * Per spec: clients do NOT fill profile forms — all info comes from scanned ID.
 * Only password creation and optional profile photo update at Step 3.
 */
import { useState, useEffect } from 'react';
import {
  Box, Button, FileButton, Group, PasswordInput,
  Progress, Stack, Text, Avatar, Badge,
} from '@mantine/core';
import {
  IconCheck, IconCamera, IconArrowRight, IconLock,
  IconShieldCheck, IconUser,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES } from '../utils/constants';
import {
  Shell, Card, CardHeader,
  StepIdentity, StepVerify,
  type IdentityResult,
} from './signup/shared';

// ─── Step 3 – Password + Photo (Client) ───────────────────────────────────────
function StepProfileClient({
  prefill,
  faceUrl,
  onBack,
  onDone,
}: {
  prefill: IdentityResult;
  faceUrl: string | null;
  onBack: () => void;
  onDone: (password: string, photoUrl: string | null) => void;
}) {
  const [photoUrl, setPhotoUrl]         = useState<string | null>(faceUrl);
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [errors, setErrors]             = useState<Record<string, string>>({});

  // Password strength
  const strength =
    password.length === 0 ? 0
    : password.length < 6 ? 20
    : password.length < 10 ? 50
    : /[A-Z]/.test(password) && /[0-9!@#$%^&*]/.test(password) ? 100
    : 75;
  const strengthLabel = strength === 0 ? '' : strength <= 20 ? 'Too short' : strength <= 50 ? 'Weak' : strength <= 75 ? 'Fair' : 'Strong';
  const strengthColor = strength <= 20 ? 'red' : strength <= 50 ? 'orange' : strength <= 75 ? 'yellow' : 'teal';

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (password.length < 6)  e.password = 'Password must be at least 6 characters';
    if (password !== confirm) e.confirm  = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onDone(password, photoUrl);
  };

  const displayName = prefill.extracted.fullName ?? 'User';

  return (
    <Card>
      <CardHeader
        icon={<IconUser size={22} color={COLORS.navyBlue} />}
        title="Complete Your Account"
        sub="Create a password to secure your account — your profile is already set up from your ID"
      />

      {/* Identity summary banner */}
      <Box
        p={16}
        mb={24}
        style={{
          borderRadius: 12,
          background: 'var(--ot-bg-row)',
          border: '1px solid var(--ot-border)',
        }}
      >
        <Group gap={12}>
          <Avatar
            src={photoUrl}
            size={48}
            radius="xl"
            color="teal"
            style={{ border: `2px solid ${COLORS.tealBlue}` }}
          >
            {displayName[0]}
          </Avatar>
          <Stack gap={3}>
            <Text fw={700} size="sm" c="var(--ot-text-navy)">{displayName}</Text>
            <Group gap={6}>
              <Badge size="xs" color="teal" variant="dot">Identity Verified</Badge>
              <Badge size="xs" color="blue" variant="dot">Phone Verified</Badge>
              <Badge size="xs" color="green" variant="dot">Biometric Verified</Badge>
            </Group>
          </Stack>
        </Group>
      </Box>

      <Stack gap={16}>
        {/* Profile photo */}
        <Box>
          <Text size="sm" fw={600} c="var(--ot-text-navy)" mb={10}>Profile Photo</Text>
          <Group gap={14} align="center">
            <Avatar
              src={photoUrl}
              size={64}
              radius="xl"
              color="teal"
              style={{ border: `2.5px solid ${COLORS.tealBlue}` }}
            >
              {displayName[0]}
            </Avatar>
            <Stack gap={4}>
              <FileButton onChange={handlePhoto} accept="image/*">
                {(p) => (
                  <Button
                    {...p}
                    variant="light"
                    color="teal"
                    size="xs"
                    leftSection={<IconCamera size={13} />}
                  >
                    {photoUrl ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                )}
              </FileButton>
              {faceUrl && photoUrl === faceUrl && (
                <Text size="10px" c="var(--ot-text-muted)">Auto-filled from face scan · tap to change</Text>
              )}
            </Stack>
          </Group>
        </Box>

        {/* Password fields */}
        <PasswordInput
          label="Password"
          placeholder="Min. 6 characters"
          leftSection={<IconLock size={15} />}
          value={password}
          onChange={e => setPassword(e.target.value)}
          error={errors.password}
          size="sm"
          styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
        />

        {/* Password strength indicator */}
        {password.length > 0 && (
          <Box mt={-8}>
            <Progress value={strength} color={strengthColor} size="xs" radius="xl" />
            <Text size="10px" c={strengthColor} mt={4} fw={600}>{strengthLabel}</Text>
          </Box>
        )}

        <PasswordInput
          label="Confirm Password"
          placeholder="Re-enter your password"
          leftSection={<IconLock size={15} />}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          error={errors.confirm}
          size="sm"
          styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
        />

        {/* Verified phone (read-only) */}
        <Box
          p={12}
          style={{
            borderRadius: 10,
            background: 'var(--ot-bg-row)',
            border: '1px solid var(--ot-border)',
          }}
        >
          <Text size="xs" c="var(--ot-text-muted)" mb={2}>Verified Phone Number</Text>
          <Group gap={6}>
            <Text size="sm" fw={600} c={COLORS.tealBlue}>{prefill.selectedPhone}</Text>
            <Badge size="xs" color="teal" leftSection={<IconCheck size={9} />} variant="light">Verified</Badge>
          </Group>
        </Box>

        <Button
          fullWidth
          size="md"
          mt={4}
          rightSection={<IconArrowRight size={16} />}
          onClick={handleSubmit}
          style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)` }}
        >
          Create Account
        </Button>
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
            Your account has been created successfully. Taking you to your dashboard…
          </Text>
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
  const navigate  = useNavigate();
  const { signup } = useAuthStore();
  const [step, setStep]       = useState(1);
  const [idResult, setIdResult] = useState<IdentityResult | null>(null);
  const [faceUrl, setFaceUrl]   = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [done, setDone]         = useState(false);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const go = (n: number) => { setStep(n); scrollTop(); };

  const handleIdentityDone = (r: IdentityResult) => {
    setIdResult(r);
    go(2);
  };

  const handleBioDone = (url: string | null) => {
    setFaceUrl(url);
    go(3);
  };

  const handleProfileDone = (password: string, photoUrl: string | null) => {
    if (!idResult) return;
    const name = idResult.extracted.fullName ?? 'User';
    const placeholderEmail = `user_${Date.now()}@onetouch.local`;
    const result = signup({ email: placeholderEmail, password, phone: idResult.selectedPhone, role: 'client' });
    if (!result.success) {
      notifications.show({ title: 'Sign up failed', message: result.error, color: 'red' });
      return;
    }
    setProfileName(name);
    setDone(true);
    scrollTop();
    setTimeout(() => navigate(ROUTES.clientDashboard), 2400);
  };

  return (
    <Shell step={done ? 3 : step}>
      {done && profileName ? (
        <StepDone name={profileName} />
      ) : step === 1 ? (
        <StepIdentity onNext={handleIdentityDone} />
      ) : step === 2 && idResult ? (
        <StepVerify
          phone={idResult.selectedPhone}
          onBack={() => go(1)}
          onDone={handleBioDone}
        />
      ) : step === 3 && idResult ? (
        <StepProfileClient
          prefill={idResult}
          faceUrl={faceUrl}
          onBack={() => go(2)}
          onDone={handleProfileDone}
        />
      ) : null}
    </Shell>
  );
}
