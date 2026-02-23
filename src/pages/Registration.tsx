import { useState } from 'react';
import {
  Box, Button, Center, Container, Group, Paper, Stack, Text,
  ThemeIcon, SimpleGrid, Stepper, TextInput, FileButton,
  Progress, Alert, PinInput, Badge, Select, Textarea,
  NumberInput, Checkbox, MultiSelect, Slider,
} from '@mantine/core';
import {
  IconShieldCheck, IconUser, IconBuilding, IconUpload,
  IconCamera, IconScan, IconPhoneCall, IconMail, IconCheck,
  IconMapPin, IconClock, IconPhoto, IconCurrencyDollar,
  IconBriefcase,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { COLORS, MOCK_OTP, ROUTES } from '../utils/constants';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { storage, STORAGE_KEYS } from '../utils/storage';
import type { ClientProfile, ProviderProfile } from '../types';

// ─── CLIENT TYPE SELECTION ─────────────────────────────────────────────────────
export function ClientTypeSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <RegisterShell title="What type of client?" subtitle="Select how you'll be using ONE TOUCH">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
        {[
          {
            icon: <IconUser size={36} />,
            label: t('register.individual'),
            desc: 'Personal services for everyday needs. Upload a government ID to verify your identity.',
            path: ROUTES.individualRegister,
            color: 'navy',
          },
          {
            icon: <IconBuilding size={36} />,
            label: t('register.business'),
            desc: 'Business account for companies or organizations. Upload business registration documents.',
            path: ROUTES.businessRegister,
            color: 'teal',
          },
        ].map(item => (
          <Box
            key={item.path}
            p="xl"
            style={{
              borderRadius: 20,
              border: `2px solid #E9ECEF`,
              background: 'white',
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(27,42,74,0.06)',
            }}
            onClick={() => navigate(item.path)}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = COLORS.tealBlue;
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#E9ECEF';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <Stack align="center" gap="md" ta="center">
              <ThemeIcon size={72} radius="xl" color={item.color as any} variant="light">
                {item.icon}
              </ThemeIcon>
              <Text fw={700} size="lg" c={COLORS.navyBlue}>{item.label}</Text>
              <Text size="sm" c="dimmed" lh={1.6}>{item.desc}</Text>
              <Button
                variant="light"
                color={item.color as any}
                rightSection={<IconArrowRight size={14} />}
                size="sm"
              >
                Select
              </Button>
            </Stack>
          </Box>
        ))}
      </SimpleGrid>
    </RegisterShell>
  );
}

