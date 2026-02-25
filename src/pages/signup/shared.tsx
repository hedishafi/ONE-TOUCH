/**
 * signup/shared.tsx
 * Shared components for the 3-step signup flow (Client + Provider):
 *   Step 1 – Identity Verification  (auto-extract, phone, agreement)
 *   Step 2 – Phone & Biometric      (OTP then face scan, sequential)
 *
 * Each consuming page adds its own Step 3 (Profile Setup).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box, Button, Center, Container, Group, Paper,
  PinInput, Stack, Text, TextInput, ActionIcon,
  Alert, FileButton, Badge, SimpleGrid, RingProgress,
  Loader, Checkbox,
} from '@mantine/core';
import {
  IconShieldLock, IconArrowRight, IconArrowLeft,
  IconPhone, IconUser, IconMessageCircle,
  IconCircleCheck, IconAlertCircle, IconUpload, IconCamera,
  IconScan, IconFileText, IconIdBadge, IconCheck, IconX, IconRotate,
  IconLock, IconInfoCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { COLORS, MOCK_OTP, ROUTES } from '../../utils/constants';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { AIHelpCenter } from '../../components/AIHelpCenter';

// ─── Global CSS ───────────────────────────────────────────────────────────────
export const SHARED_CSS = `
@keyframes sfIn     { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes scanLine { 0%{top:0%} 100%{top:100%} }
@keyframes pulseRing{ 0%,100%{box-shadow:0 0 0 0 rgba(0,128,128,0.3)} 60%{box-shadow:0 0 0 16px rgba(0,128,128,0)} }
.sf-in       { animation: sfIn 0.38s ease both; }
.sf-ring     { animation: pulseRing 2s ease-in-out infinite; }
.sf-scanline { position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#008080,transparent);animation:scanLine 1.8s linear infinite; }
.sf-id-opt   { cursor:pointer;border:1.5px solid #E4E9F2;border-radius:14px;background:#fff;transition:all 0.18s; }
.sf-id-opt:hover { border-color:#008080;background:#00808008; }
.sf-id-opt.sel   { border-color:#000080;background:#00008006;box-shadow:0 2px 10px #00008018; }
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
    { key: 'fullName',    label: 'Full Name',        placeholder: 'As on ID' },
    { key: 'idNumber',    label: 'ID Number',        placeholder: 'e.g. ETH-NIDA-XXXXXXXX' },
    { key: 'dateOfBirth', label: 'Date of Birth',    placeholder: 'DD/MM/YYYY' },
    { key: 'gender',      label: 'Gender',           placeholder: 'Male / Female' },
    { key: 'nationality', label: 'Nationality',      placeholder: 'Ethiopian' },
    { key: 'region',      label: 'Region / Sub-City',placeholder: 'e.g. Addis Ababa' },
    { key: 'woreda',      label: 'Woreda',           placeholder: 'e.g. Bole' },
    { key: 'issueDate',   label: 'Issue Date',       placeholder: 'DD/MM/YYYY' },
    { key: 'expiryDate',  label: 'Expiry Date',      placeholder: 'DD/MM/YYYY' },
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

// ─── Step labels & dot component ─────────────────────────────────────────────
export const STEP_LABELS = ['Identity', 'Phone & Biometric', 'Profile'];

export function StepDots({ current }: { current: number }) {
  return (
    <Group justify="center" gap={0} mb={30} wrap="nowrap">
      {STEP_LABELS.map((label, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        return (
          <Group key={label} gap={0} align="center" wrap="nowrap">
            <Stack gap={4} align="center">
              <Box w={30} h={30} style={{
                borderRadius: '50%', flexShrink: 0,
                background: done ? COLORS.tealBlue : active ? COLORS.navyBlue : '#E4E9F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? `0 2px 10px ${COLORS.navyBlue}45` : 'none',
                transition: 'all 0.3s',
              }}>
                {done
                  ? <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 6.5l3 3 6-6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                  : <Text size="11px" fw={700} c={active ? 'white' : '#A0AEC0'}>{i + 1}</Text>
                }
              </Box>
              <Text size="10px" fw={600} c={active ? COLORS.navyBlue : done ? COLORS.tealBlue : '#A0AEC0'} style={{ whiteSpace: 'nowrap' }}>{label}</Text>
            </Stack>
            {i < STEP_LABELS.length - 1 && (
              <Box w={44} h={2} mx={6} mb={18} style={{ background: done ? COLORS.tealBlue : '#E4E9F2', transition: 'background 0.3s', borderRadius: 2 }} />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

// ─── Shared shell ─────────────────────────────────────────────────────────────
export function Shell({ children, step }: { children: React.ReactNode; step: number }) {
  const navigate = useNavigate();
  return (
    <Box style={{ minHeight: '100vh', background: '#F7F8FC', display: 'flex', flexDirection: 'column' }}>
      <style>{SHARED_CSS}</style>

      {/* Navbar */}
      <Box style={{ background: 'white', borderBottom: '1px solid #EEF0F7' }}>
        <Container size={680}>
          <Group justify="space-between" py={14}>
            <Group gap={10} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.landing)}>
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
        <Box style={{
          height: '100%',
          width: `${(step / 3) * 100}%`,
          background: `linear-gradient(90deg, ${COLORS.navyBlue}, ${COLORS.tealBlue})`,
          transition: 'width 0.45s ease',
          borderRadius: '0 2px 2px 0',
        }} />
      </Box>

      <Center flex={1} py={36} px={16}>
        <Container size={600} w="100%">
          <StepDots current={step} />
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
    <Paper radius={20} p={{ base: 24, sm: 36 }}
      style={{ border: '1px solid #EEF0F7', boxShadow: '0 4px 24px rgba(0,0,128,0.07)', background: 'white' }}
      className="sf-in"
    >
      {children}
    </Paper>
  );
}

