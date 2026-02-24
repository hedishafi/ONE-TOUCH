import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge, Paper, Divider,
} from '@mantine/core';
import {
  IconArrowLeft, IconMail, IconPhone, IconMessageCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.afu { animation: fadeUp 0.6s ease both; }
.card-hover {
  transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.card-hover:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 48px rgba(0,0,137,0.12) !important;
}
`;

const SUPPORT_CHANNELS = [
  {
    icon: <IconMail size={28} />,
    title: 'Email Support',
    desc: 'Get a response within 24 hours',
    contact: 'support@onetouch.et',
    color: '#3498DB',
  },
  {
    icon: <IconPhone size={28} />,
    title: 'Phone Support',
    desc: 'Call us Mon-Fri, 8AM-6PM',
    contact: '+251 900 123 456',
    color: '#1ABC9C',
  },
  {
    icon: <IconMessageCircle size={28} />,
    title: 'Live Chat',
    desc: 'Chat with our team instantly',
    contact: 'Available 8AM-8PM',
    color: '#F39C12',
  },
];

const FAQ_QUICK_LINKS = [
  { q: 'How do I book a service?', path: ROUTES.helpCenter },
  { q: 'What payment methods are accepted?', path: ROUTES.helpCenter },
  { q: 'How is my payment protected?', path: ROUTES.helpCenter },
  { q: 'How do I rate a provider?', path: ROUTES.helpCenter },
];

export function Support() {
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
            <Group gap="md">
              <Button variant="subtle" size="sm" onClick={() => navigate(ROUTES.landing)}
                style={{ padding: 0, color: COLORS.navyBlue }}>
                <IconArrowLeft size={20} stroke={2.5} />
              </Button>
              <Text fw={800} size="lg" style={{ color: COLORS.navyBlue, cursor: 'pointer' }}
                onClick={() => navigate(ROUTES.landing)}>
                ONE TOUCH
              </Text>
            </Group>
            <Group gap="lg" align="center">
              <Box style={{ minWidth: 60 }}>
                <LanguageSwitcher />
              </Box>
              <Button className="btn-teal" size="sm" style={{ color: 'white', fontWeight: 700, background: COLORS.tealBlue }} 
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

        {/* ── Hero Section ── */}
        <Box style={{
          background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
          position: 'relative', overflow: 'hidden', paddingTop: '80px', paddingBottom: '80px',
        }}>
          <Box style={{
            position: 'absolute', top: -100, right: -80, width: 400, height: 400,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
          }} />
          <Container size="lg" px={{ base: 'md', sm: 'xl' }}>
            <Stack align="center" ta="center" gap="lg" style={{ position: 'relative' }}>
              <Text fw={900} size="4xl" c="white" style={{ letterSpacing: '-1px' }}>
                We're Here to Help
              </Text>
              <Text c="rgba(255,255,255,0.80)" size="lg" maw={600} style={{ lineHeight: 1.8 }}>
                Multiple ways to reach our support team. We're committed to resolving your issues quickly and professionally.
              </Text>
            </Stack>
          </Container>
        </Box>

        {/* ── Support Channels ── */}
        <Container size="lg" py={80} px={{ base: 'md', sm: 'xl' }}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl" mb={80}>
            {SUPPORT_CHANNELS.map((channel, i) => (
              <Paper
                key={channel.title}
                className="card-hover afu"
                p="xl"
                style={{
                  background: 'white', border: '1.5px solid #E9ECEF', borderRadius: 20,
                  boxShadow: '0 4px 16px rgba(0,0,137,0.05)',
                  cursor: 'pointer', animationDelay: `${i * 0.1}s`
                }}
              >
                <Stack gap="lg" align="center" ta="center">
                  <ThemeIcon size={64} radius="xl" style={{
                    background: `${channel.color}15`, color: channel.color
                  }}>
                    {channel.icon}
                  </ThemeIcon>
                  <div>
                    <Text fw={800} size="md" c={COLORS.navyBlue} mb="xs">
                      {channel.title}
                    </Text>
                    <Text size="sm" c="dimmed" lh={1.6} mb="md">
                      {channel.desc}
                    </Text>
                    <Text fw={700} size="sm" c={channel.color}>
                      {channel.contact}
                    </Text>
                  </div>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          <Divider my={60} />

          {/* ── FAQ Quick Links ── */}
          <Stack gap="lg" mb={80}>
            <Stack align="center" gap="sm" mb={40}>
              <Badge size="lg" style={{
                background: `${COLORS.lemonYellow}30`, color: '#7A6B00',
                border: `1px solid ${COLORS.lemonYellow}`, fontWeight: 700
              }}>
                Quick Help
              </Badge>
              <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px' }}>
                Frequently Asked Questions
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {FAQ_QUICK_LINKS.map((faq, i) => (
                <Paper
                  key={faq.q}
                  className="card-hover"
                  p="lg"
                  style={{
                    background: 'white', border: '1.5px solid #E9ECEF', borderRadius: 12,
                    cursor: 'pointer', animation: `fadeUp 0.6s ${0.5 + i * 0.08}s ease both`,
                  }}
                  onClick={() => navigate(faq.path)}
                >
                  <Group justify="space-between" align="center">
                    <Text fw={600} size="sm" c={COLORS.navyBlue}>
                      {faq.q}
                    </Text>
                    <Text size="lg" c={COLORS.tealBlue}>→</Text>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>

        {/* ── CTA ── */}
        <Box mx={{ base: 'md', sm: 'xl' }} mb={80}>
          <Container size="lg">
            <Box p={{ base: 40, sm: 60 }} style={{
              background: `linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,
              borderRadius: 28, position: 'relative', overflow: 'hidden', textAlign: 'center',
            }}>
              <Box style={{
                position: 'absolute', top: -60, right: -60, width: 240, height: 240,
                borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
              }} />
              <Text fw={900} size="3xl" c="white" mb="sm" style={{ letterSpacing: '-0.5px', position: 'relative' }}>
                Still have questions?
              </Text>
              <Text c="rgba(255,255,255,0.65)" mb="xl" size="md" style={{ position: 'relative' }}>
                Check our Help Center for comprehensive guides and documentation.
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
                  onClick={() => navigate(ROUTES.helpCenter)}>
                  Go to Help Center
                </Button>
              </Group>
            </Box>
          </Container>
        </Box>
      </Box>
    </>
  );
}
