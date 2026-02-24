/**
 * ProviderSignup.tsx — Fully redesigned, light-mode provider onboarding.
 *
 * Step 1  Identity Upload (type-aware: passport=1 image, others=front+back)
 * Step 2  Review Extracted Info + Phone Selection + Agreement Checkbox
 * Step 3  OTP Verification
 * Step 4  Biometric Face Scan (failure blocks progress)
 * Step 5  Profile Setup
 * Step 6  Complete → Provider Dashboard
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Button, Center, Container, Group, Paper,
  PinInput, Stack, Text, TextInput, ThemeIcon, ActionIcon,
  Alert, Select, MultiSelect, Textarea, FileButton, Badge,
  SimpleGrid, RingProgress, Loader, Checkbox,
} from '@mantine/core';
import {
  IconShieldCheck, IconShieldLock, IconArrowRight, IconArrowLeft,
  IconPhone, IconUser, IconPlus, IconTrash, IconMessageCircle,
  IconCircleCheck, IconAlertCircle, IconUpload, IconCamera,
  IconScan, IconFileText, IconIdBadge, IconBriefcase, IconLock,
  IconPhoto, IconInfoCircle, IconCheck, IconX, IconRotate,
  IconExternalLink,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, MOCK_OTP, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { useAuthStore } from '../store/authStore';
import { MOCK_CATEGORIES } from '../mock/mockServices';

// ─── Global styles ────────────────────────────────────────────────────────────
const S = `
@keyframes psIn     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes scanLine { 0%{top:0%} 100%{top:100%} }
@keyframes pulseRing{ 0%,100%{box-shadow:0 0 0 0 rgba(0,128,128,0.35)} 60%{box-shadow:0 0 0 18px rgba(0,128,128,0)} }
.ps-in   { animation: psIn 0.4s ease both; }
.ps-ring { animation: pulseRing 2s ease-in-out infinite; }
.ps-scan-line {
  position:absolute; left:0; right:0; height:3px;
  background: linear-gradient(90deg,transparent,${COLORS.tealBlue},transparent);
  animation: scanLine 2s linear infinite;
}
.ps-id-opt { cursor:pointer; border:1.5px solid #E4E9F2; border-radius:14px; background:#fff; transition:all 0.18s; }
.ps-id-opt:hover { border-color:${COLORS.tealBlue}; background:${COLORS.tealBlue}08; }
.ps-id-opt.sel   { border-color:${COLORS.navyBlue}; background:${COLORS.navyBlue}06; box-shadow:0 2px 12px ${COLORS.navyBlue}18; }
.ps-price-opt { cursor:pointer; border:1.5px solid #E4E9F2; border-radius:14px; background:#fff; transition:all 0.18s; }
.ps-price-opt:hover { border-color:${COLORS.tealBlue}; }
.ps-price-opt.sel  { border-color:${COLORS.tealBlue}; background:${COLORS.tealBlue}08; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type IdType = 'passport' | 'driving_license' | 'national_id' | 'kebele_id';
type PricingMethod = 'fixed' | 'platform_calculated';

interface IdField { key: string; label: string; placeholder: string; }

// ─── ID field schemas ─────────────────────────────────────────────────────────
const ID_FIELDS: Record<IdType, IdField[]> = {
  passport: [
    { key: 'fullName',        label: 'Full Name (as on passport)',    placeholder: 'e.g. TESFAYE ALMAZ BEKELE' },
    { key: 'passportNumber',  label: 'Passport Number',               placeholder: 'e.g. EP1234567' },
    { key: 'nationality',     label: 'Nationality',                   placeholder: 'e.g. Ethiopian' },
    { key: 'dateOfBirth',     label: 'Date of Birth',                 placeholder: 'DD/MM/YYYY' },
    { key: 'gender',          label: 'Gender',                        placeholder: 'Male / Female' },
    { key: 'placeOfBirth',    label: 'Place of Birth',                placeholder: 'e.g. Addis Ababa' },
    { key: 'issueDate',       label: 'Issue Date',                    placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',      label: 'Expiry Date',                   placeholder: 'DD/MM/YYYY' },
    { key: 'issuingCountry',  label: 'Issuing Country',               placeholder: 'e.g. Ethiopia' },
  ],
  driving_license: [
    { key: 'fullName',         label: 'Full Name',                    placeholder: 'As shown on license' },
    { key: 'licenseNumber',    label: 'License Number',               placeholder: 'e.g. DL-12345678' },
    { key: 'licenseClass',     label: 'License Class / Category',     placeholder: 'e.g. Class B' },
    { key: 'dateOfBirth',      label: 'Date of Birth',                placeholder: 'DD/MM/YYYY' },
    { key: 'gender',           label: 'Gender',                       placeholder: 'Male / Female' },
    { key: 'address',          label: 'Registered Address',           placeholder: 'Address on license' },
    { key: 'issueDate',        label: 'Issue Date',                   placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',       label: 'Expiry Date',                  placeholder: 'DD/MM/YYYY' },
    { key: 'issuingAuthority', label: 'Issuing Office / Authority',   placeholder: 'e.g. Addis Ababa Transport Bureau' },
    { key: 'phone',            label: 'Phone (on document)',          placeholder: 'Extracted from back of license' },
  ],
  national_id: [
    { key: 'fullName',  label: 'Full Name',           placeholder: 'As shown on ID' },
    { key: 'idNumber',  label: 'ID Number',           placeholder: 'e.g. ETH-NIDA-XXXXXXXX' },
    { key: 'dateOfBirth', label: 'Date of Birth',     placeholder: 'DD/MM/YYYY' },
    { key: 'gender',    label: 'Gender',              placeholder: 'Male / Female' },
    { key: 'nationality', label: 'Nationality',       placeholder: 'Ethiopian' },
    { key: 'region',    label: 'Region / Sub-City',   placeholder: 'e.g. Addis Ababa' },
    { key: 'woreda',    label: 'Woreda',              placeholder: 'e.g. Bole' },
    { key: 'issueDate', label: 'Issue Date',          placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate', label: 'Expiry Date',        placeholder: 'DD/MM/YYYY' },
    { key: 'phone',     label: 'Phone (on document)', placeholder: 'Extracted if present' },
  ],
  kebele_id: [
    { key: 'fullName',      label: 'Full Name',            placeholder: 'As shown on Kebele ID' },
    { key: 'kebeleIdNumber',label: 'Kebele ID Number',     placeholder: 'e.g. KID-XXXXXX' },
    { key: 'dateOfBirth',   label: 'Date of Birth',        placeholder: 'DD/MM/YYYY' },
    { key: 'gender',        label: 'Gender',               placeholder: 'Male / Female' },
    { key: 'fatherName',    label: "Father's Name",         placeholder: "Father's full name" },
    { key: 'kebele',        label: 'Kebele',               placeholder: 'e.g. Kebele 02' },
    { key: 'subCity',       label: 'Sub-City / Woreda',    placeholder: 'e.g. Bole Sub-City' },
    { key: 'issueDate',     label: 'Issue Date',           placeholder: 'DD/MM/YYYY' },
    { key: 'phone',         label: 'Phone (on document)',  placeholder: 'Extracted if present' },
  ],
};

// ─── Mock OCR data (phone included for non-passport docs) ────────────────────
const MOCK_EXTRACTED: Record<IdType, Record<string, string>> = {
  passport: {
    fullName: 'BEKELE ALMAZ TESFAYE', passportNumber: 'EP7291045', nationality: 'Ethiopian',
    dateOfBirth: '15/03/1990', gender: 'Female', placeOfBirth: 'Addis Ababa',
    issueDate: '10/01/2020', expiryDate: '09/01/2030', issuingCountry: 'Ethiopia',
  },
  driving_license: {
    fullName: 'TESFAYE GIRMA', licenseNumber: 'DL-54892316', licenseClass: 'Class B',
    dateOfBirth: '22/07/1988', gender: 'Male', address: 'Bole Sub-City, Addis Ababa',
    issueDate: '05/06/2019', expiryDate: '04/06/2024',
    issuingAuthority: 'Addis Ababa Transport Bureau',
    phone: '+251912345678',   // extracted from back of DL
  },
  national_id: {
    fullName: 'YONAS HAILE BEKELE', idNumber: 'ETH-NIDA-20041987-AA',
    dateOfBirth: '04/09/1987', gender: 'Male', nationality: 'Ethiopian',
    region: 'Addis Ababa', woreda: 'Bole',
    issueDate: '12/02/2022', expiryDate: '11/02/2032',
    phone: '+251987654321',   // extracted from back of national ID
  },
  kebele_id: {
    fullName: 'SELAMAWIT DAWIT', kebeleIdNumber: 'KID-081234',
    dateOfBirth: '30/11/1995', gender: 'Female', fatherName: 'DAWIT HAILE',
    kebele: 'Kebele 05', subCity: 'Kirkos Sub-City', issueDate: '08/04/2021',
    phone: '',   // not always present on Kebele ID
  },
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────
const STEP_LABELS = ['Identity', 'Review', 'Verify Phone', 'Face Scan', 'Profile', 'Done'];
const TOTAL_STEPS = 6;

function StepDots({ current }: { current: number }) {
  return (
    <Group justify="center" gap={0} mb={28} wrap="nowrap" style={{ overflowX: 'auto' }}>
      {STEP_LABELS.map((label, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        return (
          <Group key={label} gap={0} align="center" wrap="nowrap">
            <Stack gap={3} align="center">
              <Box
                w={28} h={28}
                style={{
                  borderRadius: '50%', flexShrink: 0,
                  background: done ? COLORS.tealBlue : active ? COLORS.navyBlue : '#E4E9F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active ? `0 2px 10px ${COLORS.navyBlue}40` : 'none',
                  transition: 'all 0.3s',
                }}
              >
                {done
                  ? <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 6.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  : <Text size="10px" fw={700} c={active ? 'white' : '#A0AEC0'}>{i + 1}</Text>
                }
              </Box>
              <Text size="9px" fw={600} c={active ? COLORS.navyBlue : done ? COLORS.tealBlue : '#A0AEC0'} style={{ whiteSpace: 'nowrap' }}>{label}</Text>
            </Stack>
            {i < STEP_LABELS.length - 1 && (
              <Box w={28} h={2} mx={4} mb={16} style={{ background: done ? COLORS.tealBlue : '#E4E9F2', transition: 'background 0.3s', borderRadius: 2 }} />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <Paper radius={20} p={{ base: 24, sm: 36 }}
      style={{ border: '1px solid #EEF0F7', boxShadow: '0 4px 28px rgba(0,0,128,0.07)', background: 'white' }}
      className="ps-in"
    >
      {children}
    </Paper>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <>
      <Group gap={12} mb={20}>
        <Box w={44} h={44} style={{ borderRadius: 12, background: '#F0F2F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Stack gap={1}>
          <Text fw={800} size="lg" c={COLORS.navyBlue}>{title}</Text>
          {subtitle && <Text size="xs" c="#718096">{subtitle}</Text>}
        </Stack>
      </Group>
      <Box mb={24} style={{ height: 1, background: '#F0F2F7' }} />
    </>
  );
}

function Shell({ children, step }: { children: React.ReactNode; step: number }) {
  const navigate = useNavigate();
  return (
    <Box style={{ minHeight: '100vh', background: '#F7F8FC', display: 'flex', flexDirection: 'column' }}>
      <style>{S}</style>

      {/* Navbar */}
      <Box style={{ background: 'white', borderBottom: '1px solid #EEF0F7' }}>
        <Container size={720}>
          <Group justify="space-between" py={14}>
            <Group gap={10} onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
              <Box w={34} h={34} style={{ borderRadius: 9, background: COLORS.navyBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconLock size={15} color={COLORS.lemonYellow} strokeWidth={2.5} />
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

      {/* Progress bar */}
      <Box style={{ height: 3, background: '#EEF0F7' }}>
        <Box style={{ height: '100%', width: `${(step / TOTAL_STEPS) * 100}%`, background: `linear-gradient(90deg, ${COLORS.navyBlue}, ${COLORS.tealBlue})`, transition: 'width 0.45s ease', borderRadius: '0 2px 2px 0' }} />
      </Box>

      <Center flex={1} py={36} px={16}>
        <Container size={640} w="100%">
          <StepDots current={step} />
          {children}
        </Container>
      </Center>
      <AIHelpCenter />
    </Box>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ label, preview, onFile, uploading, extracting }: {
  label: string;
  preview: string | null;
  onFile: (f: File | null) => void;
  uploading: boolean;
  extracting: boolean;
}) {
  return (
    <Box
      style={{
        borderRadius: 14,
        border: `2px dashed ${preview ? COLORS.tealBlue : '#D1D9E6'}`,
        background: preview ? `${COLORS.tealBlue}05` : '#FAFBFF',
        padding: preview ? 12 : 24,
        textAlign: 'center',
        transition: 'all 0.2s',
      }}
    >
      {preview ? (
        <Stack align="center" gap={10}>
          <Box style={{ position: 'relative', display: 'inline-block', borderRadius: 10, overflow: 'hidden' }}>
            <img src={preview} alt={label} style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 10, display: 'block' }} />
            {(uploading || extracting) && (
              <Box style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,128,0.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {extracting && <Box className="ps-scan-line" />}
                <Loader color="white" size="sm" />
                <Text size="11px" c="white" fw={600}>{extracting ? 'Extracting…' : 'Uploading…'}</Text>
              </Box>
            )}
          </Box>
          {!uploading && !extracting && (
            <Badge color="teal" leftSection={<IconCheck size={11} />} variant="light" size="sm">Uploaded</Badge>
          )}
          <FileButton onChange={onFile} accept="image/*">
            {p => <Button {...p} variant="subtle" color="gray" size="xs" leftSection={<IconRotate size={13} />}>Replace</Button>}
          </FileButton>
        </Stack>
      ) : (
        <Stack align="center" gap={10}>
          <Box w={44} h={44} style={{ borderRadius: 12, background: '#EEF0F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconUpload size={20} color="#A0AEC0" />
          </Box>
          <Stack gap={2}>
            <Text fw={600} size="sm" c={COLORS.navyBlue}>{label}</Text>
            <Text size="11px" c="#A0AEC0">JPG, PNG or PDF · max 10 MB</Text>
          </Stack>
          <FileButton onChange={onFile} accept="image/*,application/pdf">
            {p => <Button {...p} variant="light" color="navy" size="sm" radius="xl" leftSection={<IconUpload size={14} />}>Choose File</Button>}
          </FileButton>
        </Stack>
      )}
    </Box>
  );
}

