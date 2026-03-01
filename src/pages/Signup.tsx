import {
  Box, Button, Center, Container, Group,
  Stack, Text, ThemeIcon,
} from '@mantine/core';
import {
  IconShieldCheck, IconArrowRight, IconUser, IconBriefcase, IconCheck, IconLock,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';

const S = `
@keyframes suFadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
@keyframes suCardIn  { from{opacity:0;transform:translateY(28px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
.su-page  { animation: suFadeUp 0.5s ease both; }
.su-c1    { animation: suCardIn 0.5s 0.1s ease both; }
.su-c2    { animation: suCardIn 0.5s 0.22s ease both; }
.su-card {
  cursor: pointer;
  border: 1.5px solid var(--ot-border);
  border-radius: 20px;
  background: var(--ot-bg-card);
  transition: all 0.22s ease;
  box-shadow: 0 2px 16px rgba(0,0,128,0.05);
}
.su-card:hover {
  border-color: #008080;
  transform: translateY(-3px);
  box-shadow: 0 10px 32px rgba(0,128,128,0.13);
}
`;

function Benefit({ text }: { text: string }) {
  return (
    <Group gap={10} wrap="nowrap">
      <Box
        w={20} h={20} style={{ borderRadius: '50%', background: '#E6F4F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <IconCheck size={11} color="#008080" strokeWidth={3} />
      </Box>
      <Text size="sm" c="#4A5568" lh={1.5}>{text}</Text>
    </Group>
  );
}

interface RoleCardProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  benefits: string[];
  accentColor: string;
  btnLabel: string;
  animClass: string;
  tagLabel: string;
  onClick: () => void;
}

function RoleCard({ icon, label, subtitle, benefits, accentColor, btnLabel, animClass, tagLabel, onClick }: RoleCardProps) {
  return (
    <Box className={`su-card ${animClass}`} onClick={onClick} p={32}>
      <Stack gap={20}>
        <Group gap={14} align="flex-start">
          <Box
            w={52} h={52}
            style={{ borderRadius: 14, background: `${accentColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {icon}
          </Box>
          <Stack gap={3} flex={1}>
            <Group justify="space-between" align="center">
              <Text fw={800} size="lg" c={COLORS.navyBlue}>{label}</Text>
              <Box
                px={10} py={3}
                style={{ borderRadius: 20, background: `${accentColor}12`, border: `1px solid ${accentColor}30` }}
              >
                <Text size="11px" fw={700} c={accentColor}>{tagLabel}</Text>
              </Box>
            </Group>
            <Text size="sm" c="#718096" lh={1.6}>{subtitle}</Text>
          </Stack>
        </Group>

        <Box style={{ width: '100%', height: 1, background: '#F0F2F7' }} />

        <Stack gap={10}>
          {benefits.map(b => <Benefit key={b} text={b} />)}
        </Stack>

        <Button
          fullWidth size="md" radius="xl" mt={4}
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`, color: 'white', fontWeight: 700 }}
          rightSection={<IconArrowRight size={16} />}
        >
          {btnLabel}
        </Button>
      </Stack>
    </Box>
  );
}

export function Signup() {
  const navigate = useNavigate();

  return (
    <Box style={{ minHeight: '100vh', background: 'var(--ot-bg-page)', display: 'flex', flexDirection: 'column' }}>
      <style>{S}</style>

      {/* ── Navbar ── */}
      <Box style={{ background: 'var(--ot-nav-bg)', borderBottom: '1px solid var(--ot-nav-border)' }}>
        <Container size={1000}>
          <Group justify="space-between" py={16}>
            <Group gap={10} onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
              <Box
                w={36} h={36}
                style={{ borderRadius: 10, background: COLORS.navyBlue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconLock size={17} color={COLORS.lemonYellow} strokeWidth={2.5} />
              </Box>
              <Text fw={900} size="md" c={COLORS.navyBlue} style={{ letterSpacing: 0.3 }}>ONE TOUCH</Text>
            </Group>
            <Group gap={8}>
              <LanguageSwitcher />
              <Button
                size="sm" radius="xl"
                style={{ background: COLORS.navyBlue, color: 'white' }}
                onClick={() => navigate(ROUTES.login)}
              >
                Sign In
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* ── Content ── */}
      <Center flex={1} py={52} px={16}>
        <Container size={820} w="100%">
          <Stack gap={36} className="su-page">

            {/* Header */}
            <Stack gap={8} align="center" ta="center">
              <Group gap={8} justify="center">
                <Box
                  w={36} h={36}
                  style={{ borderRadius: 10, background: '#000080', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconShieldCheck size={18} color="#F5E642" strokeWidth={2.5} />
                </Box>
                <Text fw={900} size="xl" c={COLORS.navyBlue}>Create your account</Text>
              </Group>
              <Text size="sm" c="#718096" maw={440} lh={1.7}>
                Choose how you'll be using ONE TOUCH. Both paths are secure, verified, and fully trusted.
              </Text>
            </Stack>

            {/* Role cards grid */}
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 20,
              }}
            >
              <RoleCard
                animClass="su-c1"
                icon={<IconUser size={24} color={COLORS.navyBlue} />}
                label="I Need Services"
                subtitle="Find and book verified professionals for any task, fast and securely."
                benefits={[
                  'Browse local verified service providers',
                  'Transparent pricing before you book',
                  'Secure wallet & loyalty program',
                  'Rate and review after every job',
                ]}
                accentColor={COLORS.navyBlue}
                tagLabel="CLIENT"
                btnLabel="Continue as Client"
                onClick={() => navigate(ROUTES.signupClient)}
              />
              <RoleCard
                animClass="su-c2"
                icon={<IconBriefcase size={24} color={COLORS.tealBlue} />}
                label="I Offer Services"
                subtitle="Join as a verified service provider and grow your professional business."
                benefits={[
                  'Full identity & biometric verification',
                  'Receive jobs directly on the map',
                  'Set your services, prices, and schedule',
                  'Transparent earnings & instant wallet',
                ]}
                accentColor={COLORS.tealBlue}
                tagLabel="PROVIDER"
                btnLabel="Continue as Provider"
                onClick={() => navigate(ROUTES.signupProvider)}
              />
            </Box>

            {/* Footer note */}
            <Text ta="center" size="xs" c="#A0AEC0">
              By continuing, you agree to ONE TOUCH's{' '}
              <Text span fw={600} c={COLORS.tealBlue} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.termsOfService)}>Terms of Service</Text>
              {' '}and{' '}
              <Text span fw={600} c={COLORS.tealBlue} style={{ cursor: 'pointer' }} onClick={() => navigate(ROUTES.privacyPolicy)}>Privacy Policy</Text>.
            </Text>
          </Stack>
        </Container>
      </Center>

      <AIHelpCenter />
    </Box>
  );
}
