import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge, Divider,
} from '@mantine/core';
import {
  IconShieldCheck, IconBolt, IconMapPin, IconWallet,
  IconStar, IconArrowRight, IconUsers, IconCar, IconSparkles,
  IconDroplets, IconTruck, IconHeart, IconSchool, IconDeviceLaptop,
  IconCheck,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { MOCK_CATEGORIES } from '../mock/mockServices';

/* ─── keyframe animations injected once ───────────────────────────────────── */
const ANIMATIONS = `
@keyframes floatA {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(20px,-30px) scale(1.06); }
}
@keyframes floatB {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(-25px,20px) scale(1.08); }
}
@keyframes floatC {
  0%,100% { transform: translate(0,0); }
  50%      { transform: translate(15px,25px); }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(28px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fadeIn {
  from { opacity:0; }
  to   { opacity:1; }
}
@keyframes pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(0,128,128,0.45); }
  50%      { box-shadow: 0 0 0 14px rgba(0,128,128,0); }
}
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes gradMove {
  0%,100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.anim-fadeup-1 { animation: fadeUp 0.7s ease both; }
.anim-fadeup-2 { animation: fadeUp 0.7s 0.12s ease both; }
.anim-fadeup-3 { animation: fadeUp 0.7s 0.22s ease both; }
.anim-fadeup-4 { animation: fadeUp 0.7s 0.34s ease both; }
.anim-fadein   { animation: fadeIn 1s ease both; }
.card-hover {
  transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}
.card-hover:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 16px 40px rgba(0,0,0,0.25);
  background: rgba(255,255,255,0.1) !important;
}
.stat-hover {
  transition: opacity 0.2s;
}
.stat-hover:hover { opacity:1 !important; }
.btn-shimmer {
  background-size: 800px 100% !important;
  background-image: linear-gradient(110deg, #008080 30%, #00a0a0 50%, #008080 70%) !important;
  animation: shimmer 2.4s linear infinite !important;
}
.btn-shimmer:hover {
  animation: none !important;
  background-image: linear-gradient(135deg, #009090 0%, #006666 100%) !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(0,128,128,0.45) !important;
}
`;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  car:           <IconCar size={22} />,
  sparkles:      <IconSparkles size={22} />,
  droplets:      <IconDroplets size={22} />,
  bolt:          <IconBolt size={22} />,
  truck:         <IconTruck size={22} />,
  heart:         <IconHeart size={22} />,
  school:        <IconSchool size={22} />,
  'device-laptop': <IconDeviceLaptop size={22} />,
};

const TRUST_ITEMS = [
  { icon: <IconCheck size={18} />,       label: 'Verified' },
  { icon: <IconBolt size={18} />,        label: 'Instant' },
  { icon: <IconStar size={18} />,        label: 'Top-Rated' },
];

const BOTTOM_STATS = [
  { icon: <IconUsers size={15} />,       label: '2k+ Experts' },
  { icon: <IconShieldCheck size={15} />, label: 'Transparent Pricing' },
  { icon: <IconMapPin size={15} />,      label: 'Direct Booking' },
  { icon: <IconWallet size={15} />,      label: 'Escrow Protected' },
];

const STEPS = [
  { step: '01', title: 'Search Nearby', desc: 'Open the map, find verified providers near your location in real-time.' },
  { step: '02', title: 'Review & Choose', desc: 'Check verified badges, ratings, pricing, and availability before connecting.' },
  { step: '03', title: 'Call & Connect', desc: 'Tap \'Call Now\' to instantly connect. Commission starts when provider accepts.' },
  { step: '04', title: 'Complete & Pay', desc: 'Service tracked in real-time. Payment released after confirmation.' },
];

const TRUST_FEATURES = [
  { icon: '🏛️', title: 'Government ID Verification', desc: 'OCR technology extracts and verifies government identification' },
  { icon: '👤', title: 'Face Recognition', desc: 'Biometric face matching ensures provider authenticity' },
  { icon: '✓', title: 'Admin Review & Approval', desc: 'Every profile is manually reviewed by our team' },
];

