import {
  Box, Button, Container, Group, Stack, Text, ThemeIcon,
  SimpleGrid, Badge, Divider, Paper,
} from '@mantine/core';
import {
  IconShieldCheck, IconBolt, IconMapPin, IconWallet,
  IconStar, IconArrowRight, IconCar, IconSparkles,
  IconDroplets, IconTruck, IconHeart, IconSchool, IconDeviceLaptop,
  IconPhone,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
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
.afu1 { animation: fadeUp   0.7s 0.05s ease both; }
.afu2 { animation: fadeUp   0.7s 0.15s ease both; }
.afu3 { animation: fadeUp   0.7s 0.25s ease both; }
.afu4 { animation: fadeUp   0.7s 0.38s ease both; }
.afl  { animation: fadeLeft 0.7s 0.1s  ease both; }
.afr  { animation: fadeRight 0.7s 0.2s ease both; }
.float{ animation: floatY 4s ease-in-out infinite; }

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

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Box style={{ minHeight:'100vh', background:'#FFFFFF', position:'relative', overflow:'hidden' }}>

        {/* ── Decorative blobs (light, on white) ── */}
        <Box style={{ position:'absolute',top:-200,right:-180,width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,0,137,0.05) 0%,transparent 70%)',pointerEvents:'none' }} />
        <Box style={{ position:'absolute',top:300,left:-200,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,128,128,0.06) 0%,transparent 70%)',pointerEvents:'none' }} />
        <Box style={{ position:'absolute',bottom:200,right:-100,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(245,230,66,0.10) 0%,transparent 70%)',pointerEvents:'none' }} />

        {/* ── NAV ── */}
        <Box px={{ base:'lg',sm:'xl' }} py="md"
          style={{ position:'sticky',top:0,zIndex:200,background:'rgba(255,255,255,0.88)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',borderBottom:'1px solid rgba(0,0,137,0.08)',boxShadow:'0 2px 16px rgba(0,0,137,0.05)' }}>
          <Group justify="space-between" maw={1140} mx="auto">
            {/* Logo */}
            <Group gap="xs" style={{ cursor:'pointer' }} onClick={() => navigate(ROUTES.landing)}>
              <Box style={{ width:38,height:38,borderRadius:11,background:`linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(0,0,137,0.25)' }}>
                <IconShieldCheck size={20} color="white" stroke={2.5} />
              </Box>
              <Text fw={800} size="lg" style={{ color:COLORS.navyBlue,letterSpacing:'-0.3px' }}>ONE TOUCH</Text>
            </Group>
            {/* Centered nav links */}
            <Group gap="lg" align="center">
              {[
                { label:'Browse Services', path:ROUTES.services },
                { label:'How It Works', path:ROUTES.howItWorks },
                { label:'About', path:ROUTES.about }
              ].map(link => (
                <Text key={link.label} size="sm" fw={600} c={COLORS.navyBlue} className="nav-link"
                  onClick={() => navigate(link.path)}>
                  {link.label}
                </Text>
              ))}
            </Group>
            {/* Right side: language, login, signup */}
            <Group gap="lg" align="center">
              <Box style={{ minWidth: 60 }}>
                <LanguageSwitcher />
              </Box>
              <Button variant="subtle" size="sm" style={{ color:COLORS.navyBlue,fontWeight:600 }} onClick={() => navigate(ROUTES.login)}>Login</Button>
              <Button className="btn-teal" size="sm" style={{ color:'white',fontWeight:700 }} onClick={() => navigate(ROUTES.signup)}>Sign Up</Button>
            </Group>
          </Group>
        </Box>

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
                {[['10,000+','Happy Users'],['4.8★','Avg Rating'],['98%','Satisfaction']].map(([v,l]) => (
                  <Box key={l}>
                    <Text fw={900} size="xl" style={{ color:COLORS.navyBlue }}>{v}</Text>
                    <Text size="xs" c="dimmed" fw={500}>{l}</Text>
                  </Box>
                ))}
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
                          <Button size="xs" mt={4} className="btn-teal" style={{ color:'white',fontSize:11 }}>Call</Button>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                </Stack>

                <Box mt="md" p="xs" style={{ background:`linear-gradient(135deg,${COLORS.navyBlue}08,${COLORS.tealBlue}08)`,borderRadius:10,textAlign:'center' }}>
                  <Text size="xs" c={COLORS.tealBlue} fw={600}>{'📍'} Bole, Addis Ababa · 12 providers online</Text>
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
        <Box style={{ background:`linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)` }} py="lg">
          <Container size="lg">
            <SimpleGrid cols={{ base:2,sm:4 }}>
              {STATS.map(s => (
                <Box key={s.label} ta="center" py="sm">
                  <Text fw={900} size="2xl" c="white">{s.value}</Text>
                  <Text size="sm" c="rgba(255,255,255,0.65)" fw={500}>{s.label}</Text>
                </Box>
              ))}
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
                onClick={() => navigate(ROUTES.services)}>
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

        {/* ── CTA BAND ── */}
        <Box mx={{ base:'md',sm:'xl' }} mb={80}>
          <Container size="lg">
            <Box p={{ base:40,sm:60 }} style={{ background:`linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,borderRadius:28,position:'relative',overflow:'hidden',textAlign:'center' }}>
              <Box style={{ position:'absolute',top:-60,right:-60,width:240,height:240,borderRadius:'50%',background:'rgba(255,255,255,0.05)',pointerEvents:'none' }} />
              <Box style={{ position:'absolute',bottom:-80,left:-40,width:280,height:280,borderRadius:'50%',background:'rgba(245,230,66,0.06)',pointerEvents:'none' }} />
              <Text fw={900} size="3xl" c="white" mb="sm" style={{ letterSpacing:'-0.5px',position:'relative' }}>
                Ready to get started?
              </Text>
              <Text c="rgba(255,255,255,0.65)" mb="xl" size="md" style={{ position:'relative' }}>
                Join thousands of clients and providers on ONE TOUCH Ethiopia.
              </Text>
              <Group justify="center" gap="md" wrap="wrap" style={{ position:'relative' }}>
                <Button size="xl"
                  style={{ background:COLORS.lemonYellow,color:COLORS.navyBlue,fontWeight:800,padding:'14px 40px',transition:'transform 0.18s,box-shadow 0.18s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 10px 28px rgba(245,230,66,0.5)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow=''; }}
                  onClick={() => navigate(ROUTES.signup)}>Sign Up as Client</Button>
                <Button size="xl" variant="outline"
                  style={{ borderColor:'rgba(255,255,255,0.45)',color:'white',fontWeight:700,padding:'14px 40px',transition:'background 0.18s,transform 0.18s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background=''; (e.currentTarget as HTMLElement).style.transform=''; }}
                  onClick={() => navigate(ROUTES.signup)}>Join as Provider</Button>
              </Group>
            </Box>
          </Container>
        </Box>

        {/* ── FOOTER ── */}
        <Box py="xl" px={{ base:'md',sm:'xl' }} style={{ background:COLORS.navyBlue, borderTop:'none' }}>
          <Container size="lg">
            <Group justify="space-between" wrap="wrap" gap="md" mb="md">
              <Group gap="xs">
                <Box style={{ width:32,height:32,borderRadius:10,background:COLORS.lemonYellow,display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <IconShieldCheck size={16} color={COLORS.navyBlue} />
                </Box>
                <Text fw={800} c="white">ONE TOUCH</Text>
              </Group>
              <Group gap="xl" wrap="wrap">
                {['About','Privacy','Terms','Support'].map(link => (
                  <Text key={link} size="sm" c="rgba(255,255,255,0.45)"
                    style={{ cursor:'pointer',transition:'color 0.18s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color='white')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.45)')}>
                    {link}
                  </Text>
                ))}
              </Group>
            </Group>
            <Divider color="rgba(255,255,255,0.08)" mb="md" />
            <Text size="xs" c="rgba(255,255,255,0.25)" ta="center">{'\u00A9'} 2026 ONE TOUCH Ethiopia. All rights reserved.</Text>
          </Container>
        </Box>

        <AIHelpCenter />
      </Box>
    </>
  );
}
