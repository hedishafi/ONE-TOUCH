/**
 * ClientSignup.tsx — 3-step client onboarding
 *   Step 1  Identity Verification  (ID upload → auto-extract → phone → agreement)
 *   Step 2  Phone & Biometric      (OTP → face scan)
 *   Step 3  Profile Setup
 */
import { useState } from 'react';
import {
  Box, Button, FileButton, Group, PasswordInput, Stack,
  Text, TextInput, Badge, Center,
} from '@mantine/core';
import {
  IconArrowRight, IconMail, IconLock, IconUser,
  IconCircleCheck, IconCamera, IconShieldCheck, IconPhone,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, ROUTES } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import {
  Shell, Card, CardHeader,
  StepIdentity, StepVerify,
  type IdentityResult,
} from './signup/shared';

// ─── Step 3 – Client Profile Setup ───────────────────────────────────────────
interface ProfileData { displayName: string; email: string; password: string; photoUrl: string | null; }

function StepProfileClient({
  prefill, faceUrl, onComplete,
}: {
  prefill: IdentityResult;
  faceUrl: string | null;
  onComplete: (d: ProfileData) => void;
}) {
  const [displayName, setDisplayName] = useState(prefill.extracted.fullName ?? '');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [photoUrl, setPhotoUrl]       = useState<string | null>(faceUrl);

  const handlePhoto = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = e => setPhotoUrl(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = () => {
    if (!displayName.trim()) { notifications.show({ title: 'Name required', color: 'yellow', message: 'Enter your display name.' }); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { notifications.show({ title: 'Valid email required', color: 'yellow', message: '' }); return; }
    if (password.length < 6) { notifications.show({ title: 'Weak password', color: 'yellow', message: 'At least 6 characters.' }); return; }
    if (password !== confirm) { notifications.show({ title: 'Passwords do not match', color: 'red', message: '' }); return; }
    onComplete({ displayName, email, password, photoUrl });
  };

  return (
    <Card>
      <CardHeader icon={<IconUser size={20} color={COLORS.navyBlue} />} title="Profile Setup" sub="Confirm your details to complete registration" />

      {/* Verified identity bar */}
      {prefill.extracted.fullName && (
        <Box p={12} mb={20} style={{ borderRadius: 12, background: '#E6F4F1', border: '1px solid #B2DFDB', display: 'flex', alignItems: 'center', gap: 12 }}>
          {photoUrl ? (
            <Box w={40} h={40} style={{ borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              <img src={photoUrl} alt="Face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          ) : (
            <Box w={40} h={40} style={{ borderRadius: '50%', background: '#C8EBE4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IconShieldCheck size={18} color={COLORS.tealBlue} />
            </Box>
          )}
          <Stack gap={0} flex={1}>
            <Text size="10px" fw={600} c="#718096">Identity Verified</Text>
            <Text fw={700} size="sm" c={COLORS.navyBlue}>{prefill.extracted.fullName}</Text>
          </Stack>
          <Badge color="teal" variant="light" size="sm">Verified</Badge>
        </Box>
      )}

      {/* Profile photo */}
      <Stack gap={10} mb={22}>
        <Text size="12px" fw={700} c={COLORS.navyBlue} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Profile Photo <Text span fw={400} c="#A0AEC0" size="11px">(optional)</Text>
        </Text>
        <Group gap={16} align="flex-start">
          <Box w={72} h={72} style={{ borderRadius: '50%', overflow: 'hidden', border: `2px solid ${COLORS.tealBlue}30`, background: '#F0F2F9', flexShrink: 0 }}>
            {photoUrl
              ? <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Center h="100%"><IconCamera size={24} color="#CBD5E0" /></Center>
            }
          </Box>
          <Stack gap={4} justify="center">
            <FileButton onChange={handlePhoto} accept="image/*">
              {p => <Button {...p} variant="light" color="teal" size="sm" radius="xl">Update Photo</Button>}
            </FileButton>
            <Text size="11px" c="#A0AEC0">
              {faceUrl ? 'Using your face scan — tap to update' : 'You can add this later in settings'}
            </Text>
          </Stack>
        </Group>
      </Stack>

      <Box mb={20} style={{ height: 1, background: '#F0F2F7' }} />

      {/* Account fields */}
      <Stack gap={14} mb={24}>
        <TextInput
          label="Display Name" placeholder="How should we call you?"
          leftSection={<IconUser size={14} color="#A0AEC0" />}
          value={displayName} onChange={e => setDisplayName(e.currentTarget.value)}
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
        <TextInput
          label="Email Address" placeholder="you@example.com" type="email"
          leftSection={<IconMail size={14} color="#A0AEC0" />}
          value={email} onChange={e => setEmail(e.currentTarget.value)}
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
        <TextInput
          label="Phone Number" value={prefill.selectedPhone} readOnly
          leftSection={<IconPhone size={14} color="#A0AEC0" />}
          description="From your verified identity document"
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2', background: '#F7F8FC' } }}
        />
        <PasswordInput
          label="Create Password" placeholder="At least 6 characters"
          leftSection={<IconLock size={14} color="#A0AEC0" />}
          value={password} onChange={e => setPassword(e.currentTarget.value)}
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
        <PasswordInput
          label="Confirm Password" placeholder="Repeat your password"
          leftSection={<IconLock size={14} color="#A0AEC0" />}
          value={confirm} onChange={e => setConfirm(e.currentTarget.value)}
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
      </Stack>

      <Button
        fullWidth size="md" radius="xl"
        rightSection={<IconArrowRight size={16} />}
        style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})`, fontWeight: 700 }}
        onClick={handleSubmit}
      >
        Complete Registration
      </Button>
    </Card>
  );
}

// ─── Done ─────────────────────────────────────────────────────────────────────
function StepDone({ name }: { name: string }) {
  return (
    <Card>
      <Stack align="center" gap={24} ta="center" py={16}>
        <Box w={88} h={88} style={{ borderRadius: '50%', background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCircleCheck size={50} color={COLORS.tealBlue} strokeWidth={1.4} />
        </Box>
        <Stack gap={6}>
          <Text fw={900} size="xl" c={COLORS.navyBlue}>Welcome, {name.split(' ')[0]}!</Text>
          <Text size="sm" c="#718096" maw={300}>Your account is verified and ready. Taking you to your dashboard…</Text>
        </Stack>
        <Box w="100%" style={{ height: 4, borderRadius: 2, background: '#E4E9F2', overflow: 'hidden' }}>
          <Box style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }} />
        </Box>
      </Stack>
    </Card>
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export function ClientSignup() {
  const navigate   = useNavigate();
  const { signup } = useAuthStore();
  const [step, setStep]         = useState(1);
  const [idResult, setIdResult] = useState<IdentityResult | null>(null);
  const [faceUrl, setFaceUrl]   = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [done, setDone]         = useState(false);

  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const onIdentity = (r: IdentityResult)    => { setIdResult(r); go(2); };
  const onVerified = (face: string | null)  => { setFaceUrl(face); go(3); };

  const onProfile = (d: ProfileData) => {
    if (!idResult) return;
    setProfileName(d.displayName);
    signup({ email: d.email, password: d.password, phone: idResult.selectedPhone, role: 'client' });
    setDone(true);
    setTimeout(() => navigate(ROUTES.clientDashboard), 2400);
  };

  return (
    <Shell step={step}>
      {step === 1 && <StepIdentity onNext={onIdentity} />}
      {step === 2 && idResult && <StepVerify phone={idResult.selectedPhone} onDone={onVerified} onBack={() => go(1)} />}
      {step === 3 && !done && idResult && <StepProfileClient prefill={idResult} faceUrl={faceUrl} onComplete={onProfile} />}
      {step === 3 && done && <StepDone name={profileName} />}
    </Shell>
  );
}
