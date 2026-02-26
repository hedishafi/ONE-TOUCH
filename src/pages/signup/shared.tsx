/**
 * signup/shared.tsx — Refined 3-step signup shared components
 * Step 1: Identity Verification (auto-extract, phone, agreement)
 * Step 2: Phone & Biometric Verification (OTP → face scan, sequential)
 * Consuming pages supply their own Step 3 (Role-Based Profile Setup).
 *
 * Dark mode: uses CSS variables from index.css (--ot-* tokens)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Button, Center, Container, Group, Paper,
  PinInput, Stack, Text, TextInput, ActionIcon,
  Alert, FileButton, Badge, SimpleGrid, RingProgress,
  Loader, Checkbox, useMantineColorScheme,
} from '@mantine/core';
import {
  IconShieldLock, IconArrowRight, IconArrowLeft,
  IconPhone, IconUser, IconMessageCircle,
  IconCircleCheck, IconAlertCircle, IconUpload, IconCamera,
  IconScan, IconFileText, IconIdBadge, IconCheck, IconX, IconRotate,
  IconLock, IconInfoCircle, IconEPassport, IconCar, IconIdBadge2,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, MOCK_OTP, ROUTES } from '../../utils/constants';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { AIHelpCenter } from '../../components/AIHelpCenter';
import { DarkModeToggle } from '../../components/DarkModeToggle';

// ─── Global CSS (animations; id-opt uses CSS vars) ────────────────────────────
export const SHARED_CSS = `
@keyframes sfIn     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes scanLine { 0%{top:0%} 100%{top:100%} }
@keyframes pulseRing{ 0%,100%{box-shadow:0 0 0 0 rgba(0,128,128,0.35)} 60%{box-shadow:0 0 0 18px rgba(0,128,128,0)} }
@keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.sf-in       { animation: sfIn 0.36s cubic-bezier(0.22,1,0.36,1) both; }
.sf-ring     { animation: pulseRing 2s ease-in-out infinite; }
.sf-scanline { position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#008080,transparent);animation:scanLine 1.8s linear infinite; }
.sf-fade-up  { animation: fadeUp 0.3s ease both; }

.sf-id-opt {
  cursor: pointer;
  border: 1.5px solid var(--ot-id-opt-border);
  border-radius: 14px;
  background: var(--ot-id-opt-bg);
  transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
}
.sf-id-opt:hover {
  border-color: #008080;
  background: var(--ot-id-opt-hover);
}
.sf-id-opt.sel {
  border-color: #000080;
  background: var(--ot-id-opt-sel-bg);
  box-shadow: 0 2px 12px rgba(0,0,128,0.14);
}
[data-mantine-color-scheme="dark"] .sf-id-opt.sel {
  border-color: #7B9FFF;
  box-shadow: 0 2px 12px rgba(123,159,255,0.18);
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────
export type IdType = 'passport' | 'driving_license' | 'national_id' | 'kebele_id';
export interface IdField { key: string; label: string; placeholder: string; }
export interface IdentityResult {
  idType: IdType;
  extracted: Record<string, string>;
  frontDataUrl: string | null;
  backDataUrl: string | null;
  selectedPhone: string;
  agreed: boolean;
}
export interface VerifyResult {
  capturedFaceUrl: string | null;
}

// ─── ID field schemas ─────────────────────────────────────────────────────────
export const ID_FIELDS: Record<IdType, IdField[]> = {
  passport: [
    { key: 'fullName',       label: 'Full Name (as on passport)', placeholder: 'e.g. ALMAZ TESFAYE BEKELE' },
    { key: 'passportNumber', label: 'Passport Number',            placeholder: 'e.g. EP1234567' },
    { key: 'nationality',    label: 'Nationality',                placeholder: 'Ethiopian' },
    { key: 'dateOfBirth',    label: 'Date of Birth',              placeholder: 'DD/MM/YYYY' },
    { key: 'gender',         label: 'Gender',                     placeholder: 'Male / Female' },
    { key: 'placeOfBirth',   label: 'Place of Birth',             placeholder: 'e.g. Addis Ababa' },
    { key: 'issueDate',      label: 'Issue Date',                 placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',     label: 'Expiry Date',                placeholder: 'DD/MM/YYYY' },
  ],
  driving_license: [
    { key: 'fullName',         label: 'Full Name',              placeholder: 'As on license' },
    { key: 'licenseNumber',    label: 'License Number',         placeholder: 'e.g. DL-12345678' },
    { key: 'licenseClass',     label: 'License Class',          placeholder: 'e.g. Class B' },
    { key: 'dateOfBirth',      label: 'Date of Birth',          placeholder: 'DD/MM/YYYY' },
    { key: 'gender',           label: 'Gender',                 placeholder: 'Male / Female' },
    { key: 'address',          label: 'Registered Address',     placeholder: 'Address on license' },
    { key: 'issueDate',        label: 'Issue Date',             placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',       label: 'Expiry Date',            placeholder: 'DD/MM/YYYY' },
    { key: 'issuingAuthority', label: 'Issuing Authority',      placeholder: 'e.g. Addis Ababa Transport Bureau' },
  ],
  national_id: [
    { key: 'fullName',    label: 'Full Name',         placeholder: 'As on ID' },
    { key: 'idNumber',    label: 'ID Number',         placeholder: 'e.g. ETH-NIDA-XXXXXXXX' },
    { key: 'dateOfBirth', label: 'Date of Birth',     placeholder: 'DD/MM/YYYY' },
    { key: 'gender',      label: 'Gender',            placeholder: 'Male / Female' },
    { key: 'nationality', label: 'Nationality',       placeholder: 'Ethiopian' },
    { key: 'region',      label: 'Region / Sub-City', placeholder: 'e.g. Addis Ababa' },
    { key: 'woreda',      label: 'Woreda',            placeholder: 'e.g. Bole' },
    { key: 'issueDate',   label: 'Issue Date',        placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',  label: 'Expiry Date',       placeholder: 'DD/MM/YYYY' },
  ],
  kebele_id: [
    { key: 'fullName',       label: 'Full Name',         placeholder: 'As on Kebele ID' },
    { key: 'kebeleIdNumber', label: 'Kebele ID Number',  placeholder: 'e.g. KID-XXXXXX' },
    { key: 'dateOfBirth',    label: 'Date of Birth',     placeholder: 'DD/MM/YYYY' },
    { key: 'gender',         label: 'Gender',            placeholder: 'Male / Female' },
    { key: 'fatherName',     label: "Father's Name",      placeholder: "Father's full name" },
    { key: 'kebele',         label: 'Kebele',            placeholder: 'e.g. Kebele 02' },
    { key: 'subCity',        label: 'Sub-City / Woreda', placeholder: 'e.g. Bole Sub-City' },
    { key: 'issueDate',      label: 'Issue Date',        placeholder: 'DD/MM/YYYY' },
  ],
};

// ─── Mock OCR extracted data ──────────────────────────────────────────────────
export const MOCK_EXTRACTED: Record<IdType, Record<string, string>> = {
  passport: {
    fullName: 'BEKELE ALMAZ TESFAYE', passportNumber: 'EP7291045',
    nationality: 'Ethiopian', dateOfBirth: '15/03/1990', gender: 'Female',
    placeOfBirth: 'Addis Ababa', issueDate: '10/01/2020', expiryDate: '09/01/2030',
  },
  driving_license: {
    fullName: 'TESFAYE GIRMA', licenseNumber: 'DL-54892316', licenseClass: 'Class B',
    dateOfBirth: '22/07/1988', gender: 'Male', address: 'Bole Sub-City, Addis Ababa',
    issueDate: '05/06/2019', expiryDate: '04/06/2025',
    issuingAuthority: 'Addis Ababa Transport Bureau',
    phone: '+251912345678',
  },
  national_id: {
    fullName: 'YONAS HAILE BEKELE', idNumber: 'ETH-NIDA-20041987-AA',
    dateOfBirth: '04/09/1987', gender: 'Male', nationality: 'Ethiopian',
    region: 'Addis Ababa', woreda: 'Bole', issueDate: '12/02/2022', expiryDate: '11/02/2032',
    phone: '+251987654321',
  },
  kebele_id: {
    fullName: 'SELAMAWIT DAWIT', kebeleIdNumber: 'KID-081234',
    dateOfBirth: '30/11/1995', gender: 'Female', fatherName: 'DAWIT HAILE',
    kebele: 'Kebele 05', subCity: 'Kirkos Sub-City', issueDate: '08/04/2021',
    phone: '',
  },
};

// ─── Step labels & dot progress ───────────────────────────────────────────────
export const STEP_LABELS = ['Identity', 'Phone & Biometric', 'Profile'];

export function StepDots({ current, labels = STEP_LABELS }: { current: number; labels?: string[] }) {
  return (
    <Group justify="center" gap={0} mb={32} wrap="nowrap">
      {labels.map((label, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        const dotBg = done
          ? COLORS.tealBlue
          : active
          ? COLORS.navyBlue
          : 'var(--ot-border)';
        const dotText = done ? 'white' : active ? 'white' : 'var(--ot-text-muted)';
        const labelColor = active
          ? COLORS.navyBlue
          : done
          ? COLORS.tealBlue
          : 'var(--ot-text-muted)';
        return (
          <Group key={label} gap={0} align="center" wrap="nowrap">
            <Stack gap={5} align="center">
              <Box
                w={32}
                h={32}
                style={{
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: dotBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: active ? `0 0 0 4px ${COLORS.navyBlue}25` : 'none',
                  transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 13 13">
                    <path d="M2 6.5l3 3 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                ) : (
                  <Text size="11px" fw={700} c={dotText} style={{ lineHeight: 1 }}>{i + 1}</Text>
                )}
              </Box>
              <Text
                size="10px"
                fw={600}
                c={labelColor}
                style={{ whiteSpace: 'nowrap', transition: 'color 0.25s' }}
              >
                {label}
              </Text>
            </Stack>
            {i < labels.length - 1 && (
              <Box
                w={48}
                h={2}
                mx={8}
                mb={20}
                style={{
                  background: done ? COLORS.tealBlue : 'var(--ot-border)',
                  transition: 'background 0.35s',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

// ─── Shell (page wrapper with nav + progress bar) ─────────────────────────────
export function Shell({ children, step, labels = STEP_LABELS }: { children: React.ReactNode; step: number; labels?: string[] }) {
  const navigate = useNavigate();
  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)', display: 'flex', flexDirection: 'column' }}>
      <style>{SHARED_CSS}</style>

      {/* Navbar */}
      <Box style={{ background: 'var(--ot-nav-bg)', borderBottom: '1px solid var(--ot-nav-border)' }}>
        <Container size={680}>
          <Group justify="space-between" py={14}>
            <Group gap={10} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.landing)}>
              <Box
                w={36}
                h={36}
                style={{
                  borderRadius: 10,
                  background: COLORS.navyBlue,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconLock size={16} color={COLORS.lemonYellow} strokeWidth={2.5} />
              </Box>
              <Text fw={900} size="sm" c={COLORS.navyBlue} style={{ letterSpacing: '-0.3px' }}>
                ONE TOUCH
              </Text>
            </Group>
            <Group gap={8}>
              <DarkModeToggle />
              <LanguageSwitcher />
              <Button variant="subtle" size="xs" color="gray" onClick={() => navigate(ROUTES.login)}>
                Sign In
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Progress bar */}
      <Box style={{ height: 3, background: 'var(--ot-border)' }}>
        <Box
          style={{
            height: '100%',
            width: `${(step / labels.length) * 100}%`,
            background: `linear-gradient(90deg, ${COLORS.navyBlue}, ${COLORS.tealBlue})`,
            transition: 'width 0.5s cubic-bezier(0.22,1,0.36,1)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </Box>

      <Center flex={1} py={40} px={16}>
        <Container size={600} w="100%">
          <StepDots current={step} labels={labels} />
          {children}
        </Container>
      </Center>
      <AIHelpCenter />
    </Box>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      radius={20}
      p={{ base: 24, sm: 36 }}
      className="sf-in"
      style={{
        border: '1px solid var(--ot-border)',
        boxShadow: '0 4px 28px rgba(0,0,128,0.07)',
        background: 'var(--ot-bg-card)',
      }}
    >
      {children}
    </Paper>
  );
}

// ─── Card Header ──────────────────────────────────────────────────────────────
export function CardHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <>
      <Group gap={14} mb={22}>
        <Box
          w={44}
          h={44}
          style={{
            borderRadius: 13,
            background: 'var(--ot-bg-row)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid var(--ot-border)',
          }}
        >
          {icon}
        </Box>
        <Stack gap={2}>
          <Text fw={800} size="lg" c="var(--ot-text-navy)">{title}</Text>
          {sub && <Text size="xs" c="var(--ot-text-sub)">{sub}</Text>}
        </Stack>
      </Group>
      <Box mb={24} style={{ height: 1, background: 'var(--ot-border-inner)' }} />
    </>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────
export function UploadZone({ label, preview, onFile, scanning }: {
  label: string;
  preview: string | null;
  onFile: (f: File | null) => void;
  scanning: boolean;
}) {
  return (
    <Box
      style={{
        borderRadius: 14,
        border: `2px dashed ${preview ? COLORS.tealBlue : 'var(--ot-border-input)'}`,
        background: preview ? 'rgba(0,128,128,0.04)' : 'var(--ot-upload-bg)',
        padding: preview ? 12 : 22,
        textAlign: 'center',
        transition: 'all 0.22s',
      }}
    >
      {preview ? (
        <Stack align="center" gap={10}>
          <Box style={{ position: 'relative', display: 'inline-block', borderRadius: 10, overflow: 'hidden' }}>
            <img
              src={preview}
              alt={label}
              style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 10, display: 'block' }}
            />
            {scanning && (
              <Box
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,128,0.45)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                }}
              >
                <Box className="sf-scanline" />
                <Loader color="white" size="xs" mt={10} />
                <Text size="10px" c="white" fw={700} mt={6} style={{ letterSpacing: 1 }}>
                  EXTRACTING...
                </Text>
              </Box>
            )}
          </Box>
          {!scanning && (
            <Badge color="teal" leftSection={<IconCheck size={10} />} variant="light" size="sm">
              Uploaded
            </Badge>
          )}
          <FileButton onChange={onFile} accept="image/*">
            {(p) => (
              <Button {...p} variant="subtle" color="gray" size="xs" leftSection={<IconRotate size={12} />}>
                Replace
              </Button>
            )}
          </FileButton>
        </Stack>
      ) : (
        <Stack align="center" gap={10}>
          <Box
            w={44}
            h={44}
            style={{
              borderRadius: 12,
              background: 'var(--ot-upload-icon-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconUpload size={20} color="var(--ot-text-muted)" />
          </Box>
          <Stack gap={3}>
            <Text fw={600} size="sm" c="var(--ot-text-navy)">{label}</Text>
            <Text size="11px" c="var(--ot-text-muted)">JPG, PNG · max 10 MB</Text>
          </Stack>
          <FileButton onChange={onFile} accept="image/*">
            {(p) => (
              <Button {...p} variant="light" color="blue" size="sm" radius="xl" leftSection={<IconUpload size={13} />}>
                Choose File
              </Button>
            )}
          </FileButton>
        </Stack>
      )}
    </Box>
  );
}

