import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  Accordion, Paper,
} from '@mantine/core';
import {
  IconArrowLeft, IconBook, IconWallet, IconBriefcase,
  IconShield,
} from '@tabler/icons-react';
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

const FAQ_CATEGORIES = [
  {
    icon: <IconBook size={20} />,
    title: 'Booking & Services',
    color: '#3498DB',
    items: [
      { q: 'How do I book a service on ONE TOUCH?', a: 'Browse available services, select a provider, call them via in-app VoIP to confirm details and pricing, then book through the platform. You\'ll receive instant confirmation.' },
      { q: 'Can I reschedule or cancel a booking?', a: 'Yes, you can reschedule or cancel up to 2 hours before the scheduled time without penalty. Late cancellations may result in fees.' },
      { q: 'What if the provider doesn\'t show up?', a: 'If a provider doesn\'t arrive as scheduled, contact our support team immediately. Your payment will be refunded and you\'ll be offered an alternative provider.' },
      { q: 'How do I know if a provider is verified?', a: 'All providers on ONE TOUCH are verified through government ID checks. Look for the Verified badge on their profile.' },
    ]
  },
  {
    icon: <IconWallet size={20} />,
    title: 'Payments & Wallet',
    color: '#1ABC9C',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept mobile money (Telebirr, M-Pesa), bank transfers, and card payments. All payments are processed securely through our escrow system.' },
      { q: 'How does escrow protection work?', a: 'Payment is held safely until you confirm the job is complete. Once confirmed, the provider receives the payment instantly.' },
      { q: 'Can I get a refund?', a: 'Refunds are available if the service wasn\'t completed as agreed. Contact support within 24 hours with evidence, and we\'ll investigate and process refunds.' },
      { q: 'Is there a transaction fee?', a: 'ONE TOUCH charges a small platform fee (varies by service) to process payments securely and maintain the platform.' },
    ]
  },
  {
    icon: <IconBriefcase size={20} />,
    title: 'Provider Guidelines',
    color: '#F39C12',
    items: [
      { q: 'How do I become a service provider?', a: 'Sign up as a provider, pass our identity verification, and upload your credentials. Setup takes 2-3 business days.' },
      { q: 'What are the requirements?', a: 'Valid government ID, proof of skills/certifications (where applicable), and a reliable phone with internet access.' },
      { q: 'How do I set my rates?', a: 'You control your pricing. Set hourly rates or fixed prices per service. Adjust anytime from your dashboard.' },
      { q: 'How do I build my reputation?', a: 'Deliver quality work, respond quickly to clients, and encourage them to rate you. Higher ratings increase your visibility and bookings.' },
    ]
  },
  {
    icon: <IconShield size={20} />,
    title: 'Account & Security',
    color: '#E91E63',
    items: [
      { q: 'How do I secure my account?', a: 'Use a strong password, enable two-factor authentication, and never share your login details. ONE TOUCH never asks for passwords via email.' },
      { q: 'Can I have multiple accounts?', a: 'No, each person should have one account. Having multiple accounts violates our terms and may result in permanent ban.' },
      { q: 'What if I forget my password?', a: 'Click "Forgot Password" on the login page and follow the email instructions. If you don\'t receive the email, check your spam folder.' },
      { q: 'How is my personal data protected?', a: 'We use bank-level encryption and security measures. Your data is never shared with third parties without your consent. See our Privacy Policy for details.' },
    ]
  },
];

export function HelpCenter() {
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
              <Button size="sm" style={{ color: 'white', fontWeight: 700, background: COLORS.tealBlue }} 
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
                Help Center
              </Text>
              <Text c="rgba(255,255,255,0.80)" size="lg" maw={600} style={{ lineHeight: 1.8 }}>
                Find answers to common questions. Explore our comprehensive guides and documentation.
              </Text>
            </Stack>
          </Container>
        </Box>

        {/* ── FAQ Accordions ── */}
        <Container size="lg" py={80} px={{ base: 'md', sm: 'xl' }}>
          <Stack gap={60}>
            {FAQ_CATEGORIES.map((category, idx) => (
              <Paper
                key={category.title}
                className="afu"
                p="xl"
                style={{
                  background: 'white', border: '1.5px solid #E9ECEF', borderRadius: 20,
                  boxShadow: '0 4px 16px rgba(0,0,137,0.05)',
                  animationDelay: `${idx * 0.1}s`
                }}
              >
                <Group gap="md" mb="xl" align="flex-start">
                  <ThemeIcon size={48} radius="xl" style={{
                    background: `${category.color}15`, color: category.color, flexShrink: 0
                  }}>
                    {category.icon}
                  </ThemeIcon>
                  <Text fw={800} size="lg" c={COLORS.navyBlue}>
                    {category.title}
                  </Text>
                </Group>

                <Accordion
                  defaultValue={category.items[0]?.q}
                  style={{ border: 'none' }}
                >
                  {category.items.map((item, i) => (
                    <Accordion.Item
                      key={item.q}
                      value={item.q}
                      style={{
                        borderBottom: i < category.items.length - 1 ? '1px solid #E9ECEF' : 'none',
                        paddingBottom: i < category.items.length - 1 ? '12px' : 0,
                        marginBottom: i < category.items.length - 1 ? '12px' : 0,
                      }}
                    >
                      <Accordion.Control
                        style={{
                          padding: '12px 0',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: category.color,
                          }
                        }}
                      >
                        <Text fw={600} size="sm" c={COLORS.navyBlue}>
                          {item.q}
                        </Text>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Text size="sm" c="dimmed" lh={1.7} style={{ paddingTop: '8px' }}>
                          {item.a}
                        </Text>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Paper>
            ))}
          </Stack>
        </Container>

        {/* ── CTA ── */}
        <Box mx={{ base: 'md', sm: 'xl' }} mb={80}>
          <Container size="lg">
            <Box p={{ base: 40, sm: 60 }} style={{
              background: `linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,
              borderRadius: 28, position: 'relative', overflow: 'hidden', textAlign: 'center',
            }}>
              <Text fw={900} size="3xl" c="white" mb="sm" style={{ letterSpacing: '-0.5px' }}>
                Need more help?
              </Text>
              <Text c="rgba(255,255,255,0.65)" mb="xl" size="md">
                Contact our support team anytime. We're here to help you succeed.
              </Text>
              <Group justify="center" gap="md" wrap="wrap">
                <Button size="xl" style={{
                  background: COLORS.lemonYellow, color: COLORS.navyBlue, fontWeight: 800,
                  padding: '14px 40px'
                }} onClick={() => navigate(ROUTES.support)}>
                  Contact Support
                </Button>
              </Group>
            </Box>
          </Container>
        </Box>
      </Box>
    </>
  );
}
