/**
 * ProviderHome.tsx — Provider dashboard
 * Live map · Online/Offline toggle · Incoming requests · Accept → Chapa → Reveal phone
 */
import { useState, useEffect } from 'react';
import {
  Box, Text, Group, Stack, Badge, Button, Paper, ThemeIcon, Switch,
  ActionIcon, Avatar, Divider, SimpleGrid, Modal, ScrollArea,
} from '@mantine/core';
import {
  IconBriefcase, IconTrendingUp, IconUser, IconWallet,
  IconBell, IconBellFilled, IconMenu2, IconX, IconLogout,
  IconCheck, IconClock, IconMapPin, IconCircleFilled, IconGift,
  IconShieldCheck, IconCurrencyDollar, IconTool, IconPhoneCall, IconRadar, IconStar,
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { useJobStore, useNotificationStore } from '../store/jobStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { COLORS, ROUTES, CURRENCY_SYMBOL } from '../utils/constants';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import { LOYALTY_CONFIG } from '../mock/mockLoyalty';
import { ChapaModal } from '../components/ChapaModal';
import type { ProviderProfile } from '../types';

// Fix Leaflet icons
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl:        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl:      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
} catch (_) { /* already patched */ }

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;
const FREE_TRIAL_TOTAL = 3;
const TRIAL_KEY        = 'ot_prov_trials';
const MAP_CTR: [number, number] = [9.032, 38.747];

function getTrials(uid: string) {
  return (storage.get<Record<string, number>>(TRIAL_KEY, {}))[uid] ?? FREE_TRIAL_TOTAL;
}
function saveTrials(uid: string, n: number) {
  const m = storage.get<Record<string, number>>(TRIAL_KEY, {});
  m[uid] = n;
  storage.set(TRIAL_KEY, m);
}

const jitter = (): [number, number] =>
  [MAP_CTR[0] + (Math.random() - 0.5) * 0.04, MAP_CTR[1] + (Math.random() - 0.5) * 0.04];

interface Req {
  id: string; clientName: string; clientId: string;
  catId: string; desc: string; addr: string;
  price: number; dist: number; coords: [number, number]; at: string;
}

const DEMO: Req[] = [
  { id:'r1', clientName:'Alex J.',  clientId:'client-001', catId:'cat-001',
    desc:"Engine light on — car won't start reliably.",
    addr:'Bole Road, Addis Ababa', price:280, dist:1.4, coords:jitter(),
    at: new Date(Date.now()-3*60000).toISOString() },
  { id:'r2', clientName:'Sara M.',  clientId:'client-002', catId:'cat-002',
    desc:'Deep-clean 3-bed flat before move-out.',
    addr:'Kazanchis, Addis Ababa', price:140, dist:2.1, coords:jitter(),
    at: new Date(Date.now()-8*60000).toISOString() },
  { id:'r3', clientName:'Yared T.', clientId:'client-001', catId:'cat-003',
    desc:'Kitchen sink leaking beneath the cabinet.',
    addr:'Piazza, Addis Ababa', price:95, dist:3.2, coords:jitter(),
    at: new Date(Date.now()-14*60000).toISOString() },
];

const ago = (iso: string) => {
  const m = Math.floor((Date.now()-new Date(iso).getTime())/60000);
  return m<1?'Just now':m<60?`${m}m ago`:`${Math.floor(m/60)}h ago`;
};
const catName  = (id: string) => MOCK_CATEGORIES.find(c=>c.id===id)?.name ?? 'Service';
const catColor = (id: string) => MOCK_CATEGORIES.find(c=>c.id===id)?.color ?? T;