// ─── STEP 1 — Identity Verification ──────────────────────────────────────────
export function StepIdentity({ onNext }: { onNext: (r: IdentityResult) => void }) {
  const navigate = useNavigate();
  const { colorScheme } = useMantineColorScheme();

  const [idType, setIdType]       = useState<IdType | null>(null);
  const [frontUrl, setFrontUrl]   = useState<string | null>(null);
  const [backUrl, setBackUrl]     = useState<string | null>(null);
  const [scanning, setScanning]   = useState(false);
  const [extracted, setExtracted] = useState<Record<string, string>>({});
  const [fields, setFields]       = useState<Record<string, string>>({});
  const [done, setDone]           = useState(false);

  // Phone sub-state
  const [phoneMode, setPhoneMode]   = useState<'extracted' | 'manual' | null>(null);
  const [manualPhone, setManualPhone] = useState('');
  const [agreed, setAgreed]         = useState(false);

  const frontRef = useRef<string | null>(null);
  const backRef  = useRef<string | null>(null);

  const ID_OPTIONS: { type: IdType; label: string; icon: React.ReactNode; sub: string }[] = [
    { type: 'passport',        label: 'Passport',        icon: <IconEPassport size={24} color={COLORS.navyBlue} />,  sub: 'Single page scan' },
    { type: 'driving_license', label: 'Driving License', icon: <IconCar      size={24} color={COLORS.navyBlue} />,  sub: 'Front & back required' },
    { type: 'national_id',     label: 'National ID',     icon: <IconIdBadge2 size={24} color={COLORS.navyBlue} />,  sub: 'Front & back required' },
    { type: 'kebele_id',       label: 'Kebele ID',       icon: <IconIdBadge  size={24} color={COLORS.navyBlue} />,  sub: 'Front & back required' },
  ];

  function toDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  const runExtract = useCallback((type: IdType) => {
    setScanning(true);
    setDone(false);
    setExtracted({});
    setFields({});
    setTimeout(() => {
      const mock = MOCK_EXTRACTED[type];
      setExtracted(mock);
      const initial: Record<string, string> = {};
      ID_FIELDS[type].forEach(f => { initial[f.key] = mock[f.key] ?? ''; });
      setFields(initial);
      setScanning(false);
      setDone(true);
      if (type !== 'passport' && !phoneMode && mock.phone) setPhoneMode('extracted');
      notifications.show({
        title: 'Extraction Complete',
        message: 'All available information has been extracted from your document.',
        color: 'teal',
        icon: <IconCircleCheck size={16} />,
      });
    }, 1900);
  }, [phoneMode]);

  const handleFront = useCallback(async (file: File | null, type: IdType) => {
    if (!file) return;
    const url = await toDataURL(file);
    setFrontUrl(url);
    frontRef.current = url;
    if (type === 'passport') {
      runExtract(type);
    } else if (backRef.current) {
      runExtract(type);
    }
  }, [runExtract]);

  const handleBack = useCallback(async (file: File | null, type: IdType) => {
    if (!file) return;
    const url = await toDataURL(file);
    setBackUrl(url);
    backRef.current = url;
    if (frontRef.current) {
      runExtract(type);
    }
  }, [runExtract]);

  const docPhone = extracted?.phone ?? '';
  const isPassport = idType === 'passport';
  const showPhoneChoice = !isPassport && done && docPhone !== '';
  const showManualEntry = done && (isPassport || !docPhone || phoneMode === 'manual');

  const resolvedPhone = phoneMode === 'extracted' ? docPhone : manualPhone;
  const phoneValid = resolvedPhone.trim().length >= 9;

  const canProceed = done && !scanning && agreed && phoneValid;

  const handleContinue = () => {
    if (!idType || !canProceed) return;
    onNext({
      idType,
      extracted,
      frontDataUrl: frontUrl,
      backDataUrl: backUrl,
      selectedPhone: resolvedPhone.trim(),
      agreed,
    });
  };

  return (
    <Card>
      <CardHeader
        icon={<IconFileText size={22} color={COLORS.navyBlue} />}
        title="Identity Verification"
        sub="Select your document type and upload — we'll extract your information automatically"
      />

      {/* ID Type Selection */}
      <Text size="sm" fw={600} c="var(--ot-text-navy)" mb={12}>
        Document Type
      </Text>
      <SimpleGrid cols={2} spacing={10} mb={24}>
        {ID_OPTIONS.map(opt => (
          <Box
            key={opt.type}
            className={`sf-id-opt${idType === opt.type ? ' sel' : ''}`}
            p={14}
            onClick={() => {
              if (idType !== opt.type) {
                setIdType(opt.type);
                setFrontUrl(null);
                setBackUrl(null);
                frontRef.current = null;
                backRef.current  = null;
                setExtracted({});
                setFields({});
                setDone(false);
                setPhoneMode(null);
                setManualPhone('');
              }
            }}
          >
            <Group gap={10} wrap="nowrap">
              <Box
                w={38}
                h={38}
                style={{
                  borderRadius: 10,
                  background: idType === opt.type ? `${COLORS.navyBlue}12` : 'var(--ot-bg-row)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                {opt.icon}
              </Box>
              <Stack gap={2}>
                <Text size="sm" fw={700} c="var(--ot-text-navy)" style={{ lineHeight: 1.2 }}>
                  {opt.label}
                </Text>
                <Text size="10px" c="var(--ot-text-muted)">{opt.sub}</Text>
              </Stack>
            </Group>
          </Box>
        ))}
      </SimpleGrid>

      {/* Upload Section */}
      {idType && (
        <Box className="sf-fade-up">
          {isPassport ? (
            <>
              <Text size="sm" fw={600} c="var(--ot-text-navy)" mb={10}>
                Passport Photo Page
              </Text>
              <UploadZone
                label="Upload photo page"
                preview={frontUrl}
                onFile={(f) => handleFront(f, idType)}
                scanning={scanning}
              />
            </>
          ) : (
            <SimpleGrid cols={2} spacing={12} mb={4}>
              <Stack gap={6}>
                <Text size="xs" fw={600} c="var(--ot-text-navy)">Front Side</Text>
                <UploadZone
                  label="Front of document"
                  preview={frontUrl}
                  onFile={(f) => handleFront(f, idType)}
                  scanning={scanning && !!backUrl}
                />
              </Stack>
              <Stack gap={6}>
                <Text size="xs" fw={600} c="var(--ot-text-navy)">Back Side</Text>
                <UploadZone
                  label="Back of document"
                  preview={backUrl}
                  onFile={(f) => handleBack(f, idType)}
                  scanning={scanning && !!frontUrl}
                />
              </Stack>
            </SimpleGrid>
          )}

          {/* Scanning indicator */}
          {scanning && (
            <Alert icon={<Loader size="xs" />} color="blue" variant="light" radius="md" mt={16}>
              <Text size="sm">Extracting information from your document…</Text>
            </Alert>
          )}

          {/* Extracted fields */}
          {done && Object.keys(fields).length > 0 && !scanning && (
            <Box mt={22} className="sf-fade-up">
              <Group gap={8} mb={14}>
                <IconCircleCheck size={17} color={COLORS.tealBlue} />
                <Text size="sm" fw={700} c={COLORS.tealBlue}>Extraction Complete</Text>
                <Badge size="xs" color="teal" variant="dot">Review & edit if needed</Badge>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={10}>
                {ID_FIELDS[idType]
                  .filter(f => f.key !== 'phone')
                  .map(f => (
                    <TextInput
                      key={f.key}
                      label={f.label}
                      placeholder={f.placeholder}
                      value={fields[f.key] ?? ''}
                      onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                      size="sm"
                      styles={{
                        label: { fontSize: 11, fontWeight: 600, color: 'var(--ot-text-sub)', marginBottom: 4 },
                      }}
                    />
                  ))}
              </SimpleGrid>
            </Box>
          )}

          {/* Phone selection */}
          {done && !scanning && (
            <Box mt={24} className="sf-fade-up">
              <Group gap={8} mb={12}>
                <IconPhone size={16} color={COLORS.navyBlue} />
                <Text size="sm" fw={700} c="var(--ot-text-navy)">Phone Number for OTP</Text>
              </Group>

              {/* Show extracted phone choice for non-passport with phone */}
              {showPhoneChoice && (
                <Box mb={14}>
                  <Text size="xs" c="var(--ot-text-sub)" mb={10}>
                    A phone number was detected on your document. Select which to use for verification:
                  </Text>
                  <SimpleGrid cols={2} spacing={8}>
                    {[
                      { mode: 'extracted' as const, label: 'Use from document', value: docPhone },
                      { mode: 'manual'   as const, label: 'Enter a different number', value: null },
                    ].map(opt => (
                      <Box
                        key={opt.mode}
                        className={`sf-id-opt${phoneMode === opt.mode ? ' sel' : ''}`}
                        p={12}
                        onClick={() => setPhoneMode(opt.mode)}
                      >
                        <Stack gap={3}>
                          <Text size="xs" fw={700} c="var(--ot-text-navy)">{opt.label}</Text>
                          {opt.value && <Text size="11px" c={COLORS.tealBlue} fw={600}>{opt.value}</Text>}
                        </Stack>
                      </Box>
                    ))}
                  </SimpleGrid>
                </Box>
              )}

              {showManualEntry && (
                <TextInput
                  placeholder="+251 9XX XXX XXX"
                  leftSection={<IconPhone size={15} />}
                  value={manualPhone}
                  onChange={e => setManualPhone(e.target.value)}
                  size="sm"
                  description={isPassport ? 'Passport does not contain a phone number — please enter manually' : undefined}
                />
              )}
            </Box>
          )}

          {/* Agreement */}
          {done && !scanning && (
            <Box
              mt={24}
              p={16}
              className="sf-fade-up"
              style={{
                borderRadius: 12,
                background: 'var(--ot-bg-row)',
                border: '1px solid var(--ot-border)',
              }}
            >
              <Checkbox
                checked={agreed}
                onChange={e => setAgreed(e.currentTarget.checked)}
                label={
                  <Text size="sm" c="var(--ot-text-body)">
                    I agree to the{' '}
                    <Text
                      component="span"
                      c={COLORS.tealBlue}
                      fw={600}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={e => { e.preventDefault(); navigate(ROUTES.termsOfService); }}
                    >
                      Terms of Service
                    </Text>
                    {' '}and{' '}
                    <Text
                      component="span"
                      c={COLORS.tealBlue}
                      fw={600}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={e => { e.preventDefault(); navigate(ROUTES.privacyPolicy); }}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                }
              />
            </Box>
          )}

          {/* Continue */}
          <Button
            fullWidth
            mt={24}
            size="md"
            disabled={!canProceed}
            rightSection={<IconArrowRight size={16} />}
            onClick={handleContinue}
            style={{
              background: canProceed
                ? `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)`
                : undefined,
              transition: 'all 0.2s',
            }}
          >
            Continue to Phone & Biometric
          </Button>
        </Box>
      )}
    </Card>
  );
}

// ─── STEP 2 — Phone & Biometric Verification ──────────────────────────────────
type Phase2 =
  | 'otp_send'
  | 'otp_verify'
  | 'bio_idle'
  | 'bio_camera'
  | 'bio_scanning'
  | 'bio_matching'
  | 'bio_success'
  | 'bio_failed';

export function StepVerify({
  phone,
  onBack,
  onDone,
}: {
  phone: string;
  onBack: () => void;
  onDone: (faceUrl: string | null) => void;
}) {
  const [phase, setPhase]           = useState<Phase2>('otp_send');
  const [pin, setPin]               = useState('');
  const [otpError, setOtpError]     = useState('');
  const [sending, setSending]       = useState(false);
  const [scanPct, setScanPct]       = useState(0);
  const [capturedFaceUrl, setCapturedFaceUrl] = useState<string | null>(null);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const sendOtp = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setPhase('otp_verify');
    }, 1000);
  };

  const verifyOtp = () => {
    if (pin === MOCK_OTP) {
      setOtpError('');
      setPhase('bio_idle');
    } else {
      setOtpError('Incorrect verification code. Please try again.');
    }
  };

  const startCamera = async () => {
    setPhase('bio_camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      simulateBio();
    }
  };

  const captureFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 240;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const url = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedFaceUrl(url);
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    simulateBio();
  };

  const simulateBio = () => {
    setPhase('bio_scanning');
    setScanPct(0);
    let pct = 0;
    const iv = setInterval(() => {
      pct += 4;
      setScanPct(Math.min(pct, 100));
      if (pct >= 100) {
        clearInterval(iv);
        setPhase('bio_matching');
        setTimeout(() => setPhase('bio_success'), 1200);
      }
    }, 60);
  };

  // ── Render phases ──────────────────────────────────────────────────────────

  const renderOtpSend = () => (
    <Stack gap={20} className="sf-fade-up">
      <Box
        p={18}
        style={{
          borderRadius: 14,
          border: '1.5px solid var(--ot-border)',
          background: 'var(--ot-bg-row)',
        }}
      >
        <Group gap={12}>
          <Box
            w={40}
            h={40}
            style={{
              borderRadius: 10,
              background: `${COLORS.navyBlue}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <IconPhone size={20} color={COLORS.navyBlue} />
          </Box>
          <Stack gap={2}>
            <Text size="xs" c="var(--ot-text-sub)" fw={500}>OTP will be sent to</Text>
            <Text size="sm" fw={700} c="var(--ot-text-navy)">{phone}</Text>
          </Stack>
        </Group>
      </Box>
      <Alert icon={<IconInfoCircle size={15} />} color="blue" variant="light" radius="md">
        <Text size="sm">A 6-digit verification code will be sent to your phone number via SMS.</Text>
      </Alert>
      <Button
        fullWidth
        size="md"
        loading={sending}
        rightSection={!sending && <IconMessageCircle size={16} />}
        onClick={sendOtp}
        style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)` }}
      >
        Send Verification Code
      </Button>
      <Button variant="subtle" color="gray" size="sm" leftSection={<IconArrowLeft size={14} />} onClick={onBack}>
        Back to Identity
      </Button>
    </Stack>
  );

  const renderOtpVerify = () => (
    <Stack gap={20} align="center" className="sf-fade-up">
      <Text size="sm" c="var(--ot-text-sub)" ta="center">
        Enter the 6-digit code sent to <Text component="span" fw={700} c="var(--ot-text-navy)">{phone}</Text>
      </Text>
      <PinInput
        length={6}
        value={pin}
        onChange={setPin}
        onComplete={verifyOtp}
        type="number"
        placeholder="○"
        size="lg"
        styles={{ input: { fontWeight: 700, fontSize: 20, letterSpacing: 4 } }}
      />
      {otpError && (
        <Alert icon={<IconAlertCircle size={15} />} color="red" variant="light" radius="md" w="100%">
          {otpError}
        </Alert>
      )}
      <Button
        fullWidth
        size="md"
        onClick={verifyOtp}
        disabled={pin.length < 6}
        style={{
          background: pin.length >= 6
            ? `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)`
            : undefined,
        }}
        rightSection={<IconArrowRight size={16} />}
      >
        Verify Code
      </Button>
      <Text size="xs" c="var(--ot-text-muted)">
        Didn't receive it?{' '}
        <Text
          component="span"
          c={COLORS.tealBlue}
          fw={600}
          style={{ cursor: 'pointer' }}
          onClick={sendOtp}
        >
          Resend code
        </Text>
      </Text>
      <Text size="10px" c="var(--ot-text-muted)">(Demo: use <strong>123456</strong>)</Text>
    </Stack>
  );

  const renderBioIdle = () => (
    <Stack align="center" gap={28} className="sf-fade-up">
      <Box
        w={110}
        h={110}
        className="sf-ring"
        style={{
          borderRadius: '50%',
          background: `${COLORS.tealBlue}12`,
          border: `2.5px solid ${COLORS.tealBlue}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <IconCamera size={46} color={COLORS.tealBlue} strokeWidth={1.5} />
      </Box>
      <Stack gap={6} align="center">
        <Text fw={800} size="lg" c="var(--ot-text-navy)">Biometric Verification</Text>
        <Text size="sm" c="var(--ot-text-sub)" ta="center" maw={340}>
          We'll take a live selfie and match it against your identity document to confirm your identity.
        </Text>
      </Stack>
      <Alert icon={<IconInfoCircle size={15} />} color="teal" variant="light" radius="md" w="100%">
        <Text size="sm">All biometric data is processed locally on your device and never stored permanently.</Text>
      </Alert>
      <Button
        fullWidth
        size="md"
        rightSection={<IconCamera size={16} />}
        onClick={startCamera}
        style={{ background: `linear-gradient(135deg, ${COLORS.tealDark} 0%, ${COLORS.tealBlue} 100%)` }}
      >
        Start Face Scan
      </Button>
    </Stack>
  );

  const renderBioCamera = () => (
    <Stack align="center" gap={20} className="sf-fade-up">
      <Text fw={700} size="md" c="var(--ot-text-navy)">Position your face within the oval</Text>
      <Box style={{ position: 'relative', width: 280, height: 210 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }}
        />
        <Box
          style={{
            position: 'absolute', inset: 0,
            border: `3px solid ${COLORS.lemonYellow}`,
            borderRadius: '50% / 40%',
            pointerEvents: 'none',
            boxShadow: `0 0 0 2000px rgba(0,0,0,0.55)`,
            margin: '10px 30px',
          }}
        />
      </Box>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <Button
        fullWidth
        size="md"
        leftSection={<IconCamera size={16} />}
        onClick={captureFrame}
        style={{ background: `linear-gradient(135deg, ${COLORS.tealDark} 0%, ${COLORS.tealBlue} 100%)` }}
      >
        Capture
      </Button>
    </Stack>
  );

  const renderBioScanning = () => (
    <Stack align="center" gap={24} className="sf-fade-up">
      <RingProgress
        size={130}
        thickness={10}
        roundCaps
        sections={[{ value: scanPct, color: COLORS.tealBlue }]}
        label={
          <Text ta="center" fw={800} size="lg" c={COLORS.navyBlue}>{scanPct}%</Text>
        }
      />
      <Stack gap={4} align="center">
        <Text fw={700} size="md" c="var(--ot-text-navy)">Analyzing biometric data…</Text>
        <Text size="sm" c="var(--ot-text-sub)">Please wait while we verify your identity</Text>
      </Stack>
    </Stack>
  );

  const renderBioMatching = () => (
    <Stack align="center" gap={24} className="sf-fade-up">
      <Loader size="lg" color="teal" type="bars" />
      <Stack gap={4} align="center">
        <Text fw={700} size="md" c="var(--ot-text-navy)">Matching with document…</Text>
        <Text size="sm" c="var(--ot-text-sub)">Comparing your face scan with uploaded ID</Text>
      </Stack>
    </Stack>
  );

  const renderBioSuccess = () => (
    <Stack align="center" gap={24} className="sf-fade-up">
      {capturedFaceUrl && (
        <Box
          style={{
            width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
            border: `3px solid ${COLORS.tealBlue}`,
            boxShadow: `0 0 0 4px ${COLORS.tealBlue}25`,
          }}
        >
          <img src={capturedFaceUrl} alt="Captured face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
      )}
      <Box
        w={72}
        h={72}
        style={{
          borderRadius: '50%',
          background: `${COLORS.tealBlue}15`,
          border: `2px solid ${COLORS.tealBlue}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <IconCircleCheck size={38} color={COLORS.tealBlue} />
      </Box>
      <Stack gap={6} align="center">
        <Text fw={800} size="xl" c={COLORS.navyBlue}>Identity Confirmed!</Text>
        <Text size="sm" c="var(--ot-text-sub)" ta="center">
          Your face has been successfully verified. Proceeding to profile setup.
        </Text>
      </Stack>
      <Button
        fullWidth
        size="md"
        rightSection={<IconArrowRight size={16} />}
        onClick={() => onDone(capturedFaceUrl)}
        style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)` }}
      >
        Continue to Profile Setup
      </Button>
    </Stack>
  );

  const renderBioFailed = () => (
    <Stack align="center" gap={24} className="sf-fade-up">
      <Box
        w={72}
        h={72}
        style={{
          borderRadius: '50%',
          background: '#FFF0F0',
          border: '2px solid #E53E3E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <IconX size={36} color="#E53E3E" />
      </Box>
      <Stack gap={6} align="center">
        <Text fw={800} size="xl" c="#C53030">Verification Failed</Text>
        <Text size="sm" c="var(--ot-text-sub)" ta="center">
          We could not match your face with the uploaded document. Please try again in good lighting.
        </Text>
      </Stack>
      <Button
        fullWidth
        size="md"
        variant="outline"
        color="red"
        leftSection={<IconRotate size={16} />}
        onClick={() => { setPhase('bio_idle'); setScanPct(0); setCapturedFaceUrl(null); }}
      >
        Try Again
      </Button>
    </Stack>
  );

  return (
    <Card>
      <CardHeader
        icon={<IconScan size={22} color={COLORS.navyBlue} />}
        title={phase.startsWith('otp') ? 'Phone Verification' : 'Biometric Verification'}
        sub={
          phase === 'otp_send'    ? 'Verify your phone number via SMS OTP'          :
          phase === 'otp_verify'  ? 'Enter the 6-digit code sent to your phone'     :
          phase === 'bio_idle'    ? 'Live face scan to confirm your identity'        :
          phase === 'bio_camera'  ? 'Position your face and capture'                :
          phase === 'bio_scanning'? 'Analyzing your biometric data'                 :
          phase === 'bio_matching'? 'Matching face with identity document'           :
          phase === 'bio_success' ? 'Identity confirmed successfully'               :
                                    'Biometric match unsuccessful'
        }
      />
      {phase === 'otp_send'    && renderOtpSend()}
      {phase === 'otp_verify'  && renderOtpVerify()}
      {phase === 'bio_idle'    && renderBioIdle()}
      {phase === 'bio_camera'  && renderBioCamera()}
      {phase === 'bio_scanning'&& renderBioScanning()}
      {phase === 'bio_matching'&& renderBioMatching()}
      {phase === 'bio_success' && renderBioSuccess()}
      {phase === 'bio_failed'  && renderBioFailed()}
    </Card>
  );
}
