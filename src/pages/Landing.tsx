import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge, Paper,
} from '@mantine/core';
import {
  IconShieldCheck, IconBolt, IconMapPin, IconWallet,
  IconStar, IconArrowRight, IconCar, IconSparkles,
  IconDroplets, IconTruck, IconHeart, IconSchool, IconDeviceLaptop,
  IconPhone, IconBrandGooglePlay, IconBrandApple, IconHeadset, IconDeviceMobile,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { COLORS, ROUTES } from '../utils/constants';
import { LandingNavbar } from '../components/LandingNavbar';
import { AIHelpCenter } from '../components/AIHelpCenter';
import { MOCK_CATEGORIES } from '../mock/mockServices';

const ANIMATIONS = `
@keyframes fadeUp {
  from { opacity:0; transform:translateY(32px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes fadeLeft {
  from { opacity:0; transform:translateX(-24px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes fadeRight {
  from { opacity:0; transform:translateX(24px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes floatY {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-14px); }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(0,128,128,0.4); }
  70%  { box-shadow: 0 0 0 16px rgba(0,128,128,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,128,128,0); }
}
@keyframes draw-line {
  from { width: 0; }
  to   { width: 80px; }
}
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes bgWave {
  0%   { background-position: 0% 50%; }
  33%  { background-position: 60% 30%; }
  66%  { background-position: 100% 70%; }
  100% { background-position: 0% 50%; }
}
@keyframes slideUnderline {
  from { width: 0; }
  to   { width: 100%; }
}
@keyframes footerFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pageSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: pageSlideUp 0.6s ease both; }
.afu1 { animation: fadeUp   0.7s 0.05s ease both; }
.afu2 { animation: fadeUp   0.7s 0.15s ease both; }
.afu3 { animation: fadeUp   0.7s 0.25s ease both; }
.afu4 { animation: fadeUp   0.7s 0.38s ease both; }
.afl  { animation: fadeLeft 0.7s 0.1s  ease both; }
.afr  { animation: fadeRight 0.7s 0.2s ease both; }
.float{ animation: floatY 4s ease-in-out infinite; }
.footer-animated { animation: footerFadeIn 0.8s ease both; }

.cat-card {
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  cursor: pointer;
}
.cat-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0,0,137,0.10) !important;
  border-color: rgba(0,128,128,0.35) !important;
}
.feat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.feat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0,0,137,0.09) !important;
}
.nav-link {
  transition: color 0.18s;
  cursor: pointer;
}
.nav-link:hover { color: #008080 !important; }
.btn-teal {
  background: #008080 !important;
  transition: transform 0.18s, box-shadow 0.18s, background 0.18s !important;
}
.btn-teal:hover {
  background: #006666 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 24px rgba(0,128,128,0.35) !important;
}
.btn-outline-navy {
  border: 2px solid #000089 !important;
  color: #000089 !important;
  transition: background 0.18s, transform 0.18s !important;
}
.btn-outline-navy:hover {
  background: rgba(0,0,137,0.06) !important;
  transform: translateY(-2px) !important;
}
.step-circle {
  transition: transform 0.22s, box-shadow 0.22s;
  cursor: default;
}
.step-circle:hover {
  transform: scale(1.1);
  box-shadow: 0 10px 30px rgba(0,0,137,0.25) !important;
}
@keyframes btn-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(0,0,128,0.2), 0 4px 20px rgba(0,128,128,0.15); }
  50%      { box-shadow: 0 0 24px rgba(0,128,128,0.35), 0 8px 32px rgba(0,0,128,0.2); }
}
@keyframes badge-bounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
.store-badge {
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.store-badge:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 10px 28px rgba(0,0,0,0.35) !important;
}
`;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  car:           <IconCar size={24} />,
  sparkles:      <IconSparkles size={24} />,
  droplets:      <IconDroplets size={24} />,
  bolt:          <IconBolt size={24} />,
  truck:         <IconTruck size={24} />,
  heart:         <IconHeart size={24} />,
  school:        <IconSchool size={24} />,
  'device-laptop': <IconDeviceLaptop size={24} />,
};

const FEATURES = [
  { icon: <IconShieldCheck size={24} />, color: '#000089', bg: 'rgba(0,0,137,0.08)', title: 'Identity Verified', desc: 'Every provider is government-ID checked before being listed on the platform.' },
  { icon: <IconBolt size={24} />,        color: '#008080', bg: 'rgba(0,128,128,0.08)', title: 'Instant VoIP Call', desc: 'Connect in seconds with a free in-app call — no phone number sharing needed.' },
  { icon: <IconMapPin size={24} />,      color: '#000089', bg: 'rgba(0,0,137,0.08)', title: 'Location-Based',   desc: 'See only providers within your chosen radius on a live Addis Ababa map.' },
  { icon: <IconWallet size={24} />,      color: '#008080', bg: 'rgba(0,128,128,0.08)', title: 'Escrow Protected', desc: 'Payment held securely until you confirm the job is done — zero risk.' },
];