function dot(color: string) {
  return L.divIcon({
    className:'',
    html:`<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconAnchor:[9,9],
  });
}

function PulseRings({ctr, on}: {ctr:[number,number]; on:boolean}) {
  const [r, setR] = useState(400);
  useEffect(()=>{
    if (!on) return;
    const id = setInterval(()=>setR(p=>(p>=2400?400:p+60)), 90);
    return ()=>clearInterval(id);
  },[on]);
  if (!on) return null;
  return (
    <>
      <Circle center={ctr} radius={r}   pathOptions={{color:T,fillOpacity:0.04,weight:1.5,opacity:0.55}}/>
      <Circle center={ctr} radius={r*.5} pathOptions={{color:N,fillOpacity:0.02,weight:1,  opacity:0.35}}/>
    </>
  );
}

const NAV = [
  {label:'Home',       icon:<IconCircleFilled size={16}/>, r:ROUTES.providerDashboard},
  {label:'Active Jobs',icon:<IconBriefcase    size={16}/>, r:ROUTES.providerJobs},
  {label:'Earnings',   icon:<IconTrendingUp   size={16}/>, r:ROUTES.providerEarnings},
  {label:'Profile',    icon:<IconUser         size={16}/>, r:ROUTES.providerProfile},
  {label:'Wallet',     icon:<IconWallet       size={16}/>, r:ROUTES.providerWallet},
];

export function ProviderHome() {
  const nav = useNavigate();
  const {currentUser, providerProfile:authProf, updateProviderOnlineStatus, logout} = useAuthStore();
  const {jobs} = useJobStore();
  const {unreadCount, fetchNotifications, addNotification} = useNotificationStore();

  const [profile,   setProfile]   = useState<ProviderProfile|null>(authProf);
  const [online,    setOnline]    = useState(authProf?.isOnline ?? false);
  const [sidebar,   setSidebar]   = useState(false);
  const [trials,    setTrials]    = useState(FREE_TRIAL_TOTAL);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [chapaOpen, setChapaOpen] = useState(false);
  const [pending,   setPending]   = useState<Req|null>(null);
  const [revOpen,   setRevOpen]   = useState(false);
  const [revealed,  setRevealed]  = useState<{req:Req;phone:string}|null>(null);

  const tier     = profile?.loyaltyTier ?? 'rising_pro';
  const tierInfo = LOYALTY_CONFIG.providerTiers.find(t=>t.tier===tier);
  const commPct  = 10-(tierInfo?.commissionDiscount??0);
  const mapCtr: [number,number] = (profile?.lat&&profile?.lng) ? [profile.lat,profile.lng] : MAP_CTR;

  useEffect(()=>{
    if (!currentUser) { nav(ROUTES.login); return; }
    const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    const p = profiles.find(x=>x.userId===currentUser.id);
    if (p) { setProfile(p); setOnline(p.isOnline); }
    setTrials(getTrials(currentUser.id));
    fetchNotifications(currentUser.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentUser?.id]);

  const visible   = DEMO.filter(r=>!dismissed.has(r.id)&&online);
  const myJobs    = jobs.filter(j=>j.providerId===currentUser?.id);
  const done      = myJobs.filter(j=>j.status==='completed');
  const todayEarn = done
    .filter(j=>j.completedAt&&new Date(j.completedAt).toDateString()===new Date().toDateString())
    .reduce((s,j)=>s+(j.netProviderEarning??0),0);
  const totalEarn = done.reduce((s,j)=>s+(j.netProviderEarning??0),0);

  function toggle(v:boolean) {
    setOnline(v); updateProviderOnlineStatus(v);
    notifications.show({title:v?'You are Online':'You are Offline',
      message:v?'Receiving job requests.':'Not receiving requests.',color:v?'teal':'gray'});
  }

  function accept(req:Req) {
    if (trials>0) { const n=trials-1; setTrials(n); if(currentUser) saveTrials(currentUser.id,n); finalize(req); }
    else { setPending(req); setChapaOpen(true); }
  }

  function finalize(req:Req) {
    setDismissed(s=>new Set([...s,req.id]));
    const all = storage.get<any[]>(STORAGE_KEYS.users,[]);
    const cl  = all.find(u=>u.id===req.clientId)??all.find(u=>u.role==='client');
    const ph  = cl?.phone??'+251-912-345-678';
    setRevealed({req,phone:ph}); setRevOpen(true);
    addNotification({id:`n-${Date.now()}`,userId:req.clientId,type:'job_update' as any,
      title:'Provider Confirmed!',message:`Provider accepted your ${catName(req.catId)} request.`,
      isRead:false,createdAt:new Date().toISOString()});
  }

  function decline(id:string) {
    setDismissed(s=>new Set([...s,id]));
    notifications.show({title:'Request declined',message:'Passed to next provider.',color:'gray'});
  }

  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <Box style={{minHeight:'100vh',background:'var(--ot-bg-page)'}}>

      {/* Sidebar backdrop */}
      {sidebar&&<Box onClick={()=>setSidebar(false)}
        style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:399}}/>}

      {/* Sidebar */}
      <Box style={{position:'fixed',top:0,left:0,bottom:0,width:260,zIndex:400,
        background:'var(--ot-bg-card)',borderRight:'1px solid var(--ot-border)',
        transform:sidebar?'translateX(0)':'translateX(-260px)',
        transition:'transform 0.26s cubic-bezier(0.22,1,0.36,1)',
        display:'flex',flexDirection:'column'}}>
        <Box p="lg" style={{borderBottom:'1px solid var(--ot-border)'}}>
          <Group justify="space-between">
            <Group gap={8}>
              <Box w={32} h={32} style={{borderRadius:9,background:N,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Text fw={900} size="11px" c="white">OT</Text>
              </Box>
              <Text fw={800} size="sm" c={N}>OneTouch</Text>
            </Group>
            <ActionIcon variant="subtle" onClick={()=>setSidebar(false)}><IconX size={18}/></ActionIcon>
          </Group>
        </Box>
        <Box p="md">
          <Group gap={10}>
            <Avatar radius="xl" size="md" color="blue">{profile?.fullName?.charAt(0)?.charAt(0) ?? 'P'}</Avatar>
            <Box>
              <Text size="sm" fw={700} lineClamp={1}>{profile?.fullName??currentUser?.email??'Provider'}</Text>
              <Group gap={6}>
                <Badge size="xs" variant="light" color="blue">{tierInfo?.label??'Rising Pro'}</Badge>
                <Box w={7} h={7} style={{borderRadius:'50%',background:online?COLORS.success:'#aaa'}}/>
                <Text size="10px" c={online?COLORS.success:'dimmed'} fw={600}>{online?'Online':'Offline'}</Text>
              </Group>
            </Box>
          </Group>
        </Box>
        <Divider/>
        <Stack gap={2} p="sm" style={{flex:1}}>
          {NAV.map(n=>(
            <Box key={n.label} p={10}
              style={{borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',gap:10,
                fontWeight:600,fontSize:14,color:'var(--ot-text-body)'}}
              onClick={()=>{nav(n.r);setSidebar(false);}}>
              {n.icon} {n.label}
            </Box>
          ))}
        </Stack>
        <Box p="md" style={{borderTop:'1px solid var(--ot-border)'}}>
          <Box p={10} style={{borderRadius:10,cursor:'pointer',display:'flex',alignItems:'center',
            gap:10,color:COLORS.error}} onClick={()=>{logout();nav(ROUTES.login);}}>
            <IconLogout size={18}/> Sign out
          </Box>
        </Box>
      </Box>

      {/* Header */}
      <Box style={{position:'sticky',top:0,zIndex:200,background:'var(--ot-bg-card)',
        borderBottom:'1px solid var(--ot-border)'}}>
        <Box px={20} py={12} style={{maxWidth:1100,margin:'0 auto'}}>
          <Group justify="space-between">
            <Group gap={12}>
              <ActionIcon variant="subtle" size="lg" onClick={()=>setSidebar(true)}><IconMenu2 size={22}/></ActionIcon>
              <Group gap={8}>
                <Box w={32} h={32} style={{borderRadius:9,background:N,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Text fw={900} size="11px" c="white">OT</Text>
                </Box>
                <Text fw={800} size="sm" c={N} visibleFrom="sm">Provider Dashboard</Text>
              </Group>
            </Group>
            <Group gap={12}>
              <Group gap={6} px={12} py={5}
                style={{borderRadius:20,background:online?`${T}15`:'var(--ot-bg-row)',
                border:`1px solid ${online?T:'var(--ot-border)'}`,transition:'all 0.3s'}}>
                <Box w={8} h={8} style={{borderRadius:'50%',background:online?COLORS.success:'#aaa',
                  boxShadow:online?`0 0 0 3px ${COLORS.success}44`:'none',transition:'all 0.3s'}}/>
                <Text size="xs" fw={700} c={online?T:'dimmed'}>{online?'Online':'Offline'}</Text>
                <Switch checked={online} onChange={e=>toggle(e.currentTarget.checked)} size="sm" color="teal"/>
              </Group>
              <ActionIcon variant="subtle" size="lg" style={{position:'relative'}}>
                {unreadCount>0?<IconBellFilled size={22} color={T}/>:<IconBell size={22}/>}
                {unreadCount>0&&<Box style={{position:'absolute',top:2,right:2,width:14,height:14,
                  borderRadius:'50%',background:COLORS.error,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Text size="8px" c="white" fw={700}>{unreadCount}</Text></Box>}
              </ActionIcon>
              <Avatar radius="xl" size="sm" color="blue" style={{cursor:'pointer'}} onClick={()=>setSidebar(true)}>
                {profile?.fullName?.charAt(0)?.charAt(0) ?? 'P'}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>

      {/* Body */}
      <Box style={{maxWidth:1100,margin:'0 auto',padding:'24px 16px 64px'}}>

        {/* Online hero */}
        <Paper mb={20} p="lg" radius="xl"
          style={{background:online?`linear-gradient(135deg,${N}f0,${T}e0)`:'var(--ot-bg-card)',
            border:online?'none':'2px solid var(--ot-border)',transition:'background 0.5s'}}>
          <Group justify="space-between" align="center">
            <Box>
              <Group gap={10} mb={6}>
                <Box w={12} h={12} style={{borderRadius:'50%',background:online?'#2ECC71':'#888',
                  boxShadow:online?'0 0 0 4px rgba(46,204,113,.35)':'none',transition:'all .35s'}}/>
                <Text fw={800} size="md" c={online?'white':'var(--ot-text-navy)'}>
                  {online?'You are Online':'You are Offline'}
                </Text>
              </Group>
              <Text size="sm" c={online?'rgba(255,255,255,.75)':'var(--ot-text-sub)'} mb={online?12:0}>
                {online?'Receiving job requests near you.':'Toggle to start receiving requests.'}
              </Text>
              {online&&(
                <Group gap={8}>
                  <Badge variant="light" color="yellow" size="sm" leftSection={<IconRadar size={10}/>}>Scanning</Badge>
                  {visible.length>0&&<Badge variant="filled" color="red" size="sm">
                    {visible.length} new{visible.length!==1?'s':''}
                  </Badge>}
                </Group>
              )}
            </Box>
            <Switch checked={online} onChange={e=>toggle(e.currentTarget.checked)}
              size="xl" color="teal" onLabel="ON" offLabel="OFF"
              styles={{track:{cursor:'pointer'}}}/>
          </Group>
        </Paper>

        {/* Stats */}
        <SimpleGrid cols={{base:2,sm:4}} spacing={12} mb={20}>
          {[
            {label:"Today's Earnings",value:`${CURRENCY_SYMBOL} ${todayEarn.toFixed(0)}`,icon:<IconCurrencyDollar size={18}/>,c:COLORS.success},
            {label:'Total Earned',    value:`${CURRENCY_SYMBOL} ${totalEarn.toFixed(0)}`,icon:<IconTrendingUp size={18}/>,   c:N},
            {label:'Rating',          value:`${(profile?.rating??0).toFixed(1)} \u2605`,  icon:<IconStar size={18}/>,         c:COLORS.warning},
            {label:'Jobs Done',       value:`${profile?.totalJobsCompleted??done.length}`,icon:<IconCheck size={18}/>,        c:T},
          ].map(s=>(
            <Paper key={s.label} p="md" radius="xl"
              style={{background:'var(--ot-bg-card)',border:'1px solid var(--ot-border)'}}>
              <Box style={{color:s.c,marginBottom:4}}>{s.icon}</Box>
              <Text fw={800} size="lg" c={s.c}>{s.value}</Text>
              <Text size="xs" c="var(--ot-text-muted)">{s.label}</Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Free trial */}
        <Paper mb={20} p="md" radius="xl"
          style={{background:'var(--ot-bg-card)',border:`2px solid ${trials>0?T:COLORS.error}44`}}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap={10}>
              <ThemeIcon size={40} radius="xl" variant="light" color={trials>0?'teal':'red'}>
                <IconGift size={18}/>
              </ThemeIcon>
              <Box>
                <Text fw={700} size="sm">Free Trial Accepts</Text>
                <Text size="xs" c="var(--ot-text-sub)">
                  {trials>0?`${trials} zero-commission accept${trials!==1?'s':''} left`:`${commPct}% Chapa commission per accept`}
                </Text>
              </Box>
            </Group>
            <Badge size="xl" variant="filled" color={trials>0?'teal':'red'}
              style={{fontWeight:900,fontSize:16,minWidth:48}}>
              {trials}/{FREE_TRIAL_TOTAL}
            </Badge>
          </Group>
        </Paper>

        {/* Map + Requests */}
        <SimpleGrid cols={{base:1,md:2}} spacing={20}>

          {/* Map */}
          <Paper radius="xl" style={{overflow:'hidden',border:'1px solid var(--ot-border)',position:'relative'}}>
            <MapContainer center={mapCtr} zoom={14} style={{width:'100%',height:420}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"/>
              <Marker position={mapCtr} icon={dot(N)}>
                <Popup><Text size="sm" fw={600}>{profile?.fullName??'You'} — {online?'Online':'Offline'}</Text></Popup>
              </Marker>
              <PulseRings ctr={mapCtr} on={online}/>
              {visible.map(r=>(
                <Marker key={r.id} position={r.coords} icon={dot(COLORS.warning)}>
                  <Popup>
                    <Stack gap={6}>
                      <Text size="sm" fw={700}>{catName(r.catId)}</Text>
                      <Text size="xs">{r.desc}</Text>
                      <Text size="xs" c="dimmed">{r.addr}</Text>
                      <Button mt={4} size="xs" color="teal" onClick={()=>accept(r)}>Accept</Button>
                    </Stack>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <Box style={{position:'absolute',bottom:12,left:12,zIndex:1000,
              background:'rgba(255,255,255,.95)',borderRadius:10,padding:'8px 12px',
              boxShadow:'0 2px 10px rgba(0,0,0,.12)'}}>
              <Stack gap={5}>
                <Group gap={8}><Box w={10} h={10} style={{borderRadius:'50%',background:N,border:'2px solid white'}}/><Text size="xs" fw={600}>You</Text></Group>
                <Group gap={8}><Box w={10} h={10} style={{borderRadius:'50%',background:COLORS.warning,border:'2px solid white'}}/><Text size="xs" fw={600}>Job request</Text></Group>
              </Stack>
            </Box>
            {!online&&(
              <Box style={{position:'absolute',inset:0,zIndex:600,background:'rgba(0,0,0,.55)',
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
                <Text fw={800} size="lg" c="white">Go Online to See Requests</Text>
                <Button size="sm" style={{background:T}} onClick={()=>toggle(true)}>Go Online</Button>
              </Box>
            )}
          </Paper>

          {/* Request list */}
          <Box>
            <Group justify="space-between" mb={14}>
              <Text fw={800} size="sm" c={N}>Incoming Requests</Text>
              {visible.length>0&&<Badge color="red" variant="filled" size="xs">{visible.length} new</Badge>}
            </Group>

            {!online?(
              <Paper p="xl" radius="xl" style={{background:'var(--ot-bg-card)',border:'2px dashed var(--ot-border)',textAlign:'center'}}>
                <Stack align="center" gap={10}>
                  <Text style={{fontSize:44}}>📡</Text>
                  <Text size="sm" c="var(--ot-text-sub)">Go online to see requests</Text>
                  <Button size="xs" variant="light" color="teal" onClick={()=>toggle(true)}>Go Online</Button>
                </Stack>
              </Paper>
            ):visible.length===0?(
              <Paper p="xl" radius="xl" style={{background:'var(--ot-bg-card)',border:'1px solid var(--ot-border)',textAlign:'center'}}>
                <Stack align="center" gap={10}>
                  <Text style={{fontSize:44}}>🔍</Text>
                  <Text size="sm" c="var(--ot-text-sub)">Scanning for new requests…</Text>
                </Stack>
              </Paper>
            ):(
              <ScrollArea.Autosize mah={440} scrollbarSize={4}>
                <Stack gap={12}>
                  {visible.map(req=>{
                    const isFree=trials>0;
                    const comm=req.price*commPct/100;
                    const youGet=req.price-(isFree?0:comm);
                    return (
                      <Paper key={req.id} p="md" radius="xl"
                        style={{background:'var(--ot-bg-card)',border:`2px solid ${COLORS.warning}55`,
                          position:'relative',overflow:'hidden'}}>
                        <Box style={{position:'absolute',top:0,left:0,width:4,height:'100%',
                          background:COLORS.warning,borderRadius:'4px 0 0 4px'}}/>
                        <Stack gap={10} pl={8}>
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap={10} wrap="nowrap">
                              <Box style={{width:42,height:42,borderRadius:12,flexShrink:0,
                                background:`${catColor(req.catId)}20`,display:'flex',
                                alignItems:'center',justifyContent:'center',color:catColor(req.catId)}}>
                                <IconTool size={20}/>
                              </Box>
                              <Box>
                                <Text size="sm" fw={700}>{catName(req.catId)}</Text>
                                <Text size="xs" c="var(--ot-text-sub)" lineClamp={1}>{req.desc}</Text>
                              </Box>
                            </Group>
                            <Badge color="yellow" variant="light" size="xs">New</Badge>
                          </Group>
                          <Group gap={14}>
                            <Group gap={4}><IconMapPin size={11}/><Text size="xs" c="var(--ot-text-muted)">{req.dist} km</Text></Group>
                            <Group gap={4}><IconClock   size={11}/><Text size="xs" c="var(--ot-text-muted)">{ago(req.at)}</Text></Group>
                          </Group>
                          <Group gap={4} py={8} px={12} style={{background:'var(--ot-bg-row)',borderRadius:10}}>
                            <Box style={{flex:1,textAlign:'center'}}>
                              <Text size="10px" c="var(--ot-text-muted)">Job</Text>
                              <Text size="xs" fw={700}>{CURRENCY_SYMBOL} {req.price}</Text>
                            </Box>
                            <Box style={{flex:1,textAlign:'center'}}>
                              <Text size="10px" c="var(--ot-text-muted)">Commission</Text>
                              {isFree
                                ?<Badge size="xs" color="teal" variant="light">FREE</Badge>
                                :<Text size="xs" fw={700} c={COLORS.error}>-{CURRENCY_SYMBOL}{comm.toFixed(0)}</Text>}
                            </Box>
                            <Box style={{flex:1,textAlign:'center'}}>
                              <Text size="10px" c="var(--ot-text-muted)">You get</Text>
                              <Text size="xs" fw={800} c={COLORS.success}>{CURRENCY_SYMBOL} {youGet.toFixed(0)}</Text>
                            </Box>
                          </Group>
                          <Group gap={8}>
                            <Button flex={1} size="xs" radius="xl"
                              style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                              leftSection={<IconCheck size={13}/>}
                              onClick={()=>accept(req)}>
                              {isFree?'Accept (Free Trial)':'Accept & Pay'}
                            </Button>
                            <ActionIcon size="lg" radius="xl" variant="light" color="red"
                              onClick={()=>decline(req.id)}><IconX size={15}/></ActionIcon>
                          </Group>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Box>
        </SimpleGrid>
      </Box>

      {/* Chapa Modal */}
      <ChapaModal
        opened={chapaOpen} onClose={()=>setChapaOpen(false)}
        onSuccess={()=>{setChapaOpen(false);if(pending)finalize(pending);}}
        amount={pending?+(pending.price*commPct/100).toFixed(2):0}
        description={pending?catName(pending.catId):''}
        providerName={profile?.fullName??'Provider'}
        jobId={pending?.id??'demo'}
      />

      {/* Reveal phone modal */}
      <Modal opened={revOpen} onClose={()=>setRevOpen(false)} centered radius="xl" size="sm"
        withCloseButton={false} styles={{content:{background:'white'},header:{display:'none'}}}>
        <Stack align="center" gap="md" p="lg" pt="xl">
          <Box w={80} h={80} style={{borderRadius:'50%',
            background:`linear-gradient(135deg,${N},${T})`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IconPhoneCall size={38} color="white"/>
          </Box>
          <Text fw={900} size="xl" c={N} ta="center">Job Confirmed!</Text>
          <Text size="sm" c="dimmed" ta="center">Call the client to confirm details and arrival time.</Text>
          <Paper p="lg" radius="lg" w="100%"
            style={{background:'#F0FFF8',border:`1px solid ${COLORS.success}55`}}>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">Client Phone</Text>
              <Text fw={900} size="xl" c={N} style={{letterSpacing:2}}>{revealed?.phone}</Text>
              <Text size="xs" c={COLORS.success}>
                {revealed?.req.clientName} · {revealed?catName(revealed.req.catId):''}
              </Text>
            </Stack>
          </Paper>
          <Group gap={10} w="100%">
            <Button flex={1} size="md" radius="xl"
              style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
              leftSection={<IconPhoneCall size={16}/>}
              component="a" href={`tel:${revealed?.phone}`}>
              Call Now
            </Button>
            <Button flex={1} size="md" radius="xl" variant="light" color="gray"
              onClick={()=>setRevOpen(false)}>
              Close
            </Button>
          </Group>
          <Group gap={5}>
            <IconShieldCheck size={12} color={T}/>
            <Text size="xs" c="dimmed">Client has been notified you accepted.</Text>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default ProviderHome;
