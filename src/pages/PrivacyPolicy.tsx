import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon, Divider,
} from '@mantine/core';
import { IconArrowLeft, IconShieldCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
.afu { animation: fadeUp 0.6s ease both; }
`;

export function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Information We Collect',
      content: 'We collect information you provide directly (name, email, phone, payment details) and information automatically when you use the platform (IP address, device info, usage patterns). We also collect data from third parties when you authorize them (e.g., payment processors).'
    },
    {
      title: '2. How We Use Your Information',
      content: 'We use your information to provide and improve our services, process payments, communicate with you, prevent fraud, comply with legal requirements, and personalize your experience. Your data is never sold to third parties without explicit consent.'
    },
    {
      title: '3. Data Security',
      content: 'We implement bank-level encryption and security measures to protect your personal and financial data. All data is transmitted securely over HTTPS, and sensitive information is encrypted in storage. We regularly audit our security practices.'
    },
    {
      title: '4. Your Rights',
      content: 'You have the right to access, correct, or delete your personal information. You can opt out of marketing communications anytime. To exercise these rights, contact our privacy team at privacy@onetouch.et.'
    },
    {
      title: '5. Third-Party Services',
      content: 'We use trusted third-party services (payment processors, analytics, hosting providers). These partners have their own privacy policies and security measures. We only share data necessary for them to provide their services.'
    },
    {
      title: '6. Cookies & Tracking',
      content: 'We use cookies to remember your preferences and improve your experience. You can disable cookies in your browser settings, but some features may not work properly. We do not track you across third-party websites.'
    },
    {
      title: '7. Children\'s Privacy',
      content: 'ONE TOUCH is not intended for users under 18. We do not knowingly collect information from minors. If we discover a user is under 18, we will delete their account and data immediately.'
    },
    {
      title: '8. Policy Updates',
      content: 'We may update this privacy policy periodically. We will notify you of significant changes via email or prominent notification on the platform. Your continued use of ONE TOUCH after changes constitutes acceptance.'
    },
  ];

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
              <Group gap="md" justify="center">
                <ThemeIcon size={56} radius="xl" style={{
                  background: 'rgba(255,255,255,0.2)', color: 'white'
                }}>
                  <IconShieldCheck size={28} />
                </ThemeIcon>
              </Group>
              <Text fw={900} size="4xl" c="white" style={{ letterSpacing: '-1px' }}>
                Privacy Policy
              </Text>
              <Text c="rgba(255,255,255,0.80)" size="lg" maw={600} style={{ lineHeight: 1.8 }}>
                We respect your privacy and are committed to protecting your personal data. Last updated: February 2026.
              </Text>
            </Stack>
          </Container>
        </Box>

        {/* ── Content ── */}
        <Container size="md" py={80} px={{ base: 'md', sm: 'xl' }}>
          <Stack gap="xl">
            {sections.map((section, i) => (
              <Box
                key={section.title}
                className="afu"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <Text fw={700} size="lg" c={COLORS.navyBlue} mb="md" style={{
                  borderBottom: `2px solid ${COLORS.tealBlue}20`,
                  paddingBottom: '12px',
                }}>
                  {section.title}
                </Text>
                <Text size="sm" c="dimmed" lh={1.8}>
                  {section.content}
                </Text>
                {i < sections.length - 1 && <Divider my="xl" color="rgba(0,0,137,0.08)" />}
              </Box>
            ))}

            <Box p="lg" style={{
              background: `${COLORS.tealBlue}10`, borderRadius: 16,
              border: `1px solid ${COLORS.tealBlue}20`, marginTop: '40px'
            }}>
              <Stack gap="sm">
                <Text fw={700} size="sm" c={COLORS.tealBlue} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Questions About Your Privacy?
                </Text>
                <Text size="sm" c={COLORS.navyBlue}>
                  Email us at <strong>privacy@onetouch.et</strong> or contact our support team anytime.
                </Text>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
