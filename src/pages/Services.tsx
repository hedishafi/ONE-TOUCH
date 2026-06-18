import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge, Divider, Paper,
} from '@mantine/core';
import {
  IconArrowLeft, IconBolt,
  IconCar, IconSparkles, IconDroplets, IconTruck,
  IconHeart, IconSchool, IconDeviceLaptop, IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { COLORS, ROUTES } from '../utils/constants';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import type { Category } from '../types';
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
.afu-card { animation: fadeUp 0.6s ease both; }
@for $i from 1 through 8 {
  .afu-card:nth-child(#{$i}) { animation-delay: #{$i * 0.08}s; }
}
.afu-sub { animation: slideInRight 0.5s ease both; }
.cat-card {
  transition: all 0.22s ease;
  cursor: pointer;
}
.cat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,137,0.12) !important;
  border-color: #008080 !important;
}
.sub-item {
  transition: all 0.18s ease;
  cursor: pointer;
}
.sub-item:hover {
  background: rgba(0,128,128,0.06) !important;
  border-left: 3px solid #008080;
  padding-left: calc(16px - 3px);
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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  car: <IconCar size={24} />,
  sparkles: <IconSparkles size={24} />,
  droplets: <IconDroplets size={24} />,
  bolt: <IconBolt size={24} />,
  truck: <IconTruck size={24} />,
  heart: <IconHeart size={24} />,
  school: <IconSchool size={24} />,
  'device-laptop': <IconDeviceLaptop size={24} />,
};

export function Services() {
  const navigate = useNavigate();
  const { categories } = useServiceCatalog();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const selectedSkills = selectedCategory?.subcategories ?? [];

  // Smooth scroll to top when toggling views
  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          position: 'absolute', bottom: 100, left: -150, width: 500, height: 500,
          borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,128,128,0.06) 0%,transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* ── Main Content ── */}
        <Container size="lg" py={60} px={{ base: 'md', sm: 'xl' }}>
          {!selectedCategory ? (
            <>
              {/* Header */}
              <Stack align="center" mb={56} gap="sm">
                <Badge size="lg"
                  style={{
                    background: `${COLORS.tealBlue}15`, color: COLORS.tealBlue,
                    border: `1px solid ${COLORS.tealBlue}25`, fontWeight: 700
                  }}>
                  Browse Services
                </Badge>
                <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px' }}>
                  Find the service you need
                </Text>
                <Box style={{
                  width: 64, height: 4, borderRadius: 2,
                  background: `linear-gradient(90deg,${COLORS.tealBlue},${COLORS.navyBlue})`
                }} />
                <Text size="md" c="dimmed" ta="center" maw={500} mt={8}>
                  Browse verified service categories and select one to see available sub-services and providers near you.
                </Text>
              </Stack>

              {/* Categories Grid */}
              <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="lg" mb={60}>
                {categories.map((cat, i) => (
                  <Paper
                    key={cat.id}
                    className="cat-card afu-card"
                    p="xl"
                    style={{
                      background: 'white', border: '1.5px solid #E9ECEF', borderRadius: 20,
                      boxShadow: '0 2px 12px rgba(0,0,137,0.05)', cursor: 'pointer',
                      animationDelay: `${i * 0.08}s`
                    }}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    <Stack align="center" ta="center" gap="md">
                      <ThemeIcon size={56} radius="xl"
                        style={{
                          background: `${cat.color}15`, color: cat.color,
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.transform = '';
                        }}
                      >
                        {CATEGORY_ICONS[cat.icon] ?? <IconBolt size={24} />}
                      </ThemeIcon>
                      <div>
                        <Text fw={700} size="sm" c={COLORS.navyBlue}>{cat.name}</Text>
                        <Text size="xs" c="dimmed" mt={4}>{cat.subcategories.length} services</Text>
                      </div>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </>
          ) : (
            <>
              {/* Category Detail View */}
              <Stack gap="xl" mb={60}>
                {/* Header with back button */}
                <Group justify="space-between" align="center">
                  <Group gap="md">
                    <Button variant="subtle" size="sm" onClick={handleBackToCategories}
                      style={{ padding: 0, color: COLORS.navyBlue }}>
                      <IconArrowLeft size={20} stroke={2.5} />
                    </Button>
                    <Stack gap={0}>
                      <Text fw={900} size="2xl" c={COLORS.navyBlue}>{selectedCategory.name}</Text>
                      <Text size="sm" c="dimmed">{selectedSkills.length} sub-services available</Text>
                    </Stack>
                  </Group>
                  <ThemeIcon size={60} radius="xl"
                    style={{ background: `${selectedCategory.color}15`, color: selectedCategory.color }}>
                    {CATEGORY_ICONS[selectedCategory.icon] ?? <IconBolt size={28} />}
                  </ThemeIcon>
                </Group>

                <Divider />

                {/* Subcategories */}
                <Stack gap="xs">
                  <Text fw={700} size="md" c={COLORS.navyBlue} mb="md">Sub-Services:</Text>
                  {selectedSkills.map((sub, i) => (
                    <Paper
                      key={sub.id}
                      className="sub-item afu-sub"
                      p="md"
                      style={{
                        background: 'white', border: `1px solid #E9ECEF`, borderRadius: 12,
                        transition: 'all 0.18s ease', animationDelay: `${i * 0.08}s`
                      }}
                    >
                      <Group justify="space-between" align="center">
                        <Group gap="sm">
                          <Box style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: `${selectedCategory.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <IconCheck size={16} color={selectedCategory.color} />
                          </Box>
                          <div>
                            <Text fw={600} size="sm" c={COLORS.navyBlue}>{sub.name}</Text>
                            <Text size="xs" c="dimmed" mt={2}>Find verified providers</Text>
                          </div>
                        </Group>
                        <Button size="sm" variant="subtle" className="btn-teal"
                          style={{ color: 'white', fontWeight: 700 }}
                          onClick={() => navigate(ROUTES.signup)}>
                          Browse
                        </Button>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </>
          )}
        </Container>

        {/* ── CTA Band ── */}
        {!selectedCategory && (
          <Box mx={{ base: 'md', sm: 'xl' }} mb={80}>
            <Container size="lg">
              <Box p={{ base: 40, sm: 60 }} style={{
                background: `linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,
                borderRadius: 28, position: 'relative', overflow: 'hidden', textAlign: 'center'
              }}>
                <Box style={{
                  position: 'absolute', top: -60, right: -60, width: 240, height: 240,
                  borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none'
                }} />
                <Text fw={900} size="3xl" c="white" mb="sm" style={{ letterSpacing: '-0.5px', position: 'relative' }}>
                  Ready to book a service?
                </Text>
                <Text c="rgba(255,255,255,0.65)" mb="xl" size="md" style={{ position: 'relative' }}>
                  Create an account to browse available providers and book instantly.
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
                    Sign Up Now
                  </Button>
                </Group>
              </Box>
            </Container>
          </Box>
        )}
      </Box>
    </>
  );
}
