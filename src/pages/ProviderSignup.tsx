/**
 * ProviderSignup.tsx — 3-step provider onboarding
 * Step 1: Identity  | Step 2: Phone & Biometric | Step 3: Provider Profile
 *
 * Step 3 includes: email/password, service category, sub-services,
 * optional bio, required years of experience, fixed/platform pricing.
 * Biometric face photo auto-fills profile picture.
 */
import { useState, useEffect } from 'react';
import {
  Box, Button, FileButton, Group, MultiSelect,
  PasswordInput, Progress, Select, Stack, Text,
  Avatar, Badge, SimpleGrid, Textarea, NumberInput,
} from '@mantine/core';
import {
  IconShieldCheck, IconArrowRight, IconCamera, IconLock,
  IconBriefcase, IconCircleCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES } from '../utils/constants';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import {
  Shell, Card, CardHeader,
  StepIdentity, StepVerify,
  type IdentityResult,
} from './signup/shared';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProviderProfileData {
  password: string;
  photoUrl: string | null;
  categoryId: string;
  subcategoryIds: string[];
  priceMin: number | null;
  priceMax: number | null;
  yearsOfExperience: number | null;
  whatMakesYouSpecial: string;
}

// ─── Step 3 – Provider Profile Setup ─────────────────────────────────────────
function StepProfileProvider({
  prefill,
  faceUrl,
  onBack: _onBack,
  onDone,
}: {
  prefill: IdentityResult;
  faceUrl: string | null;
  onBack: () => void;
  onDone: (data: ProviderProfileData) => void;
}) {
  const [photoUrl, setPhotoUrl]               = useState<string | null>(faceUrl);
  const [password, setPassword]               = useState('');
  const [confirm, setConfirm]                 = useState('');
  const [categoryId, setCategoryId]           = useState('');
  const [subcategoryIds, setSubcategoryIds]   = useState<string[]>([]);
  const [priceMin, setPriceMin]               = useState<number | null>(null);
  const [priceMax, setPriceMax]               = useState<number | null>(null);
  const [yearsOfExperience, setYearsOfExperience] = useState<number | null>(null);
  const [whatMakesYouSpecial, setWhatMakesYouSpecial] = useState('');
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const { categories } = useServiceCatalog();

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Category → sub-service options
  const selectedCategory = categories.find(c => c.id === categoryId);
  const subOptions = selectedCategory?.subcategories?.map(s => ({ value: s.id, label: s.name })) ?? [];

  const validate = () => {
    const e: Record<string, string> = {};
    if (password.length < 6)              e.password = 'Password must be at least 6 characters';
    if (password !== confirm)             e.confirm = 'Passwords do not match';
    if (!categoryId)                      e.category = 'Please select a service category';
    if (subcategoryIds.length === 0)      e.subcategory = 'Please select at least one sub-service';
    if (priceMin !== null && priceMax !== null && priceMin >= priceMax)
      e.priceRange = 'Min price must be less than max price';
    if (priceMin !== null && priceMax !== null && priceMin > 0 && priceMax > priceMin * 6)
      e.priceRange = 'Price range is too wide. Max price cannot exceed 500% above minimum.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onDone({ password, photoUrl, categoryId, subcategoryIds, priceMin, priceMax, yearsOfExperience, whatMakesYouSpecial });
  };

  const displayName = prefill.extracted.fullName ?? 'Provider';

  return (
    <Card>
      <CardHeader
        icon={<IconBriefcase size={22} color={COLORS.navyBlue} />}
        title="Provider Profile Setup"
        sub="Set up your service profile to start receiving job requests"
      />

      {/* Identity verification summary */}
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

      <Stack gap={18}>
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
              {faceUrl && photoUrl === faceUrl ? (
                <Text size="10px" c="var(--ot-text-muted)">Auto-filled from face scan · tap to change</Text>
              ) : (
                <Text size="10px" c="var(--ot-text-muted)">Upload a clear professional photo</Text>
              )}
            </Stack>
          </Group>
        </Box>

        {/* Passwords */}
        <SimpleGrid cols={2} spacing={12}>
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
          <PasswordInput
            label="Confirm Password"
            placeholder="Re-enter password"
            leftSection={<IconLock size={15} />}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            error={errors.confirm}
            size="sm"
            styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
          />
        </SimpleGrid>

        {/* Verified phone removed from profile setup UI */}

        {/* Service Category */}
        <Box>
          <Select
            label="Service Category"
            placeholder="Select your main service area"
            data={categories.map(c => ({ value: c.id, label: c.name }))}
            value={categoryId}
            onChange={v => { setCategoryId(v ?? ''); setSubcategoryIds([]); }}
            error={errors.category}
            size="sm"
            searchable
            styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
          />
        </Box>

        {/* Sub-services */}
        {categoryId && (
          <Box>
            <MultiSelect
              label="Sub-Services"
              placeholder="Select all that apply"
              data={subOptions}
              value={subcategoryIds}
              onChange={setSubcategoryIds}
              error={errors.subcategory}
              size="sm"
              searchable
              styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
            />
          </Box>
        )}

        {/* Payment structure removed — default platform/negotiated pricing will be used */}

        {/* Price Range (optional) */}
        <Box>
          <Text size="sm" fw={600} c="var(--ot-text-navy)" mb={6}>
            Price Range (ETB) <Text component="span" size="xs" c="var(--ot-text-muted)" fw={400}>— optional</Text>
          </Text>
          <SimpleGrid cols={2} spacing={10}>
            <NumberInput
              placeholder="Min (e.g. 200)"
              prefix="ETB "
              min={0}
              value={priceMin ?? ''}
              onChange={v => setPriceMin(v === '' ? null : Number(v))}
              size="sm"
              styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
            />
            <NumberInput
              placeholder="Max (e.g. 800)"
              prefix="ETB "
              min={0}
              value={priceMax ?? ''}
              onChange={v => setPriceMax(v === '' ? null : Number(v))}
              size="sm"
              error={errors.priceRange}
              styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
            />
          </SimpleGrid>
          <Text size="10px" c="var(--ot-text-muted)" mt={4}>
            Set a price range so clients know what to expect. Leave blank to negotiate per job.
          </Text>
          <Box mt={6} p={8} style={{ borderRadius: 8, background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.25)' }}>
            <Text size="xs" fw={600} style={{ color: '#C0392B' }}>
              ⚠️ Per-hour payments are disabled on this platform to prevent fraud.
            </Text>
          </Box>
        </Box>

        {/* Years of Experience (optional) */}
        <NumberInput
          label={
            <Text size="sm" fw={600} c="var(--ot-text-navy)">
              Years of Experience <Text component="span" size="xs" c="var(--ot-text-muted)" fw={400}>— optional</Text>
            </Text>
          }
          placeholder="e.g. 5"
          min={0}
          max={50}
          value={yearsOfExperience ?? ''}
          onChange={v => setYearsOfExperience(v === '' ? null : Number(v))}
          size="sm"
          styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
        />

        {/* What Makes You Special (optional) */}
        <Textarea
          label={
            <Text size="sm" fw={600} c="var(--ot-text-navy)">
              What Makes You Special <Text component="span" size="xs" c="var(--ot-text-muted)" fw={400}>— optional</Text>
            </Text>
          }
          placeholder="Tell clients what sets you apart — certifications, unique skills, approach to work…"
          value={whatMakesYouSpecial}
          onChange={e => setWhatMakesYouSpecial(e.target.value)}
          minRows={3}
          maxRows={5}
          size="sm"
          autosize
          styles={{ label: { fontWeight: 600, color: 'var(--ot-text-navy)' } }}
        />

        <Button
          fullWidth
          size="md"
          mt={4}
          rightSection={<IconArrowRight size={16} />}
          onClick={handleSubmit}
          style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)` }}
        >
          Complete Registration
        </Button>
      </Stack>
    </Card>
  );
}

// ─── Done Screen ──────────────────────────────────────────────────────────────
function StepDone({ name }: { name: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setPct(p => { if (p >= 100) { clearInterval(iv); return 100; } return p + 4; }), 110);
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
            Your provider profile has been created. Taking you to your dashboard…
          </Text>
        </Stack>
        <Stack gap={8} w="100%">
          {['Identity Verification', 'Phone Verification', 'Face Scan'].map(label => (
            <Group key={label} gap={8}>
              <Box
                w={22} h={22}
                style={{
                  borderRadius: '50%',
                  background: `${COLORS.tealBlue}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <IconCircleCheck size={14} color={COLORS.tealBlue} />
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

// ─── ProviderSignup Orchestrator ──────────────────────────────────────────────
export function ProviderSignup() {
  const navigate  = useNavigate();
  const { signup, loginByUserId } = useAuthStore();
  const [step, setStep]         = useState(1);
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

  const handleProfileDone = (data: ProviderProfileData) => {
    if (!idResult) return;
    const name = idResult.extracted.fullName ?? 'Provider';
    const placeholderEmail = `provider_${Date.now()}@onetouch.local`;
    const result = signup({ email: placeholderEmail, password: data.password, phone: idResult.selectedPhone, role: 'provider' });
    if (!result.success) {
      notifications.show({ title: 'Sign up failed', message: result.error, color: 'red' });
      return;
    }
    // Authenticate the newly created user so ProtectedRoute lets them through
    if (result.userId) {
      loginByUserId(result.userId);
    }
    setProfileName(name);
    setDone(true);
    scrollTop();
    setTimeout(() => navigate(ROUTES.providerDashboard), 2600);
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
        <StepProfileProvider
          prefill={idResult}
          faceUrl={faceUrl}
          onBack={() => go(2)}
          onDone={handleProfileDone}
        />
      ) : null}
    </Shell>
  );
}
