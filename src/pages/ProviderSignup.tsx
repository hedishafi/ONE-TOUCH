/**
 * ProviderSignup.tsx
 * Full multi-step verification onboarding for service providers:
 *   Step 1 – Identity type → Upload → Auto-extract → Dynamic form
 *   Step 2 – Phone number(s) + OTP verification
 *   Step 3 – Biometric face scan & match against ID photo
 *   Step 4 – Profile setup (category, sub-services, bio, photo, pricing)
 *   Step 5 – Complete → Provider Dashboard
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Button, Center, Container, Group, Paper,
  PinInput, Progress, Stack, Text, TextInput, ThemeIcon, ActionIcon,
  Alert, Select, MultiSelect, Textarea, FileButton, Badge, Divider,
  SimpleGrid, RingProgress, Loader,
} from '@mantine/core';
import {
  IconShieldCheck, IconShieldLock, IconArrowRight, IconArrowLeft,
  IconPhone, IconUser, IconPlus, IconTrash, IconMessageCircle,
  IconCircleCheck, IconAlertCircle, IconUpload, IconCamera,
  IconScan, IconFileText, IconIdBadge, IconBriefcase,
  IconPhoto, IconInfoCircle, IconCheck, IconX,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, MOCK_OTP, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { useAuthStore } from '../store/authStore';
import { MOCK_CATEGORIES } from '../mock/mockServices';

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes fadeUp    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes pulseScan { 0%,100%{box-shadow:0 0 0 0 rgba(0,128,128,0.4)} 50%{box-shadow:0 0 0 20px rgba(0,128,128,0)} }
@keyframes scanLine  { 0%{top:0%} 100%{top:100%} }
.ps-enter   { animation: fadeUp 0.45s ease both; }
.ps-scan-ring { animation: pulseScan 2s ease-in-out infinite; }
.ps-scan-line {
  position: absolute; left:0; right:0; height:3px;
  background: linear-gradient(90deg, transparent, ${COLORS.tealBlue}, transparent);
  animation: scanLine 2s linear infinite;
}
.ps-id-card {
  cursor: pointer;
  border: 2px solid #E9ECEF;
  border-radius: 16px;
  background: white;
  transition: all 0.2s;
}
.ps-id-card:hover, .ps-id-card.selected {
  border-color: ${COLORS.tealBlue};
  background: ${COLORS.tealBlue}08;
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type IdType   = 'passport' | 'driving_license' | 'national_id' | 'kebele_id';
type PricingMethod = 'fixed' | 'platform_calculated';

interface IdentityField {
  key: string;
  label: string;
  placeholder: string;
}

// ─── Identity field schemas ────────────────────────────────────────────────────
const ID_FIELDS: Record<IdType, IdentityField[]> = {
  passport: [
    { key: 'fullName',       label: 'Full Name (as on passport)',    placeholder: 'e.g. TESFAYE ALMAZ BEKELE' },
    { key: 'passportNumber', label: 'Passport Number',               placeholder: 'e.g. EP1234567' },
    { key: 'nationality',    label: 'Nationality',                   placeholder: 'e.g. Ethiopian' },
    { key: 'dateOfBirth',    label: 'Date of Birth',                 placeholder: 'DD/MM/YYYY' },
    { key: 'gender',         label: 'Gender',                        placeholder: 'Male / Female' },
    { key: 'placeOfBirth',   label: 'Place of Birth',                placeholder: 'e.g. Addis Ababa' },
    { key: 'issueDate',      label: 'Issue Date',                    placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',     label: 'Expiry Date',                   placeholder: 'DD/MM/YYYY' },
    { key: 'issuingCountry', label: 'Issuing Country',               placeholder: 'e.g. Ethiopia' },
    { key: 'mrz',            label: 'MRZ Line (optional)',           placeholder: 'Machine-readable zone text' },
  ],
  driving_license: [
    { key: 'fullName',        label: 'Full Name',                    placeholder: 'As shown on license' },
    { key: 'licenseNumber',   label: 'License Number',               placeholder: 'e.g. DL-12345678' },
    { key: 'licenseClass',    label: 'License Class / Category',     placeholder: 'e.g. Class B, Class C' },
    { key: 'dateOfBirth',     label: 'Date of Birth',                placeholder: 'DD/MM/YYYY' },
    { key: 'gender',          label: 'Gender',                       placeholder: 'Male / Female' },
    { key: 'address',         label: 'Registered Address',           placeholder: 'Address on license' },
    { key: 'issueDate',       label: 'Issue Date',                   placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',      label: 'Expiry Date',                  placeholder: 'DD/MM/YYYY' },
    { key: 'issuingAuthority',label: 'Issuing Authority / Office',   placeholder: 'e.g. Addis Ababa Transport Bureau' },
  ],
  national_id: [
    { key: 'fullName',        label: 'Full Name',                    placeholder: 'As shown on ID' },
    { key: 'idNumber',        label: 'ID Number',                    placeholder: 'e.g. ETH-NIDA-XXXXXXXX' },
    { key: 'dateOfBirth',     label: 'Date of Birth',                placeholder: 'DD/MM/YYYY' },
    { key: 'gender',          label: 'Gender',                       placeholder: 'Male / Female' },
    { key: 'nationality',     label: 'Nationality',                  placeholder: 'Ethiopian' },
    { key: 'region',          label: 'Region / Sub-City',            placeholder: 'e.g. Addis Ababa' },
    { key: 'woreda',          label: 'Woreda',                       placeholder: 'e.g. Bole' },
    { key: 'issueDate',       label: 'Issue Date',                   placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',      label: 'Expiry Date',                  placeholder: 'DD/MM/YYYY' },
  ],
  kebele_id: [
    { key: 'fullName',        label: 'Full Name',                    placeholder: 'As shown on Kebele ID' },
    { key: 'kebeleIdNumber',  label: 'Kebele ID Number',             placeholder: 'e.g. KID-XXXXXX' },
    { key: 'dateOfBirth',     label: 'Date of Birth',                placeholder: 'DD/MM/YYYY' },
    { key: 'gender',          label: 'Gender',                       placeholder: 'Male / Female' },
    { key: 'fatherName',      label: "Father's Name",                placeholder: "Father's full name" },
    { key: 'kebele',          label: 'Kebele Name / Number',         placeholder: 'e.g. Kebele 02' },
    { key: 'subCity',         label: 'Sub-City / Woreda',            placeholder: 'e.g. Bole Sub-City' },
    { key: 'issueDate',       label: 'Issue Date',                   placeholder: 'DD/MM/YYYY' },
  ],
};

// ─── Mock OCR extraction per ID type ─────────────────────────────────────────
const MOCK_EXTRACTED: Record<IdType, Record<string, string>> = {
  passport: {
    fullName: 'BEKELE ALMAZ TESFAYE', passportNumber: 'EP7291045', nationality: 'Ethiopian',
    dateOfBirth: '15/03/1990', gender: 'Female', placeOfBirth: 'Addis Ababa',
    issueDate: '10/01/2020', expiryDate: '09/01/2030', issuingCountry: 'Ethiopia', mrz: '',
  },
  driving_license: {
    fullName: 'TESFAYE GIRMA', licenseNumber: 'DL-54892316', licenseClass: 'Class B',
    dateOfBirth: '22/07/1988', gender: 'Male', address: 'Bole Sub-City, Addis Ababa',
    issueDate: '05/06/2019', expiryDate: '04/06/2024', issuingAuthority: 'Addis Ababa Transport Bureau',
  },
  national_id: {
    fullName: 'YONAS HAILE BEKELE', idNumber: 'ETH-NIDA-20041987-AA', dateOfBirth: '04/09/1987',
    gender: 'Male', nationality: 'Ethiopian', region: 'Addis Ababa',
    woreda: 'Bole', issueDate: '12/02/2022', expiryDate: '11/02/2032',
  },
  kebele_id: {
    fullName: 'SELAMAWIT DAWIT', kebeleIdNumber: 'KID-081234', dateOfBirth: '30/11/1995',
    gender: 'Female', fatherName: 'DAWIT HAILE', kebele: 'Kebele 05', subCity: 'Kirkos Sub-City', issueDate: '08/04/2021',
  },
};

// ─── Shared shell ─────────────────────────────────────────────────────────────
function Shell({ children, step, totalSteps }: { children: React.ReactNode; step: number; totalSteps: number }) {
  const navigate = useNavigate();
  const progress = (step / totalSteps) * 100;
  const stepLabels = ['Identity', 'Phone', 'Face Scan', 'Profile', 'Done'];

  return (
    <Box style={{ minHeight: '100vh', background: `linear-gradient(150deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 45%, ${COLORS.tealBlue}35 100%)`, display: 'flex', flexDirection: 'column' }}>
      <style>{STYLES}</style>

      <Group justify="space-between" p="md" px="xl">
        <Group gap="sm" onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
          <Box w={38} h={38} style={{ borderRadius: 12, background: COLORS.lemonYellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconShieldCheck size={20} color={COLORS.navyBlue} stroke={2.5} />
          </Box>
          <Text fw={800} size="lg" c="white">ONE TOUCH</Text>
        </Group>
        <LanguageSwitcher />
      </Group>

      {/* Step dots (desktop) */}
      <Group justify="center" gap={0} py="sm" style={{ background: 'rgba(0,0,0,0.15)' }}>
        {stepLabels.map((label, i) => {
          const done    = i + 1 < step;
          const current = i + 1 === step;
          return (
            <Group key={label} gap={0} align="center">
              <Stack gap={2} align="center">
                <Box
                  w={28} h={28}
                  style={{
                    borderRadius: '50%',
                    background: done ? COLORS.tealBlue : current ? COLORS.lemonYellow : 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}
                >
                  {done
                    ? <IconCheck size={14} color="white" />
                    : <Text size="xs" fw={700} c={current ? COLORS.navyBlue : 'rgba(255,255,255,0.6)'}>{i + 1}</Text>
                  }
                </Box>
                <Text size="10px" fw={current ? 700 : 400} c={current ? COLORS.lemonYellow : 'rgba(255,255,255,0.5)'}>{label}</Text>
              </Stack>
              {i < stepLabels.length - 1 && (
                <Box w={40} h={2} mx={4} mb={16} style={{ background: done ? COLORS.tealBlue : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
              )}
            </Group>
          );
        })}
      </Group>

      <Progress value={progress} size="xs" color="teal" style={{ borderRadius: 0 }} />

      <Center flex={1} py={32} px="md">
        <Container size={680} w="100%">
          {children}
        </Container>
      </Center>
      <AIHelpCenter />
    </Box>
  );
}

// ─── STEP 1 – Identity Verification ──────────────────────────────────────────
function StepIdentity({ onNext }: {
  onNext: (data: { idType: IdType; idFields: Record<string, string>; phones: string[] }) => void;
}) {
  const [idType, setIdType]           = useState<IdType | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadDone, setUploadDone]   = useState(false);
  const [extracting, setExtracting]   = useState(false);
  const [extracted, setExtracted]     = useState<Record<string, string>>({});
  const [phones, setPhones]           = useState(['']);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFileUpload = (file: File | null) => {
    if (!file || !idType) return;
    // Generate preview
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setUploadDone(true);
      setExtracting(true);
      // Simulate OCR extraction
      setTimeout(() => {
        setExtracted(MOCK_EXTRACTED[idType]);
        setExtracting(false);
        notifications.show({
          title: 'Information Extracted',
          message: 'Fields have been auto-filled from your document. Please review and correct if needed.',
          color: 'teal',
          icon: <IconScan size={18} />,
        });
      }, 2200);
    }, 1000);
  };

  const addPhone = () => { if (phones.length < 2) setPhones([...phones, '']); };
  const removePhone = (i: number) => setPhones(phones.filter((_, idx) => idx !== i));
  const setPhone = (i: number, v: string) => { const a = [...phones]; a[i] = v; setPhones(a); };

  const handleContinue = () => {
    if (!idType) { notifications.show({ title: 'Select ID type', message: 'Choose an identity document type.', color: 'yellow' }); return; }
    if (!uploadDone) { notifications.show({ title: 'Upload required', message: 'Please upload your identity document.', color: 'yellow' }); return; }
    if (extracting) { notifications.show({ title: 'Please wait', message: 'Extraction in progress…', color: 'yellow' }); return; }
    const missing = ID_FIELDS[idType].filter(f => !['mrz'].includes(f.key) && !extracted[f.key]?.trim());
    if (missing.length > 0) { notifications.show({ title: 'Missing fields', message: `Please fill: ${missing.map(f => f.label).join(', ')}.`, color: 'yellow' }); return; }
    const validPhones = phones.filter(p => p.trim().length >= 7);
    if (validPhones.length === 0) { notifications.show({ title: 'Phone required', message: 'Add at least one phone number.', color: 'yellow' }); return; }
    onNext({ idType, idFields: extracted, phones: validPhones });
  };

  const idCards: { type: IdType; label: string; icon: React.ReactNode; desc: string }[] = [
    { type: 'passport',        label: 'Passport',       icon: <IconFileText size={26} />,  desc: 'International travel document' },
    { type: 'driving_license', label: 'Driving License',icon: <IconIdBadge size={26} />,   desc: 'Class B, C, or other' },
    { type: 'national_id',     label: 'National ID',    icon: <IconShieldLock size={26} />, desc: 'Ethiopian NIDA card' },
    { type: 'kebele_id',       label: 'Kebele ID',      icon: <IconUser size={26} />,       desc: 'Local/community ID' },
  ];

  return (
    <Paper shadow="xl" radius="xl" p={40} className="ps-enter">
      <Stack gap="xl">
        <Stack gap={4} align="center">
          <ThemeIcon size={60} radius="xl" color="teal" variant="light">
            <IconShieldLock size={30} />
          </ThemeIcon>
          <Text fw={800} size="xl" c={COLORS.navyBlue}>Identity Verification</Text>
          <Text c="dimmed" size="sm" ta="center">
            Your identity will be securely verified to ensure a trusted marketplace
          </Text>
        </Stack>

        {/* ID type selection */}
        <Stack gap="sm">
          <Text fw={700} size="sm" c={COLORS.navyBlue}>1 · Select Identity Document Type</Text>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            {idCards.map(card => (
              <Box
                key={card.type}
                className={`ps-id-card${idType === card.type ? ' selected' : ''}`}
                p="md"
                onClick={() => {
                  setIdType(card.type);
                  setUploadDone(false);
                  setExtracted({});
                  setImagePreview(null);
                }}
              >
                <Stack gap={6} align="center" ta="center">
                  <ThemeIcon size={44} radius="xl" color={idType === card.type ? 'teal' : 'gray'} variant={idType === card.type ? 'filled' : 'light'}>
                    {card.icon}
                  </ThemeIcon>
                  <Text fw={700} size="xs" c={idType === card.type ? COLORS.tealBlue : COLORS.navyBlue}>{card.label}</Text>
                  <Text size="10px" c="dimmed" lh={1.4}>{card.desc}</Text>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>

        {/* Upload section */}
        {idType && (
          <Stack gap="sm">
            <Text fw={700} size="sm" c={COLORS.navyBlue}>2 · Upload Document Image</Text>
            <Box
              p="xl"
              style={{
                borderRadius: 16,
                border: `2px dashed ${uploadDone ? COLORS.tealBlue : '#CCC'}`,
                background: uploadDone ? `${COLORS.tealBlue}06` : '#FAFAFA',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              {imagePreview ? (
                <Stack align="center" gap="sm">
                  <Box style={{ position: 'relative', display: 'inline-block', borderRadius: 12, overflow: 'hidden' }}>
                    <img src={imagePreview} alt="ID preview" style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 12, display: 'block' }} />
                    {uploading && (
                      <Box style={{ position: 'absolute', inset: 0, background: 'rgba(0,128,128,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader color="white" size="md" />
                      </Box>
                    )}
                    {extracting && (
                      <Box style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,128,0.5)', overflow: 'hidden' }}>
                        <Box className="ps-scan-line" />
                      </Box>
                    )}
                  </Box>
                  {uploadDone && !extracting && (
                    <Badge color="teal" leftSection={<IconCheck size={12} />} variant="light">
                      Document uploaded & information extracted
                    </Badge>
                  )}
                  {extracting && (
                    <Badge color="blue" leftSection={<Loader size={10} />} variant="light">
                      Scanning & extracting information…
                    </Badge>
                  )}
                  <FileButton onChange={handleFileUpload} accept="image/*">
                    {(props) => (
                      <Button {...props} variant="subtle" color="teal" size="xs" leftSection={<IconUpload size={14} />}>
                        Replace image
                      </Button>
                    )}
                  </FileButton>
                </Stack>
              ) : (
                <Stack align="center" gap="md">
                  <ThemeIcon size={56} radius="xl" color="gray" variant="light">
                    <IconUpload size={26} />
                  </ThemeIcon>
                  <Stack gap={4}>
                    <Text fw={600} size="sm" c={COLORS.navyBlue}>Upload your {idCards.find(c => c.type === idType)?.label}</Text>
                    <Text size="xs" c="dimmed">JPG, PNG or PDF · Max 10 MB</Text>
                  </Stack>
                  <FileButton onChange={handleFileUpload} accept="image/*,application/pdf">
                    {(props) => (
                      <Button {...props} variant="light" color="teal" leftSection={<IconUpload size={16} />}>
                        Choose File
                      </Button>
                    )}
                  </FileButton>
                </Stack>
              )}
            </Box>
          </Stack>
        )}

        {/* Auto-extracted form fields */}
        {uploadDone && !extracting && idType && (
          <Stack gap="sm">
            <Group gap="xs">
              <Text fw={700} size="sm" c={COLORS.navyBlue}>3 · Review Extracted Information</Text>
              <Badge color="teal" variant="light" size="sm">Auto-filled</Badge>
            </Group>
            <Alert color="blue" icon={<IconInfoCircle size={16} />} radius="md" p="xs">
              <Text size="xs">Fields were auto-extracted from your document. Please review and correct any errors before continuing.</Text>
            </Alert>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {ID_FIELDS[idType].map(field => (
                <TextInput
                  key={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={extracted[field.key] ?? ''}
                  onChange={e => setExtracted(prev => ({ ...prev, [field.key]: e.currentTarget.value }))}
                />
              ))}
            </SimpleGrid>
          </Stack>
        )}

        {/* Phone numbers */}
        {uploadDone && !extracting && (
          <Stack gap="sm">
            <Text fw={700} size="sm" c={COLORS.navyBlue}>4 · Your Phone Number(s)</Text>
            <Text size="xs" c="dimmed">Phone number is not extracted from your ID — please enter it manually.</Text>
            {phones.map((phone, i) => (
              <Group key={i} gap="xs" wrap="nowrap">
                <TextInput
                  flex={1}
                  placeholder={i === 0 ? 'Primary phone: +251 9XX XXX XXX' : 'Secondary (optional)'}
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
              <Button variant="subtle" color="teal" size="xs" leftSection={<IconPlus size={14} />} onClick={addPhone} style={{ alignSelf: 'flex-start' }}>
                Add another phone number
              </Button>
            )}
          </Stack>
        )}

        <Button
          fullWidth size="md" radius="xl"
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
          onClick={handleContinue}
          disabled={!uploadDone || extracting}
        >
          Continue to Phone Verification
        </Button>
      </Stack>
    </Paper>
  );
}

// ─── STEP 2 – OTP Verification ────────────────────────────────────────────────
function StepOtp({ phones, onVerified, onBack }: {
  phones: string[];
  onVerified: () => void;
  onBack: () => void;
}) {
  const [selectedPhone, setSelectedPhone] = useState(phones[0]);
  const [otp, setOtp]                     = useState('');
  const [sent, setSent]                   = useState(false);
  const [sending, setSending]             = useState(false);
  const [verifying, setVerifying]         = useState(false);
  const [error, setError]                 = useState('');

  const sendOtp = () => {
    setSending(true); setError('');
    setTimeout(() => {
      setSending(false); setSent(true);
      notifications.show({
        title: 'OTP Sent',
        message: `Code sent to ${selectedPhone}. (Demo: ${MOCK_OTP})`,
        color: 'teal',
        icon: <IconMessageCircle size={18} />,
      });
    }, 1200);
  };

  const verifyOtp = () => {
    if (otp.length < 6) { setError('Enter the full 6-digit code.'); return; }
    setVerifying(true); setError('');
    setTimeout(() => {
      setVerifying(false);
      if (otp === MOCK_OTP) { onVerified(); }
      else { setError('Incorrect code. Please try again.'); }
    }, 900);
  };

  return (
    <Paper shadow="xl" radius="xl" p={40} className="ps-enter">
      <Stack gap="lg">
        <Group>
          <ActionIcon variant="subtle" onClick={onBack}><IconArrowLeft size={18} /></ActionIcon>
          <Stack gap={2} flex={1}>
            <Text fw={800} size="xl" c={COLORS.navyBlue}>Phone Verification</Text>
            <Text size="sm" c="dimmed">Verify your phone number to proceed</Text>
          </Stack>
        </Group>

        {/* Phone selector if multiple */}
        {phones.length > 1 && (
          <Select
            label="Send code to"
            data={phones.map(p => ({ value: p, label: p }))}
            value={selectedPhone}
            onChange={v => { setSelectedPhone(v!); setSent(false); setOtp(''); setError(''); }}
            leftSection={<IconPhone size={16} />}
          />
        )}

        <Box p="md" style={{ borderRadius: 14, background: `${COLORS.tealBlue}08`, border: `1px solid ${COLORS.tealBlue}25` }}>
          <Group gap="sm">
            <IconPhone size={20} color={COLORS.tealBlue} />
            <Text fw={600} size="sm" c={COLORS.navyBlue}>{selectedPhone}</Text>
          </Group>
        </Box>

        {!sent ? (
          <Button
            fullWidth size="md" radius="xl" loading={sending}
            leftSection={<IconMessageCircle size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
            onClick={sendOtp}
          >
            Send Verification Code
          </Button>
        ) : (
          <Stack gap="md">
            <Stack gap={8} align="center">
              <Text size="sm" fw={500} c={COLORS.navyBlue}>Enter the 6-digit code</Text>
              <PinInput length={6} type="number" size="lg" value={otp} onChange={setOtp} oneTimeCode />
              {error && (
                <Alert color="red" radius="md" icon={<IconAlertCircle size={16} />} p="xs">
                  {error}
                </Alert>
              )}
            </Stack>
            <Button
              fullWidth size="md" radius="xl" loading={verifying}
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

// ─── STEP 3 – Biometric Face Verification ────────────────────────────────────
function StepBiometric({ onVerified, onBack }: { onVerified: () => void; onBack: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'idle' | 'camera' | 'scanning' | 'matching' | 'success' | 'failed'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    setPhase('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      // Camera not available — fall back to simulation
      setPhase('scanning');
      simulateScan();
    }
  }, []);

  const captureFace = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase('scanning');
    simulateScan();
  };

  const simulateScan = () => {
    let p = 0;
    const interval = setInterval(() => {
      p += 4;
      setScanProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setPhase('matching');
        setTimeout(() => {
          setPhase('success');
        }, 1800);
      }
    }, 80);
  };

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  return (
    <Paper shadow="xl" radius="xl" p={40} className="ps-enter">
      <Stack gap="lg" align="center">
        <Group w="100%">
          <ActionIcon variant="subtle" onClick={onBack}><IconArrowLeft size={18} /></ActionIcon>
          <Stack gap={2} flex={1}>
            <Text fw={800} size="xl" c={COLORS.navyBlue}>Biometric Face Verification</Text>
            <Text size="sm" c="dimmed">We'll match your face against your ID photo</Text>
          </Stack>
        </Group>

        {/* -- IDLE -- */}
        {phase === 'idle' && (
          <Stack align="center" gap="lg" ta="center">
            <Box
              className="ps-scan-ring"
              w={160} h={160}
              style={{ borderRadius: '50%', background: `${COLORS.tealBlue}10`, border: `3px solid ${COLORS.tealBlue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconCamera size={64} color={COLORS.tealBlue} />
            </Box>
            <Stack gap={8} maw={340}>
              <Text fw={700} c={COLORS.navyBlue}>Ready for face scan</Text>
              <Text size="sm" c="dimmed" lh={1.6}>
                Position your face clearly in the frame, in good lighting. We'll compare it to your identity document.
              </Text>
            </Stack>
            <Alert color="blue" icon={<IconInfoCircle size={16} />} radius="md" p="sm" w="100%">
              <Text size="xs">Your biometric data is processed locally and is never stored on our servers.</Text>
            </Alert>
            <Button
              size="md" radius="xl" leftSection={<IconCamera size={18} />}
              style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
              onClick={startCamera}
            >
              Start Face Scan
            </Button>
          </Stack>
        )}

        {/* -- CAMERA -- */}
        {phase === 'camera' && (
          <Stack align="center" gap="md">
            <Box style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: `3px solid ${COLORS.tealBlue}`, width: 320, height: 240 }}>
              <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
              {/* Face guide overlay */}
              <Box style={{
                position: 'absolute', inset: 0,
                background: 'transparent',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Box style={{
                  width: 140, height: 180, borderRadius: '50%',
                  border: `3px solid ${COLORS.lemonYellow}`,
                  boxShadow: `0 0 0 2000px rgba(0,0,0,0.35)`,
                }} />
              </Box>
            </Box>
            <Text size="sm" c="dimmed" ta="center">Centre your face in the oval guide</Text>
            <Button
              size="md" radius="xl" leftSection={<IconScan size={18} />}
              style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
              onClick={captureFace}
            >
              Capture &amp; Scan
            </Button>
          </Stack>
        )}

        {/* -- SCANNING -- */}
        {phase === 'scanning' && (
          <Stack align="center" gap="lg" ta="center">
            <RingProgress
              size={160}
              thickness={12}
              sections={[{ value: scanProgress, color: 'teal' }]}
              label={
                <Text fw={700} size="lg" ta="center" c={COLORS.tealBlue}>{scanProgress}%</Text>
              }
            />
            <Stack gap={4}>
              <Text fw={700} c={COLORS.navyBlue}>Analysing face…</Text>
              <Text size="sm" c="dimmed">Detecting facial landmarks and features</Text>
            </Stack>
          </Stack>
        )}

        {/* -- MATCHING -- */}
        {phase === 'matching' && (
          <Stack align="center" gap="lg" ta="center">
            <Box style={{ position: 'relative' }}>
              <Loader size={80} color="teal" />
            </Box>
            <Stack gap={4}>
              <Text fw={700} c={COLORS.navyBlue}>Matching with ID…</Text>
              <Text size="sm" c="dimmed">Comparing face to your uploaded identity document</Text>
            </Stack>
          </Stack>
        )}

        {/* -- SUCCESS -- */}
        {phase === 'success' && (
          <Stack align="center" gap="lg" ta="center">
            <ThemeIcon size={100} radius="xl" color="teal" variant="light">
              <IconCircleCheck size={56} />
            </ThemeIcon>
            <Stack gap={6}>
              <Text fw={800} size="xl" c={COLORS.navyBlue}>Identity Verified!</Text>
              <Text size="sm" c="dimmed">Your face has been matched to your identity document successfully.</Text>
            </Stack>
            <Button
              size="md" radius="xl" fullWidth
              rightSection={<IconArrowRight size={16} />}
              style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
              onClick={onVerified}
            >
              Continue to Profile Setup
            </Button>
          </Stack>
        )}

        {/* -- FAILED -- */}
        {phase === 'failed' && (
          <Stack align="center" gap="lg" ta="center">
            <ThemeIcon size={100} radius="xl" color="red" variant="light">
              <IconX size={56} />
            </ThemeIcon>
            <Stack gap={6}>
              <Text fw={800} size="xl" c="red">Verification Failed</Text>
              <Text size="sm" c="dimmed">Face could not be matched. Ensure good lighting and remove glasses.</Text>
            </Stack>
            <Button variant="outline" color="red" size="md" radius="xl" onClick={() => setPhase('idle')}>
              Try Again
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

// ─── STEP 4 – Profile Setup ───────────────────────────────────────────────────
function StepProfile({ idFields, onComplete, onBack }: {
  idFields: Record<string, string>;
  onComplete: (profile: {
    categoryId: string;
    subcategoryIds: string[];
    bio: string;
    pricingMethod: PricingMethod;
    profilePicUrl: string | null;
  }) => void;
  onBack: () => void;
}) {
  const [categoryId, setCategoryId]     = useState<string | null>(null);
  const [subcategoryIds, setSubcategory] = useState<string[]>([]);
  const [bio, setBio]                   = useState('');
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed');
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  const categoryOptions  = MOCK_CATEGORIES.map(c => ({ value: c.id, label: c.name }));
  const selectedCategory = MOCK_CATEGORIES.find(c => c.id === categoryId);
  const subOptions       = (selectedCategory?.subcategories ?? []).map(s => ({ value: s.id, label: s.name }));

  const handleProfilePic = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setProfilePicUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!categoryId) { notifications.show({ title: 'Select a category', message: 'Choose your primary service category.', color: 'yellow' }); return; }
    if (subcategoryIds.length === 0) { notifications.show({ title: 'Select sub-services', message: 'Choose at least one sub-service.', color: 'yellow' }); return; }
    if (!bio.trim()) { notifications.show({ title: 'Add a bio', message: 'Write a short description of your services.', color: 'yellow' }); return; }
    onComplete({ categoryId, subcategoryIds, bio, pricingMethod, profilePicUrl });
  };

  return (
    <Paper shadow="xl" radius="xl" p={40} className="ps-enter">
      <Stack gap="xl">
        <Group>
          <ActionIcon variant="subtle" onClick={onBack}><IconArrowLeft size={18} /></ActionIcon>
          <Stack gap={2} flex={1}>
            <Text fw={800} size="xl" c={COLORS.navyBlue}>Profile Setup</Text>
            <Text size="sm" c="dimmed">Complete your provider profile to start receiving jobs</Text>
          </Stack>
        </Group>

        {/* Pre-filled name from ID */}
        {idFields.fullName && (
          <Box p="md" style={{ borderRadius: 14, background: `${COLORS.tealBlue}08`, border: `1px solid ${COLORS.tealBlue}25` }}>
            <Group gap="sm">
              <ThemeIcon size={36} radius="xl" color="teal" variant="light">
                <IconUser size={18} />
              </ThemeIcon>
              <Stack gap={1}>
                <Text size="xs" c="dimmed">Verified Identity</Text>
                <Text fw={700} c={COLORS.navyBlue}>{idFields.fullName}</Text>
              </Stack>
              <Badge color="teal" variant="light" style={{ marginLeft: 'auto' }}>Verified</Badge>
            </Group>
          </Box>
        )}

        {/* Profile picture */}
        <Stack gap="sm">
          <Text fw={700} size="sm" c={COLORS.navyBlue}>Profile Picture</Text>
          <Group gap="lg" align="flex-end">
            <Box
              w={96} h={96}
              style={{ borderRadius: '50%', overflow: 'hidden', border: `3px solid ${COLORS.tealBlue}30`, background: '#F0F7F7', flexShrink: 0 }}
            >
              {profilePicUrl
                ? <img src={profilePicUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Center h="100%"><IconUser size={36} color="#CCC" /></Center>
              }
            </Box>
            <Stack gap={4}>
              <FileButton onChange={handleProfilePic} accept="image/*">
                {(props) => (
                  <Button {...props} variant="light" color="teal" size="sm" leftSection={<IconPhoto size={14} />}>
                    Upload Photo
                  </Button>
                )}
              </FileButton>
              <Text size="xs" c="dimmed">Optional — you can add one later from your profile settings</Text>
            </Stack>
          </Group>
        </Stack>

        <Divider />

        {/* Service category */}
        <Stack gap="md">
          <Text fw={700} size="sm" c={COLORS.navyBlue}>Service Category</Text>
          <Select
            placeholder="Select your primary service category"
            data={categoryOptions}
            value={categoryId}
            onChange={v => { setCategoryId(v); setSubcategory([]); }}
            leftSection={<IconBriefcase size={16} />}
            searchable
          />

          {categoryId && (
            <MultiSelect
              label="Sub-services you offer"
              placeholder="Select one or more"
              data={subOptions}
              value={subcategoryIds}
              onChange={setSubcategory}
              searchable
            />
          )}
        </Stack>

        {/* Bio */}
        <Textarea
          label="Bio / Service Description"
          placeholder="Describe your experience, skills, and what makes you the best choice for clients…"
          minRows={4}
          value={bio}
          onChange={e => setBio(e.currentTarget.value)}
        />

        {/* Pricing */}
        <Stack gap="sm">
          <Text fw={700} size="sm" c={COLORS.navyBlue}>Pricing Method</Text>
          <Alert color="orange" icon={<IconInfoCircle size={16} />} radius="md" p="sm">
            <Text size="xs" fw={500}>
              To prevent fraud and ensure full transparency, per-hour pricing is not supported on ONE TOUCH.
            </Text>
          </Alert>
          <SimpleGrid cols={2} spacing="sm">
            {([
              { value: 'fixed',               label: 'Fixed Price',            desc: 'You set a clear price per job' },
              { value: 'platform_calculated', label: 'Platform Calculated',    desc: 'Price auto-calculated by ONE TOUCH' },
            ] as { value: PricingMethod; label: string; desc: string }[]).map(opt => (
              <Box
                key={opt.value}
                p="md"
                className="ps-id-card"
                onClick={() => setPricingMethod(opt.value)}
                style={{ borderColor: pricingMethod === opt.value ? COLORS.tealBlue : '#E9ECEF' }}
              >
                <Stack gap={4} align="center" ta="center">
                  <ThemeIcon size={36} radius="xl" color={pricingMethod === opt.value ? 'teal' : 'gray'} variant={pricingMethod === opt.value ? 'filled' : 'light'}>
                    <IconCheck size={18} />
                  </ThemeIcon>
                  <Text fw={700} size="sm" c={pricingMethod === opt.value ? COLORS.tealBlue : COLORS.navyBlue}>{opt.label}</Text>
                  <Text size="xs" c="dimmed">{opt.desc}</Text>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>

        <Button
          fullWidth size="md" radius="xl"
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})` }}
          onClick={handleSubmit}
        >
          Complete Registration
        </Button>

        <Button variant="subtle" color="gray" size="sm" fullWidth onClick={() => onComplete({ categoryId: categoryId ?? '', subcategoryIds, bio, pricingMethod, profilePicUrl: null })}>
          Skip for now — complete profile later
        </Button>
      </Stack>
    </Paper>
  );
}

// ─── STEP 5 – Done ─────────────────────────────────────────────────────────────
function StepDone() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDot(d => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);

  return (
    <Paper shadow="xl" radius="xl" p={48} className="ps-enter">
      <Stack align="center" gap="xl" ta="center">
        <ThemeIcon size={100} radius="xl" color="teal" variant="light">
          <IconCircleCheck size={56} />
        </ThemeIcon>
        <Stack gap={8}>
          <Text fw={900} size="2rem" c={COLORS.navyBlue} style={{ lineHeight: 1.2 }}>
            Welcome to ONE TOUCH!
          </Text>
          <Text c="dimmed" size="sm" maw={380}>
            Your account has been created and identity verified. Redirecting you to your dashboard{'.'.repeat(dot + 1)}
          </Text>
        </Stack>
        <Progress value={100} size="sm" color="teal" w="100%" animated />
        <SimpleGrid cols={3} spacing="md" w="100%">
          {[
            { icon: <IconShieldCheck size={22} />, label: 'Identity Verified' },
            { icon: <IconPhone size={22} />,       label: 'Phone Verified' },
            { icon: <IconCamera size={22} />,      label: 'Face Matched' },
          ].map(item => (
            <Stack key={item.label} align="center" gap={6}>
              <ThemeIcon size={40} radius="xl" color="teal" variant="light">{item.icon}</ThemeIcon>
              <Text size="xs" fw={600} c="dimmed">{item.label}</Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export function ProviderSignup() {
  const navigate    = useNavigate();
  const { signup }  = useAuthStore();

  const [step, setStep] = useState(1);
  const TOTAL = 5;

  // Accumulated data across steps
  const [identityData, setIdentityData] = useState<{
    idType: IdType; idFields: Record<string, string>; phones: string[];
  } | null>(null);

  const next = () => {
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIdentityDone = (data: typeof identityData) => {
    setIdentityData(data);
    next();
  };

  const handleProfileComplete = (_profile: {
    categoryId: string;
    subcategoryIds: string[];
    bio: string;
    pricingMethod: PricingMethod;
    profilePicUrl: string | null;
  }) => {
    if (!identityData) return;
    const email = `${identityData.idFields.fullName?.split(' ')[0]?.toLowerCase() ?? 'provider'}@onetouch.demo`;
    signup({ email, password: 'demo123', phone: identityData.phones[0], role: 'provider' });
    notifications.show({ title: 'Registration Complete!', message: 'Welcome to ONE TOUCH as a verified provider.', color: 'teal' });
    next();                                   // step 5 – done
    setTimeout(() => navigate(ROUTES.providerDashboard), 2500);
  };

  return (
    <Shell step={step} totalSteps={TOTAL}>
      {step === 1 && (
        <Stack gap={20}>
          <Stack gap={4} align="center">
            <Text size="xs" c="rgba(255,255,255,0.55)" fw={500}>Step 1 of 5</Text>
            <Text fw={900} size="xl" c="white">Identity Verification</Text>
          </Stack>
          <StepIdentity onNext={handleIdentityDone} />
        </Stack>
      )}

      {step === 2 && identityData && (
        <Stack gap={20}>
          <Stack gap={4} align="center">
            <Text size="xs" c="rgba(255,255,255,0.55)" fw={500}>Step 2 of 5</Text>
            <Text fw={900} size="xl" c="white">Phone Verification</Text>
          </Stack>
          <StepOtp phones={identityData.phones} onVerified={next} onBack={back} />
        </Stack>
      )}

      {step === 3 && (
        <Stack gap={20}>
          <Stack gap={4} align="center">
            <Text size="xs" c="rgba(255,255,255,0.55)" fw={500}>Step 3 of 5</Text>
            <Text fw={900} size="xl" c="white">Biometric Face Scan</Text>
          </Stack>
          <StepBiometric onVerified={next} onBack={back} />
        </Stack>
      )}

      {step === 4 && identityData && (
        <Stack gap={20}>
          <Stack gap={4} align="center">
            <Text size="xs" c="rgba(255,255,255,0.55)" fw={500}>Step 4 of 5</Text>
            <Text fw={900} size="xl" c="white">Profile Setup</Text>
          </Stack>
          <StepProfile idFields={identityData.idFields} onComplete={handleProfileComplete} onBack={back} />
        </Stack>
      )}

      {step === 5 && (
        <Stack gap={20}>
          <Stack gap={4} align="center">
            <Text size="xs" c="rgba(255,255,255,0.55)" fw={500}>Step 5 of 5</Text>
            <Text fw={900} size="xl" c="white">You're In!</Text>
          </Stack>
          <StepDone />
        </Stack>
      )}
    </Shell>
  );
}
