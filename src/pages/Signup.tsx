/**
 * Signup.tsx – Role selection entry point.
 * Replaces the old generic signup form with two distinct paths.
 */
import {
  Box, Button, Center, Container, Group,
  Stack, Text, ThemeIcon, Badge,
} from '@mantine/core';
import {
  IconShieldCheck, IconArrowRight, IconUser, IconBriefcase, IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';

const STYLES = `
@keyframes fadeUp  { from { opacity:0; transform:translateY(24px);          } to { opacity:1; transform:translateY(0);       } }
@keyframes cardPop { from { opacity:0; transform:translateY(32px) scale(.97);} to { opacity:1; transform:translateY(0) scale(1); } }
.su-hero  { animation: fadeUp   0.55s 0.05s ease both; }
.su-card1 { animation: cardPop  0.55s 0.15s ease both; }
.su-card2 { animation: cardPop  0.55s 0.28s ease both; }
.su-role-card {
  cursor: pointer;
  border: 2px solid #E9ECEF;
  border-radius: 24px;
  background: white;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0,0,128,0.06);
}
.su-role-card:hover {
  border-color: ${COLORS.tealBlue};
  transform: translateY(-4px);
  box-shadow: 0 12px 36px rgba(0,128,128,0.16);
}
`;

interface RoleCardProps {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  benefits: string[];
  color: string;
  btnLabel: string;
  animClass: string;
  onClick: () => void;
}

function RoleCard({ icon, label, subtitle, benefits, color, btnLabel, animClass, onClick }: RoleCardProps) {
  return (
    <Box className={`su-role-card ${animClass}`} onClick={onClick} p={36}>
      <Stack gap="lg" align="center" ta="center">
        <ThemeIcon size={80} radius="xl" variant="light" color={color as any}>
          {icon}
        </ThemeIcon>
        <Stack gap={6} align="center">
          <Text fw={800} size="xl" c={COLORS.navyBlue}>{label}</Text>
          <Text size="sm" c="dimmed" lh={1.65} maw={260}>{subtitle}</Text>
        </Stack>
        <Stack gap={10} align="flex-start" w="100%">
          {benefits.map(b => (
            <Group key={b} gap="xs" wrap="nowrap">
              <ThemeIcon size={20} radius="xl" color="teal" variant="light" style={{ flexShrink: 0 }}>
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">{b}</Text>
            </Group>
          ))}
        </Stack>
        <Button
          fullWidth size="md" radius="xl"
          color={color as any}
          rightSection={<IconArrowRight size={16} />}
          mt={4}
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
    <Box
      style={{
        minHeight: '100vh',
        background: `linear-gradient(150deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 45%, ${COLORS.tealBlue}38 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{STYLES}</style>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <Group justify="space-between" p="md" px="xl">
        <Group gap="sm" onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
          <Box
            w={38} h={38}
            style={{ borderRadius: 12, background: COLORS.lemonYellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconShieldCheck size={20} color={COLORS.navyBlue} stroke={2.5} />
          </Box>
          <Text fw={800} size="lg" c="white" style={{ letterSpacing: 0.5 }}>ONE TOUCH</Text>
        </Group>
        <Group gap="md">
          <LanguageSwitcher />
          <Button variant="subtle" color="gray" size="sm" c="white" onClick={() => navigate(ROUTES.login)}>
            Sign In
          </Button>
        </Group>
      </Group>

      {/* ── Main content ─────────────────────────────────────── */}
      <Center flex={1} py={48} px="md">
        <Container size={860} w="100%">
          <Stack gap={48}>

            {/* Hero */}
            <Stack gap={12} align="center" ta="center" className="su-hero">
              <Badge
                size="lg" radius="xl" variant="light"
                style={{ background: 'rgba(245,230,66,0.15)', color: COLORS.lemonYellow, borderColor: 'rgba(245,230,66,0.3)' }}
              >
                Create your account
              </Badge>
              <Text fw={900} style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', lineHeight: 1.15, letterSpacing: -0.5, color: 'white' }}>
                How would you like to<br />join ONE TOUCH?
              </Text>
              <Text size="md" c="rgba(255,255,255,0.65)" maw={480}>
                Select the account type that fits your needs. You can always update your profile later.
              </Text>
            </Stack>

            {/* Role cards */}
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 24,
              }}
            >
              <RoleCard
                animClass="su-card1"
                icon={<IconUser size={38} />}
                label="I Need Services"
                subtitle="Find and book trusted professionals for any task, quickly and securely."
                benefits={[
                  'Browse hundreds of local service providers',
                  'Book in minutes with transparent pricing',
                  'Rate and review every experience',
                  'Secure wallet & loyalty rewards',
                ]}
                color="navy"
                btnLabel="Sign Up as Client"
                onClick={() => navigate(ROUTES.signupClient)}
              />
              <RoleCard
                animClass="su-card2"
                icon={<IconBriefcase size={38} />}
                label="I Offer Services"
                subtitle="Join as a verified professional and grow your business with ONE TOUCH."
                benefits={[
                  'Identity-verified & trusted ecosystem',
                  'Set your own services and rates',
                  'Receive jobs directly on the map',
                  'Transparent earnings & instant wallet',
                ]}
                color="teal"
                btnLabel="Sign Up as Provider"
                onClick={() => navigate(ROUTES.signupProvider)}
              />
            </Box>

            {/* Footer */}
            <Text ta="center" size="xs" c="rgba(255,255,255,0.45)">
              Already have an account?{' '}
              <Text
                span fw={600} c={COLORS.lemonYellow}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(ROUTES.login)}
              >
                Sign in here
              </Text>
            </Text>
          </Stack>
        </Container>
      </Center>

      <AIHelpCenter />
    </Box>
  );
}
