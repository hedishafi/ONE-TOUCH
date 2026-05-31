import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon, Divider, Grid,
} from '@mantine/core';
import { IconArrowLeft, IconFileText, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
.afu { animation: fadeUp 0.6s ease both; }
.toc-link {
  transition: all 0.2s ease;
  cursor: pointer;
  color: #6C757D;
}
.toc-link:hover {
  color: #008080;
  padding-left: 8px;
}
.toc-link.active {
  color: #008080;
  font-weight: 700;
  border-left: 3px solid #008080;
  padding-left: 12px;
}
`;

const SECTION_NUMS = ['1','2','3','4','5','6','7','8','9','10'];

export function TermsOfService() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('1');

  const TERMS_SECTIONS = SECTION_NUMS.map(num => ({
    num,
    title: t(`termsOfService.s${num}_title`),
    content: t(`termsOfService.s${num}_content`),
  }));

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
                  <IconFileText size={28} />
                </ThemeIcon>
              </Group>
              <Text fw={900} size="4xl" c="white" style={{ letterSpacing: '-1px' }}>
                {t('termsOfService.page_title')}
              </Text>
              <Text c="rgba(255,255,255,0.80)" size="lg" maw={600} style={{ lineHeight: 1.8 }}>
                {t('termsOfService.page_sub')}
              </Text>
            </Stack>
          </Container>
        </Box>

        {/* ── Content with TOC ── */}
        <Container size="xl" py={80} px={{ base: 'md', sm: 'xl' }}>
          <Grid gutter="2xl" align="flex-start">
            {/* Table of Contents */}
            <Grid.Col span={{ base: 12, sm: 3 }}>
              <Box style={{
                position: 'sticky', top: 120,
                background: 'white',
                border: `1px solid rgba(0,0,137,0.08)`,
                borderRadius: 16,
                padding: '20px',
              }}>
                <Text fw={700} size="sm" c={COLORS.navyBlue} mb="md" style={{
                  textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {t('termsOfService.toc_heading')}
                </Text>
                <Stack gap="xs">
                  {TERMS_SECTIONS.map(section => (
                    <Text
                      key={section.num}
                      size="sm"
                      className={`toc-link ${activeSection === section.num ? 'active' : ''}`}
                      onClick={() => setActiveSection(section.num)}
                    >
                      {section.num}. {section.title}
                    </Text>
                  ))}
                </Stack>
              </Box>
            </Grid.Col>

            {/* Main Content */}
            <Grid.Col span={{ base: 12, sm: 9 }}>
              <Stack gap="xl">
                {TERMS_SECTIONS.map((section, i) => (
                  <Box
                    key={section.num}
                    className="afu"
                    id={`section-${section.num}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onMouseEnter={() => setActiveSection(section.num)}
                  >
                    <Group gap="md" mb="md" align="flex-start">
                      <Box style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: `${COLORS.tealBlue}15`, color: COLORS.tealBlue,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontWeight: 700, fontSize: 14
                      }}>
                        {section.num}
                      </Box>
                      <Text fw={700} size="lg" c={COLORS.navyBlue}>
                        {section.title}
                      </Text>
                    </Group>
                    <Text size="sm" c="dimmed" lh={1.8} pl={48}>
                      {section.content}
                    </Text>
                    {i < TERMS_SECTIONS.length - 1 && <Divider my="xl" color="rgba(0,0,137,0.08)" />}
                  </Box>
                ))}

                {/* Sign off */}
                <Box p="lg" mt="xl" style={{
                  background: `${COLORS.tealBlue}10`, borderRadius: 16,
                  border: `1px solid ${COLORS.tealBlue}20`,
                }}>
                  <Group gap="sm">
                    <IconCheck color={COLORS.tealBlue} />
                    <Stack gap="4px">
                      <Text fw={700} size="sm" c={COLORS.tealBlue}>
                        {t('termsOfService.acceptance_title')}
                      </Text>
                      <Text size="sm" c={COLORS.navyBlue}>
                        {t('termsOfService.acceptance_body')}
                      </Text>
                    </Stack>
                  </Group>
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>
    </>
  );
}