const TESTIMONIALS = [
  { stars: 5, text: '"Maria is incredibly professional. Her attention to detail is outstanding. My home has never looked this clean!"', name: 'Sarah L.', role: 'Verified Client', avatar: 'S' },
  { stars: 5, text: '"Fast response time and excellent work. The verification process gave me confidence to hire. Highly recommended!"', name: 'Tom R.', role: 'Verified Client', avatar: 'T' },
  { stars: 5, text: '"Knowing every provider is identity-verified makes all the difference. Great platform for finding trustworthy professionals."', name: 'Priya K.', role: 'Verified Client', avatar: 'P' },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Box
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg,#000089 0%,#00004A 25%,#000070 50%,#000050 75%,#000089 100%)',
          backgroundSize: '300% 300%',
          animation: 'gradMove 10s ease infinite',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Floating glow orbs ── */}
        <Box style={{ position:'absolute',top:-180,left:-120,width:700,height:700,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,128,128,0.18) 0%,transparent 65%)',animation:'floatA 9s ease-in-out infinite',pointerEvents:'none' }} />
        <Box style={{ position:'absolute',bottom:-200,right:-100,width:650,height:650,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,0,200,0.14) 0%,transparent 70%)',animation:'floatB 12s ease-in-out infinite',pointerEvents:'none' }} />
        <Box style={{ position:'absolute',top:'40%',right:'10%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,230,66,0.06) 0%,transparent 70%)',animation:'floatC 7s ease-in-out infinite',pointerEvents:'none' }} />

        {/* ── Spinning ring decoration ── */}
        <Box style={{
          position:'absolute',top:'8%',right:'6%',width:180,height:180,
          border:'1.5px solid rgba(0,128,128,0.18)',borderRadius:'50%',
          animation:'spin-slow 20s linear infinite',pointerEvents:'none',
        }} />
        <Box style={{
          position:'absolute',top:'10%',right:'8%',width:120,height:120,
          border:'1.5px dashed rgba(245,230,66,0.12)',borderRadius:'50%',
          animation:'spin-slow 14s linear infinite reverse',pointerEvents:'none',
        }} />

        {/* ── NAV ── */}
        <Box
          px={{ base:'lg', sm:'xl' }} py="md"
          style={{ position:'sticky',top:0,zIndex:100,background:'rgba(0,0,60,0.72)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)' }}
        >
          <Group justify="space-between" maw={1140} mx="auto">
            <Group gap="xs">
              <Box style={{ width:38,height:38,borderRadius:11,background:`linear-gradient(135deg,${COLORS.lemonYellow} 0%,#FFD700 100%)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(245,230,66,0.35)' }}>
                <IconShieldCheck size={20} color={COLORS.navyBlue} stroke={2.5} />
              </Box>
              <Text fw={800} size="lg" c="white" style={{ letterSpacing:'-0.3px' }}>ONE TOUCH</Text>
            </Group>
            <Group gap="sm">
              <LanguageSwitcher />
              <Button variant="subtle" c="rgba(255,255,255,0.75)" size="sm" onClick={() => navigate(ROUTES.login)}
                style={{ transition:'color 0.2s' }}>Login</Button>
              <Button size="sm"
                style={{ background:`linear-gradient(135deg,${COLORS.tealBlue} 0%,#006666 100%)`,color:'white',fontWeight:700,transition:'transform 0.18s,box-shadow 0.18s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 6px 18px rgba(0,128,128,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow=''; }}
                onClick={() => navigate(ROUTES.signup)}>Sign Up</Button>
            </Group>
          </Group>
        </Box>

        {/* ── HERO ── */}
        <Container size="sm" pt={80} pb={24} ta="center" px="md">

          <Badge className="anim-fadeup-1" size="sm" mb="xl"
            style={{ background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.72)',border:'1px solid rgba(255,255,255,0.16)',fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',fontSize:11 }}>
            Now Live in Addis Ababa
          </Badge>

          <Text component="h1" fw={900} className="anim-fadeup-2"
            style={{ fontSize:'clamp(2.2rem,6vw,3.6rem)',lineHeight:1.1,letterSpacing:'-2px',color:'white',margin:'0 0 18px',
              textShadow:'0 2px 30px rgba(0,128,128,0.2)' }}>
            Your Marketplace for{' '}
            <Text component="span" style={{
              background:'linear-gradient(90deg,#008080 0%,#00C8C8 50%,#008080 100%)',
              backgroundSize:'200% auto',
              WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent',
              backgroundClip:'text',
              animation:'shimmer 3s linear infinite',
            }}>
              Trusted Experts
            </Text>
          </Text>

          <Text size="md" c="rgba(255,255,255,0.52)" maw={440} mx="auto" lh={1.7} mb={44} className="anim-fadeup-3">
            Skip the bidding. Skip the wait. Hire verified professionals directly and get things done.
          </Text>

          {/* ── WHITE CARD ── */}
          <Box className="anim-fadeup-4" mx="auto" maw={420}
            style={{
              background:'#FFFFFF',
              borderRadius:22,
              padding:'36px 32px',
              boxShadow:'0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px rgba(0,128,128,0.08)',
              position:'relative',
              overflow:'hidden',
            }}
          >
            {/* subtle gradient shimmer top */}
            <Box style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#000089,#008080,#F5E642,#008080,#000089)',backgroundSize:'300% 100%',animation:'shimmer 4s linear infinite' }} />

            <Stack align="center" gap={0} mb={28}>
              <Box w={54} h={54} mb={16}
                style={{ borderRadius:'50%',background:`linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',animation:'pulse 2.4s ease-in-out infinite' }}>
                <IconShieldCheck size={24} color="white" stroke={2} />
              </Box>
              <Text fw={800} size="xl" c={COLORS.navyBlue} ta="center">Welcome to ONE TOUCH</Text>
              <Text size="sm" c="dimmed" mt={6} ta="center" maw={280} lh={1.55}>
                The premium marketplace for verified professionals. Book expert help instantly.
              </Text>
            </Stack>

            <Stack gap={10}>
              <Button fullWidth size="md" rightSection={<IconArrowRight size={16} />}
                className="btn-shimmer"
                style={{ color:'white',fontWeight:700,height:46,fontSize:15,transition:'transform 0.18s,box-shadow 0.18s',border:'none' }}
                onClick={() => navigate(ROUTES.signup)}>
                Create Your Account
              </Button>
              <Button fullWidth size="md" variant="default"
                style={{ border:'1.5px solid #DEE2E6',color:COLORS.navyBlue,fontWeight:600,height:46,background:'#F8F9FA',transition:'border-color 0.2s,background 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=COLORS.tealBlue; (e.currentTarget as HTMLElement).style.background='#F0FDFD'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#DEE2E6'; (e.currentTarget as HTMLElement).style.background='#F8F9FA'; }}
                onClick={() => navigate(ROUTES.login)}>
                Login to Dashboard
              </Button>
            </Stack>

            <Divider label="WHY CHOOSE ONE TOUCH?" labelPosition="center" my={24}
              styles={{ label:{ fontSize:10,color:'#ADB5BD',fontWeight:700,letterSpacing:'0.07em' } }} />

            <SimpleGrid cols={3} spacing="xs">
              {TRUST_ITEMS.map(item => (
                <Stack key={item.label} align="center" gap={6}>
                  <ThemeIcon size={44} radius="xl"
                    style={{ background:`${COLORS.tealBlue}15`,color:COLORS.tealBlue,transition:'transform 0.18s,background 0.18s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background=`${COLORS.tealBlue}28`; (e.currentTarget as HTMLElement).style.transform='scale(1.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background=`${COLORS.tealBlue}15`; (e.currentTarget as HTMLElement).style.transform=''; }}>
                    {item.icon}
                  </ThemeIcon>
                  <Text size="xs" fw={700} c={COLORS.navyBlue} ta="center">{item.label}</Text>
                </Stack>
              ))}
            </SimpleGrid>

            <Text size="xs" c="dimmed" ta="center" mt={20}>
              Join 50,000+ users already growing with us.
            </Text>
          </Box>

          {/* Stats strip */}
          <Group justify="center" gap={32} mt={36} wrap="wrap" className="anim-fadein">
            {BOTTOM_STATS.map(s => (
              <Group key={s.label} gap={6} className="stat-hover" style={{ opacity:0.45,cursor:'default',transition:'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity='1'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity='0.45'}>
                <Box style={{ color:'white',display:'flex' }}>{s.icon}</Box>
                <Text size="sm" c="white" fw={500}>{s.label}</Text>
              </Group>
            ))}
          </Group>
        </Container>

        {/* ── SERVICE CATEGORIES ── */}
        <Container size="lg" py={80} px={{ base:'md', sm:'xl' }}>
          <Stack align="center" mb={48} gap="sm">
            <Badge size="md" style={{ background:'rgba(0,128,128,0.15)',color:COLORS.tealBlue,border:'1px solid rgba(0,128,128,0.3)',fontWeight:600 }}>
              Service Categories
            </Badge>
            <Text fw={900} size="2xl" c="white" ta="center" style={{ letterSpacing:'-0.5px' }}>Find verified professionals across industries</Text>
            <Text size="sm" c="rgba(255,255,255,0.42)" ta="center" maw={420}>
              Find verified professionals across industries
            </Text>
          </Stack>

          <SimpleGrid cols={{ base:2, xs:4 }} spacing="md">
            {MOCK_CATEGORIES.map((cat, i) => (
              <Box key={cat.id} className="card-hover" p="lg" ta="center"
                style={{
                  background:'rgba(255,255,255,0.055)',
                  border:'1px solid rgba(255,255,255,0.09)',
                  borderRadius:18,
                  cursor:'pointer',
                  animation:`fadeUp 0.6s ${0.05 * i}s ease both`,
                }}
                onClick={() => navigate(ROUTES.signup)}>
                <ThemeIcon size={52} radius="xl" mb="sm" mx="auto"
                  style={{ background:`${cat.color}22`,color:cat.color,transition:'transform 0.2s' }}>
                  {CATEGORY_ICONS[cat.icon] ?? <IconBolt size={22} />}
                </ThemeIcon>
                <Text fw={700} size="sm" c="white">{cat.name}</Text>
                <Text size="xs" mt={4} style={{ color:'rgba(255,255,255,0.35)' }}>{cat.subcategories.length} services</Text>
              </Box>
            ))}
          </SimpleGrid>

          <Group justify="center" mt={36}>
            <Button variant="outline" size="md" rightSection={<IconArrowRight size={16} />}
              style={{ borderColor:'rgba(255,255,255,0.22)',color:'white',transition:'border-color 0.2s,background 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=COLORS.tealBlue; (e.currentTarget as HTMLElement).style.background='rgba(0,128,128,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='rgba(255,255,255,0.22)'; (e.currentTarget as HTMLElement).style.background='transparent'; }}
              onClick={() => navigate(ROUTES.signup)}>
              View All Services
            </Button>
          </Group>
        </Container>

        {/* ── HOW IT WORKS ── */}
        <Box py={72} px={{ base:'md', sm:'xl' }}
          style={{ borderTop:'1px solid rgba(255,255,255,0.07)',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.15)' }}>
          <Container size="md">
            <Stack align="center" mb={52} gap="sm">
              <Text fw={900} size="2xl" c="white" ta="center" style={{ letterSpacing:'-0.5px' }}>
                How <Text component="span" style={{
                  background:'linear-gradient(90deg,#008080 0%,#00C8C8 50%,#008080 100%)',
                  backgroundSize:'200% auto',
                  WebkitBackgroundClip:'text',
                  WebkitTextFillColor:'transparent',
                  backgroundClip:'text',
                }}>ONE TOUCH</Text> Works
              </Text>
              <Text size="sm" c="rgba(255,255,255,0.42)" ta="center">Instant connection, verified trust</Text>
            </Stack>
            <SimpleGrid cols={{ base:1, sm:4 }} spacing={16}>
              {STEPS.map((item, i) => (
                <Stack key={item.step} align="center" ta="center" gap="md"
                  style={{ animation:`fadeUp 0.6s ${0.1 * i}s ease both` }}>
                  <Box w={60} h={60}
                    style={{ borderRadius:'50%',background:`linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 6px 24px rgba(0,128,128,0.2)`,transition:'transform 0.22s,box-shadow 0.22s',cursor:'default' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='scale(1.08)'; (e.currentTarget as HTMLElement).style.boxShadow='0 10px 32px rgba(0,128,128,0.35)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow=`0 6px 24px rgba(0,128,128,0.2)`; }}>
                    <Text fw={900} size="md" c="white">{item.step}</Text>
                  </Box>
                  <Text fw={700} size="sm" c="white">{item.title}</Text>
                  <Text size="xs" c="rgba(255,255,255,0.45)" lh={1.6}>{item.desc}</Text>
                </Stack>
              ))}
            </SimpleGrid>
          </Container>
        </Box>

        {/* ── BUILT ON TRUST & VERIFICATION ── */}
        <Container size="lg" py={80} px={{ base:'md', sm:'xl' }}>
          <Stack align="center" mb={52} gap="sm">
            <Text fw={900} size="2xl" c="white" ta="center" style={{ letterSpacing:'-0.5px' }}>Built on trust & verification</Text>
            <Text size="sm" c="rgba(255,255,255,0.42)" ta="center" maw={500}>
              Multi-layer verification ensures every provider is who they claim to be
            </Text>
          </Stack>
          <SimpleGrid cols={{ base:1, sm:3 }} spacing={32}>
            {TRUST_FEATURES.map((item, i) => (
              <Stack key={item.title} align="center" ta="center" gap="lg"
                style={{ 
                  padding:'40px',
                  borderRadius:16,
                  background:'rgba(255,255,255,0.03)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  animation:`fadeUp 0.6s ${0.1 * i}s ease both`,
                  transition:'transform 0.2s,background 0.2s'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform='translateY(-4px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.transform=''; }}>
                <Text size="3xl">{item.icon}</Text>
                <Text fw={700} size="md" c="white">{item.title}</Text>
                <Text size="sm" c="rgba(255,255,255,0.45)" lh={1.6}>{item.desc}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Container>

        {/* ── TESTIMONIALS ── */}
        <Box py={80} px={{ base:'md', sm:'xl' }} style={{ borderTop:'1px solid rgba(255,255,255,0.07)',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.15)' }}>
          <Container size="lg">
            <Stack align="center" mb={52} gap="sm">
              <Text fw={900} size="2xl" c="white" ta="center" style={{ letterSpacing:'-0.5px' }}>Trusted by thousands</Text>
            </Stack>
            <SimpleGrid cols={{ base:1, sm:3 }} spacing={32}>
              {TESTIMONIALS.map((item, i) => (
                <Box key={item.name}
                  p="lg"
                  style={{
                    background:'rgba(255,255,255,0.05)',
                    border:'1px solid rgba(255,255,255,0.1)',
                    borderRadius:16,
                    animation:`fadeUp 0.6s ${0.1 * i}s ease both`,
                  }}>
                  <Group gap={4} mb="md">
                    {[...Array(item.stars)].map((_, j) => (
                      <Text key={j} component="span" size="lg">⭐</Text>
                    ))}
                  </Group>
                  <Text size="sm" c="rgba(255,255,255,0.8)" fw={500} lh={1.6} mb="lg">
                    "{item.text}"
                  </Text>
                  <Group gap="sm">
                    <Box
                      style={{
                        width:40,
                        height:40,
                        borderRadius:'50%',
                        background:`linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        color:'white',
                        fontWeight:700,
                      }}>
                      {item.avatar}
                    </Box>
                    <Stack gap={0}>
                      <Text size="sm" fw={600} c="white">{item.name}</Text>
                      <Text size="xs" c="rgba(255,255,255,0.45)">{item.role}</Text>
                    </Stack>
                  </Group>
                </Box>
              ))}
            </SimpleGrid>
          </Container>
        </Box>

        {/* ── CTA ── */}
        <Container size="sm" py={80} px="md" ta="center">
          <Text fw={900} size="2xl" c="white" mb="sm" style={{ letterSpacing:'-0.5px' }}>
            Ready to connect?
          </Text>
          <Text c="rgba(255,255,255,0.45)" mb="xl" size="md">
            Whether you're a professional or looking for one, ONE TOUCH connects you instantly with verified trust.
          </Text>
          <Group justify="center" gap="md" wrap="wrap">
            <Button size="lg" className="btn-shimmer"
              style={{ color:'white',fontWeight:700,padding:'13px 36px',border:'none',transition:'transform 0.18s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform=''}
              onClick={() => navigate(ROUTES.signup)}>Get Started</Button>
            <Button size="lg" variant="outline"
              style={{ borderColor:'rgba(255,255,255,0.3)',color:'white',fontWeight:700,padding:'13px 36px',transition:'background 0.2s,transform 0.18s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.transform=''; }}
              onClick={() => navigate(ROUTES.signup)}>Browse Services</Button>
          </Group>
        </Container>

        {/* ── FOOTER ── */}
        <Box py="xl" px={{ base:'md', sm:'xl' }} style={{ borderTop:'1px solid rgba(255,255,255,0.07)',background:'rgba(0,0,0,0.3)' }}>
          <Container size="lg">
            <SimpleGrid cols={{ base:2, sm:4 }} spacing="xl" mb="xl">
              <Stack gap="md">
                <Group gap="xs">
                  <Box w={30} h={30} style={{ borderRadius:9,background:`linear-gradient(135deg,${COLORS.lemonYellow} 0%,#FFD700 100%)`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <IconShieldCheck size={15} color={COLORS.navyBlue} />
                  </Box>
                  <Text fw={700} size="sm" c="white">ONE TOUCH</Text>
                </Group>
                <Text size="xs" c="rgba(255,255,255,0.45)" lh={1.6}>
                  Find trusted services near you — instantly.
                </Text>
              </Stack>
              
              <Stack gap="sm">
                <Text fw={700} size="xs" c="rgba(255,255,255,0.6)" tt="uppercase" style={{ letterSpacing: '1px' }}>FOR CLIENTS</Text>
                {['Browse Services', 'How It Works', 'Trust & Safety'].map(link => (
                  <Text key={link} size="sm" c="rgba(255,255,255,0.4)"
                    style={{ cursor:'pointer',transition:'color 0.18s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.8)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)')}>
                    {link}
                  </Text>
                ))}
              </Stack>

              <Stack gap="sm">
                <Text fw={700} size="xs" c="rgba(255,255,255,0.6)" tt="uppercase" style={{ letterSpacing: '1px' }}>FOR PROVIDERS</Text>
                {['Join as Service Provider', 'Dashboard', 'Earnings'].map(link => (
                  <Text key={link} size="sm" c="rgba(255,255,255,0.4)"
                    style={{ cursor:'pointer',transition:'color 0.18s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.8)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)')}>
                    {link}
                  </Text>
                ))}
              </Stack>

              <Stack gap="sm">
                <Text fw={700} size="xs" c="rgba(255,255,255,0.6)" tt="uppercase" style={{ letterSpacing: '1px' }}>SUPPORT</Text>
                {['Help Center', 'Privacy Policy', 'Terms of Service'].map(link => (
                  <Text key={link} size="sm" c="rgba(255,255,255,0.4)"
                    style={{ cursor:'pointer',transition:'color 0.18s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.8)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)')}>
                    {link}
                  </Text>
                ))}
              </Stack>
            </SimpleGrid>

            <Divider style={{ borderColor:'rgba(255,255,255,0.07)' }} />

            <Group justify="space-between" wrap="wrap" gap="md" align="center" pt="lg">
              <Text size="xs" c="rgba(255,255,255,0.3)">{'\u00A9'} 2026 ONE TOUCH. All rights reserved.</Text>
              <Group gap="md">
                <Text size="xs" c="rgba(255,255,255,0.3)"
                  style={{ cursor:'pointer' }}>Privacy Policy</Text>
                <Text size="xs" c="rgba(255,255,255,0.3)"
                  style={{ cursor:'pointer' }}>Terms of Service</Text>
              </Group>
            </Group>
          </Container>
        </Box>

        <AIHelpCenter />
      </Box>
    </>
  );
}
