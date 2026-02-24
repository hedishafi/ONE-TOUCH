import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge, Divider, Paper,
} from '@mantine/core';
import {
  IconArrowLeft, IconSearch, IconPhone, IconTruck, IconCreditCard,
  IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity:0; transform:translateY(32px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes slideInUp {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
.afu-step { animation: slideInUp 0.6s ease both; }
.step-card {
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}
.step-card:hover {
  transform: translateY(-12px);
  box-shadow: 0 24px 48px rgba(0,0,137,0.16) !important;
}
.step-icon {
  transition: all 0.3s ease;
}
.step-card:hover .step-icon {
  transform: scale(1.15) rotate(5deg);
}
.timeline-connector {
  transition: all 0.6s ease;
}
.nav-link:hover { color: #008080 !important; }
.btn-teal {
  background: #008080 !important;
  transition: all 0.18s !important;
}
.btn-teal:hover {
  background: #006666 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 24px rgba(0,128,128,0.35) !important;
}
`;

const PROCESS_STEPS = [
  {
    id: 1,
    number: '01',
    title: 'Choose a Service',
    desc: 'Browse verified service categories and select the exact service you need. Filter by location, price, and provider ratings.',
    icon: <IconSearch size={32} />,
    color: '#3498DB',
  },
  {
    id: 2,
    number: '02',
    title: 'Connect with Provider',
    desc: 'Call the provider instantly via our free in-app VoIP. Discuss details, agree on pricing, and confirm the job scope.',
    icon: <IconPhone size={32} />,
    color: '#1ABC9C',
  },
  {
    id: 3,
    number: '03',
    title: 'Service in Progress',
    desc: 'The provider arrives at the agreed time. Track progress, communicate in real-time, and get live updates.',
    icon: <IconTruck size={32} />,
    color: '#F39C12',
  },
  {
    id: 4,
    number: '04',
    title: 'Secure Payment',
    desc: 'Pay securely in ETB using our escrow system. Payment is held safe until you confirm the work is done.',
    icon: <IconCreditCard size={32} />,
    color: '#E91E63',
  },
];

export function HowItWorks() {
  const navigate = useNavigate();

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Box style={{ minHeight: '100vh', background: '#FFFFFF', position: 'relative' }}>
        
        {/* ── Header/Nav ── */}
        <Box px={{ base: 'lg', sm: 'xl' }} py="md"
          style={{
            position: 'sticky', top: 0, zIndex: 200, background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(0,0,137,0.08)', boxShadow: '0 2px 16px rgba(0,0,137,0.05)'
          }}>
          <Group justify="space-between" maw={1140} mx="auto">
            {/* Logo/Back */}
            <Group gap="md">
              <Button variant="subtle" size="sm" onClick={() => navigate(ROUTES.landing)}
                style={{ padding: 0, color: COLORS.navyBlue }}>
                <IconArrowLeft size={20} stroke={2.5} />
              </Button>
              <Text fw={800} size="lg" style={{ color: COLORS.navyBlue, letterSpacing: '-0.3px', cursor: 'pointer' }}
                onClick={() => navigate(ROUTES.landing)}>
                ONE TOUCH
              </Text>
            </Group>

            {/* Right: Language + Buttons */}
            <Group gap="lg" align="center">
              <Box style={{ minWidth: 60 }}>
                <LanguageSwitcher />
              </Box>
              <Button className="btn-teal" size="sm" style={{ color: 'white', fontWeight: 700 }} 
                onClick={() => navigate(ROUTES.signup)}>
                Sign Up
              </Button>
            </Group>
          </Group>
        </Box>

        {/* ── Decorative blobs ── */}
        <Box style={{
          position: 'absolute', top: -200, right: -180, width: 600, height: 600,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,0,137,0.05) 0%,transparent 70%)',
          pointerEvents: 'none'
        }} />
        <Box style={{
          position: 'absolute', bottom: 200, left: -150, width: 500, height: 500,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,128,128,0.06) 0%,transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* ── Page Title ── */}
        <Container size="lg" pt={60} px={{ base: 'md', sm: 'xl' }}>
          <Stack align="center" mb={80} gap="sm">
            <Badge size="lg"
              style={{
                background: `${COLORS.lemonYellow}30`, color: '#7A6B00',
                border: `1px solid ${COLORS.lemonYellow}`, fontWeight: 700
              }}>
              How It Works
            </Badge>
            <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px' }}>
              Simple 4-Step Process
            </Text>
            <Box style={{
              width: 64, height: 4, borderRadius: 2,
              background: `linear-gradient(90deg,${COLORS.lemonYellow},${COLORS.tealBlue})`
            }} />
            <Text size="md" c="dimmed" ta="center" maw={520} mt={8}>
              From choosing a service to secure payment — ONE TOUCH makes it simple, transparent, and trustworthy.
            </Text>
          </Stack>
        </Container>

        {/* ── Process Steps ── */}
        <Container size="xl" pb={100} px={{ base: 'md', sm: 'xl' }}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing={{ base: 'lg', md: 'xl' }} mb={80}>
            {PROCESS_STEPS.map((step, idx) => (
              <Box key={step.id} style={{ position: 'relative' }}>
                {/* Timeline connector */}
                {idx < PROCESS_STEPS.length - 1 && (
                  <Box style={{
                    display: 'none',
                    '@media (min-width: 768px)': {
                      display: 'block',
                    },
                    position: 'absolute',
                    top: '70px',
                    left: '50%',
                    width: '100%',
                    height: '4px',
                    background: `linear-gradient(90deg, ${step.color}40, ${PROCESS_STEPS[idx + 1].color}40)`,
                    transform: 'translateX(50%)',
                    zIndex: 0,
                  }} />
                )}

                {/* Step Card */}
                <Paper
                  className="step-card afu-step"
                  p={{ base: 'lg', sm: 'xl' }}
                  style={{
                    background: 'white',
                    border: '1.5px solid #E9ECEF',
                    borderRadius: 20,
                    boxShadow: '0 4px 16px rgba(0,0,137,0.06)',
                    position: 'relative',
                    zIndex: 1,
                    animationDelay: `${idx * 0.12}s`,
                  }}
                >
                  <Stack align="center" ta="center" gap="md">
                    {/* Step Icon */}
                    <ThemeIcon
                      size={80}
                      radius="xl"
                      className="step-icon"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}20, ${step.color}35)`,
                        color: step.color,
                      }}
                    >
                      {step.icon}
                    </ThemeIcon>

                    {/* Step Number & Title */}
                    <div>
                      <Text
                        size="sm"
                        fw={700}
                        c={step.color}
                        style={{ letterSpacing: '1px', textTransform: 'uppercase' }}
                      >
                        Step {step.number}
                      </Text>
                      <Text fw={800} size="lg" c={COLORS.navyBlue} mt="xs">
                        {step.title}
                      </Text>
                    </div>

                    {/* Description */}
                    <Text size="sm" c="dimmed" lh={1.65}>
                      {step.desc}
                    </Text>

                    {/* Checkmark */}
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: `${step.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '8px',
                      }}
                    >
                      <IconCheck size={18} color={step.color} stroke={3} />
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            ))}
          </SimpleGrid>

          {/* ── Key Features ── */}
          <Divider my={60} />

          <Stack align="center" mb={60} gap="sm">
            <Text fw={900} size="2xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing: '-0.3px' }}>
              Why our process is better
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb={60}>
            {[
              {
                icon: '🔒',
                title: 'Escrow Protected',
                desc: 'Payment held securely until you confirm work is done. Zero risk.',
              },
              {
                icon: '📞',
                title: 'Free VoIP Call',
                desc: 'Instant in-app calling — no sharing phone numbers. Complete privacy.',
              },
              {
                icon: '⭐',
                title: 'Verified Providers',
                desc: 'Every provider government-ID verified. Trusted professionals only.',
              },
            ].map((feature, i) => (
              <Paper
                key={i}
                p="lg"
                style={{
                  background: 'white',
                  border: '1px solid #E9ECEF',
                  borderRadius: 16,
                  textAlign: 'center',
                  animation: `fadeUp 0.6s ${0.2 + i * 0.1}s ease both`,
                }}
              >
                <Text size="3xl" mb="sm">{feature.icon}</Text>
                <Text fw={700} size="md" c={COLORS.navyBlue} mb="xs">
                  {feature.title}
                </Text>
                <Text size="sm" c="dimmed" lh={1.6}>
                  {feature.desc}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>

        {/* ── CTA Band ── */}
        <Box mx={{ base: 'md', sm: 'xl' }} mb={80}>
          <Container size="lg">
            <Box p={{ base: 40, sm: 60 }} style={{
              background: `linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,
              borderRadius: 28,
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'center',
            }}>
              <Box style={{
                position: 'absolute', top: -60, right: -60, width: 240, height: 240,
                borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
              }} />
              <Text fw={900} size="3xl" c="white" mb="sm" style={{ letterSpacing: '-0.5px', position: 'relative' }}>
                Ready to experience the difference?
              </Text>
              <Text c="rgba(255,255,255,0.65)" mb="xl" size="md" style={{ position: 'relative' }}>
                Sign up now and connect with verified providers in your area.
              </Text>
              <Group justify="center" gap="md" wrap="wrap" style={{ position: 'relative' }}>
                <Button size="xl" style={{
                  background: COLORS.lemonYellow, color: COLORS.navyBlue, fontWeight: 800,
                  padding: '14px 40px', transition: 'all 0.18s'
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(245,230,66,0.5)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                  onClick={() => navigate(ROUTES.signup)}>
                  Get Started Free
                </Button>
              </Group>
            </Box>
          </Container>
        </Box>
      </Box>
    </>
  );
}
