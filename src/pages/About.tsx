import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge, Divider, Paper,
} from '@mantine/core';
import {
  IconArrowLeft, IconShieldCheck, IconBolt, IconMapPin,
  IconUsers, IconTrendingUp, IconHeart, IconArrowRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity:0; transform:translateY(32px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes slideInLeft {
  from { opacity:0; transform:translateX(-24px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes slideInRight {
  from { opacity:0; transform:translateX(24px); }
  to   { opacity:1; transform:translateX(0); }
}
.afu-content { animation: fadeUp 0.7s ease both; }
.afu-stat { animation: fadeUp 0.6s ease both; }
.stat-card {
  transition: all 0.28s ease;
}
.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,137,0.12) !important;
}
.value-item {
  transition: transform 0.22s ease;
}
.value-item:hover {
  transform: translateX(4px);
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

const COMPANY_VALUES = [
  {
    icon: <IconShieldCheck size={28} />,
    title: 'Trust First',
    desc: 'Every provider is government-ID verified. We build on trust, not just ratings.',
    color: '#000089',
  },
  {
    icon: <IconBolt size={28} />,
    title: 'Speed & Efficiency',
    desc: 'Book in minutes, connect instantly. One tap away from getting help.',
    color: '#008080',
  },
  {
    icon: <IconMapPin size={28} />,
    title: 'Local Focus',
    desc: 'Built for Addis Ababa and Ethiopia. Understanding local needs and culture.',
    color: '#F39C12',
  },
  {
    icon: <IconUsers size={28} />,
    title: 'Community Powered',
    desc: 'Supporting local professionals and businesses. Growing together.',
    color: '#E91E63',
  },
];

const IMPACT_STATS = [
  { value: '2,000+', label: 'Verified Providers', delay: '0.1s' },
  { value: '15,000+', label: 'Jobs Completed', delay: '0.2s' },
  { value: '4.8★', label: 'Average Rating', delay: '0.3s' },
  { value: '98%', label: 'Satisfaction Rate', delay: '0.4s' },
];

export function About() {
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

        {/* ── Hero Section ── */}
        <Box style={{
          background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
          position: 'relative',
          overflow: 'hidden',
          paddingTop: '80px',
          paddingBottom: '80px',
        }}>
          <Box style={{
            position: 'absolute', top: -100, right: -80, width: 400, height: 400,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
          }} />
          <Container size="lg" px={{ base: 'md', sm: 'xl' }}>
            <Stack align="center" ta="center" gap="lg" style={{ position: 'relative' }}>
              <Badge size="xl" style={{
                background: 'rgba(255,255,255,0.15)', color: 'white',
                border: '1px solid rgba(255,255,255,0.25)', fontWeight: 700, animation: 'fadeUp 0.6s ease both'
              }}>
                About ONE TOUCH
              </Badge>
              <Text fw={900} size="4xl" c="white" style={{
                letterSpacing: '-1px', animation: 'fadeUp 0.6s 0.1s ease both'
              }}>
                Connecting Trust  <br /> & Opportunity in Ethiopia
              </Text>
              <Text c="rgba(255,255,255,0.80)" size="lg" maw={600} style={{
                lineHeight: 1.8, animation: 'fadeUp 0.6s 0.2s ease both'
              }}>
                ONE TOUCH is building the trusted digital infrastructure for service delivery in Addis Ababa and beyond. We believe in transparent communication, secure transactions, and empowering local professionals.
              </Text>
            </Stack>
          </Container>
        </Box>

        {/* ── Impact Stats ── */}
        <Container size="lg" py={80} px={{ base: 'md', sm: 'xl' }}>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg" mb={80}>
            {IMPACT_STATS.map((stat) => (
              <Paper
                key={stat.label}
                className="stat-card afu-stat"
                p="xl"
                ta="center"
                style={{
                  background: 'white',
                  border: '1.5px solid #E9ECEF',
                  borderRadius: 16,
                  boxShadow: '0 4px 12px rgba(0,0,137,0.05)',
                  animation: `fadeUp 0.6s ${stat.delay} ease both`,
                }}
              >
                <Text fw={900} size="3xl" c={COLORS.tealBlue} mb="xs">
                  {stat.value}
                </Text>
                <Text size="sm" fw={600} c="dimmed">
                  {stat.label}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>

          <Divider my={60} />

          {/* ── Our Story ── */}
          <Stack gap="xl" mb={80}>
            <Stack align="center" gap="sm" mb={40}>
              <Badge size="lg" style={{
                background: `${COLORS.navyBlue}10`, color: COLORS.navyBlue,
                border: `1px solid ${COLORS.navyBlue}20`, fontWeight: 700
              }}>
                Our Story
              </Badge>
              <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px' }}>
                Why we built ONE TOUCH
              </Text>
            </Stack>

            <Paper p={{ base: 'lg', sm: 'xl' }} style={{
              background: 'linear-gradient(135deg, rgba(0,128,128,0.06) 0%, rgba(0,0,137,0.03) 100%)',
              border: '1.5px solid rgba(0,0,137,0.08)',
              borderRadius: 20,
            }}>
              <Stack gap="lg" style={{ animation: 'fadeUp 0.7s ease both' }}>
                <Text size="md" lh={1.8} c="dimmed">
                  In Ethiopia, finding trusted service providers has been challenging. People worry about safety, transparent pricing, and payment security. Professionals struggle to build reputation and reach customers reliably.
                </Text>
                <Text size="md" lh={1.8} c="dimmed">
                  ONE TOUCH was created to solve this problem. We built a platform that combines identity verification, secure in-app communication, escrow protection, and digital payments. It's the bridge between clients and professionals — safe, instant, and transparent.
                </Text>
                <Text size="md" lh={1.8} c="dimmed">
                  Our mission is simple: empower Ethiopians to connect, serve, and grow. One touch. One transaction. One community.
                </Text>
              </Stack>
            </Paper>
          </Stack>

          {/* ── Mission & Vision ── */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mb={80}>
            <Paper p="xl" style={{
              background: 'white',
              border: `2px solid ${COLORS.navyBlue}20`,
              borderRadius: 20,
              animation: 'slideInLeft 0.7s ease both'
            }}>
              <Stack gap="md">
                <Group align="flex-start" gap="md">
                  <ThemeIcon size={48} radius="xl" style={{
                    background: `${COLORS.navyBlue}15`, color: COLORS.navyBlue, flexShrink: 0
                  }}>
                    <IconTrendingUp size={24} />
                  </ThemeIcon>
                  <div>
                    <Text fw={800} size="lg" c={COLORS.navyBlue}>Our Mission</Text>
                  </div>
                </Group>
                <Text size="md" lh={1.7} c="dimmed">
                  To connect trusted service providers with clients through secure digital infrastructure, enabling transparent communication, fair pricing, and reliable transactions in Ethiopia.
                </Text>
              </Stack>
            </Paper>

            <Paper p="xl" style={{
              background: 'white',
              border: `2px solid ${COLORS.tealBlue}20`,
              borderRadius: 20,
              animation: 'slideInRight 0.7s ease both'
            }}>
              <Stack gap="md">
                <Group align="flex-start" gap="md">
                  <ThemeIcon size={48} radius="xl" style={{
                    background: `${COLORS.tealBlue}15`, color: COLORS.tealBlue, flexShrink: 0
                  }}>
                    <IconHeart size={24} />
                  </ThemeIcon>
                  <div>
                    <Text fw={800} size="lg" c={COLORS.tealBlue}>Our Vision</Text>
                  </div>
                </Group>
                <Text size="md" lh={1.7} c="dimmed">
                  A thriving ecosystem where every professional can reach their potential and every client can find trusted help instantly. Empowering local businesses and building a digital Ethiopia.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>

          {/* ── Core Values ── */}
          <Stack gap="lg" mb={80}>
            <Stack align="center" gap="sm" mb={40}>
              <Badge size="lg" style={{
                background: `${COLORS.tealBlue}12`, color: COLORS.tealBlue,
                border: `1px solid ${COLORS.tealBlue}25`, fontWeight: 700
              }}>
                Our Core Values
              </Badge>
              <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px' }}>
                What we stand for
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
              {COMPANY_VALUES.map((value, i) => (
                <Paper
                  key={value.title}
                  className="value-item"
                  p="xl"
                  style={{
                    background: 'white',
                    border: '1.5px solid #E9ECEF',
                    borderRadius: 20,
                    animation: `fadeUp 0.6s ${0.1 + i * 0.08}s ease both`,
                  }}
                >
                  <Stack gap="md">
                    <ThemeIcon size={56} radius="xl" style={{
                      background: `${value.color}15`, color: value.color
                    }}>
                      {value.icon}
                    </ThemeIcon>
                    <div>
                      <Text fw={800} size="md" c={COLORS.navyBlue} mb="xs">
                        {value.title}
                      </Text>
                      <Text size="sm" c="dimmed" lh={1.6}>
                        {value.desc}
                      </Text>
                    </div>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>

        {/* ── Commitment to Ethiopia ── */}
        <Box style={{
          background: `linear-gradient(135deg, rgba(0,0,137,0.03) 0%, rgba(0,128,128,0.03) 100%)`,
          borderTop: `1px solid rgba(0,0,137,0.08)`,
          borderBottom: `1px solid rgba(0,0,137,0.08)`,
        }} py={80}>
          <Container size="lg" px={{ base: 'md', sm: 'xl' }}>
            <Stack align="center" ta="center" gap="lg">
              <Badge size="lg" style={{
                background: `${COLORS.lemonYellow}30`, color: '#7A6B00',
                border: `1px solid ${COLORS.lemonYellow}`, fontWeight: 700
              }}>
                Our Commitment
              </Badge>
              <Text fw={900} size="3xl" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px', maxWidth: '700px' }}>
                Supporting Local Businesses & Professionals
              </Text>
              <Text size="md" c="dimmed" lh={1.8} maw={700}>
                ONE TOUCH is committed to empowering local service providers, informal sector workers, and small businesses in Ethiopia. We provide fair opportunities, secure payment channels, and digital visibility. Together, we're building a more connected, trustworthy, and prosperous economy.
              </Text>
            </Stack>
          </Container>
        </Box>

        {/* ── CTA Band ── */}
        <Box mx={{ base: 'md', sm: 'xl' }} my={80}>
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
                Join the ONE TOUCH Community
              </Text>
              <Text c="rgba(255,255,255,0.65)" mb="xl" size="md" style={{ position: 'relative' }}>
                Whether you're a client looking for trusted help or a professional ready to grow — let's transform service delivery in Ethiopia together.
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
                  onClick={() => navigate(ROUTES.signup)}
                  rightSection={<IconArrowRight size={18} />}
                >
                  Get Started Now
                </Button>
              </Group>
            </Box>
          </Container>
        </Box>
      </Box>
    </>
  );
}