// ─── STEP 1 – Identity Document Upload ───────────────────────────────────────
function StepIdentity({ onNext }: {
  onNext: (d: { idType: IdType; extracted: Record<string, string>; frontPreview: string | null; backPreview: string | null }) => void;
}) {
  const [idType, setIdType]           = useState<IdType | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview]   = useState<string | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [extracting, setExtracting]     = useState(false);
  const [extracted, setExtracted]       = useState<Record<string, string>>({});
  const [done, setDone]                 = useState(false);

  const requiresBack = idType !== 'passport';

  const handleFile = (side: 'front' | 'back', file: File | null) => {
    if (!file || !idType) return;
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      if (side === 'front') setFrontPreview(url);
      else setBackPreview(url);
    };
    reader.readAsDataURL(file);

    if (side === 'front') {
      setUploading(true);
      setTimeout(() => {
        setUploading(false);
        if (!requiresBack) {
          // Passport: single upload → extract immediately
          triggerExtract(idType);
        }
      }, 900);
    } else {
      // Back uploaded → trigger extraction
      setTimeout(() => triggerExtract(idType), 400);
    }
  };

  const triggerExtract = (type: IdType) => {
    setExtracting(true);
    setTimeout(() => {
      setExtracted(MOCK_EXTRACTED[type]);
      setExtracting(false);
      setDone(true);
      notifications.show({
        title: 'Information Extracted',
        message: 'Fields have been auto-filled. Please review before continuing.',
        color: 'teal',
        icon: <IconScan size={16} />,
      });
    }, 2000);
  };

  const readyToExtract = idType && frontPreview && (requiresBack ? !!backPreview : true) && !uploading;

  const handleContinue = () => {
    if (!idType || !frontPreview || !done) return;
    onNext({ idType, extracted, frontPreview, backPreview });
  };

  const idOptions: { type: IdType; label: string; desc: string; icon: React.ReactNode; needsBack: boolean }[] = [
    { type: 'passport',        label: 'Passport',        desc: 'Main page only', icon: <IconFileText size={22} color={COLORS.navyBlue} />,   needsBack: false },
    { type: 'driving_license', label: 'Driving License', desc: 'Front & back',   icon: <IconIdBadge size={22} color={COLORS.navyBlue} />,    needsBack: true },
    { type: 'national_id',     label: 'National ID',     desc: 'Front & back',   icon: <IconShieldLock size={22} color={COLORS.navyBlue} />, needsBack: true },
    { type: 'kebele_id',       label: 'Kebele ID',       desc: 'Front & back',   icon: <IconUser size={22} color={COLORS.navyBlue} />,       needsBack: true },
  ];

  return (
    <Card>
      <CardHeader icon={<IconShieldLock size={22} color={COLORS.navyBlue} />} title="Identity Verification" subtitle="Upload your official document to verify your identity" />

      {/* Type selection */}
      <Text size="13px" fw={700} c={COLORS.navyBlue} mb={10}>Select Document Type</Text>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10} mb={24}>
        {idOptions.map(opt => (
          <Box
            key={opt.type}
            className={`ps-id-opt${idType === opt.type ? ' sel' : ''}`}
            p={12}
            onClick={() => { setIdType(opt.type); setFrontPreview(null); setBackPreview(null); setExtracted({}); setDone(false); setExtracting(false); }}
          >
            <Stack gap={6} align="center" ta="center">
              <Box w={36} h={36} style={{ borderRadius: 10, background: idType === opt.type ? `${COLORS.navyBlue}10` : '#F7F8FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {opt.icon}
              </Box>
              <Text size="12px" fw={700} c={idType === opt.type ? COLORS.navyBlue : '#4A5568'}>{opt.label}</Text>
              <Text size="10px" c="#A0AEC0">{opt.desc}</Text>
            </Stack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Upload zones */}
      {idType && (
        <Stack gap={16} mb={20}>
          <Text size="13px" fw={700} c={COLORS.navyBlue}>
            {idType === 'passport' ? 'Upload Main Passport Page' : 'Upload Front & Back'}
          </Text>

          {idType === 'passport' ? (
            <UploadZone
              label="Main Passport Page (photo page)"
              preview={frontPreview}
              onFile={f => handleFile('front', f)}
              uploading={uploading}
              extracting={extracting}
            />
          ) : (
            <SimpleGrid cols={2} spacing={12}>
              <UploadZone
                label="Front of Document"
                preview={frontPreview}
                onFile={f => handleFile('front', f)}
                uploading={uploading}
                extracting={extracting}
              />
              <UploadZone
                label="Back of Document"
                preview={backPreview}
                onFile={f => handleFile('back', f)}
                uploading={false}
                extracting={extracting}
              />
            </SimpleGrid>
          )}

          {/* Extract button for non-passport (after both sides uploaded) */}
          {requiresBack && frontPreview && backPreview && !done && !extracting && (
            <Button
              variant="light" color="navy" radius="xl" size="sm"
              leftSection={<IconScan size={15} />}
              onClick={() => triggerExtract(idType)}
            >
              Extract Information from Document
            </Button>
          )}

          {extracting && (
            <Group gap={10} p={12} style={{ borderRadius: 12, background: '#EEF5FF', border: '1px solid #C3D9FF' }}>
              <Loader size="sm" color="navy" />
              <Text size="sm" fw={600} c={COLORS.navyBlue}>Scanning document and extracting information…</Text>
            </Group>
          )}

          {done && (
            <Group gap={8} p={12} style={{ borderRadius: 12, background: '#E6F4F1', border: '1px solid #B2DFDB' }}>
              <IconCircleCheck size={18} color={COLORS.tealBlue} />
              <Text size="sm" fw={600} c={COLORS.tealBlue}>Information extracted — please review on the next step</Text>
            </Group>
          )}
        </Stack>
      )}

      <Button
        fullWidth size="md" radius="xl"
        disabled={!done}
        rightSection={<IconArrowRight size={16} />}
        style={{ background: done ? `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})` : undefined, fontWeight: 700 }}
        onClick={handleContinue}
      >
        Review Extracted Information
      </Button>

      {!idType && (
        <Alert color="blue" icon={<IconInfoCircle size={15} />} radius={12} p={12} mt={16}>
          <Text size="xs">Select a document type above to begin the upload and extraction process.</Text>
        </Alert>
      )}
    </Card>
  );
}

// ─── STEP 2 – Review Info + Phone Selection + Agreement ───────────────────────
function StepReview({ idType, extracted, onNext, onBack }: {
  idType: IdType;
  extracted: Record<string, string>;
  onNext: (data: { fields: Record<string, string>; selectedPhone: string; agreed: boolean }) => void;
  onBack: () => void;
}) {
  const [fields, setFields]         = useState<Record<string, string>>(extracted);
  const [manualPhone, setManualPhone] = useState('');
  const [extraPhone, setExtraPhone]   = useState('');
  const [showExtra, setShowExtra]     = useState(false);
  const [selectedPhone, setSelectedPhone] = useState(extracted.phone || '');
  const [agreed, setAgreed]           = useState(false);
  const navigate = useNavigate();

  const docPhone     = extracted.phone?.trim();
  const isPassport   = idType === 'passport';
  // For passport: always manual. For others: show extracted if found, else manual
  const hasDocPhone  = !isPassport && docPhone && docPhone.length >= 7;

  // All phone options (for non-passport with extracted phone)
  const phoneOptions = hasDocPhone
    ? [{ value: docPhone!, label: `${docPhone} (from document)` }, { value: '__manual__', label: 'Enter a different number' }]
    : [];

  const resolvedPhone = hasDocPhone && selectedPhone !== '__manual__'
    ? selectedPhone
    : manualPhone;

  const handleContinue = () => {
    if (!resolvedPhone || resolvedPhone.trim().length < 7) {
      notifications.show({ title: 'Phone required', message: 'Provide a valid phone number to receive the verification code.', color: 'yellow' }); return;
    }
    if (!agreed) {
      notifications.show({ title: 'Agreement required', message: 'You must agree to the Terms and Privacy Policy to continue.', color: 'yellow' }); return;
    }
    onNext({ fields, selectedPhone: resolvedPhone.trim(), agreed });
  };

  const allFields = ID_FIELDS[idType].filter(f => f.key !== 'phone');

  return (
    <Card>
      <Group gap={10} mb={20}>
        <ActionIcon variant="subtle" radius={10} onClick={onBack}><IconArrowLeft size={16} /></ActionIcon>
        <Stack gap={0}>
          <Text fw={800} size="lg" c={COLORS.navyBlue}>Review Extracted Information</Text>
          <Text size="xs" c="#718096">Auto-filled from your document — correct any errors</Text>
        </Stack>
      </Group>
      <Box mb={20} style={{ height: 1, background: '#F0F2F7' }} />

      {/* Auto-fill notice */}
      <Alert color="blue" icon={<IconInfoCircle size={14} />} radius={12} p={12} mb={20}>
        <Text size="xs">These details were automatically extracted. Review carefully and edit anything that looks incorrect before proceeding.</Text>
      </Alert>

      {/* Editable fields */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={14} mb={24}>
        {allFields.map(f => (
          <TextInput
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            value={fields[f.key] ?? ''}
            onChange={e => setFields(prev => ({ ...prev, [f.key]: e.currentTarget.value }))}
            styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
          />
        ))}
      </SimpleGrid>

      <Box mb={24} style={{ height: 1, background: '#F0F2F7' }} />

      {/* ── Phone number section ───────────────────────────── */}
      <Stack gap={12} mb={24}>
        <Group gap={8}>
          <IconPhone size={16} color={COLORS.navyBlue} />
          <Text fw={700} size="sm" c={COLORS.navyBlue}>Phone Number for Verification</Text>
        </Group>

        {isPassport ? (
          // Passport: always manual entry (passport doesn't contain phone)
          <Stack gap={6}>
            <Text size="12px" c="#718096">Passports don't contain phone numbers. Please enter yours manually.</Text>
            <TextInput
              placeholder="+251 9XX XXX XXX (primary)"
              leftSection={<IconPhone size={15} color="#A0AEC0" />}
              value={manualPhone}
              onChange={e => setManualPhone(e.currentTarget.value)}
              styles={{ input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
            />
            {!showExtra ? (
              <Button variant="subtle" color="teal" size="xs" leftSection={<IconPlus size={12} />} onClick={() => setShowExtra(true)} style={{ alignSelf: 'flex-start' }}>
                Add a secondary phone
              </Button>
            ) : (
              <Group gap={8} wrap="nowrap">
                <TextInput
                  flex={1}
                  placeholder="+251 9XX XXX XXX (optional)"
                  leftSection={<IconPhone size={15} color="#A0AEC0" />}
                  value={extraPhone}
                  onChange={e => setExtraPhone(e.currentTarget.value)}
                  styles={{ input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
                />
                <ActionIcon variant="light" color="red" radius={10} size={36} onClick={() => { setShowExtra(false); setExtraPhone(''); }}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            )}
          </Stack>
        ) : hasDocPhone ? (
          // Non-passport with extracted phone
          <Stack gap={10}>
            <Text size="12px" c="#718096">We found a phone number in your document. Choose where to send the verification code, or enter a different number.</Text>

            {/* Extracted phone card */}
            <Box
              p={14}
              style={{
                borderRadius: 12,
                border: `1.5px solid ${selectedPhone === docPhone ? COLORS.tealBlue : '#E4E9F2'}`,
                background: selectedPhone === docPhone ? `${COLORS.tealBlue}08` : '#F7F8FC',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => setSelectedPhone(docPhone!)}
            >
              <Group justify="space-between">
                <Group gap={10}>
                  <IconPhone size={16} color={COLORS.tealBlue} />
                  <Stack gap={0}>
                    <Text size="11px" fw={600} c="#A0AEC0" style={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>Extracted from document</Text>
                    <Text fw={700} size="sm" c={COLORS.navyBlue}>{docPhone}</Text>
                  </Stack>
                </Group>
                {selectedPhone === docPhone && (
                  <Box w={20} h={20} style={{ borderRadius: '50%', background: COLORS.tealBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconCheck size={11} color="white" strokeWidth={3} />
                  </Box>
                )}
              </Group>
            </Box>

            {/* Option to enter different number */}
            <Box
              p={14}
              style={{
                borderRadius: 12,
                border: `1.5px solid ${selectedPhone === '__manual__' ? COLORS.navyBlue : '#E4E9F2'}`,
                background: selectedPhone === '__manual__' ? `${COLORS.navyBlue}06` : '#F7F8FC',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onClick={() => setSelectedPhone('__manual__')}
            >
              <Group justify="space-between">
                <Group gap={10}>
                  <IconPhone size={16} color={COLORS.navyBlue} />
                  <Text fw={600} size="sm" c={COLORS.navyBlue}>Use a different number</Text>
                </Group>
                {selectedPhone === '__manual__' && (
                  <Box w={20} h={20} style={{ borderRadius: '50%', background: COLORS.navyBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconCheck size={11} color="white" strokeWidth={3} />
                  </Box>
                )}
              </Group>
              {selectedPhone === '__manual__' && (
                <TextInput
                  mt={10}
                  placeholder="+251 9XX XXX XXX"
                  leftSection={<IconPhone size={15} color="#A0AEC0" />}
                  value={manualPhone}
                  onChange={e => { e.stopPropagation(); setManualPhone(e.currentTarget.value); }}
                  onClick={e => e.stopPropagation()}
                  styles={{ input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
                />
              )}
            </Box>
          </Stack>
        ) : (
          // Non-passport without phone extracted
          <Stack gap={6}>
            <Text size="12px" c="#718096">No phone number was found in your document. Please enter it manually.</Text>
            <TextInput
              placeholder="+251 9XX XXX XXX"
              leftSection={<IconPhone size={15} color="#A0AEC0" />}
              value={manualPhone}
              onChange={e => setManualPhone(e.currentTarget.value)}
              styles={{ input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
            />
          </Stack>
        )}
      </Stack>

      <Box mb={24} style={{ height: 1, background: '#F0F2F7' }} />

      {/* ── Agreement ──────────────────────────────────────── */}
      <Box
        p={16}
        mb={20}
        style={{
          borderRadius: 14,
          border: `1.5px solid ${agreed ? COLORS.tealBlue : '#E4E9F2'}`,
          background: agreed ? `${COLORS.tealBlue}05` : '#FAFBFF',
          transition: 'all 0.2s',
        }}
      >
        <Group gap={12} align="flex-start" wrap="nowrap">
          <Checkbox
            size="sm"
            checked={agreed}
            onChange={e => setAgreed(e.currentTarget.checked)}
            color="teal"
            styles={{ input: { borderRadius: 5, cursor: 'pointer', borderColor: agreed ? COLORS.tealBlue : '#CBD5E0' } }}
          />
          <Text size="sm" c="#4A5568" lh={1.6}>
            I have read and agree to ONE TOUCH's{' '}
            <Text
              span fw={700} c={COLORS.tealBlue}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(ROUTES.termsOfService)}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              span fw={700} c={COLORS.tealBlue}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(ROUTES.privacyPolicy)}
            >
              Privacy Policy
            </Text>
            . I confirm that the information provided is accurate and belongs to me.
          </Text>
        </Group>
      </Box>

      {!agreed && (
        <Alert color="orange" icon={<IconAlertCircle size={14} />} radius={10} p={10} mb={16}>
          <Text size="xs">You must agree to the Terms and Privacy Policy before proceeding.</Text>
        </Alert>
      )}

      <Button
        fullWidth size="md" radius="xl"
        disabled={!agreed}
        rightSection={<IconArrowRight size={16} />}
        style={{ background: agreed ? `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})` : undefined, fontWeight: 700 }}
        onClick={handleContinue}
      >
        Send Verification Code
      </Button>
    </Card>
  );
}

// ─── STEP 3 – OTP Verification ────────────────────────────────────────────────
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
      notifications.show({ title: 'Code Sent', message: `OTP sent to ${phone}. Demo: ${MOCK_OTP}`, color: 'teal', icon: <IconMessageCircle size={16} /> });
    }, 1100);
  };

  const verify = () => {
    if (otp.length < 6) { setError('Enter the complete 6-digit code.'); return; }
    setVerifying(true); setError('');
    setTimeout(() => {
      setVerifying(false);
      if (otp === MOCK_OTP) { onVerified(); }
      else { setError('Incorrect code. Please try again.'); }
    }, 900);
  };

  return (
    <Card>
      <Group gap={10} mb={20}>
        <ActionIcon variant="subtle" radius={10} onClick={onBack}><IconArrowLeft size={16} /></ActionIcon>
        <Stack gap={0}>
          <Text fw={800} size="lg" c={COLORS.navyBlue}>Phone Verification</Text>
          <Text size="xs" c="#718096">Enter the one-time code to confirm your phone number</Text>
        </Stack>
      </Group>
      <Box mb={20} style={{ height: 1, background: '#F0F2F7' }} />

      {/* Phone display */}
      <Box p={14} mb={20} style={{ borderRadius: 12, background: '#F7F8FC', border: '1px solid #E4E9F2', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Box w={34} h={34} style={{ borderRadius: 9, background: `${COLORS.tealBlue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconPhone size={16} color={COLORS.tealBlue} />
        </Box>
        <Stack gap={1}>
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
            Verify &amp; Continue
          </Button>
          <Text size="xs" ta="center" c="#A0AEC0">
            Didn't receive it?{' '}
            <Text span fw={700} c={COLORS.tealBlue} style={{ cursor: 'pointer' }} onClick={sendOtp}>Resend code</Text>
          </Text>
        </Stack>
      )}
    </Card>
  );
}

// ─── STEP 4 – Biometric Face Verification ────────────────────────────────────
function StepBiometric({ onVerified, onBack }: { onVerified: () => void; onBack: () => void }) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase]           = useState<'idle' | 'camera' | 'scanning' | 'matching' | 'success' | 'failed'>('idle');
  const [scanProgress, setScanProgress] = useState(0);

  const startCamera = useCallback(async () => {
    setPhase('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch {
      simulateScan();
    }
  }, []);

  const capture = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPhase('scanning');
    simulateScan();
  };

  const simulateScan = () => {
    let p = 0;
    const iv = setInterval(() => {
      p += 5; setScanProgress(p);
      if (p >= 100) { clearInterval(iv); setPhase('matching'); setTimeout(() => setPhase('success'), 1800); }
    }, 80);
  };

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  return (
    <Card>
      <Group gap={10} mb={20}>
        <ActionIcon variant="subtle" radius={10} onClick={onBack}><IconArrowLeft size={16} /></ActionIcon>
        <Stack gap={0}>
          <Text fw={800} size="lg" c={COLORS.navyBlue}>Biometric Face Verification</Text>
          <Text size="xs" c="#718096">Your face will be matched against your identity document</Text>
        </Stack>
      </Group>
      <Box mb={24} style={{ height: 1, background: '#F0F2F7' }} />

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <Stack align="center" gap={20} ta="center">
          <Box
            w={120} h={120} className="ps-ring"
            style={{ borderRadius: '50%', background: `${COLORS.tealBlue}10`, border: `2.5px solid ${COLORS.tealBlue}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconCamera size={52} color={COLORS.tealBlue} strokeWidth={1.5} />
          </Box>
          <Stack gap={8} maw={340}>
            <Text fw={700} size="md" c={COLORS.navyBlue}>Ready to scan your face</Text>
            <Text size="sm" c="#718096" lh={1.6}>
              Ensure you're in good lighting with no glasses or obstructions. We'll compare your face with your uploaded ID photo.
            </Text>
          </Stack>
          <Alert color="blue" icon={<IconInfoCircle size={14} />} radius={12} p={12} w="100%">
            <Text size="xs">Biometric data is processed on-device only and is never stored on ONE TOUCH servers.</Text>
          </Alert>
          <Button
            fullWidth size="md" radius="xl"
            leftSection={<IconCamera size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, fontWeight: 700 }}
            onClick={startCamera}
          >
            Start Face Scan
          </Button>
        </Stack>
      )}

      {/* ── Camera ── */}
      {phase === 'camera' && (
        <Stack align="center" gap={16}>
          <Box style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: `2px solid ${COLORS.tealBlue}`, width: 300, height: 230 }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
            <Box style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Box style={{ width: 130, height: 170, borderRadius: '50%', border: `2.5px solid ${COLORS.lemonYellow}`, boxShadow: '0 0 0 2000px rgba(0,0,0,0.32)' }} />
            </Box>
          </Box>
          <Text size="xs" c="#718096" ta="center">Centre your face within the oval guide, then capture</Text>
          <Button
            size="md" radius="xl" fullWidth
            leftSection={<IconScan size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, fontWeight: 700 }}
            onClick={capture}
          >
            Capture &amp; Analyse
          </Button>
        </Stack>
      )}

      {/* ── Scanning ── */}
      {phase === 'scanning' && (
        <Stack align="center" gap={20} ta="center">
          <RingProgress
            size={140} thickness={10}
            sections={[{ value: scanProgress, color: 'teal' }]}
            label={<Text fw={700} size="lg" ta="center" c={COLORS.tealBlue}>{scanProgress}%</Text>}
          />
          <Stack gap={4}>
            <Text fw={700} c={COLORS.navyBlue}>Analysing facial features…</Text>
            <Text size="sm" c="#718096">Please keep still</Text>
          </Stack>
        </Stack>
      )}

      {/* ── Matching ── */}
      {phase === 'matching' && (
        <Stack align="center" gap={20} ta="center">
          <Loader size={72} color="teal" />
          <Stack gap={4}>
            <Text fw={700} c={COLORS.navyBlue}>Matching with ID photo…</Text>
            <Text size="sm" c="#718096">Comparing your live face against your uploaded document</Text>
          </Stack>
        </Stack>
      )}

      {/* ── Success ── */}
      {phase === 'success' && (
        <Stack align="center" gap={20} ta="center">
          <Box w={88} h={88} style={{ borderRadius: '50%', background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCircleCheck size={48} color={COLORS.tealBlue} strokeWidth={1.5} />
          </Box>
          <Stack gap={6}>
            <Text fw={800} size="xl" c={COLORS.navyBlue}>Identity Confirmed!</Text>
            <Text size="sm" c="#718096">Your face has been successfully matched to your identity document.</Text>
          </Stack>
          <Button
            fullWidth size="md" radius="xl"
            rightSection={<IconArrowRight size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})`, fontWeight: 700 }}
            onClick={onVerified}
          >
            Continue to Profile Setup
          </Button>
        </Stack>
      )}

      {/* ── Failed ── */}
      {phase === 'failed' && (
        <Stack align="center" gap={20} ta="center">
          <Box w={88} h={88} style={{ borderRadius: '50%', background: '#FDE8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={48} color="#E74C3C" strokeWidth={1.5} />
          </Box>
          <Stack gap={6}>
            <Text fw={800} size="xl" c="#E74C3C">Verification Failed</Text>
            <Text size="sm" c="#718096">Face did not match your ID document. Ensure good lighting and try again.</Text>
          </Stack>
          <Alert color="red" icon={<IconAlertCircle size={14} />} radius={12} p={12} w="100%">
            <Text size="xs" fw={600}>You cannot proceed without successful face verification. This is required to ensure account security.</Text>
          </Alert>
          <Button
            fullWidth size="md" radius="xl" variant="outline" color="red"
            leftSection={<IconRotate size={16} />}
            onClick={() => { setPhase('idle'); setScanProgress(0); }}
          >
            Try Again
          </Button>
        </Stack>
      )}
    </Card>
  );
}

// ─── STEP 5 – Profile Setup ───────────────────────────────────────────────────
function StepProfile({ idFields, onComplete, onBack }: {
  idFields: Record<string, string>;
  onComplete: (d: { categoryId: string; subcategoryIds: string[]; bio: string; pricingMethod: PricingMethod; profilePicUrl: string | null }) => void;
  onBack: () => void;
}) {
  const [categoryId, setCategoryId]   = useState<string | null>(null);
  const [subIds, setSubIds]           = useState<string[]>([]);
  const [bio, setBio]                 = useState('');
  const [pricing, setPricing]         = useState<PricingMethod>('fixed');
  const [picUrl, setPicUrl]           = useState<string | null>(null);

  const catOptions  = MOCK_CATEGORIES.map(c => ({ value: c.id, label: c.name }));
  const selectedCat = MOCK_CATEGORIES.find(c => c.id === categoryId);
  const subOptions  = (selectedCat?.subcategories ?? []).map(s => ({ value: s.id, label: s.name }));

  const handlePic = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = e => setPicUrl(e.target?.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = () => {
    if (!categoryId) { notifications.show({ title: 'Category required', message: 'Select your primary service category.', color: 'yellow' }); return; }
    if (!subIds.length) { notifications.show({ title: 'Sub-service required', message: 'Select at least one sub-service.', color: 'yellow' }); return; }
    if (!bio.trim()) { notifications.show({ title: 'Bio required', message: 'Add a short description of your services.', color: 'yellow' }); return; }
    onComplete({ categoryId, subcategoryIds: subIds, bio, pricingMethod: pricing, profilePicUrl: picUrl });
  };

  const pricingOpts: { value: PricingMethod; label: string; desc: string }[] = [
    { value: 'fixed',               label: 'Fixed Price',           desc: 'You set a clear price for each job' },
    { value: 'platform_calculated', label: 'Platform Calculated',   desc: 'ONE TOUCH calculates the price automatically' },
  ];

  return (
    <Card>
      <Group gap={10} mb={20}>
        <ActionIcon variant="subtle" radius={10} onClick={onBack}><IconArrowLeft size={16} /></ActionIcon>
        <Stack gap={0}>
          <Text fw={800} size="lg" c={COLORS.navyBlue}>Profile Setup</Text>
          <Text size="xs" c="#718096">Complete your profile to start receiving jobs</Text>
        </Stack>
      </Group>
      <Box mb={24} style={{ height: 1, background: '#F0F2F7' }} />

      <Stack gap={24}>
        {/* Verified identity bar */}
        {idFields.fullName && (
          <Box p={14} style={{ borderRadius: 12, background: '#E6F4F1', border: '1px solid #B2DFDB', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Box w={34} h={34} style={{ borderRadius: 9, background: '#C8EBE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconShieldCheck size={17} color={COLORS.tealBlue} />
            </Box>
            <Stack gap={0} flex={1}>
              <Text size="10px" fw={600} c="#718096">Verified Identity</Text>
              <Text fw={700} size="sm" c={COLORS.navyBlue}>{idFields.fullName}</Text>
            </Stack>
            <Badge color="teal" variant="light" size="sm">Verified</Badge>
          </Box>
        )}

        {/* Profile picture */}
        <Stack gap={10}>
          <Text size="13px" fw={700} c={COLORS.navyBlue}>Profile Photo (optional)</Text>
          <Group gap={16} align="flex-start">
            <Box w={80} h={80} style={{ borderRadius: '50%', overflow: 'hidden', border: `2px solid ${COLORS.tealBlue}30`, background: '#F0F2F9', flexShrink: 0 }}>
              {picUrl
                ? <img src={picUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Center h="100%"><IconUser size={28} color="#CBD5E0" /></Center>
              }
            </Box>
            <Stack gap={4} justify="center">
              <FileButton onChange={handlePic} accept="image/*">
                {p => <Button {...p} variant="light" color="teal" size="sm" radius="xl" leftSection={<IconPhoto size={14} />}>Upload Photo</Button>}
              </FileButton>
              <Text size="11px" c="#A0AEC0">You can always add this later in settings</Text>
            </Stack>
          </Group>
        </Stack>

        <Box style={{ height: 1, background: '#F0F2F7' }} />

        {/* Service category */}
        <Stack gap={12}>
          <Text size="13px" fw={700} c={COLORS.navyBlue}>Service Category</Text>
          <Select
            placeholder="Select your primary category"
            data={catOptions}
            value={categoryId}
            onChange={v => { setCategoryId(v); setSubIds([]); }}
            leftSection={<IconBriefcase size={15} color="#A0AEC0" />}
            searchable
            styles={{ input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
          />
          {categoryId && (
            <MultiSelect
              label="Sub-services you offer"
              placeholder="Select one or more"
              data={subOptions}
              value={subIds}
              onChange={setSubIds}
              searchable
              styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 4 }, input: { borderRadius: 10, borderColor: '#E4E9F2' } }}
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
          styles={{ label: { fontWeight: 700, fontSize: 13, color: COLORS.navyBlue, marginBottom: 5 }, input: { borderRadius: 12, borderColor: '#E4E9F2' } }}
        />

        <Box style={{ height: 1, background: '#F0F2F7' }} />

        {/* Pricing method */}
        <Stack gap={10}>
          <Text size="13px" fw={700} c={COLORS.navyBlue}>Pricing Method</Text>
          <Alert color="orange" icon={<IconInfoCircle size={14} />} radius={12} p={12}>
            <Text size="xs" fw={600}>Per-hour pricing is not available on ONE TOUCH to prevent fraud and ensure full pricing transparency for clients.</Text>
          </Alert>
          <SimpleGrid cols={2} spacing={10}>
            {pricingOpts.map(opt => (
              <Box
                key={opt.value}
                className={`ps-price-opt${pricing === opt.value ? ' sel' : ''}`}
                p={14}
                onClick={() => setPricing(opt.value)}
              >
                <Stack gap={6} align="center" ta="center">
                  <Box
                    w={32} h={32}
                    style={{ borderRadius: 8, background: pricing === opt.value ? `${COLORS.tealBlue}18` : '#F7F8FC', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                  >
                    <IconCheck size={16} color={pricing === opt.value ? COLORS.tealBlue : '#CBD5E0'} strokeWidth={pricing === opt.value ? 3 : 2} />
                  </Box>
                  <Text size="12px" fw={700} c={pricing === opt.value ? COLORS.tealBlue : COLORS.navyBlue}>{opt.label}</Text>
                  <Text size="10px" c="#718096">{opt.desc}</Text>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </Stack>

        <Button
          fullWidth size="md" radius="xl"
          rightSection={<IconArrowRight size={16} />}
          style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})`, fontWeight: 700 }}
          onClick={handleSubmit}
        >
          Complete Registration
        </Button>
        <Button
          fullWidth variant="subtle" color="gray" size="sm"
          onClick={() => onComplete({ categoryId: categoryId ?? '', subcategoryIds: subIds, bio, pricingMethod: pricing, profilePicUrl: null })}
        >
          Skip for now — complete profile later
        </Button>
      </Stack>
    </Card>
  );
}

// ─── STEP 6 – Done ────────────────────────────────────────────────────────────
function StepDone() {
  const [count, setCount] = useState(0);
  useEffect(() => { const t = setInterval(() => setCount(c => (c + 1) % 4), 500); return () => clearInterval(t); }, []);
  return (
    <Card>
      <Stack align="center" gap={24} ta="center" py={12}>
        <Box w={96} h={96} style={{ borderRadius: '50%', background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCircleCheck size={52} color={COLORS.tealBlue} strokeWidth={1.5} />
        </Box>
        <Stack gap={6}>
          <Text fw={900} style={{ fontSize: '1.7rem', lineHeight: 1.2, color: COLORS.navyBlue }}>Welcome aboard!</Text>
          <Text size="sm" c="#718096" maw={320}>
            Your account is set up and fully verified. Redirecting to your dashboard{'…'.slice(0, count + 1)}
          </Text>
        </Stack>
        <SimpleGrid cols={3} spacing={12} w="100%">
          {[
            { icon: <IconShieldCheck size={20} color={COLORS.tealBlue} />, label: 'Identity Verified' },
            { icon: <IconPhone size={20} color={COLORS.tealBlue} />,       label: 'Phone Verified' },
            { icon: <IconCamera size={20} color={COLORS.tealBlue} />,      label: 'Face Matched' },
          ].map(item => (
            <Stack key={item.label} align="center" gap={6} p={12} style={{ borderRadius: 12, background: '#F0F9F7', border: '1px solid #C8EBE4' }}>
              {item.icon}
              <Text size="10px" fw={700} c="#718096">{item.label}</Text>
            </Stack>
          ))}
        </SimpleGrid>
        <Box w="100%" style={{ height: 5, borderRadius: 3, background: '#E4E9F2', overflow: 'hidden' }}>
          <Box style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${COLORS.tealBlue}, ${COLORS.navyBlue})`, animation: 'psIn 0.3s ease both' }} />
        </Box>
      </Stack>
    </Card>
  );
}

// ─── Main orchestrator ────────────────────────────────────────────────────────
export function ProviderSignup() {
  const navigate   = useNavigate();
  const { signup } = useAuthStore();
  const [step, setStep] = useState(1);

  // Data accumulated across steps
  const [idData, setIdData] = useState<{ idType: IdType; extracted: Record<string, string>; frontPreview: string | null; backPreview: string | null } | null>(null);
  const [reviewData, setReviewData] = useState<{ fields: Record<string, string>; selectedPhone: string; agreed: boolean } | null>(null);

  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const onIdentityDone = (d: typeof idData) => { setIdData(d); go(2); };

  const onReviewDone = (d: typeof reviewData) => { setReviewData(d); go(3); };

  const onOtpVerified = () => go(4);

  const onBiometricDone = () => go(5);

  const onProfileDone = () => {
    if (!idData || !reviewData) return;
    const name = idData.extracted.fullName ?? 'provider';
    const email = `${name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}@onetouch.demo`;
    signup({ email, password: 'demo123456', phone: reviewData.selectedPhone, role: 'provider' });
    notifications.show({ title: 'Registration Complete!', message: 'Welcome to ONE TOUCH.', color: 'teal', icon: <IconCircleCheck size={16} /> });
    go(6);
    setTimeout(() => navigate(ROUTES.providerDashboard), 2800);
  };

  return (
    <Shell step={step}>
      {step === 1 && <StepIdentity onNext={onIdentityDone} />}
      {step === 2 && idData && <StepReview idType={idData.idType} extracted={idData.extracted} onNext={onReviewDone} onBack={() => go(1)} />}
      {step === 3 && reviewData && <StepOtp phone={reviewData.selectedPhone} onVerified={onOtpVerified} onBack={() => go(2)} />}
      {step === 4 && <StepBiometric onVerified={onBiometricDone} onBack={() => go(3)} />}
      {step === 5 && idData && <StepProfile idFields={reviewData?.fields ?? idData.extracted} onComplete={onProfileDone} onBack={() => go(4)} />}
      {step === 6 && <StepDone />}
    </Shell>
  );
}
