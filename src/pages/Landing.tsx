import {
  Box, Button, Container, Grid, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge,
} from '@mantine/core';
import {
  IconPhone, IconShieldCheck, IconMapPin, IconWallet,
  IconStar, IconArrowRight, IconBolt,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';

const FEATURES = [
  {
    icon: <IconBolt size={24} />,
    key: 'feature_instant',
    descKey: 'feature_instant_desc',
    color: 'lemon',
  },
  {
    icon: <IconShieldCheck size={24} />,
    key: 'feature_secure',
    descKey: 'feature_secure_desc',
    color: 'teal',
  },
  {
    icon: <IconShieldCheck size={24} />,
    key: 'feature_verified',
    descKey: 'feature_verified_desc',
    color: 'navy',
  },
  {
    icon: <IconPhone size={24} />,
    key: 'feature_voip',
    descKey: 'feature_voip_desc',
    color: 'teal',
  },
];

const STATS = [
  { value: '10,000+', label: 'Verified Providers' },
  { value: '50,000+', label: 'Services Completed' },
  { value: '4.8★', label: 'Average Rating' },
  { value: '98%', label: 'Client Satisfaction' },
];

export function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box style={{ minHeight: '100vh', background: '#F5F6FA' }}>
      {/* Navigation */}
      <Box
        style={{
          background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyDark} 100%)`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 12px rgba(27,42,74,0.3)',
        }}
        px={{ base: 'md', sm: 'xl' }}
        py="sm"
      >
        <Group justify="space-between" maw={1200} mx="auto">
          <Group gap="sm">
            <Box
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: COLORS.lemonYellow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconShieldCheck size={22} color={COLORS.navyBlue} stroke={2.5} />
            </Box>
            <Text fw={800} size="xl" c="white" style={{ letterSpacing: '-0.5px' }}>
              ONE TOUCH
            </Text>
          </Group>
          <Group gap="sm">
            <LanguageSwitcher />
            <Button
              variant="subtle"
              color="white"
              size="sm"
              onClick={() => navigate(ROUTES.login)}
            >
              {t('nav.login')}
            </Button>
            <Button
              size="sm"
              style={{
                background: COLORS.lemonYellow,
                color: COLORS.navyBlue,
                fontWeight: 700,
              }}
              onClick={() => navigate(ROUTES.signup)}
            >
              {t('nav.signup')}
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Hero Section */}
      <Box
        style={{
          background: `linear-gradient(150deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 50%, ${COLORS.tealBlue} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
        pt={80}
        pb={100}
        px={{ base: 'md', sm: 'xl' }}
      >
        {/* Background decoration */}
        <Box
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `${COLORS.tealBlue}15`,
          }}
        />
        <Box
          style={{
            position: 'absolute',
            bottom: -120,
            left: -60,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `${COLORS.lemonYellow}10`,
          }}
        />

        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
          <Grid align="center" gutter={60}>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Stack gap="xl">
                <Badge
                  size="lg"
                  style={{
                    background: `${COLORS.lemonYellow}20`,
                    color: COLORS.lemonYellow,
                    border: `1px solid ${COLORS.lemonYellow}40`,
                    width: 'fit-content',
                  }}
                >
                  🚀 New — AI-Powered Marketplace
                </Badge>
                <Text
                  component="h1"
                  fw={900}
                  style={{
                    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                    lineHeight: 1.1,
                    letterSpacing: '-1px',
                    color: 'white',
                    margin: 0,
                  }}
                >
                  {t('landing.hero_title')}
                  <Text
                    component="span"
                    style={{ color: COLORS.lemonYellow, display: 'block' }}
                  >
                    Instantly.
                  </Text>
                </Text>
                <Text size="lg" c="rgba(255,255,255,0.75)" maw={480} lh={1.7}>
                  {t('landing.hero_subtitle')}
                </Text>
                <Group gap="md" wrap="wrap">
                  <Button
                    size="xl"
                    rightSection={<IconArrowRight size={18} />}
                    style={{
                      background: COLORS.lemonYellow,
                      color: COLORS.navyBlue,
                      fontWeight: 800,
                      fontSize: 16,
                      padding: '14px 32px',
                      boxShadow: `0 8px 24px ${COLORS.lemonYellow}40`,
                    }}
                    onClick={() => navigate(ROUTES.signup)}
                  >
                    Get Started Free
                  </Button>
                  <Button
                    size="xl"
                    variant="outline"
                    color="white"
                    style={{ padding: '14px 32px' }}
                    onClick={() => navigate(ROUTES.login)}
                  >
                    {t('nav.login')}
                  </Button>
                </Group>
                <Group gap="xl" wrap="wrap">
                  <Group gap={6}>
                    <IconShieldCheck size={16} color={COLORS.tealLight} />
                    <Text size="sm" c="rgba(255,255,255,0.7)">Identity Verified</Text>
                  </Group>
                  <Group gap={6}>
                    <IconMapPin size={16} color={COLORS.tealLight} />
                    <Text size="sm" c="rgba(255,255,255,0.7)">Location-Based</Text>
                  </Group>
                  <Group gap={6}>
                    <IconWallet size={16} color={COLORS.tealLight} />
                    <Text size="sm" c="rgba(255,255,255,0.7)">Escrow Protected</Text>
                  </Group>
                </Group>
              </Stack>
            </Grid.Col>

            {/* Hero Visual */}
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Box
                p="xl"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 24,
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Stack gap="md">
                  {/* Mock provider card */}
                  {[
                    { name: 'John Mechanics', service: 'Engine Repair', rating: 4.8, dist: '1.2 km', price: '$45/hr', online: true },
                    { name: 'Maria Sparkle', service: 'Home Cleaning', rating: 4.9, dist: '0.8 km', price: '$80 fixed', online: true },
                    { name: 'Emily Watts', service: 'Electrical Work', rating: 4.7, dist: '2.1 km', price: 'Estimate', online: true },
                  ].map((p, i) => (
                    <Box
                      key={i}
                      p="md"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        borderRadius: 14,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="sm">
                          <Box
                            w={42}
                            h={42}
                            style={{
                              borderRadius: 12,
                              background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text c="white" fw={800} size="lg">{p.name[0]}</Text>
                          </Box>
                          <Box>
                            <Text fw={700} size="sm" c={COLORS.navyBlue}>{p.name}</Text>
                            <Text size="xs" c="dimmed">{p.service}</Text>
                            <Group gap={4} mt={2}>
                              <IconStar size={10} fill="#F5E642" color="#F5E642" />
                              <Text size="xs" fw={600}>{p.rating}</Text>
                              <Text size="xs" c="dimmed">• {p.dist}</Text>
                            </Group>
                          </Box>
                        </Group>
                        <Box ta="right">
                          <Text size="xs" fw={700} c={COLORS.tealBlue}>{p.price}</Text>
                          <Button
                            size="xs"
                            mt={4}
                            style={{ background: COLORS.tealBlue, color: 'white' }}
                          >
                            Call Free
                          </Button>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      {/* Stats Bar */}
      <Box style={{ background: COLORS.lemonYellow }} py="lg" px={{ base: 'md', sm: 'xl' }}>
        <Container size="lg">
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            {STATS.map(stat => (
              <Box key={stat.label} ta="center">
                <Text fw={900} size="2xl" c={COLORS.navyBlue}>{stat.value}</Text>
                <Text size="sm" c={COLORS.navyLight} fw={500}>{stat.label}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container size="lg" py={80} px={{ base: 'md', sm: 'xl' }}>
        <Stack align="center" mb={60} gap="md">
          <Badge size="lg" color="teal" variant="light">Why ONE TOUCH?</Badge>
          <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px' }}>
            Everything you need,
            <Text component="span" c={COLORS.tealBlue}> in one platform</Text>
          </Text>
          <Text size="md" c="dimmed" ta="center" maw={560}>
            We've designed ONE TOUCH from the ground up to be the safest, fastest, and most rewarding way to connect with service providers.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          {FEATURES.map((feature, i) => (
            <Box
              key={i}
              p="xl"
              style={{
                background: 'white',
                borderRadius: 20,
                boxShadow: '0 4px 20px rgba(27,42,74,0.08)',
                border: '1px solid #E9ECEF',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
            >
              <Group gap="md" align="flex-start">
                <ThemeIcon
                  size={52}
                  radius="xl"
                  style={{
                    background: feature.color === 'lemon'
                      ? `${COLORS.lemonYellow}20`
                      : feature.color === 'teal'
                      ? `${COLORS.tealBlue}15`
                      : `${COLORS.navyBlue}10`,
                  }}
                  variant="light"
                  color={feature.color === 'lemon' ? 'yellow' : feature.color === 'teal' ? 'teal' : 'navy'}
                >
                  {feature.icon}
                </ThemeIcon>
                <Stack gap={6} flex={1}>
                  <Text fw={700} size="md" c={COLORS.navyBlue}>{t(`landing.${feature.key}`)}</Text>
                  <Text size="sm" c="dimmed" lh={1.6}>{t(`landing.${feature.descKey}`)}</Text>
                </Stack>
              </Group>
            </Box>
          ))}
        </SimpleGrid>
      </Container>

      {/* How It Works */}
      <Box style={{ background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)` }} py={80} px={{ base: 'md', sm: 'xl' }}>
        <Container size="md">
          <Stack align="center" mb={60} gap="md">
            <Badge size="lg" style={{ background: `${COLORS.lemonYellow}20`, color: COLORS.lemonYellow, border: `1px solid ${COLORS.lemonYellow}30` }}>
              How It Works
            </Badge>
            <Text fw={900} size="3xl" ta="center" c="white" style={{ letterSpacing: '-0.5px' }}>
              Connect in 3 Simple Steps
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            {[
              { step: '01', title: 'Browse & Discover', desc: 'Search by service category and see verified providers near you on a live map.' },
              { step: '02', title: 'Call Free & Agree', desc: 'Connect instantly via free in-app VoIP. Agree on price with full transparency.' },
              { step: '03', title: 'Pay Securely & Review', desc: 'Payment held in escrow, released only when you confirm the job is done.' },
            ].map(item => (
              <Box key={item.step} ta="center">
                <Box
                  w={64}
                  h={64}
                  style={{
                    borderRadius: '50%',
                    background: COLORS.lemonYellow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Text fw={900} size="lg" c={COLORS.navyBlue}>{item.step}</Text>
                </Box>
                <Text fw={700} size="md" c="white" mb={8}>{item.title}</Text>
                <Text size="sm" c="rgba(255,255,255,0.65)" lh={1.6}>{item.desc}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container size="md" py={80} px={{ base: 'md', sm: 'xl' }}>
        <Box
          p={60}
          ta="center"
          style={{
            background: `linear-gradient(135deg, ${COLORS.tealBlue}15 0%, ${COLORS.navyBlue}10 100%)`,
            borderRadius: 24,
            border: `1px solid ${COLORS.tealBlue}20`,
          }}
        >
          <Text fw={900} size="3xl" c={COLORS.navyBlue} mb="md" style={{ letterSpacing: '-0.5px' }}>
            Ready to get started?
          </Text>
          <Text c="dimmed" mb="xl" size="md">
            Join thousands of clients and providers on ONE TOUCH.
          </Text>
          <Group justify="center" gap="md" wrap="wrap">
            <Button
              size="xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)`,
                color: 'white',
                fontWeight: 700,
                padding: '14px 40px',
              }}
              onClick={() => navigate(ROUTES.signup)}
            >
              Sign Up as Client
            </Button>
            <Button
              size="xl"
              style={{
                background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.tealDark} 100%)`,
                color: 'white',
                fontWeight: 700,
                padding: '14px 40px',
              }}
              onClick={() => navigate(ROUTES.signup)}
            >
              Join as Provider
            </Button>
          </Group>
        </Box>
      </Container>

      {/* Footer */}
      <Box
        style={{
          background: COLORS.navyDark,
          borderTop: `1px solid rgba(255,255,255,0.06)`,
        }}
        py="xl"
        px={{ base: 'md', sm: 'xl' }}
      >
        <Container size="lg">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Group gap="sm">
              <Box
                w={32}
                h={32}
                style={{
                  borderRadius: 8,
                  background: COLORS.lemonYellow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconShieldCheck size={16} color={COLORS.navyBlue} />
              </Box>
              <Text fw={700} c="white">ONE TOUCH</Text>
            </Group>
            <Text size="sm" c="rgba(255,255,255,0.4)">
              © 2026 ONE TOUCH. All rights reserved.
            </Text>
          </Group>
        </Container>
      </Box>

      <AIHelpCenter />
    </Box>
  );
}
