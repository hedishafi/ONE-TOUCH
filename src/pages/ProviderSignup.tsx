/**
 * ProviderSignup.tsx — 3-step provider onboarding
 *   Step 1  Identity Verification  (ID upload → auto-extract → phone → agreement)
 *   Step 2  Phone & Biometric      (OTP → face scan with capture)
 *   Step 3  Profile Setup          (auto face pic, category, sub-services, bio? exp, pricing)
 */
import { useState } from 'react';
import {
  Box, Button, FileButton, Group, PasswordInput, Stack, Textarea,
  Text, TextInput, Badge, Center, Select, MultiSelect, SimpleGrid,
  NumberInput, Alert,
} from '@mantine/core';
import {
  IconArrowRight, IconMail, IconLock, IconUser,
  IconCircleCheck, IconCamera, IconShieldCheck, IconBriefcase,
  IconStar, IconInfoCircle, IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, ROUTES } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import {
  Shell, Card, CardHeader,
  StepIdentity, StepVerify,
  type IdentityResult,
} from './signup/shared';

// ─── Types ────────────────────────────────────────────────────────────────────
type PricingMethod = 'fixed' | 'platform_calculated';

interface ProviderProfileData {
  email: string;
  password: string;
  photoUrl: string | null;
  categoryId: string;
  subcategoryIds: string[];
  bio: string;
  yearsExp: number;
  pricingMethod: PricingMethod;
}

