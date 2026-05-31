import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  Accordion, Paper,
} from '@mantine/core';
import {
  IconArrowLeft, IconBook, IconWallet, IconBriefcase,
  IconShield,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
.afu { animation: fadeUp 0.6s ease both; }
`;

export function HelpCenter() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const FAQ_CATEGORIES = [
    {
      icon: <IconBook size={20} />,
      title: t('helpCenter.cat_booking_title'),
      color: '#3498DB',
      items: [
        { q: t('helpCenter.cat_booking_q1'), a: t('helpCenter.cat_booking_a1') },
        { q: t('helpCenter.cat_booking_q2'), a: t('helpCenter.cat_booking_a2') },
        { q: t('helpCenter.cat_booking_q3'), a: t('helpCenter.cat_booking_a3') },
        { q: t('helpCenter.cat_booking_q4'), a: t('helpCenter.cat_booking_a4') },
      ],
    },
    {
      icon: <IconWallet size={20} />,
      title: t('helpCenter.cat_payments_title'),
      color: '#1ABC9C',
      items: [
        { q: t('helpCenter.cat_payments_q1'), a: t('helpCenter.cat_payments_a1') },
        { q: t('helpCenter.cat_payments_q2'), a: t('helpCenter.cat_payments_a2') },
        { q: t('helpCenter.cat_payments_q3'), a: t('helpCenter.cat_payments_a3') },
        { q: t('helpCenter.cat_payments_q4'), a: t('helpCenter.cat_payments_a4') },
      ],
    },
    {
      icon: <IconBriefcase size={20} />,
      title: t('helpCenter.cat_provider_title'),
      color: '#F39C12',
      items: [
        { q: t('helpCenter.cat_provider_q1'), a: t('helpCenter.cat_provider_a1') },
        { q: t('helpCenter.cat_provider_q2'), a: t('helpCenter.cat_provider_a2') },
        { q: t('helpCenter.cat_provider_q3'), a: t('helpCenter.cat_provider_a3') },
        { q: t('helpCenter.cat_provider_q4'), a: t('helpCenter.cat_provider_a4') },
      ],
    },
    {
      icon: <IconShield size={20} />,
      title: t('helpCenter.cat_security_title'),
      color: '#E91E63',
      items: [
        { q: t('helpCenter.cat_security_q1'), a: t('helpCenter.cat_security_a1') },
        { q: t('helpCenter.cat_security_q2'), a: t('helpCenter.cat_security_a2') },
        { q: t('helpCenter.cat_security_q3'), a: t('helpCenter.cat_security_a3') },
        { q: t('helpCenter.cat_security_q4'), a: t('helpCenter.cat_security_a4') },
      ],
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
            borderBottom: '1px solid rgba(0,0,137,0.08)', boxShadow: '0 2px 16px rgba(0,0,137,0.05)',
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
                {t('helpCenter.nav_signup')}
              </Button>
            </Group>
          </Group>
        </Box>

        {/* ── Decorative blob ── */}
        <Box style={{
          position: 'absolute', top: -200, right: -180, width: 600, height: 600,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,0,137,0.05) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ── Hero Section ── */}
        <Box style={{
          background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 100%)`,
          position: 'relative', overflow: 'hidden', paddingTop: '80px', paddingBottom: '80px',
        }}>
          <Box style={{
            position: 'absolute', top: -100, right: -80, width: 400, height: 400,
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <Container size="lg" px={{ base: 'md', sm: 'xl' }}>
            <Stack align="center" ta="center" gap="lg" style={{ position: 'relative' }}>
              <Text fw={900} size="4xl" c="white" style={{ letterSpacing: '-1px' }}>
                {t('helpCenter.hero_title')}
              </Text>
              <Text c="rgba(255,255,255,0.80)" size="lg" maw={600} style={{ lineHeight: 1.8 }}>
                {t('helpCenter.hero_sub')}
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
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                <Group gap="md" mb="xl" align="flex-start">
                  <ThemeIcon size={48} radius="xl" style={{
                    background: `${category.color}15`, color: category.color, flexShrink: 0,
                  }}>
                    {category.icon}
                  </ThemeIcon>
                  <Text fw={800} size="lg" c={COLORS.navyBlue}>
                    {category.title}
                  </Text>
                </Group>

                <Accordion defaultValue={category.items[0]?.q} style={{ border: 'none' }}>
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
                      <Accordion.Control style={{ padding: '12px 0', transition: 'all 0.2s ease' }}>
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
                {t('helpCenter.cta_title')}
              </Text>
              <Text c="rgba(255,255,255,0.65)" mb="xl" size="md">
                {t('helpCenter.cta_sub')}
              </Text>
              <Group justify="center" gap="md" wrap="wrap">
                <Button size="xl" style={{
                  background: COLORS.lemonYellow, color: COLORS.navyBlue, fontWeight: 800,
                  padding: '14px 40px',
                }} onClick={() => navigate(ROUTES.support)}>
                  {t('helpCenter.cta_btn')}
                </Button>
              </Group>
            </Box>
          </Container>
        </Box>
      </Box>
    </>
  );
}