// ─── INDIVIDUAL CLIENT REGISTRATION ───────────────────────────────────────────
export function IndividualClientRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrDone, setOcrDone] = useState(false);
  const [extractedData, setExtractedData] = useState({ fullName: '', idNumber: '' });
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const simulateOcr = () => {
    setOcrProgress(0);
    const interval = setInterval(() => {
      setOcrProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setOcrDone(true);
          setExtractedData({ fullName: 'Abebe Girma', idNumber: 'ETH-ID-' + Math.floor(Math.random() * 9000000 + 1000000) });
          return 100;
        }
        return p + 10;
      });
    }, 150);
  };

  const handleIdUpload = (file: File | null) => {
    setIdFile(file);
    if (file) simulateOcr();
  };

  const verifyPhone = () => {
    if (phoneOtp === MOCK_OTP) {
      notifications.show({ title: 'Phone Verified!', message: 'Your phone number is confirmed.', color: 'teal' });
      setActive(2);
    } else {
      notifications.show({ title: 'Invalid OTP', message: `Use ${MOCK_OTP} for demo`, color: 'red' });
    }
  };

  const verifyEmail = () => {
    if (emailOtp === MOCK_OTP) {
      // Save mock client profile
      const profiles = storage.get<ClientProfile[]>(STORAGE_KEYS.clientProfiles, []);
      profiles.push({
        userId: `client-${Date.now()}`,
        clientType: 'individual',
        fullName: extractedData.fullName,
        idNumber: extractedData.idNumber,
        loyaltyTier: 'bronze',
        walletBalance: 0,
        totalBookings: 0,
      });
      storage.set(STORAGE_KEYS.clientProfiles, profiles);
      notifications.show({ title: '🎉 Registration Complete!', message: 'Welcome to ONE TOUCH!', color: 'teal' });
      navigate(ROUTES.clientDashboard);
    } else {
      notifications.show({ title: 'Invalid OTP', message: `Use ${MOCK_OTP} for demo`, color: 'red' });
    }
  };

  return (
    <RegisterShell title="Individual Client Registration" subtitle="Step-by-step verification">
      <Stepper active={active} color="teal" size="sm" mb="xl" onStepClick={setActive}>
        <Stepper.Step icon={<IconScan size={16} />} label="ID Upload" />
        <Stepper.Step icon={<IconPhoneCall size={16} />} label="Phone OTP" />
        <Stepper.Step icon={<IconMail size={16} />} label="Email OTP" />
      </Stepper>

      {active === 0 && (
        <Stack gap="lg">
          <Alert color="blue" radius="md" icon={<IconShieldCheck size={14} />}>
            Your ID is used only for identity verification and is stored securely. We never share it.
          </Alert>

          <Group gap="md" align="flex-start" wrap="wrap">
            {/* ID Upload */}
            <Box flex={1} miw={200}>
              <Text size="sm" fw={600} mb="xs">{t('register.upload_id')}</Text>
              <FileButton onChange={handleIdUpload} accept="image/*,.pdf">
                {(props) => (
                  <Box
                    p="xl"
                    {...props}
                    style={{
                      borderRadius: 16,
                      border: `2px dashed ${idFile ? COLORS.tealBlue : '#DEE2E6'}`,
                      background: idFile ? `${COLORS.tealBlue}05` : '#F8F9FA',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <ThemeIcon size={48} radius="xl" color={idFile ? 'teal' : 'gray'} variant="light" mx="auto" mb="sm">
                      {idFile ? <IconCheck size={24} /> : <IconUpload size={24} />}
                    </ThemeIcon>
                    <Text size="sm" fw={600} c={idFile ? 'teal' : 'dimmed'}>
                      {idFile ? idFile.name : 'Click to upload ID'}
                    </Text>
                    <Text size="xs" c="dimmed">JPG, PNG or PDF</Text>
                  </Box>
                )}
              </FileButton>
            </Box>

            {/* Selfie Upload */}
            <Box flex={1} miw={200}>
              <Text size="sm" fw={600} mb="xs">{t('register.upload_selfie')}</Text>
              <FileButton onChange={setSelfieFile} accept="image/*">
                {(props) => (
                  <Box
                    p="xl"
                    {...props}
                    style={{
                      borderRadius: 16,
                      border: `2px dashed ${selfieFile ? COLORS.navyBlue : '#DEE2E6'}`,
                      background: selfieFile ? `${COLORS.navyBlue}05` : '#F8F9FA',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <ThemeIcon size={48} radius="xl" color={selfieFile ? 'navy' : 'gray'} variant="light" mx="auto" mb="sm">
                      {selfieFile ? <IconCheck size={24} /> : <IconCamera size={24} />}
                    </ThemeIcon>
                    <Text size="sm" fw={600} c={selfieFile ? COLORS.navyBlue : 'dimmed'}>
                      {selfieFile ? selfieFile.name : 'Click to take selfie'}
                    </Text>
                    <Text size="xs" c="dimmed">Live liveness check</Text>
                  </Box>
                )}
              </FileButton>
            </Box>
          </Group>

          {/* OCR Progress */}
          {idFile && !ocrDone && (
            <Box>
              <Text size="sm" c="dimmed" mb="xs">{t('register.extracting')}</Text>
              <Progress value={ocrProgress} color="teal" animated radius="xl" />
            </Box>
          )}

          {/* Extracted data */}
          {ocrDone && (
            <Box p="md" style={{ background: `${COLORS.tealBlue}08`, borderRadius: 12, border: `1px solid ${COLORS.tealBlue}30` }}>
              <Group gap="xs" mb="sm">
                <IconScan size={16} color={COLORS.tealBlue} />
                <Text size="sm" fw={600} c={COLORS.tealBlue}>Data Extracted Successfully</Text>
                <Badge size="xs" color="teal">Auto-filled</Badge>
              </Group>
              <SimpleGrid cols={2}>
                <TextInput label="Full Name" value={extractedData.fullName} onChange={e => setExtractedData(d => ({ ...d, fullName: e.target.value }))} />
                <TextInput label="ID Number" value={extractedData.idNumber} onChange={e => setExtractedData(d => ({ ...d, idNumber: e.target.value }))} />
              </SimpleGrid>
            </Box>
          )}

          <Button
            fullWidth
            size="md"
            disabled={!ocrDone}
            onClick={() => setActive(1)}
            style={{ background: COLORS.navyBlue }}
          >
            Continue to Phone Verification
          </Button>
        </Stack>
      )}

      {active === 1 && (
        <Stack gap="lg">
          <Alert color="teal" icon={<IconPhoneCall size={14} />}>
            {t('register.otp_sent')} <strong>+251 9XX XXX XXX</strong>. {t('register.otp_enter')}.
          </Alert>
          <Text size="sm" c="dimmed">Demo OTP: <strong>123456</strong></Text>
          <PinInput
            length={6}
            value={phoneOtp}
            onChange={setPhoneOtp}
            size="lg"
            mx="auto"
            type="number"
          />
          <Button fullWidth size="md" onClick={verifyPhone} style={{ background: COLORS.tealBlue }}>
            {t('register.verify')}
          </Button>
        </Stack>
      )}

      {active === 2 && (
        <Stack gap="lg">
          <Alert color="navy" icon={<IconMail size={14} />}>
            {t('register.otp_sent')} <strong>your email</strong>. {t('register.otp_enter')}.
          </Alert>
          <Text size="sm" c="dimmed">Demo OTP: <strong>123456</strong></Text>
          <PinInput
            length={6}
            value={emailOtp}
            onChange={setEmailOtp}
            size="lg"
            mx="auto"
            type="number"
          />
          <Button fullWidth size="md" onClick={verifyEmail}
            style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)` }}>
            {t('register.complete')}
          </Button>
        </Stack>
      )}
    </RegisterShell>
  );
}

// ─── BUSINESS CLIENT REGISTRATION ─────────────────────────────────────────────
export function BusinessClientRegister() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrDone, setOcrDone] = useState(false);
  const [extracted, setExtracted] = useState({ businessName: '', taxId: '', address: '' });
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');

  const simulateOcr = (file: File | null) => {
    setDocFile(file);
    if (!file) return;
    setOcrProgress(0);
    const iv = setInterval(() => {
      setOcrProgress(p => {
        if (p >= 100) {
          clearInterval(iv);
          setOcrDone(true);
          setExtracted({ businessName: 'Haile Trading PLC', taxId: 'TIN-' + Math.floor(Math.random() * 9000000 + 1000000), address: 'Bole Road, Addis Ababa' });
          return 100;
        }
        return p + 8;
      });
    }, 180);
  };

  const finish = () => {
    if (emailOtp === MOCK_OTP) {
      notifications.show({ title: '🎉 Business Account Ready!', message: 'Welcome to ONE TOUCH Business.', color: 'teal' });
      navigate(ROUTES.clientDashboard);
    } else {
      notifications.show({ title: 'Invalid OTP', message: 'Use 123456 for demo', color: 'red' });
    }
  };

  return (
    <RegisterShell title="Business Client Registration" subtitle="Verify your business identity">
      <Stepper active={active} color="teal" size="sm" mb="xl">
        <Stepper.Step icon={<IconBuilding size={16} />} label="Documents" />
        <Stepper.Step icon={<IconPhoneCall size={16} />} label="Phone OTP" />
        <Stepper.Step icon={<IconMail size={16} />} label="Email OTP" />
      </Stepper>

      {active === 0 && (
        <Stack gap="lg">
          <FileButton onChange={simulateOcr} accept="image/*,.pdf">
            {(props) => (
              <Box
                p="xl"
                {...props}
                style={{
                  borderRadius: 16,
                  border: `2px dashed ${docFile ? COLORS.tealBlue : '#DEE2E6'}`,
                  background: docFile ? `${COLORS.tealBlue}05` : '#F8F9FA',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <ThemeIcon size={56} radius="xl" color={docFile ? 'teal' : 'gray'} variant="light" mx="auto" mb="sm">
                  {docFile ? <IconCheck size={28} /> : <IconUpload size={28} />}
                </ThemeIcon>
                <Text fw={600} c={docFile ? 'teal' : 'dimmed'}>{docFile ? docFile.name : 'Upload Business Registration Documents'}</Text>
                <Text size="xs" c="dimmed">Certificate of Incorporation, Tax Registration, etc.</Text>
              </Box>
            )}
          </FileButton>

          {docFile && !ocrDone && (
            <Box>
              <Text size="sm" c="dimmed" mb="xs">Extracting business data...</Text>
              <Progress value={ocrProgress} color="teal" animated radius="xl" />
            </Box>
          )}
          {ocrDone && (
            <Stack gap="sm">
              <Badge color="teal" size="sm" w="fit-content">OCR Extracted Data</Badge>
              <TextInput label="Business Name" value={extracted.businessName} onChange={e => setExtracted(d => ({ ...d, businessName: e.target.value }))} />
              <TextInput label="Tax ID" value={extracted.taxId} onChange={e => setExtracted(d => ({ ...d, taxId: e.target.value }))} />
              <TextInput label="Business Address" value={extracted.address} onChange={e => setExtracted(d => ({ ...d, address: e.target.value }))} />
            </Stack>
          )}
          <Button fullWidth size="md" disabled={!ocrDone} onClick={() => setActive(1)} style={{ background: COLORS.navyBlue }}>
            Continue
          </Button>
        </Stack>
      )}

      {active === 1 && (
        <Stack gap="lg" align="center">
          <Text size="sm" c="dimmed">Demo OTP: <strong>123456</strong></Text>
          <PinInput length={6} value={phoneOtp} onChange={setPhoneOtp} size="lg" type="number" />
          <Button fullWidth size="md" onClick={() => { if (phoneOtp === MOCK_OTP) setActive(2); else notifications.show({ title: 'Wrong OTP', message: 'Use 123456', color: 'red' }); }} style={{ background: COLORS.tealBlue }}>
            Verify Phone
          </Button>
        </Stack>
      )}

      {active === 2 && (
        <Stack gap="lg" align="center">
          <Text size="sm" c="dimmed">Demo OTP: <strong>123456</strong></Text>
          <PinInput length={6} value={emailOtp} onChange={setEmailOtp} size="lg" type="number" />
          <Button fullWidth size="md" onClick={finish} style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)` }}>
            Complete Registration
          </Button>
        </Stack>
      )}
    </RegisterShell>
  );
}