// ─── Step 3 – Provider Profile Setup ─────────────────────────────────────────
function StepProfileProvider({
  prefill, faceUrl, onComplete,
}: {
  prefill: IdentityResult;
  faceUrl: string | null;
  onComplete: (d: ProviderProfileData) => void;
}) {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [photoUrl, setPhotoUrl]     = useState<string | null>(faceUrl);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subIds, setSubIds]         = useState<string[]>([]);
  const [bio, setBio]               = useState('');
  const [yearsExp, setYearsExp]     = useState<number | string>(1);
  const [pricing, setPricing]       = useState<PricingMethod>('fixed');

  const handlePhoto = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = e => setPhotoUrl(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const catOptions  = MOCK_CATEGORIES.map(c => ({ value: c.id, label: c.name }));
  const selectedCat = MOCK_CATEGORIES.find(c => c.id === categoryId);
  const subOptions  = (selectedCat?.subcategories ?? []).map(s => ({ value: s.id, label: s.name }));

  const handleSubmit = () => {
    if (!/\S+@\S+\.\S+/.test(email)) { notifications.show({ title: 'Valid email required', color: 'yellow', message: '' }); return; }
    if (password.length < 6) { notifications.show({ title: 'Weak password', color: 'yellow', message: 'At least 6 characters.' }); return; }
    if (password !== confirm) { notifications.show({ title: 'Passwords do not match', color: 'red', message: '' }); return; }
    if (!categoryId) { notifications.show({ title: 'Category required', color: 'yellow', message: 'Select your service category.' }); return; }
    if (!subIds.length) { notifications.show({ title: 'Sub-service required', color: 'yellow', message: 'Select at least one sub-service.' }); return; }
    const exp = typeof yearsExp === 'string' ? parseInt(yearsExp, 10) : yearsExp;
    if (!exp || exp < 0) { notifications.show({ title: 'Experience required', color: 'yellow', message: 'Enter your years of experience.' }); return; }
    onComplete({ email, password, photoUrl, categoryId, subcategoryIds: subIds, bio, yearsExp: exp, pricingMethod: pricing });
  };

  const pricingOpts: { value: PricingMethod; label: string; desc: string }[] = [
    { value: 'fixed',               label: 'Fixed Price',         desc: 'You set a clear price per job' },
    { value: 'platform_calculated', label: 'Platform Calculated', desc: 'Price auto-calculated by ONE TOUCH' },
  ];

  return (
    <Card>
      <CardHeader icon={<IconBriefcase size={20} color={COLORS.navyBlue} />} title="Provider Profile" sub="Set up your profile to start receiving jobs" />

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
            <Text size="10px" fw={600} c="#718096">Verified Identity</Text>
            <Text fw={700} size="sm" c={COLORS.navyBlue}>{prefill.extracted.fullName}</Text>
          </Stack>
          <Badge color="teal" variant="light" size="sm">Verified</Badge>
        </Box>
      )}

      {/* Profile photo — auto from face scan */}
      <Stack gap={10} mb={22}>
        <Text size="12px" fw={700} c={COLORS.navyBlue} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Profile Photo
        </Text>
        <Group gap={16} align="flex-start">
          <Box w={72} h={72} style={{ borderRadius: '50%', overflow: 'hidden', border: `2px solid ${COLORS.tealBlue}40`, background: '#F0F2F9', flexShrink: 0 }}>
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
              {faceUrl ? 'Auto-filled from face scan · tap to change' : 'Optional — you can add this later'}
            </Text>
          </Stack>
        </Group>
      </Stack>

      <Box mb={20} style={{ height: 1, background: '#F0F2F7' }} />

      {/* Account credentials */}
      <Text size="12px" fw={700} c={COLORS.navyBlue} mb={12} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Account Credentials</Text>
      <Stack gap={12} mb={22}>
        <TextInput
          label="Email Address" placeholder="you@example.com" type="email"
          leftSection={<IconMail size={14} color="#A0AEC0" />}
          value={email} onChange={e => setEmail(e.currentTarget.value)}
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
        <TextInput
          label="Phone Number" value={prefill.selectedPhone} readOnly
          description="Verified phone from your identity document"
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

      <Box mb={20} style={{ height: 1, background: '#F0F2F7' }} />

      {/* Service category */}
      <Text size="12px" fw={700} c={COLORS.navyBlue} mb={12} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Services</Text>
      <Stack gap={12} mb={22}>
        <Select
          label="Service Category" placeholder="Select your primary category"
          data={catOptions} value={categoryId}
          onChange={v => { setCategoryId(v); setSubIds([]); }}
          leftSection={<IconBriefcase size={14} color="#A0AEC0" />}
          searchable
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
        {categoryId && (
          <MultiSelect
            label="Sub-services you offer"
            placeholder="Select one or more"
            data={subOptions} value={subIds} onChange={setSubIds}
            searchable
            styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
          />
        )}
        <Textarea
          label={<Text size="12px" fw={600} c={COLORS.navyBlue}>Bio <Text span fw={400} c="#A0AEC0">(optional)</Text></Text>}
          placeholder="Briefly describe your experience and what makes you the best choice for clients…"
          minRows={3} value={bio}
          onChange={e => setBio(e.currentTarget.value)}
          styles={{ input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
        <NumberInput
          label="Years of Experience"
          placeholder="e.g. 5"
          leftSection={<IconStar size={14} color="#A0AEC0" />}
          min={0} max={60}
          value={yearsExp}
          onChange={setYearsExp}
          required
          styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
        />
      </Stack>

      <Box mb={20} style={{ height: 1, background: '#F0F2F7' }} />

      {/* Pricing */}
      <Text size="12px" fw={700} c={COLORS.navyBlue} mb={10} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Payment Structure</Text>
      <Alert color="blue" icon={<IconInfoCircle size={13} />} radius={10} p={10} mb={14}>
        <Text size="xs">Per-hour pricing is not available to ensure full transparency and trust for clients.</Text>
      </Alert>
      <SimpleGrid cols={2} spacing={10} mb={24}>
        {pricingOpts.map(opt => (
          <Box
            key={opt.value}
            onClick={() => setPricing(opt.value)}
            style={{ cursor: 'pointer', borderRadius: 14, border: `1.5px solid ${pricing === opt.value ? COLORS.tealBlue : '#E4E9F2'}`, background: pricing === opt.value ? '#00808008' : 'white', padding: 14, transition: 'all 0.18s' }}
          >
            <Stack gap={6} align="center" ta="center">
              <Box w={30} h={30} style={{ borderRadius: 8, background: pricing === opt.value ? `${COLORS.tealBlue}18` : '#F7F8FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconCheck size={15} color={pricing === opt.value ? COLORS.tealBlue : '#CBD5E0'} strokeWidth={pricing === opt.value ? 3 : 2} />
              </Box>
              <Text size="12px" fw={700} c={pricing === opt.value ? COLORS.tealBlue : COLORS.navyBlue}>{opt.label}</Text>
              <Text size="10px" c="#718096">{opt.desc}</Text>
            </Stack>
          </Box>
        ))}
      </SimpleGrid>

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
          <Text size="sm" c="#718096" maw={320}>Your provider account is verified. Redirecting to your dashboard…</Text>
        </Stack>
        <SimpleGrid cols={3} spacing={10} w="100%">
          {['Identity Verified', 'Phone Verified', 'Face Matched'].map(label => (
            <Stack key={label} align="center" gap={6} p={10} style={{ borderRadius: 10, background: '#E6F4F1', border: '1px solid #C8EBE4' }}>
              <IconCircleCheck size={16} color={COLORS.tealBlue} />
              <Text size="10px" fw={600} c="#718096">{label}</Text>
            </Stack>
          ))}
        </SimpleGrid>
        <Box w="100%" style={{ height: 4, borderRadius: 2, background: '#E4E9F2', overflow: 'hidden' }}>
          <Box style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${COLORS.tealBlue}, ${COLORS.navyBlue})` }} />
        </Box>
      </Stack>
    </Card>
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export function ProviderSignup() {
  const navigate   = useNavigate();
  const { signup } = useAuthStore();
  const [step, setStep]         = useState(1);
  const [idResult, setIdResult] = useState<IdentityResult | null>(null);
  const [faceUrl, setFaceUrl]   = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [done, setDone]         = useState(false);

  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const onIdentity = (r: IdentityResult)   => { setIdResult(r); go(2); };
  const onVerified = (face: string | null) => { setFaceUrl(face); go(3); };

  const onProfile = (d: ProviderProfileData) => {
    if (!idResult) return;
    setProfileName(idResult.extracted.fullName ?? 'Provider');
    signup({ email: d.email, password: d.password, phone: idResult.selectedPhone, role: 'provider' });
    notifications.show({ title: 'Registration Complete!', message: 'Welcome to ONE TOUCH.', color: 'teal', icon: <IconCircleCheck size={15} /> });
    setDone(true);
    setTimeout(() => navigate(ROUTES.providerDashboard), 2600);
  };

  return (
    <Shell step={step}>
      {step === 1 && <StepIdentity onNext={onIdentity} />}
      {step === 2 && idResult && <StepVerify phone={idResult.selectedPhone} onDone={onVerified} onBack={() => go(1)} />}
      {step === 3 && !done && idResult && <StepProfileProvider prefill={idResult} faceUrl={faceUrl} onComplete={onProfile} />}
      {step === 3 && done && <StepDone name={profileName} />}
    </Shell>
  );
}