export function CardHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <>
      <Group gap={12} mb={20}>
        <Box w={42} h={42} style={{ borderRadius: 12, background: '#F0F2F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </Box>
        <Stack gap={1}>
          <Text fw={800} size="lg" c={COLORS.navyBlue}>{title}</Text>
          {sub && <Text size="xs" c="#718096">{sub}</Text>}
        </Stack>
      </Group>
      <Box mb={22} style={{ height: 1, background: '#F0F2F7' }} />
    </>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────
export function UploadZone({ label, preview, onFile, scanning }: {
  label: string; preview: string | null; onFile: (f: File | null) => void; scanning: boolean;
}) {
  return (
    <Box style={{
      borderRadius: 14, border: `2px dashed ${preview ? COLORS.tealBlue : '#D1D9E6'}`,
      background: preview ? '#00808005' : '#FAFBFF', padding: preview ? 12 : 20,
      textAlign: 'center', transition: 'all 0.2s',
    }}>
      {preview ? (
        <Stack align="center" gap={8}>
          <Box style={{ position: 'relative', display: 'inline-block', borderRadius: 10, overflow: 'hidden' }}>
            <img src={preview} alt={label} style={{ maxHeight: 130, maxWidth: '100%', borderRadius: 10, display: 'block' }} />
            {scanning && (
              <Box style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,128,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Box className="sf-scanline" />
                <Loader color="white" size="xs" mt={8} />
                <Text size="10px" c="white" fw={600} mt={4}>Extracting…</Text>
              </Box>
            )}
          </Box>
          {!scanning && <Badge color="teal" leftSection={<IconCheck size={10} />} variant="light" size="sm">Uploaded</Badge>}
          <FileButton onChange={onFile} accept="image/*">
            {p => <Button {...p} variant="subtle" color="gray" size="xs" leftSection={<IconRotate size={12} />}>Replace</Button>}
          </FileButton>
        </Stack>
      ) : (
        <Stack align="center" gap={8}>
          <Box w={40} h={40} style={{ borderRadius: 10, background: '#EEF0F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconUpload size={18} color="#A0AEC0" />
          </Box>
          <Stack gap={2}>
            <Text fw={600} size="sm" c={COLORS.navyBlue}>{label}</Text>
            <Text size="11px" c="#A0AEC0">JPG, PNG · max 10 MB</Text>
          </Stack>
          <FileButton onChange={onFile} accept="image/*">
            {p => <Button {...p} variant="light" color="blue" size="sm" radius="xl" leftSection={<IconUpload size={13} />}>Choose File</Button>}
          </FileButton>
        </Stack>
      )}
    </Box>
  );
}

// ─── STEP 1 – Identity Verification ──────────────────────────────────────────
export function StepIdentity({ onNext }: { onNext: (r: IdentityResult) => void }) {
  const navigate = useNavigate();
  const [idType, setIdType]           = useState<IdType | null>(null);
  const [frontUrl, setFrontUrl]       = useState<string | null>(null);
  const [backUrl, setBackUrl]         = useState<string | null>(null);
  const [scanning, setScanning]       = useState(false);
  const [extracted, setExtracted]     = useState<Record<string, string>>({});
  const [fields, setFields]           = useState<Record<string, string>>({});
  const [done, setDone]               = useState(false);
  const [manualPhone, setManualPhone] = useState('');
  const [selectedPhone, setSelectedPhone] = useState('');
  const [agreed, setAgreed]           = useState(false);

  const isPassport   = idType === 'passport';
  const needsBack    = !isPassport;
  const docPhone     = extracted.phone?.trim() ?? '';
  const hasDocPhone  = !isPassport && docPhone.length >= 7;

  const runExtract = useCallback((type: IdType) => {
    setScanning(true);
    setTimeout(() => {
      const data = MOCK_EXTRACTED[type];
      setExtracted(data);
      setFields(Object.fromEntries(ID_FIELDS[type].map(f => [f.key, data[f.key] ?? ''])));
      setScanning(false);
      setDone(true);
      if (!isPassport && data.phone?.trim()) setSelectedPhone(data.phone.trim());
      notifications.show({ title: 'Information Extracted', message: 'Fields auto-filled — review before continuing.', color: 'teal', icon: <IconScan size={15} /> });
    }, 1800);
  }, [isPassport]);

  const handleFront = (file: File | null) => {
    if (!file || !idType) return;
    const r = new FileReader();
    r.onload = e => {
      setFrontUrl(e.target?.result as string);
      if (isPassport) runExtract(idType);         // passport: single upload → auto-extract
      else if (backUrl) runExtract(idType);       // others: if back already uploaded → extract
    };
    r.readAsDataURL(file);
  };

  const handleBack = (file: File | null) => {
    if (!file || !idType) return;
    const r = new FileReader();
    r.onload = e => {
      setBackUrl(e.target?.result as string);
      if (frontUrl) runExtract(idType);           // others: if front already uploaded → extract
    };
    r.readAsDataURL(file);
  };

  const changeType = (type: IdType) => {
    setIdType(type); setFrontUrl(null); setBackUrl(null);
    setExtracted({}); setFields({}); setDone(false);
    setScanning(false); setSelectedPhone(''); setManualPhone('');
  };

  const resolvedPhone = hasDocPhone && selectedPhone !== '__manual__'
    ? selectedPhone : manualPhone.trim();

  const handleContinue = () => {
    if (!done) { notifications.show({ title: 'Upload required', message: 'Upload your ID document first.', color: 'yellow' }); return; }
    if (!resolvedPhone || resolvedPhone.length < 7) { notifications.show({ title: 'Phone required', message: 'Provide a valid phone number.', color: 'yellow' }); return; }
    if (!agreed) { notifications.show({ title: 'Agreement required', message: 'You must agree to the Terms and Privacy Policy.', color: 'yellow' }); return; }
    onNext({ idType: idType!, extracted, frontDataUrl: frontUrl, backDataUrl: backUrl, selectedPhone: resolvedPhone, agreed });
  };

  const idOptions: { type: IdType; label: string; desc: string; icon: React.ReactNode }[] = [
    { type: 'passport',        label: 'Passport',        desc: 'Main page only', icon: <IconFileText size={20} color={COLORS.navyBlue} /> },
    { type: 'driving_license', label: 'Driving License', desc: 'Front & back',   icon: <IconIdBadge size={20} color={COLORS.navyBlue} /> },
    { type: 'national_id',     label: 'National ID',     desc: 'Front & back',   icon: <IconShieldLock size={20} color={COLORS.navyBlue} /> },
    { type: 'kebele_id',       label: 'Kebele ID',       desc: 'Front & back',   icon: <IconUser size={20} color={COLORS.navyBlue} /> },
  ];

  return (
    <Card>
      <CardHeader icon={<IconShieldLock size={20} color={COLORS.navyBlue} />} title="Identity Verification" sub="Upload your ID — we'll extract your information automatically" />

      {/* Document type selection */}
      <Text size="12px" fw={700} c={COLORS.navyBlue} mb={10} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Choose Document Type</Text>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10} mb={24}>
        {idOptions.map(opt => (
          <Box key={opt.type} className={`sf-id-opt${idType === opt.type ? ' sel' : ''}`} p={12} onClick={() => changeType(opt.type)}>
            <Stack gap={6} align="center" ta="center">
              <Box w={34} h={34} style={{ borderRadius: 10, background: idType === opt.type ? `${COLORS.navyBlue}10` : '#F7F8FC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {opt.icon}
              </Box>
              <Text size="11px" fw={700} c={idType === opt.type ? COLORS.navyBlue : '#4A5568'}>{opt.label}</Text>
              <Text size="10px" c="#A0AEC0">{opt.desc}</Text>
            </Stack>
          </Box>
        ))}
      </SimpleGrid>

      {/* Upload zones */}
      {idType && (
        <Stack gap={14} mb={22}>
          {isPassport ? (
            <UploadZone label="Main Passport Page (photo page)" preview={frontUrl} onFile={handleFront} scanning={scanning} />
          ) : (
            <SimpleGrid cols={2} spacing={12}>
              <UploadZone label="Front of Document" preview={frontUrl} onFile={handleFront} scanning={scanning && !backUrl} />
              <UploadZone label="Back of Document"  preview={backUrl}  onFile={handleBack}  scanning={scanning && !!frontUrl} />
            </SimpleGrid>
          )}

          {scanning && (
            <Group gap={10} p={12} style={{ borderRadius: 10, background: '#EEF5FF', border: '1px solid #C3D9FF' }}>
              <Loader size="xs" color="blue" />
              <Text size="xs" fw={600} c={COLORS.navyBlue}>Scanning and extracting information…</Text>
            </Group>
          )}

          {done && (
            <Group gap={8} p={10} style={{ borderRadius: 10, background: '#E6F4F1', border: '1px solid #B2DFDB' }}>
              <IconCircleCheck size={16} color={COLORS.tealBlue} />
              <Text size="xs" fw={600} c={COLORS.tealBlue}>Extraction complete — review fields below</Text>
            </Group>
          )}
        </Stack>
      )}

      {/* Editable extracted fields */}
      {done && idType && (
        <>
          <Text size="12px" fw={700} c={COLORS.navyBlue} mb={10} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Review Extracted Information</Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={12} mb={22}>
            {ID_FIELDS[idType].filter(f => f.key !== 'phone').map(f => (
              <TextInput
                key={f.key}
                label={f.label}
                placeholder={f.placeholder}
                value={fields[f.key] ?? ''}
                onChange={e => setFields(p => ({ ...p, [f.key]: e.currentTarget.value }))}
                styles={{ label: { fontWeight: 600, fontSize: 12, color: COLORS.navyBlue, marginBottom: 3 }, input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
              />
            ))}
          </SimpleGrid>

          {/* Phone selection */}
          <Box mb={20} style={{ padding: 16, borderRadius: 14, background: '#F7F8FC', border: '1px solid #E4E9F2' }}>
            <Group gap={8} mb={12}>
              <IconPhone size={15} color={COLORS.navyBlue} />
              <Text fw={700} size="sm" c={COLORS.navyBlue}>Phone for Verification Code</Text>
            </Group>

            {isPassport ? (
              <Stack gap={6}>
                <Text size="11px" c="#718096">Passports don't contain phone numbers — enter yours manually.</Text>
                <TextInput
                  placeholder="+251 9XX XXX XXX"
                  leftSection={<IconPhone size={14} color="#A0AEC0" />}
                  value={manualPhone}
                  onChange={e => setManualPhone(e.currentTarget.value)}
                  styles={{ input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
                />
              </Stack>
            ) : hasDocPhone ? (
              <Stack gap={10}>
                <Text size="11px" c="#718096">We found a number on your document. Choose where to send the code:</Text>
                {/* Extracted phone option */}
                <Box
                  p={12} style={{ borderRadius: 10, border: `1.5px solid ${selectedPhone === docPhone ? COLORS.tealBlue : '#E4E9F2'}`, background: selectedPhone === docPhone ? '#00808008' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}
                  onClick={() => setSelectedPhone(docPhone)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={0}>
                      <Text size="10px" fw={600} c="#A0AEC0">From your document</Text>
                      <Text fw={700} size="sm" c={COLORS.navyBlue}>{docPhone}</Text>
                    </Stack>
                    {selectedPhone === docPhone && (
                      <Box w={18} h={18} style={{ borderRadius: '50%', background: COLORS.tealBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconCheck size={10} color="white" strokeWidth={3} />
                      </Box>
                    )}
                  </Group>
                </Box>
                {/* Manual entry option */}
                <Box
                  p={12} style={{ borderRadius: 10, border: `1.5px solid ${selectedPhone === '__manual__' ? COLORS.navyBlue : '#E4E9F2'}`, background: selectedPhone === '__manual__' ? '#00008006' : 'white', cursor: 'pointer', transition: 'all 0.15s' }}
                  onClick={() => setSelectedPhone('__manual__')}
                >
                  <Group justify="space-between">
                    <Text fw={600} size="sm" c={COLORS.navyBlue}>Use a different number</Text>
                    {selectedPhone === '__manual__' && (
                      <Box w={18} h={18} style={{ borderRadius: '50%', background: COLORS.navyBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconCheck size={10} color="white" strokeWidth={3} />
                      </Box>
                    )}
                  </Group>
                  {selectedPhone === '__manual__' && (
                    <TextInput
                      mt={10} placeholder="+251 9XX XXX XXX"
                      leftSection={<IconPhone size={14} color="#A0AEC0" />}
                      value={manualPhone}
                      onChange={e => { e.stopPropagation(); setManualPhone(e.currentTarget.value); }}
                      onClick={e => e.stopPropagation()}
                      styles={{ input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
                    />
                  )}
                </Box>
              </Stack>
            ) : (
              <Stack gap={6}>
                <Text size="11px" c="#718096">No phone found on document — enter manually.</Text>
                <TextInput
                  placeholder="+251 9XX XXX XXX"
                  leftSection={<IconPhone size={14} color="#A0AEC0" />}
                  value={manualPhone}
                  onChange={e => setManualPhone(e.currentTarget.value)}
                  styles={{ input: { borderRadius: 9, borderColor: '#E4E9F2' } }}
                />
              </Stack>
            )}
          </Box>

          {/* Agreement checkbox */}
          <Box
            p={14} mb={20}
            style={{ borderRadius: 13, border: `1.5px solid ${agreed ? COLORS.tealBlue : '#E4E9F2'}`, background: agreed ? '#00808006' : '#FAFBFF', transition: 'all 0.2s' }}
          >
            <Group gap={12} align="flex-start" wrap="nowrap">
              <Checkbox
                size="sm" checked={agreed}
                onChange={e => setAgreed(e.currentTarget.checked)}
                color="teal"
                styles={{ input: { borderRadius: 4, cursor: 'pointer' } }}
              />
              <Text size="sm" c="#4A5568" lh={1.55}>
                I have read and agree to ONE TOUCH's{' '}
                <Text span fw={700} c={COLORS.tealBlue} style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(ROUTES.termsOfService)}>Terms of Service</Text>
                {' '}and{' '}
                <Text span fw={700} c={COLORS.tealBlue} style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate(ROUTES.privacyPolicy)}>Privacy Policy</Text>.
                I confirm this information belongs to me.
              </Text>
            </Group>
          </Box>

          <Button
            fullWidth size="md" radius="xl"
            disabled={!agreed}
            rightSection={<IconArrowRight size={16} />}
            style={{ background: agreed ? `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})` : undefined, fontWeight: 700 }}
            onClick={handleContinue}
          >
            Continue to Verification
          </Button>
        </>
      )}

      {!idType && (
        <Alert color="blue" icon={<IconInfoCircle size={14} />} radius={10} p={10}>
          <Text size="xs">Select a document type above to begin — information will be extracted automatically.</Text>
        </Alert>
      )}
    </Card>
  );
}

// ─── STEP 2 – Phone OTP + Biometric (sequential sub-steps) ───────────────────
type Phase2 = 'otp_send' | 'otp_verify' | 'bio_idle' | 'bio_camera' | 'bio_scanning' | 'bio_matching' | 'bio_success' | 'bio_failed';

export function StepVerify({ phone, onDone, onBack }: {
  phone: string;
  onDone: (capturedFaceUrl: string | null) => void;
  onBack: () => void;
}) {
  const [phase, setPhase]       = useState<Phase2>('otp_send');
  const [otp, setOtp]           = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading]   = useState(false);
  const [scanPct, setScanPct]   = useState(0);
  const [faceUrl, setFaceUrl]   = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isOtpPhase = phase.startsWith('otp');
  const isBioPhase = phase.startsWith('bio');

  const sendOtp = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false); setPhase('otp_verify');
      notifications.show({ title: 'Code Sent', message: `Sent to ${phone}. Demo code: ${MOCK_OTP}`, color: 'teal', icon: <IconMessageCircle size={15} /> });
    }, 1000);
  };

  const verifyOtp = () => {
    if (otp.length < 6) { setOtpError('Enter all 6 digits.'); return; }
    setLoading(true); setOtpError('');
    setTimeout(() => {
      setLoading(false);
      if (otp === MOCK_OTP) { setPhase('bio_idle'); }
      else { setOtpError('Incorrect code — try again.'); }
    }, 900);
  };

  const startCamera = useCallback(async () => {
    setPhase('bio_camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch { simulateBio(); }
  }, []);

  const captureFace = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    // Capture frame to canvas
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width  = videoRef.current.videoWidth  || 320;
      canvasRef.current.height = videoRef.current.videoHeight || 240;
      ctx?.drawImage(videoRef.current, 0, 0);
      setFaceUrl(canvasRef.current.toDataURL('image/jpeg', 0.8));
    }
    simulateBio();
  };

  const simulateBio = () => {
    setPhase('bio_scanning');
    let p = 0;
    const iv = setInterval(() => {
      p += 4; setScanPct(p);
      if (p >= 100) { clearInterval(iv); setPhase('bio_matching'); setTimeout(() => setPhase('bio_success'), 1600); }
    }, 60);
  };

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const subLabel = isOtpPhase ? 'Phone Verification' : 'Biometric Face Verification';
  const subDesc  = isOtpPhase ? 'Confirm your phone number with a one-time code' : 'Match your live face with your identity document';

  return (
    <Card>
      <Group gap={10} mb={20}>
        {isOtpPhase && <ActionIcon variant="subtle" radius={10} onClick={onBack}><IconArrowLeft size={16} /></ActionIcon>}
        <Stack gap={0}>
          <Text fw={800} size="lg" c={COLORS.navyBlue}>{subLabel}</Text>
          <Text size="xs" c="#718096">{subDesc}</Text>
        </Stack>
        {isBioPhase && (
          <Box ml="auto">
            <Badge color="teal" variant="light" size="sm" leftSection={<IconCheck size={10} />}>Phone Verified</Badge>
          </Box>
        )}
      </Group>
      <Box mb={22} style={{ height: 1, background: '#F0F2F7' }} />

      {/* OTP – send */}
      {phase === 'otp_send' && (
        <Stack gap={20}>
          <Box p={14} style={{ borderRadius: 12, background: '#F7F8FC', border: '1px solid #E4E9F2', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Box w={34} h={34} style={{ borderRadius: 9, background: `${COLORS.tealBlue}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconPhone size={15} color={COLORS.tealBlue} />
            </Box>
            <Stack gap={0}>
              <Text size="10px" fw={600} c="#A0AEC0" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>Sending code to</Text>
              <Text fw={700} size="sm" c={COLORS.navyBlue}>{phone}</Text>
            </Stack>
          </Box>
          <Button
            fullWidth size="md" radius="xl" loading={loading}
            leftSection={<IconMessageCircle size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, fontWeight: 700 }}
            onClick={sendOtp}
          >
            Send Verification Code
          </Button>
        </Stack>
      )}

      {/* OTP – verify */}
      {phase === 'otp_verify' && (
        <Stack gap={20}>
          <Stack align="center" gap={12}>
            <Text size="sm" fw={600} c={COLORS.navyBlue}>Enter the 6-digit code sent to {phone}</Text>
            <PinInput length={6} type="number" size="lg" value={otp} onChange={setOtp} oneTimeCode />
            {otpError && (
              <Alert color="red" icon={<IconAlertCircle size={14} />} radius={10} p={10} w="100%">
                <Text size="xs">{otpError}</Text>
              </Alert>
            )}
          </Stack>
          <Button
            fullWidth size="md" radius="xl" loading={loading}
            rightSection={<IconArrowRight size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, fontWeight: 700 }}
            onClick={verifyOtp}
          >
            Verify Code
          </Button>
          <Text size="xs" ta="center" c="#A0AEC0">
            Didn't receive it?{' '}
            <Text span fw={700} c={COLORS.tealBlue} style={{ cursor: 'pointer' }} onClick={() => { setPhase('otp_send'); setOtp(''); setOtpError(''); }}>Resend</Text>
          </Text>
        </Stack>
      )}

      {/* Biometric – idle */}
      {phase === 'bio_idle' && (
        <Stack align="center" gap={20} ta="center">
          <Box w={110} h={110} className="sf-ring" style={{ borderRadius: '50%', background: `${COLORS.tealBlue}10`, border: `2px solid ${COLORS.tealBlue}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconCamera size={48} color={COLORS.tealBlue} strokeWidth={1.5} />
          </Box>
          <Stack gap={6} maw={320}>
            <Text fw={700} size="md" c={COLORS.navyBlue}>Ready for face scan</Text>
            <Text size="sm" c="#718096" lh={1.6}>Good lighting, no glasses or obstructions. Your face will be matched to your ID photo.</Text>
          </Stack>
          <Alert color="blue" icon={<IconInfoCircle size={13} />} radius={10} p={10} w="100%">
            <Text size="xs">Biometric data is processed locally — never stored on our servers.</Text>
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

      {/* Biometric – camera */}
      {phase === 'bio_camera' && (
        <Stack align="center" gap={16}>
          <Box style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: `2px solid ${COLORS.tealBlue}`, width: 280, height: 210 }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
            <Box style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Box style={{ width: 120, height: 155, borderRadius: '50%', border: `2px solid ${COLORS.lemonYellow}`, boxShadow: '0 0 0 2000px rgba(0,0,0,0.28)' }} />
            </Box>
          </Box>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <Text size="xs" c="#718096" ta="center">Centre your face inside the oval, then tap Capture</Text>
          <Button
            fullWidth size="md" radius="xl"
            leftSection={<IconScan size={16} />}
            style={{ background: `linear-gradient(135deg, ${COLORS.tealBlue}, ${COLORS.tealDark})`, fontWeight: 700 }}
            onClick={captureFace}
          >
            Capture &amp; Analyse
          </Button>
        </Stack>
      )}

      {/* Biometric – scanning */}
      {phase === 'bio_scanning' && (
        <Stack align="center" gap={20} ta="center" py={12}>
          <RingProgress size={130} thickness={9} sections={[{ value: scanPct, color: 'teal' }]} label={<Text fw={700} size="lg" c={COLORS.tealBlue} ta="center">{scanPct}%</Text>} />
          <Stack gap={4}><Text fw={700} c={COLORS.navyBlue}>Analysing features…</Text><Text size="sm" c="#718096">Please stay still</Text></Stack>
        </Stack>
      )}

      {/* Biometric – matching */}
      {phase === 'bio_matching' && (
        <Stack align="center" gap={20} ta="center" py={12}>
          <Loader size={64} color="teal" />
          <Stack gap={4}><Text fw={700} c={COLORS.navyBlue}>Matching with ID photo…</Text><Text size="sm" c="#718096">Comparing live face to your document</Text></Stack>
        </Stack>
      )}

      {/* Biometric – success */}
      {phase === 'bio_success' && (
        <Stack align="center" gap={20} ta="center">
          {faceUrl ? (
            <Box style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${COLORS.tealBlue}`, flexShrink: 0 }}>
              <img src={faceUrl} alt="Captured face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
          ) : (
            <Box w={88} h={88} style={{ borderRadius: '50%', background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCircleCheck size={48} color={COLORS.tealBlue} strokeWidth={1.5} />
            </Box>
          )}
          <Stack gap={5}><Text fw={800} size="xl" c={COLORS.navyBlue}>Identity Confirmed!</Text><Text size="sm" c="#718096">Face matched successfully to your document.</Text></Stack>
          <Button fullWidth size="md" radius="xl" rightSection={<IconArrowRight size={16} />} style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.navyLight})`, fontWeight: 700 }} onClick={() => onDone(faceUrl)}>
            Continue to Profile Setup
          </Button>
        </Stack>
      )}

      {/* Biometric – failed (hard block) */}
      {phase === 'bio_failed' && (
        <Stack align="center" gap={20} ta="center">
          <Box w={88} h={88} style={{ borderRadius: '50%', background: '#FDE8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconX size={44} color="#E53E3E" strokeWidth={1.5} />
          </Box>
          <Stack gap={5}><Text fw={800} size="xl" c="#E53E3E">Verification Failed</Text><Text size="sm" c="#718096">Face did not match. Ensure good lighting and try again.</Text></Stack>
          <Alert color="red" icon={<IconAlertCircle size={13} />} radius={10} p={10} w="100%">
            <Text size="xs" fw={600}>You cannot proceed without successful face verification. This protects your account security.</Text>
          </Alert>
          <Button fullWidth variant="outline" color="red" size="md" radius="xl" leftSection={<IconRotate size={15} />} onClick={() => { setPhase('bio_idle'); setScanPct(0); }}>
            Try Again
          </Button>
        </Stack>
      )}
    </Card>
  );
}