const STATS = [
  { value: '2,000+', label: 'Verified Providers' },
  { value: '15,000+', label: 'Jobs Completed' },
  { value: '4.8★', label: 'Average Rating' },
  { value: '98%', label: 'Satisfaction Rate' },
];

const STEPS = [
  { n: '01', title: 'Browse & Discover', desc: 'Search by category and see verified providers near you on a live Addis Ababa map.', icon: <IconMapPin size={20} /> },
  { n: '02', title: 'Call Free & Agree', desc: 'Free in-app VoIP call. Agree on price with full transparency before any payment.', icon: <IconPhone size={20} /> },
  { n: '03', title: 'Pay Secure & Review', desc: 'Escrow holds payment and releases it only after you confirm the job is done.', icon: <IconShieldCheck size={20} /> },
];

export function Landing() {
  const navigate = useNavigate();

  function CountUp({ end, duration = 1500, decimals = 0, suffix = '' }: { end: number; duration?: number; decimals?: number; suffix?: string }) {
    const [value, setValue] = useState(0);

    useEffect(() => {
      let start: number | null = null;
      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const current = +(progress * end).toFixed(decimals);
        setValue(current);
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      const raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [end, duration, decimals]);

    const formatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const suffixColor = (suffix === '%' || suffix === '★' || suffix === '+') ? COLORS.lemonYellow : undefined;
    return <>
      <span style={{ fontWeight: 900 }}>{formatter.format(value)}</span>
      {suffix ? <span style={{ fontWeight: 700, marginLeft: 6, color: suffixColor }}>{suffix}</span> : null}
    </>;
  }

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Box style={{ minHeight:'100vh', background:'#FFFFFF', position:'relative', overflow:'hidden' }}>

        {/* ── Decorative blobs (light, on white) ── */}
        <Box style={{ position:'absolute',top:-200,right:-180,width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,0,137,0.05) 0%,transparent 70%)',pointerEvents:'none' }} />
        <Box style={{ position:'absolute',top:300,left:-200,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,128,128,0.06) 0%,transparent 70%)',pointerEvents:'none' }} />
        <Box style={{ position:'absolute',bottom:200,right:-100,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,230,66,0.10) 0%,transparent 70%)',pointerEvents:'none' }} />

        {/* ── NAV ── */}
        <LandingNavbar />

        {/* ── HERO ── */}
        <Container size="lg" pt={90} pb={80} px={{ base:'md',sm:'xl' }}>
          <Group align="center" gap={60} wrap="nowrap" style={{ flexWrap:'wrap' }}>

            {/* Left copy */}
            <Stack flex={1} miw={280} gap="xl">
              <Badge className="afu1" size="lg"
                style={{ width:'fit-content',background:`${COLORS.tealBlue}12`,color:COLORS.tealBlue,border:`1px solid ${COLORS.tealBlue}30`,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',fontSize:11 }}>
                Now Live in Addis Ababa
              </Badge>

              <Text component="h1" className="afu2" fw={900} lh={1.08}
                style={{ fontSize:'clamp(2.6rem,5.5vw,4rem)',letterSpacing:'-2px',color:COLORS.navyBlue,margin:0 }}>
                Find Trusted{' '}
                <Text component="span" style={{
                  background:`linear-gradient(90deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,
                  WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
                }}>
                  Professionals
                </Text>
                {'\n'}Near You — Instantly.
              </Text>

              <Text className="afu3" size="lg" lh={1.7} maw={480}
                style={{ color:'#555' }}>
                ONE TOUCH connects clients with verified service providers across Addis Ababa. Book, pay, and review — all in one place.
              </Text>

              <Group className="afu4" gap="md" wrap="wrap">
                <Button size="xl" className="btn-teal"
                  rightSection={<IconArrowRight size={18} />}
                  style={{ color:'white',fontWeight:800,padding:'14px 32px',fontSize:16 }}
                  onClick={() => navigate(ROUTES.signup)}>
                  Get Started Free
                </Button>
                <Button size="xl" className="btn-outline-navy" variant="outline"
                  style={{ padding:'14px 32px',fontSize:15,fontWeight:700 }}
                  onClick={() => navigate(ROUTES.login)}>
                  Login to Dashboard
                </Button>
              </Group>

              <Group className="afu4" gap="xl" wrap="wrap">
                {[['10,000+','Happy Users'],['4.8★','Avg Rating'],['98%','Satisfaction']].map(([v,l]) => {
                  const raw = String(v);
                  const cleaned = raw.replace(/,/g, '');
                  let main = raw;
                  let suffix = '';
                  if (cleaned.endsWith('+')) { main = cleaned.replace('+','').replace(/\B(?=(\d{3})+(?!\d))/g, ',') ; suffix = '+'; }
                  if (cleaned.indexOf('★') !== -1) { main = cleaned.replace('★',''); suffix = '★'; }
                  if (cleaned.endsWith('%')) { main = cleaned.replace('%',''); suffix = '%'; }
                  return (
                    <Box key={l}>
                      <Text fw={900} size="xl" style={{ color:COLORS.navyBlue }}>
                        <span>{main}</span>
                        {suffix ? <span style={{ color: (suffix==='%'||suffix==='★'||suffix==='+')?COLORS.lemonYellow:undefined, marginLeft:6, fontWeight:700 }}>{suffix}</span> : null}
                      </Text>
                      <Text size="xs" c="dimmed" fw={500}>{l}</Text>
                    </Box>
                  );
                })}
              </Group>
            </Stack>

            {/* Right — floating card UI mockup */}
            <Box flex={1} miw={280} maw={440} className="afr float" style={{ position:'relative' }}>
              {/* Main card */}
              <Paper p={28} radius={20} shadow="xl"
                style={{ background:'white',border:`1px solid rgba(0,0,137,0.08)`,overflow:'hidden',position:'relative' }}>
                {/* Accent top bar */}
                <Box style={{ position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${COLORS.navyBlue},${COLORS.tealBlue},${COLORS.lemonYellow})` }} />

                <Group mb="lg" justify="space-between">
                  <Text fw={800} size="md" c={COLORS.navyBlue}>Nearby Providers</Text>
                  <Badge size="sm" style={{ background:`${COLORS.tealBlue}15`,color:COLORS.tealBlue }}>Live</Badge>
                </Group>

                <Stack gap="sm">
                  {[
                    { name:'Yohannes Teferi', service:'Engine Repair', rating:4.9, dist:'1.2 km', price:'ETB 500/hr', color:'#E74C3C' },
                    { name:'Meron Tesfaye',   service:'Home Cleaning',  rating:4.8, dist:'0.8 km', price:'ETB 800 fixed', color:'#3498DB' },
                    { name:'Tigist Mengesha', service:'Electrical Work', rating:4.7, dist:'2.1 km', price:'Estimate', color:'#F39C12' },
                  ].map((p,i) => (
                    <Box key={i} p="sm" style={{ background:'#F8F9FA',borderRadius:12,border:'1px solid #E9ECEF' }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <Box w={38} h={38} style={{ borderRadius:10,background:`linear-gradient(135deg,${p.color}30,${p.color}60)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                            <Text fw={800} c={p.color}>{p.name[0]}</Text>
                          </Box>
                          <Box>
                            <Text fw={700} size="sm" c={COLORS.navyBlue} style={{ lineHeight:1.2 }}>{p.name}</Text>
                            <Text size="xs" c="dimmed">{p.service}</Text>
                            <Group gap={4} mt={2}>
                              <IconStar size={10} fill={COLORS.lemonYellow} color={COLORS.lemonYellow} />
                              <Text size="xs" fw={600} c={COLORS.navyBlue}>{p.rating}</Text>
                              <Text size="xs" c="dimmed">· {p.dist}</Text>
                            </Group>
                          </Box>
                        </Group>
                        <Box ta="right" style={{ flexShrink:0 }}>
                          <Text size="xs" fw={700} c={COLORS.tealBlue}>{p.price}</Text>
                          <Button size="xs" mt={4} className="btn-teal" style={{ color:'white',fontSize:11 }} onClick={() => navigate(ROUTES.signup)}>Call</Button>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                </Stack>

                <Box mt="md" p="xs" style={{ background:`linear-gradient(135deg,${COLORS.navyBlue}08,${COLORS.tealBlue}08)`,borderRadius:10,textAlign:'center' }}>
                  <Text size="xs" fw={600}>
                    <span style={{ color: COLORS.tealBlue, marginRight: 6 }}>{'📍'}</span>
                    <span style={{ color: COLORS.lemonYellow, fontWeight: 700 }}>Bole, Addis Ababa</span>
                    <span style={{ color: '#6B7280', marginLeft: 8 }}>· 12 providers online</span>
                  </Text>
                </Box>
              </Paper>

              {/* Floating badge top-right */}
              <Box style={{ position:'absolute',top:-16,right:-16,background:COLORS.lemonYellow,borderRadius:14,padding:'8px 14px',boxShadow:'0 8px 20px rgba(245,230,66,0.4)' }}>
                <Text fw={800} size="xs" c={COLORS.navyBlue}>Verified ✓</Text>
              </Box>

              {/* Floating badge bottom-left */}
              <Box style={{ position:'absolute',bottom:-16,left:-16,background:'white',borderRadius:14,padding:'10px 16px',boxShadow:'0 8px 24px rgba(0,0,137,0.12)',border:`1px solid rgba(0,0,137,0.08)` }}>
                <Group gap={8}>
                  <Box style={{ width:28,height:28,borderRadius:'50%',background:`${COLORS.tealBlue}20`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <IconShieldCheck size={14} color={COLORS.tealBlue} />
                  </Box>
                  <Box>
                    <Text size="xs" fw={700} c={COLORS.navyBlue}>Escrow Protected</Text>
                    <Text size="10px" c="dimmed">Pay only when done</Text>
                  </Box>
                </Group>
              </Box>
            </Box>
          </Group>
        </Container>

        {/* ── STATS BAR ── */}
        <Box style={{ background: '#FBFCFF' }} py="xl">
          <Container size="lg">
            <SimpleGrid cols={{ base:2,sm:4 }}>
              {STATS.map(s => {
                // parse value like '2,000+', '15,000+', '4.8★', '98%'
                const raw = String(s.value);
                let num = 0;
                let decimals = 0;
                let suffix = '';
                const cleaned = raw.replace(/,/g, '');
                const percentMatch = cleaned.match(/^(\d+(?:\.\d+)?)%$/);
                const plusMatch = cleaned.match(/^(\d+(?:\.\d+)?)(\+)?$/);

                if (percentMatch) {
                  num = parseFloat(percentMatch[1]);
                  suffix = '%';
                } else if (/\d+\.\d+/.test(cleaned) && cleaned.indexOf('★') !== -1) {
                  // rating like 4.8★
                  num = parseFloat(cleaned.replace('★', ''));
                  decimals = 1;
                  suffix = '★';
                } else if (plusMatch) {
                  num = parseFloat(plusMatch[1]);
                  suffix = cleaned.endsWith('+') ? '+' : '';
                } else {
                  // fallback: try to extract number
                  const m = cleaned.match(/(\d+(?:\.\d+)?)/);
                  if (m) num = parseFloat(m[1]);
                }

                return (
                  <Box key={s.label} ta="center" py="sm">
                      <Text fw={900} size="3xl" c={COLORS.navyBlue} style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)' }}>
                        <CountUp end={num} duration={1400} decimals={decimals} suffix={suffix} />
                      </Text>
                    <Text size="sm" c="#6B7280" fw={500}>{s.label}</Text>
                  </Box>
                );
              })}
            </SimpleGrid>
          </Container>
        </Box>

        {/* ── BROWSE SERVICES ── */}
        <Container size="lg" py={80} px={{ base:'md',sm:'xl' }}>
          <Stack align="center" mb={52} gap="sm">
            <Badge size="lg" style={{ background:`${COLORS.navyBlue}10`,color:COLORS.navyBlue,border:`1px solid ${COLORS.navyBlue}20`,fontWeight:700 }}>
              Our Services
            </Badge>
            <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing:'-0.5px' }}>
              What can we help you with?
            </Text>
            <Box style={{ width:64,height:4,borderRadius:2,background:`linear-gradient(90deg,${COLORS.navyBlue},${COLORS.tealBlue})`,animation:'draw-line 0.8s ease both' }} />
            <Text size="md" c="dimmed" ta="center" maw={480} mt={8}>
              From auto repairs to home cleaning — find verified professionals near you in Addis Ababa.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base:2,xs:4 }} spacing="lg">
            {MOCK_CATEGORIES.map((cat,i) => (
              <Box key={cat.id} className="cat-card" p="xl" ta="center"
                style={{ background:'white',border:'1.5px solid #E9ECEF',borderRadius:20,boxShadow:'0 2px 12px rgba(0,0,137,0.05)',animation:`fadeUp 0.6s ${0.06*i}s ease both` }}
                onClick={() => navigate(`/services/${cat.id}`)}>
                <ThemeIcon size={56} radius="xl" mb="md" mx="auto"
                  style={{ background:`${cat.color}14`,color:cat.color,transition:'transform 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='scale(1.12)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform=''}>
                  {CATEGORY_ICONS[cat.icon] ?? <IconBolt size={24} />}
                </ThemeIcon>
                <Text fw={700} size="sm" c={COLORS.navyBlue}>{cat.name}</Text>
                <Text size="xs" c="dimmed" mt={4}>{cat.subcategories.length} services</Text>
              </Box>
            ))}
          </SimpleGrid>

          <Group justify="center" mt={40}>
            <Button variant="outline" size="md" rightSection={<IconArrowRight size={16} />}
              className="btn-outline-navy"
              style={{ fontWeight:700 }}
              onClick={() => navigate(ROUTES.services)}>
              View All Services
            </Button>
          </Group>
        </Container>

        {/* ── FEATURES ── */}
        <Box py={80} px={{ base:'md',sm:'xl' }} style={{ background:'#F8F9FA' }}>
          <Container size="lg">
            <Stack align="center" mb={52} gap="sm">
              <Badge size="lg" style={{ background:`${COLORS.tealBlue}12`,color:COLORS.tealBlue,border:`1px solid ${COLORS.tealBlue}25`,fontWeight:700 }}>
                Why ONE TOUCH?
              </Badge>
              <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing:'-0.5px' }}>
                Built for trust, speed & transparency
              </Text>
              <Box style={{ width:64,height:4,borderRadius:2,background:`linear-gradient(90deg,${COLORS.tealBlue},${COLORS.navyBlue})` }} />
            </Stack>
            <SimpleGrid cols={{ base:1,sm:2 }} spacing="xl">
              {FEATURES.map((f,i) => (
                <Paper key={i} className="feat-card" p="xl" radius={18} shadow="sm"
                  style={{ background:'white',border:`1px solid rgba(0,0,137,0.06)`,animation:`fadeUp 0.6s ${0.08*i}s ease both`,overflow:'hidden',position:'relative' }}>
                  <Box style={{ position:'absolute',top:0,left:0,width:4,height:'100%',background:`linear-gradient(180deg,${f.color},${f.color}40)`,borderRadius:'4px 0 0 4px' }} />
                  <Box pl={8}>
                    <ThemeIcon size={50} radius="xl" mb="md" style={{ background:f.bg,color:f.color }}>
                      {f.icon}
                    </ThemeIcon>
                    <Text fw={800} size="md" c={COLORS.navyBlue} mb="xs">{f.title}</Text>
                    <Text size="sm" c="dimmed" lh={1.65}>{f.desc}</Text>
                  </Box>
                </Paper>
              ))}
            </SimpleGrid>
          </Container>
        </Box>

        {/* ── HOW IT WORKS ── */}
        <Box style={{ background: '#ffffff', position: 'relative' }}>
        <Container size="lg" py={80} px={{ base:'md',sm:'xl' }}>
          <Stack align="center" mb={60} gap="sm">
            <Badge size="lg" style={{ background:`${COLORS.lemonYellow}30`,color:'#7A6B00',border:`1px solid ${COLORS.lemonYellow}`,fontWeight:700 }}>
              How It Works
            </Badge>
            <Text fw={900} size="3xl" ta="center" c={COLORS.navyBlue} style={{ letterSpacing:'-0.5px' }}>
              3 steps to get help
            </Text>
            <Box style={{ width:64,height:4,borderRadius:2,background:`linear-gradient(90deg,${COLORS.lemonYellow},${COLORS.tealBlue})` }} />
          </Stack>
          <SimpleGrid cols={{ base:1,sm:3 }} spacing={48}>
            {STEPS.map((item,i) => (
              <Stack key={item.n} align="center" ta="center" gap="lg" style={{ position:'relative',animation:`fadeUp 0.6s ${0.1*i}s ease both` }}>
                {i < STEPS.length-1 && (
                  <Box style={{ display:'none' }} />
                )}
                <Box className="step-circle" w={70} h={70}
                  style={{ borderRadius:'50%',background:`linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 8px 24px rgba(0,0,137,0.2)`,position:'relative' }}>
                  <Text fw={900} size="xl" c="white">{item.n}</Text>
                  <Box style={{ position:'absolute',bottom:-4,right:-4,width:22,height:22,borderRadius:'50%',background:COLORS.lemonYellow,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Box c={COLORS.navyBlue}>{item.icon}</Box>
                  </Box>
                </Box>
                <Text fw={800} size="md" c={COLORS.navyBlue}>{item.title}</Text>
                <Text size="sm" c="dimmed" lh={1.7}>{item.desc}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Container>
        </Box>

        {/* ══════════════════════════════════════════════════════════
            UNIFIED BOTTOM SECTION — Get Started · Download · Call
           ══════════════════════════════════════════════════════════ */}
        <Box
          py={{ base: 72, sm: 96 }}
          px={{ base: 'md', sm: 'xl' }}
          style={{
            background: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            borderTop: 'none',
          }}
        >
          {/* Background blobs */}
          <Box style={{ position:'absolute', top:-160, right:'10%', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle, ${COLORS.tealBlue}06 0%, transparent 65%)`, pointerEvents:'none' }} />
          <Box style={{ position:'absolute', bottom:-140, left:'5%', width:440, height:440, borderRadius:'50%', background:`radial-gradient(circle, ${COLORS.navyBlue}05 0%, transparent 65%)`, pointerEvents:'none' }} />

          <Container size="lg" style={{ position:'relative', zIndex:1 }}>

            {/* ── PART 1: GET STARTED — centered hero CTA ── */}
            <Stack align="center" ta="center" mb={72} gap="lg">
              <Badge size="lg" style={{ background:`${COLORS.tealBlue}12`, color:COLORS.tealBlue, border:`1px solid ${COLORS.tealBlue}30`, fontWeight:700, letterSpacing:'0.06em' }}>
                Ready?
              </Badge>

              <Text fw={900} c={COLORS.navyBlue}
                style={{ fontSize:'clamp(2rem,4.5vw,3.2rem)', letterSpacing:'-1.2px', lineHeight:1.08 }}>
                Start finding trusted pros{' '}
                <Text component="span" style={{ background:`linear-gradient(90deg,${COLORS.navyBlue},${COLORS.tealBlue})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  today.
                </Text>
              </Text>

              <Text size="md" c="dimmed" maw={480} lh={1.7}>
                Join thousands of clients and providers on ONE TOUCH Ethiopia — the fastest way to find verified professionals near you.
              </Text>

              <Button
                size="xl"
                rightSection={<IconArrowRight size={18} />}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.navyBlue}, ${COLORS.tealBlue})`,
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 17,
                  padding: '16px 44px',
                  borderRadius: 16,
                  border: 'none',
                  animation: 'btn-glow 3s ease-in-out infinite',
                  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform='translateY(-4px) scale(1.02)'; el.style.boxShadow=`0 16px 40px rgba(0,128,128,0.35)`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform=''; el.style.boxShadow=''; }}
                onClick={() => navigate(ROUTES.signup)}
              >
                Get Started Free
              </Button>
            </Stack>

            {/* ── Divider line ── */}
            <Box mx="auto" mb={64} style={{ width:120, height:2, borderRadius:2, background:`linear-gradient(90deg, transparent, ${COLORS.tealBlue}40, transparent)` }} />

            {/* ── PART 2: Two cards — Download + Call Center ── */}
            <SimpleGrid cols={{ base:1, sm:2 }} spacing={28}>

              {/* ── Download Our App ── */}
              <Paper
                p={{ base: 28, sm: 36 }}
                radius={20}
                className="feat-card"
                style={{
                  background: 'white',
                  border: '1.5px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 8px 40px rgba(0,0,128,0.08)',
                }}
              >
                <Group gap={12} mb="lg" align="center">
                  <Box style={{ width:44, height:44, borderRadius:14, background:`${COLORS.tealBlue}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <IconDeviceMobile size={22} color={COLORS.tealBlue} />
                  </Box>
                  <Box>
                    <Text fw={800} size="lg" c={COLORS.navyBlue} style={{ letterSpacing:'-0.4px' }}>Download Our App</Text>
                    <Text size="xs" c="dimmed">Available on Android & iOS</Text>
                  </Box>
                </Group>

                <Text size="sm" c="dimmed" lh={1.75} mb={24}>
                  Book services, track your provider in real-time, and manage payments — all from your phone.
                </Text>

                {/* Store badges side-by-side */}
                <Group gap={12} mb={16} wrap="wrap">
                  <Box component="a" href="#" className="store-badge"
                    style={{
                      flex:'1 1 140px',
                      display:'inline-flex',
                      alignItems:'center',
                      gap:10,
                      background: 'linear-gradient(90deg, #16a34a 0%, #06b6d4 100%)',
                      borderRadius:14,
                      padding:'12px 16px',
                      textDecoration:'none',
                      cursor:'pointer',
                      boxShadow:'0 8px 30px rgba(6, 182, 212, 0.12)',
                      color: 'white'
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 18px 40px rgba(6,182,212,0.18)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(6,182,212,0.12)'; }}
                  >
                    <IconBrandGooglePlay size={28} color="white" style={{ flexShrink:0 }} />
                    <Box>
                      <Text size="8px" c="rgba(255,255,255,0.85)" fw={600} style={{ textTransform:'uppercase', letterSpacing:'0.07em' }}>Get it on</Text>
                      <Text size="sm" fw={800} c="white" style={{ lineHeight:1.15 }}>Google Play</Text>
                    </Box>
                  </Box>

                  <Box component="a" href="#" className="store-badge"
                    style={{
                      flex:'1 1 140px',
                      display:'inline-flex',
                      alignItems:'center',
                      gap:10,
                      background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 100%)',
                      borderRadius:14,
                      padding:'12px 16px',
                      textDecoration:'none',
                      cursor:'pointer',
                      boxShadow:'0 8px 30px rgba(37,99,235,0.12)',
                      color: 'white',
                      transition: 'transform 180ms ease, box-shadow 180ms ease'
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 18px 40px rgba(124,58,237,0.18)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(37,99,235,0.12)'; }}
                  >
                    <IconBrandApple size={28} color="white" style={{ flexShrink:0 }} />
                    <Box>
                      <Text size="8px" c="rgba(255,255,255,0.95)" fw={600} style={{ textTransform:'uppercase', letterSpacing:'0.07em' }}>Download on the</Text>
                      <Text size="sm" fw={800} c="white" style={{ lineHeight:1.15 }}>App Store</Text>
                    </Box>
                  </Box>
                </Group>

                <Group gap={4} align="center">
                  <Group gap={1}>
                    {[1,2,3,4,5].map(s => <IconStar key={s} size={12} fill={COLORS.lemonYellow} color={COLORS.lemonYellow} />)}
                  </Group>
                  <Text size="xs" c="dimmed" fw={500}>4.8 · 2,000+ reviews</Text>
                </Group>
              </Paper>

              {/* ── Call Center ── */}
              <Paper
                p={{ base: 28, sm: 36 }}
                radius={20}
                className="feat-card"
                style={{
                  background: 'white',
                  border: '1.5px solid rgba(0,0,0,0.06)',
                  boxShadow: '0 8px 40px rgba(0,0,128,0.08)',
                }}
              >
                <Group gap={12} mb="lg" align="center">
                  <Box style={{ position:'relative', width:44, height:44, borderRadius:14, background:`${COLORS.navyBlue}10`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <IconHeadset size={22} color={COLORS.navyBlue} />
                    <Box style={{ position:'absolute', top:-2, right:-2, width:10, height:10, borderRadius:'50%', background:'#22c55e', border:'2px solid white', boxShadow:'0 0 6px #22c55e' }} />
                  </Box>
                  <Box>
                    <Text fw={800} size="lg" c={COLORS.navyBlue} style={{ letterSpacing:'-0.4px' }}>Call Center</Text>
                    <Text size="xs" c="dimmed">24/7 · English & Amharic</Text>
                  </Box>
                </Group>

                <Text size="sm" c="dimmed" lh={1.75} mb={24}>
                  Need help? Our agents handle bookings, disputes, and refunds. Or chat with our AI assistant for instant answers.
                </Text>

                {/* Phone number card */}
                <Box mb={20} p="md"
                  style={{ background:`linear-gradient(135deg,${COLORS.navyBlue},${COLORS.tealBlue})`, borderRadius:14 }}>
                  <Text size="xs" c="rgba(255,255,255,0.6)" fw={600} mb={4} style={{ textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    Support hotline
                  </Text>
                  <Group gap={10} align="center">
                    <IconPhone size={18} color={COLORS.lemonYellow} />
                    <Text fw={900} c="white" style={{ fontSize:'clamp(1.2rem,2.5vw,1.6rem)', letterSpacing:'-0.5px' }}>
                      1234
                    </Text>
                  </Group>
                  <Text size="xs" c="rgba(255,255,255,0.5)" mt={4}>Mon – Sun · 24hrs · Free in-app call</Text>
                </Box>

                {/* Action buttons row */}
                <Group gap={10} wrap="wrap">
                  <Button
                    size="sm"
                    leftSection={<IconPhone size={14} />}
                    style={{
                      flex:'1 1 auto',
                      background:`linear-gradient(135deg,${COLORS.tealBlue},#006b6b)`,
                      color:'white', fontWeight:700, border:'none', borderRadius:12,
                      transition:'transform 0.18s, box-shadow 0.18s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform='translateY(-2px)'; el.style.boxShadow='0 8px 24px rgba(0,128,128,0.35)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform=''; el.style.boxShadow=''; }}
                    onClick={() => navigate(ROUTES.signup)}
                  >
                    Call Now
                  </Button>
                  <Button
                    size="sm"
                    leftSection={<IconBolt size={14} />}
                    variant="outline"
                    style={{
                      flex:'1 1 auto',
                      color: COLORS.navyBlue, borderColor:`${COLORS.navyBlue}30`,
                      fontWeight:600, borderRadius:12, transition:'all 0.18s ease',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background=`${COLORS.navyBlue}07`; el.style.borderColor=`${COLORS.navyBlue}55`; el.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background=''; el.style.borderColor=`${COLORS.navyBlue}30`; el.style.transform=''; }}
                    onClick={() => navigate(ROUTES.aiBot)}
                  >
                    Chat with AI
                  </Button>
                </Group>
              </Paper>

            </SimpleGrid>
          </Container>
        </Box>

        {/* ── PREMIUM FOOTER ── */}
        <Box style={{
          background: `linear-gradient(135deg, #000080 0%, #004080 25%, #008080 50%, #004060 75%, #000080 100%)`,
          backgroundSize: '300% 300%',
          animation: 'gradientShift 10s ease infinite',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Decorative blobs */}
          <Box style={{ position:'absolute', top:-80, left:-80, width:320, height:320, borderRadius:'50%', background:`radial-gradient(circle, ${COLORS.tealBlue}08 0%, transparent 70%)`, pointerEvents:'none' }} />
          <Box style={{ position:'absolute', bottom:-60, right:-60, width:280, height:280, borderRadius:'50%', background:`radial-gradient(circle, ${COLORS.navyBlue}06 0%, transparent 70%)`, pointerEvents:'none' }} />

          {/* Accent top border */}
          <Box style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${COLORS.navyBlue} 0%, ${COLORS.tealBlue} 50%, ${COLORS.navyBlue} 100%)`, opacity:0.25 }} />

          {/* ── UPPER FOOTER ── */}
          <Container size="lg" style={{ position:'relative', zIndex:1, paddingTop:64, paddingBottom:48 }}>
            <SimpleGrid cols={{ base:1, sm:2, md:4 }} spacing={40}>

              {/* Brand Column */}
              <Box>
                <Group gap={10} mb={16}>
                  <Box style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg,${COLORS.navyBlue},${COLORS.tealBlue})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${COLORS.tealBlue}30` }}>
                    <IconShieldCheck size={20} color="white" stroke={2.2} />
                  </Box>
                  <Text fw={900} size="lg" c={COLORS.navyBlue} style={{ letterSpacing:'-0.4px' }}>ONE TOUCH</Text>
                </Group>
                <Text size="sm" c="#6B7280" lh={1.8} mb={24}>
                  Connecting you with trusted local service providers — fast, safe & transparent.
                </Text>
                {/* App store mini badges */}
                <Stack gap={8}>
                  <Box
                    onClick={() => {}}
                    style={{ display:'flex', alignItems:'center', gap:8, background:'white', border:`1.5px solid #E5E7EB`, borderRadius:10, padding:'8px 14px', cursor:'pointer', transition:'all 0.2s', width:'fit-content', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=COLORS.tealBlue; (e.currentTarget as HTMLElement).style.boxShadow=`0 4px 12px ${COLORS.tealBlue}20`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#E5E7EB'; (e.currentTarget as HTMLElement).style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; }}
                  >
                    <IconBrandGooglePlay size={16} color="#16a34a" />
                    <Box><Text size="9px" c="#9CA3AF" lh={1}>GET IT ON</Text><Text size="xs" c={COLORS.navyBlue} fw={700} lh={1.2}>Google Play</Text></Box>
                  </Box>
                  <Box
                    onClick={() => {}}
                    style={{ display:'flex', alignItems:'center', gap:8, background:'white', border:`1.5px solid #E5E7EB`, borderRadius:10, padding:'8px 14px', cursor:'pointer', transition:'all 0.2s', width:'fit-content', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor=COLORS.tealBlue; (e.currentTarget as HTMLElement).style.boxShadow=`0 4px 12px ${COLORS.tealBlue}20`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#E5E7EB'; (e.currentTarget as HTMLElement).style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; }}
                  >
                    <IconBrandApple size={16} color={COLORS.navyBlue} />
                    <Box><Text size="9px" c="#9CA3AF" lh={1}>DOWNLOAD ON THE</Text><Text size="xs" c={COLORS.navyBlue} fw={700} lh={1.2}>App Store</Text></Box>
                  </Box>
                </Stack>
              </Box>

              {/* Product Column */}
              <Box>
                <Text fw={700} size="xs" c={COLORS.tealBlue} mb={16} style={{ textTransform:'uppercase', letterSpacing:'0.12em' }}>Product</Text>
                <Stack gap={10}>
                  {[
                    { label: 'Browse Services', path: ROUTES.services },
                    { label: 'How It Works', path: ROUTES.howItWorks },
                    { label: 'Become a Provider', path: ROUTES.signup },
                    { label: 'Dashboard', path: ROUTES.dashboard },
                  ].map(link => (
                    <Text key={link.label} size="sm" c="#6B7280" fw={500}
                      onClick={() => navigate(link.path)}
                      style={{ cursor:'pointer', transition:'all 0.18s', display:'inline-flex', alignItems:'center', gap:4, width:'fit-content' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color=COLORS.navyBlue; el.style.paddingLeft='4px'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color='#6B7280'; el.style.paddingLeft='0'; }}
                    >{link.label}</Text>
                  ))}
                </Stack>
              </Box>

              {/* Company Column */}
              <Box>
                <Text fw={700} size="xs" c={COLORS.tealBlue} mb={16} style={{ textTransform:'uppercase', letterSpacing:'0.12em' }}>Company</Text>
                <Stack gap={10}>
                  {[
                    { label: 'About Us', path: ROUTES.about },
                    { label: 'Help Center', path: ROUTES.helpCenter },
                    { label: 'Contact & Support', path: ROUTES.support },
                    { label: 'AI Help Bot', path: ROUTES.aiBot },
                  ].map(link => (
                    <Text key={link.label} size="sm" c="#6B7280" fw={500}
                      onClick={() => navigate(link.path)}
                      style={{ cursor:'pointer', transition:'all 0.18s', display:'inline-flex', alignItems:'center', gap:4, width:'fit-content' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color=COLORS.navyBlue; el.style.paddingLeft='4px'; }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color='#6B7280'; el.style.paddingLeft='0'; }}
                    >{link.label}</Text>
                  ))}
                </Stack>
              </Box>

              {/* Contact + Legal Column */}
              <Box>
                <Text fw={700} size="xs" c={COLORS.tealBlue} mb={16} style={{ textTransform:'uppercase', letterSpacing:'0.12em' }}>Contact</Text>
                <Stack gap={10} mb={28}>
                  <Group gap={8}>
                    <IconPhone size={14} color={COLORS.tealBlue} />
                    <Text size="sm" c={COLORS.navyBlue} fw={700}>1234</Text>
                  </Group>
                  <Text size="sm" c="#6B7280" lh={1.6}>Mon – Sun · 24 hrs<br />English & Amharic</Text>
                </Stack>
                <Text fw={700} size="xs" c={COLORS.tealBlue} mb={12} style={{ textTransform:'uppercase', letterSpacing:'0.12em' }}>Legal</Text>
                <Stack gap={8}>
                  {[
                    { label: 'Privacy Policy', path: ROUTES.privacyPolicy },
                    { label: 'Terms of Service', path: ROUTES.termsOfService },
                  ].map(link => (
                    <Text key={link.label} size="sm" c="#6B7280" fw={500}
                      onClick={() => navigate(link.path)}
                      style={{ cursor:'pointer', transition:'all 0.18s', width:'fit-content' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color=COLORS.navyBlue; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='#6B7280'; }}
                    >{link.label}</Text>
                  ))}
                </Stack>
              </Box>

            </SimpleGrid>
          </Container>

          {/* ── BOTTOM BAR ── */}
          <Box style={{ borderTop:'1px solid #E5E7EB', background:'#E8EDF2' }}>
            <Container size="lg" style={{ position:'relative', zIndex:1 }}>
              <Group justify="space-between" align="center" wrap="wrap" gap="md" py={20}>
                <Text size="xs" c="#9CA3AF">
                  © 2026 <Text component="span" c={COLORS.navyBlue} fw={600}>ONE TOUCH Ethiopia</Text> · All rights reserved.
                </Text>
                <Group gap={6}>
                  <Box style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e' }} />
                  <Text size="xs" c="#9CA3AF">All systems operational · Made with ♥ in Addis Ababa</Text>
                </Group>
              </Group>
            </Container>
          </Box>

        </Box>

        <AIHelpCenter />
      </Box>
    </>
  );
}