// ─── PROVIDER REGISTRATION ─────────────────────────────────────────────────────
export function ProviderRegister() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pricingModel, setPricingModel] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState<number>(50);
  const [coverageRadius, setCoverageRadius] = useState(10);
  const [bio, setBio] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  const catOptions = MOCK_CATEGORIES.map(c => ({ value: c.id, label: c.name }));
  const selectedCat = MOCK_CATEGORIES.find(c => c.id === selectedCategory);
  const subcatOptions = selectedCat?.subcategories.map(s => ({ value: s.id, label: s.name })) ?? [];

  const simOcr = (file: File | null) => {
    setIdFile(file);
    if (!file) return;
    setOcrProgress(0);
    const iv = setInterval(() => {
      setOcrProgress(p => {
        if (p >= 100) { clearInterval(iv); setOcrDone(true); return 100; }
        return p + 12;
      });
    }, 120);
  };

  const finish = () => {
    if (emailOtp === MOCK_OTP) {
      notifications.show({ title: '🎉 Provider Profile Created!', message: 'You can now receive jobs on ONE TOUCH.', color: 'teal' });
      navigate(ROUTES.providerDashboard);
    } else {
      notifications.show({ title: 'Wrong OTP', message: 'Use 123456 for demo', color: 'red' });
    }
  };

  return (
    <RegisterShell title="Service Provider Registration" subtitle="Get verified and start earning">
      <Stepper active={active} color="teal" size="sm" mb="xl" onStepClick={(s) => s < active && setActive(s)}>
        <Stepper.Step icon={<IconScan size={14} />} label="ID Verify" />
        <Stepper.Step icon={<IconPhoneCall size={14} />} label="Phone" />
        <Stepper.Step icon={<IconBriefcase size={14} />} label="Service" />
        <Stepper.Step icon={<IconMapPin size={14} />} label="Location" />
        <Stepper.Step icon={<IconCheck size={14} />} label="Done" />
      </Stepper>

      {active === 0 && (
        <Stack gap="lg">
          <Alert color="blue" icon={<IconShieldCheck size={14} />}>
            Upload your government ID + selfie for identity verification.
          </Alert>
          <Group gap="md" align="flex-start" wrap="wrap">
            <Box flex={1} miw={200}>
              <FileButton onChange={simOcr} accept="image/*">
                {(props) => (
                  <Box p="xl" {...props} style={{ borderRadius: 16, border: `2px dashed ${idFile ? COLORS.tealBlue : '#DEE2E6'}`, background: '#F8F9FA', cursor: 'pointer', textAlign: 'center' }}>
                    <ThemeIcon size={48} radius="xl" color={idFile ? 'teal' : 'gray'} variant="light" mx="auto" mb="sm">
                      {idFile ? <IconCheck size={24} /> : <IconUpload size={24} />}
                    </ThemeIcon>
                    <Text size="sm" fw={600} c={idFile ? 'teal' : 'dimmed'}>{idFile ? 'ID Uploaded' : 'Upload Government ID'}</Text>
                  </Box>
                )}
              </FileButton>
            </Box>
            <Box flex={1} miw={200}>
              <Box p="xl" style={{ borderRadius: 16, border: `2px dashed #DEE2E6`, background: '#F8F9FA', textAlign: 'center', cursor: 'pointer' }}>
                <ThemeIcon size={48} radius="xl" color="gray" variant="light" mx="auto" mb="sm">
                  <IconCamera size={24} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">Take Selfie</Text>
                <Text size="xs" c="dimmed">Live liveness check</Text>
              </Box>
            </Box>
          </Group>
          {idFile && !ocrDone && (
            <Box>
              <Text size="sm" c="dimmed" mb="xs">Verifying identity...</Text>
              <Progress value={ocrProgress} color="teal" animated radius="xl" />
            </Box>
          )}
          {ocrDone && <Alert color="teal" icon={<IconCheck size={14} />}>Identity verified successfully!</Alert>}
          <Button fullWidth size="md" disabled={!ocrDone} onClick={() => setActive(1)} style={{ background: COLORS.navyBlue }}>
            Continue to Phone Verification
          </Button>
        </Stack>
      )}

      {active === 1 && (
        <Stack gap="lg" align="center">
          <Text size="sm" c="dimmed">Demo OTP: <strong>123456</strong></Text>
          <PinInput length={6} value={phoneOtp} onChange={setPhoneOtp} size="lg" type="number" />
          <Button fullWidth size="md" onClick={() => { if (phoneOtp === MOCK_OTP) setActive(2); else notifications.show({ title: 'Wrong OTP', message: 'Use 123456', color: 'red' }); }} style={{ background: COLORS.tealBlue }}>
            Verify Phone & Continue
          </Button>
        </Stack>
      )}

      {active === 2 && (
        <Stack gap="lg">
          <Select label="Primary Service Category" data={catOptions} value={selectedCategory} onChange={setSelectedCategory} placeholder="Select category" />
          {selectedCat && (
            <Select label="Subcategory" data={subcatOptions} placeholder="Select subcategory" />
          )}
          <Select
            label="Pricing Model"
            data={[
              { value: 'hourly', label: '⏱ Hourly Rate' },
              { value: 'fixed', label: '💰 Fixed Price' },
              { value: 'custom', label: '🤝 Custom Estimate' },
            ]}
            value={pricingModel}
            onChange={setPricingModel}
          />
          {pricingModel === 'hourly' && (
            <NumberInput label="Hourly Rate (USD)" value={hourlyRate} onChange={(v) => setHourlyRate(Number(v))} prefix="$" min={10} />
          )}
          {pricingModel === 'fixed' && (
            <NumberInput label="Fixed Price (USD)" prefix="$" min={10} />
          )}
          <Textarea label="Bio / Description" placeholder="Tell clients about your experience and expertise..." value={bio} onChange={e => setBio(e.target.value)} rows={3} />
          <Button fullWidth size="md" disabled={!selectedCategory || !pricingModel} onClick={() => setActive(3)} style={{ background: COLORS.navyBlue }}>
            Continue to Location & Availability
          </Button>
        </Stack>
      )}

      {active === 3 && (
        <Stack gap="lg">
          <Alert color="teal" icon={<IconMapPin size={14} />}>
            Your location is used to match you with nearby clients. Only approximate location is shared with clients.
          </Alert>
          <Box p="md" style={{ background: `${COLORS.tealBlue}10`, borderRadius: 12, border: `1px solid ${COLORS.tealBlue}30`, textAlign: 'center' }}>
            <IconMapPin size={32} color={COLORS.tealBlue} />
            <Text size="sm" fw={600} mt="xs">Detecting your location...</Text>
            <Badge color="teal" mt="xs">Addis Ababa, ET · 9.0320°N, 38.7469°E</Badge>
          </Box>
          <Box>
            <Text size="sm" fw={600} mb="xs">Service Coverage Radius: {coverageRadius} km</Text>
            <Slider
              value={coverageRadius}
              onChange={setCoverageRadius}
              min={1}
              max={50}
              step={1}
              marks={[{ value: 5, label: '5km' }, { value: 20, label: '20km' }, { value: 50, label: '50km' }]}
              color="teal"
            />
          </Box>
          <Checkbox
            label="Set status to Online immediately after registration"
            checked={isOnline}
            onChange={e => setIsOnline(e.currentTarget.checked)}
            color="teal"
          />
          <Button fullWidth size="md" onClick={() => setActive(4)} style={{ background: COLORS.navyBlue }}>
            Continue to Final Step
          </Button>
        </Stack>
      )}

      {active === 4 && (
        <Stack gap="lg" align="center">
          <Alert color="teal" icon={<IconCheck size={14} />}>
            Almost done! Verify your email to activate your provider account.
          </Alert>
          <Text size="sm" c="dimmed">Demo OTP: <strong>123456</strong></Text>
          <PinInput length={6} value={emailOtp} onChange={setEmailOtp} size="lg" type="number" />
          <Button fullWidth size="md" onClick={finish}
            style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)` }}>
            Complete Registration
          </Button>
        </Stack>
      )}
    </RegisterShell>
  );
}

// ─── SHARED SHELL ──────────────────────────────────────────────────────────────
function RegisterShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const navigate = useNavigate();
  return (
    <Box style={{ minHeight: '100vh', background: `linear-gradient(150deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 40%, ${COLORS.tealBlue}40 100%)` }}>
      <Group justify="space-between" p="md" px="xl">
        <Group gap="sm" onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
          <Box w={36} h={36} style={{ borderRadius: 10, background: COLORS.lemonYellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconShieldCheck size={18} color={COLORS.navyBlue} stroke={2.5} />
          </Box>
          <Text fw={800} size="lg" c="white">ONE TOUCH</Text>
        </Group>
        <LanguageSwitcher />
      </Group>
      <Center p="md" pb="xl">
        <Container size={600} w="100%">
          <Paper shadow="xl" radius="xl" p={40}>
            <Stack gap="xl">
              <Stack gap={4} align="center">
                <Text fw={800} size="xl" c={COLORS.navyBlue}>{title}</Text>
                <Text c="dimmed" size="sm">{subtitle}</Text>
              </Stack>
              {children}
            </Stack>
          </Paper>
        </Container>
      </Center>
      <AIHelpCenter />
    </Box>
  );
}

function IconArrowRight({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
