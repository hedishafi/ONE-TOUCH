import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Group, SimpleGrid, Stack, Text,
  ThemeIcon, Badge, Paper, Breadcrumbs, Anchor,
} from '@mantine/core';
import {
  IconArrowRight, IconArrowLeft, IconBolt, IconCar, IconSparkles,
  IconDroplets, IconTruck, IconHeart, IconSchool, IconDeviceLaptop,
  IconShieldCheck, IconStar, IconMapPin, IconTools, IconWash,
  IconClock, IconEngine, IconTool, IconWand, IconWifi,
  IconBrush, IconMusic, IconMath, IconLanguage,
} from '@tabler/icons-react';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import { COLORS, ROUTES } from '../utils/constants';
import { LandingNavbar } from '../components/LandingNavbar';

/* ── Animations ─────────────────────────────────────────── */
const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity:0; transform:translateY(28px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fadeIn {
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes slideRight {
  from { opacity:0; transform:translateX(-20px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes pulseRing {
  0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
  70%  { box-shadow: 0 0 0 18px rgba(255,255,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
}
.sub-card {
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  cursor: pointer;
}
.sub-card:hover {
  transform: translateY(-6px) !important;
  box-shadow: 0 20px 48px rgba(0,0,0,0.12) !important;
}
.sub-card:hover .sub-card-icon {
  transform: scale(1.1) rotate(-4deg);
}
.sub-card-icon {
  transition: transform 0.22s ease;
}
.btn-book {
  transition: all 0.2s ease !important;
}
.btn-book:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 20px rgba(0,0,0,0.18) !important;
}
.back-btn {
  transition: all 0.18s ease;
  cursor: pointer;
}
.back-btn:hover {
  transform: translateX(-3px);
}
`;

/* ── Category icon map ───────────────────────────────────── */
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  car:             <IconCar size={32} />,
  sparkles:        <IconSparkles size={32} />,
  droplets:        <IconDroplets size={32} />,
  bolt:            <IconBolt size={32} />,
  truck:           <IconTruck size={32} />,
  heart:           <IconHeart size={32} />,
  school:          <IconSchool size={32} />,
  'device-laptop': <IconDeviceLaptop size={32} />,
};

/* ── Per-subcategory icon suggestions ───────────────────── */
const SUB_ICONS: Record<string, React.ReactNode> = {
  // Auto
  'sub-001': <IconEngine size={24} />,
  'sub-002': <IconTools size={24} />,
  'sub-003': <IconTool size={24} />,
  'sub-004': <IconDeviceLaptop size={24} />,
  // Cleaning
  'sub-005': <IconSparkles size={24} />,
  'sub-006': <IconBrush size={24} />,
  'sub-007': <IconWand size={24} />,
  'sub-008': <IconWash size={24} />,
  // Plumbing
  'sub-009': <IconTools size={24} />,
  'sub-010': <IconDroplets size={24} />,
  'sub-011': <IconBolt size={24} />,
  // Electrical
  'sub-012': <IconBolt size={24} />,
  'sub-013': <IconShieldCheck size={24} />,
  'sub-014': <IconBolt size={24} />,
  // Moving
  'sub-015': <IconTruck size={24} />,
  'sub-016': <IconMapPin size={24} />,
  'sub-017': <IconTools size={24} />,
  // Beauty
  'sub-018': <IconStar size={24} />,
  'sub-019': <IconWand size={24} />,
  'sub-020': <IconHeart size={24} />,
  // Tutoring
  'sub-021': <IconMath size={24} />,
  'sub-022': <IconLanguage size={24} />,
  'sub-023': <IconMusic size={24} />,
  // IT
  'sub-024': <IconDeviceLaptop size={24} />,
  'sub-025': <IconWifi size={24} />,
  'sub-026': <IconDeviceLaptop size={24} />,
};

/* ── Short descriptions ──────────────────────────────────── */
const SUB_DESCRIPTIONS: Record<string, string> = {
  'sub-001': 'Full engine diagnostics, repair, and overhaul by certified mechanics.',
  'sub-002': 'Tire rotation, balancing, replacement, and rim repairs.',
  'sub-003': 'Quick and clean oil change with top-grade motor oil brands.',
  'sub-004': 'Advanced OBD-II diagnostics to identify vehicle issues fast.',
  'sub-005': 'Thorough top-to-bottom cleaning of every corner of your home.',
  'sub-006': 'Professional office sanitation keeping your workspace spotless.',
  'sub-007': 'Deep cleaning before or after moving in or out of a property.',
  'sub-008': 'Steam and deep cleaning to restore your carpets and rugs.',
  'sub-009': 'Fast repair of burst pipes, dripping faucets, and leaks.',
  'sub-010': 'Unclog drains and restore full water flow quickly.',
  'sub-011': 'Repair or replacement of water heaters and geysers.',
  'sub-012': 'Safe wiring installation for homes and commercial spaces.',
  'sub-013': 'Upgrade your electrical panel for better safety and capacity.',
  'sub-014': 'Install EV charging stations at your home or business.',
  'sub-015': 'Smooth local home or office relocation handled by experts.',
  'sub-016': 'Reliable transport for moves across cities or regions.',
  'sub-017': 'Expert assembly and installation of all types of furniture.',
  'sub-018': 'Professional haircut, styling, and grooming at your location.',
  'sub-019': 'Premium makeup and beauty services for any occasion.',
  'sub-020': 'Relaxing therapeutic massage from certified practitioners.',
  'sub-021': 'Expert tutoring in mathematics, physics, biology, and chemistry.',
  'sub-022': 'English, Amharic, French, and other language lessons.',
  'sub-023': 'Guitar, piano, violin, and vocal lessons for all levels.',
  'sub-024': 'Laptop, desktop, and hardware repair by certified technicians.',
  'sub-025': 'Home and office network setup, router config, and troubleshooting.',
  'sub-026': 'Software installation, virus removal, and OS support.',
};

/* ── Page badges ─────────────────────────────────────────── */
const TRUST_BADGES = [
  { icon: <IconShieldCheck size={14} />, label: 'Verified Providers' },
  { icon: <IconClock size={14} />,       label: 'Fast Response' },
  { icon: <IconStar size={14} />,        label: '4.8★ Avg Rating' },
  { icon: <IconMapPin size={14} />,      label: 'Addis Ababa' },
];

/* ── Component ───────────────────────────────────────────── */
export function ServiceSubcategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { categories, loading } = useServiceCatalog();

  const category = categories.find(c => c.id === categoryId);

  if (loading && categories.length === 0) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text fw={700} size="lg" c={COLORS.navyBlue}>Loading services…</Text>
      </Box>
    );
  }

  /* ── 404 fallback ── */
  if (!category) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text fw={800} size="2xl" c={COLORS.navyBlue}>Service not found</Text>
        <Button className="btn-teal" style={{ color: 'white' }} onClick={() => navigate(ROUTES.landing)}>
          Back to Home
        </Button>
      </Box>
    );
  }

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Box style={{ minHeight: '100vh', background: '#FFFFFF', overflowX: 'hidden' }}>

        <LandingNavbar />

        {/* ── Category Hero Header ── */}
        <Box
          py={{ base: 60, sm: 80 }}
          px={{ base: 'md', sm: 'xl' }}
          style={{
            background: `linear-gradient(135deg, ${category.color}18 0%, ${category.color}08 50%, #ffffff 100%)`,
            borderBottom: `1px solid ${category.color}20`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative blobs */}
          <Box style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${category.color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <Box style={{ position: 'absolute', bottom: -60, left: -40, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${category.color}08 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
            {/* Breadcrumb */}
            <Breadcrumbs
              mb="xl"
              style={{ animation: 'slideRight 0.5s ease both' }}
              separator={<Text size="xs" c="dimmed">/</Text>}
            >
              <Anchor size="sm" c={COLORS.tealBlue} fw={600} onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>Home</Anchor>
              <Anchor size="sm" c={COLORS.tealBlue} fw={600} onClick={() => navigate(ROUTES.services)} style={{ cursor: 'pointer' }}>Services</Anchor>
              <Text size="sm" c="dimmed" fw={500}>{category.name}</Text>
            </Breadcrumbs>

            <Group align="center" gap={24} wrap="wrap" style={{ animation: 'fadeUp 0.6s 0.05s ease both' }}>
              {/* Large category icon */}
              <Box
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 22,
                  background: `linear-gradient(135deg, ${category.color}22, ${category.color}44)`,
                  border: `2px solid ${category.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: category.color,
                  boxShadow: `0 8px 24px ${category.color}25`,
                }}
              >
                {CATEGORY_ICONS[category.icon] ?? <IconBolt size={32} />}
              </Box>

              <Stack gap={6}>
                <Group gap="sm" align="center">
                  <Badge
                    size="sm"
                    style={{ background: `${category.color}15`, color: category.color, border: `1px solid ${category.color}30`, fontWeight: 700 }}
                  >
                    {category.subcategories.length} Available Services
                  </Badge>
                </Group>
                <Text fw={900} size="3xl" c={COLORS.navyBlue} style={{ letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  {category.name}
                </Text>
                <Text size="md" c="dimmed" maw={540}>
                  Choose a service below. All providers are verified and rated by real customers in Addis Ababa.
                </Text>
              </Stack>
            </Group>

            {/* Trust badges row */}
            <Group mt="xl" gap="sm" wrap="wrap" style={{ animation: 'fadeUp 0.6s 0.15s ease both' }}>
              {TRUST_BADGES.map((b, i) => (
                <Group
                  key={i} gap={6} px={12} py={6}
                  style={{ background: 'white', borderRadius: 20, border: `1px solid #E9ECEF`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  <Box c={COLORS.tealBlue}>{b.icon}</Box>
                  <Text size="xs" fw={600} c={COLORS.navyBlue}>{b.label}</Text>
                </Group>
              ))}
            </Group>
          </Container>
        </Box>

        {/* ── Subcategory Grid ── */}
        <Container size="lg" py={70} px={{ base: 'md', sm: 'xl' }}>
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 2, md: 3 }} spacing="lg">
            {category.subcategories.map((sub, i) => (
              <Paper
                key={sub.id}
                className="sub-card"
                p={0}
                radius={20}
                style={{
                  border: `1.5px solid #E9ECEF`,
                  overflow: 'hidden',
                  animation: `fadeUp 0.55s ${0.07 * i}s ease both`,
                  background: 'white',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                }}
                onClick={() => navigate(ROUTES.signup)}
              >
                {/* Colored top accent */}
                <Box style={{ height: 4, background: `linear-gradient(90deg, ${category.color}, ${category.color}80)` }} />

                <Stack gap={0} p="xl">
                  {/* Icon */}
                  <ThemeIcon
                    size={52}
                    radius="xl"
                    mb="md"
                    className="sub-card-icon"
                    style={{
                      background: `${category.color}12`,
                      color: category.color,
                      border: `1px solid ${category.color}20`,
                    }}
                  >
                    {SUB_ICONS[sub.id] ?? <IconBolt size={24} />}
                  </ThemeIcon>

                  <Text fw={800} size="md" c={COLORS.navyBlue} mb={6}>
                    {sub.name}
                  </Text>
                  <Text size="sm" c="dimmed" lh={1.6} mb="lg" style={{ flexGrow: 1 }}>
                    {SUB_DESCRIPTIONS[sub.id] ?? `Professional ${sub.name.toLowerCase()} services by verified experts near you.`}
                  </Text>

                  <Button
                    size="sm"
                    className="btn-book"
                    rightSection={<IconArrowRight size={15} />}
                    style={{
                      background: `linear-gradient(135deg, ${category.color}, ${category.color}cc)`,
                      color: 'white',
                      fontWeight: 700,
                      border: 'none',
                      alignSelf: 'flex-start',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(ROUTES.signup);
                    }}
                  >
                    Book Now
                  </Button>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Back navigation */}
          <Group justify="center" mt={56} gap="md">
            <Group
              gap={8}
              className="back-btn"
              onClick={() => navigate(ROUTES.landing)}
              style={{ cursor: 'pointer' }}
            >
              <IconArrowLeft size={16} color={COLORS.tealBlue} />
              <Text size="sm" fw={600} c={COLORS.tealBlue}>Back to Home</Text>
            </Group>
            <Text size="sm" c="dimmed">·</Text>
            <Text
              size="sm" fw={600} c={COLORS.navyBlue}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onClick={() => navigate(ROUTES.services)}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              Browse All Services
            </Text>
          </Group>
        </Container>

        {/* ── Bottom CTA ── */}
        <Box
          mx={{ base: 'md', sm: 'xl' }}
          mb={64}
        >
          <Container size="lg">
            <Box
              p={{ base: 36, sm: 48 }}
              style={{
                background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${category.color} 100%)`,
                borderRadius: 24,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
              <Text fw={800} size="xl" c="white" mb={8} style={{ position: 'relative' }}>
                Ready to book a {category.name} professional?
              </Text>
              <Text c="rgba(255,255,255,0.75)" size="sm" mb="xl" style={{ position: 'relative' }}>
                Create a free account to connect with verified providers near you.
              </Text>
              <Group justify="center" gap="md" wrap="wrap" style={{ position: 'relative' }}>
                <Button
                  size="md"
                  style={{
                    background: COLORS.lemonYellow,
                    color: COLORS.navyBlue,
                    fontWeight: 800,
                    transition: 'transform 0.18s, box-shadow 0.18s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 24px rgba(245,230,66,0.5)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                  onClick={() => navigate(ROUTES.signup)}
                >
                  Sign Up Free
                </Button>
                <Button
                  size="md"
                  variant="outline"
                  style={{ borderColor: 'rgba(255,255,255,0.45)', color: 'white', fontWeight: 700, transition: 'background 0.18s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '')}
                  onClick={() => navigate(ROUTES.login)}
                >
                  I Already Have an Account
                </Button>
              </Group>
            </Box>
          </Container>
        </Box>

      </Box>
    </>
  );
}
