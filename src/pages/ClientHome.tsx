/**
 * ClientHome.tsx — Client dashboard
 * Request Service · Chat in app (AI voice assistant with 7 stages)
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Text, Group, Stack, Badge, Button, Paper, ThemeIcon, ActionIcon,
  Avatar, Modal, Divider, SimpleGrid, Textarea, Progress,
} from '@mantine/core';
import {
  IconPhone, IconMapPin, IconCheck, IconHistory, IconWallet, IconStar,
  IconHeart, IconLogout, IconMenu2, IconX, IconMicrophone,
  IconPhoneOff, IconSearch, IconChevronRight,
  IconBell, IconBellFilled, IconCircleFilled, IconSparkles, IconBriefcase,
  IconArrowRight, IconStarFilled,
  IconMessage,
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { useJobStore, useNotificationStore } from '../store/jobStore';
import { COLORS, ROUTES, CURRENCY_SYMBOL } from '../utils/constants';
import { MOCK_CATEGORIES } from '../mock/mockServices';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;
const MAP_CTR: [number, number] = [9.032, 38.747];

// Fixed nearby provider dots for the live map preview
const PROV_DOTS: {pos:[number,number]; color:string; name:string; rating:number}[] = [
  {pos:[9.036,38.751],color:T,              name:'Abebe T.',rating:4.9},
  {pos:[9.029,38.743],color:COLORS.success, name:'Sara M.',  rating:4.8},
  {pos:[9.034,38.755],color:N,              name:'Dawit K.', rating:4.7},
  {pos:[9.027,38.748],color:T,              name:'Tigist A.',rating:4.9},
  {pos:[9.039,38.744],color:COLORS.success, name:'Yared T.', rating:4.6},
  {pos:[9.031,38.757],color:COLORS.warning, name:'Hana B.',  rating:4.8},
];
const provDot=(color:string)=>L.divIcon({
  className:'',
  html:`<div class="ot-prov-dot" style="--dc:${color}"></div>`,
  iconAnchor:[9,9],iconSize:[18,18],
});
const userDot=L.divIcon({
  className:'',
  html:`<div class="ot-user-dot"></div>`,
  iconAnchor:[12,12],iconSize:[24,24],
});

// Map icon string names to emojis for display
const CAT_ICONS: Record<string, string> = {
  car:'🚗', sparkles:'✨', droplets:'💧', bolt:'⚡',
  truck:'🚚', heart:'💅', school:'📚',
};

function catEmoji(icon: string) {
  return CAT_ICONS[icon] ?? '🔧';
}

// Dynamic follow-up question based on description keywords
function followupFor(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('paint'))                           return 'How many rooms need painting?';
  if (d.includes('clean'))                           return 'What room size and type? (bedroom / office / etc.)';
  if (d.includes('beauty')||d.includes('hair')||d.includes('makeup')||d.includes('nail'))
                                                     return 'How many people need services?';
  if (d.includes('car')||d.includes('engine')||d.includes('mechanic'))
                                                     return 'What is your car make, model, and year?';
  if (d.includes('electric')||d.includes('wire')||d.includes('outlet'))
                                                     return 'Which area needs electrical work? (kitchen / bedroom / breaker)';
  if (d.includes('mov')||d.includes('furniture'))    return 'What floor are you on, and how many large items?';
  if (d.includes('plumb')||d.includes('pipe')||d.includes('leak')||d.includes('drain'))
                                                     return 'Where exactly is the leak or blockage located?';
  if (d.includes('laundry')||d.includes('wash'))     return 'How many loads or kilograms of laundry?';
  return 'Can you describe the exact location of the issue in more detail?';
}

type AStage = 'idle'|'dialing'|'connected'|'listening'|'followup'|'searching'|'found'|'confirmed';
type CStage = 'idle'|'dialing'|'connected'|'listening'|'processing'|'done';

type Provider = {
  name:string; rating:number; dist:number;
  priceMin:number; priceMax:number; yearsExp:number;
  specialty:string; avatar:string;
};

const PROVIDER_POOL: Provider[] = [
  {name:'Abebe T.',   rating:4.9, dist:1.2, priceMin:120, priceMax:280, yearsExp:7,  specialty:'Plumbing & Repairs',    avatar:'A'},
  {name:'Sara M.',    rating:4.8, dist:1.7, priceMin:100, priceMax:250, yearsExp:5,  specialty:'Plumbing & Repairs', avatar:'S'},
  {name:'Dawit K.',   rating:4.7, dist:2.0, priceMin:150, priceMax:320, yearsExp:9,  specialty:'Plumbing & Repairs',       avatar:'D'},
  {name:'Tigist A.',  rating:4.9, dist:0.9, priceMin:90,  priceMax:200, yearsExp:4,  specialty:'Plumbing & Repairs',     avatar:'T'},
  {name:'Yared T.',   rating:4.6, dist:2.3, priceMin:110, priceMax:240, yearsExp:6,  specialty:'Plumbing & Repairs',     avatar:'Y'},
  {name:'Hana B.',    rating:4.8, dist:1.4, priceMin:130, priceMax:300, yearsExp:8,  specialty:'Plumbing & Repairs',      avatar:'H'},
  {name:'Bereket G.', rating:4.7, dist:1.8, priceMin:80,  priceMax:180, yearsExp:3,  specialty:'Plumbing & Repairs',          avatar:'B'},
  {name:'Meron S.',   rating:4.9, dist:1.1, priceMin:140, priceMax:260, yearsExp:10, specialty:'Plumbing & Repairs',  avatar:'M'},
];

/** Return 4 nearby providers, sorted by distance, randomised each call. */
function getNearbyProviders(): Provider[] {
  return [...PROVIDER_POOL]
    .sort(()=>Math.random()-0.5)
    .slice(0,4)
    .sort((a,b)=>a.dist-b.dist);
}

// keep a single alias so legacy references still compile
void (PROVIDER_POOL);

const DECLINE_REASONS = [
  'Not available right now',
  'Price is too high',
  'Found another provider',
  'Service not needed anymore',
  'Other',
];

function AnimRing({ctr,color}:{ctr:[number,number];color:string}) {
  const [r,setR]=useState(300);
  useEffect(()=>{const id=setInterval(()=>setR(p=>(p>=2500?300:p+60)),90);return()=>clearInterval(id);},[]);
  return(
    <>
      <Circle center={ctr} radius={r}    pathOptions={{color,fillOpacity:0.04,weight:1.5,opacity:0.6}}/>
      <Circle center={ctr} radius={r*.5} pathOptions={{color:N,fillOpacity:0.02,weight:1,opacity:0.35}}/>
    </>
  );
}

const statusColor=(s:string)=>s==='completed'?'teal':s==='cancelled'?'red':s==='in_progress'?'blue':'orange';
const statusLabel=(s:string)=>s==='pending_agreement'?'Requested':s==='in_progress'?'In Progress':s==='completed'?'Done':s==='cancelled'?'Cancelled':s;

const NAV=[
  {label:'Home',    icon:<IconCircleFilled size={16}/>,r:ROUTES.clientDashboard},
  {label:'History', icon:<IconHistory      size={16}/>,r:ROUTES.clientHistory},
  {label:'Saved',   icon:<IconHeart        size={16}/>,r:ROUTES.clientSaved},
  {label:'Wallet',  icon:<IconWallet       size={16}/>,r:ROUTES.clientWallet},
  {label:'Loyalty', icon:<IconStar         size={16}/>,r:ROUTES.clientLoyalty},
];

export function ClientHome() {
  const nav=useNavigate();
  const {currentUser,clientProfile}=useAuthStore();
  const {jobs,createJob}=useJobStore();
  const {unreadCount,fetchNotifications,addNotification}=useNotificationStore();

  const [sidebar,setSidebar]=useState(false);
  const [aOpen,setAOpen]=useState(false);
  const [aStage,setAStage]=useState<AStage>('idle');
  const [desc,setDesc]=useState('');
  const [fQ,setFQ]=useState('');
  const [fA,setFA]=useState('');
  const [foundProv,setFoundProv]=useState<Provider>(PROVIDER_POOL[0]);
  const [foundProviders,setFoundProviders]=useState<Provider[]>([]);
  const [selectedProv,setSelectedProv]=useState<Provider|null>(null);
  const [,setEstPrice]=useState({min:120,max:280});
  const aTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const [cOpen,setCOpen]=useState(false);
  const [cStage,setCStage]=useState<CStage>('idle');
  const [cCat,setCCat]=useState('');
  const [,setCPrice]=useState({min:80,max:200});
  const [cProviders,setCProviders]=useState<Provider[]>([]);
  const [cSelectedProv,setCSelectedProv]=useState<Provider|null>(null);
  const cTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  // Service-choice picker
  const [pickOpen,setPickOpen]=useState(false);
  const [pickCat, setPickCat] =useState('');

  // Decline voice flow
  const [declineOpen,setDeclineOpen]=useState(false);
  const [declineStage,setDeclineStage]=useState<'asking'|'confirmed'>('asking');
  const declineTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const mapTile='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  useEffect(()=>{
    if(!currentUser){nav(ROUTES.login);return;}
    fetchNotifications(currentUser.id);
    return()=>{if(aTimer.current)clearTimeout(aTimer.current);if(cTimer.current)clearTimeout(cTimer.current);if(declineTimer.current)clearTimeout(declineTimer.current);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentUser?.id]);

  const myJobs   =jobs.filter(j=>j.clientId===currentUser?.id);
  const activeJob=myJobs.find(j=>j.status==='pending_agreement'||j.status==='in_progress');
  const recent   =[...myJobs].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,5);

  /* ── Voice assistant ─────────────────────────────────────────────────────── */
  function startAssist(){
    setDesc('');setFA('');setFQ('');setAOpen(true);setAStage('dialing');
    aTimer.current=setTimeout(()=>setAStage('connected'),2200);
    setTimeout(()=>setAStage('listening'),3800);
  }
  function submitDesc(){
    if(!desc.trim())return;
    setFQ(followupFor(desc));setAStage('followup');
  }
  function submitFollowup(){
    if(!fA.trim())return;
    setAStage('searching');
    aTimer.current=setTimeout(()=>{
      const providers=getNearbyProviders();
      setFoundProviders(providers);
      setFoundProv(providers[0]);
      setSelectedProv(null);
      setEstPrice({min:providers[0].priceMin,max:providers[0].priceMax});
      setAStage('found');
    },3500);
  }
  function confirmJob(){
    if(!currentUser)return;
    const prov=selectedProv??foundProviders[0]??foundProv;
    setFoundProv(prov);
    const catId=MOCK_CATEGORIES[Math.floor(Math.random()*MOCK_CATEGORIES.length)]?.id??'cat-001';
    createJob({clientId:currentUser.id,providerId:'provider-001',categoryId:catId,
      subcategoryId:'sub-001',description:desc,estimatedPrice:prov.priceMin,
      status:'pending_agreement',commissionRate:10,
      clientLocation:{lat:MAP_CTR[0],lng:MAP_CTR[1],address:'Your location, Addis Ababa'},
      createdAt:new Date().toISOString()} as any);
    addNotification({id:`n-${Date.now()}`,userId:'provider-001',type:'new_job' as any,
      title:'New Job Request',message:`Client needs: ${desc.slice(0,60)}`,isRead:false,createdAt:new Date().toISOString()});
    setAStage('confirmed');
    notifications.show({title:'Request Sent!',message:'A provider will contact you shortly.',color:'teal'});
  }
  // Open decline voice modal
  function openDecline(){
    setDeclineStage('asking');
    setDeclineOpen(true);
  }
  function pickReason(_reason:string){
    setDeclineStage('confirmed');
    declineTimer.current=setTimeout(()=>{
      setDeclineOpen(false);
      setTimeout(()=>setDeclineStage('asking'),300);
    },2800);
  }
  function closeDecline(){
    if(declineTimer.current)clearTimeout(declineTimer.current);
    setDeclineOpen(false);
    setTimeout(()=>setDeclineStage('asking'),300);
  }
  // Client declines found provider — open voice decline modal
  function cancelFromFound(){
    setAOpen(false);
    setTimeout(()=>{setAStage('idle');openDecline();},300);
  }
  function closeAssist(){if(aTimer.current)clearTimeout(aTimer.current);setAOpen(false);setTimeout(()=>setAStage('idle'),300);}

  /* ── Category call ───────────────────────────────────────────────────────── */
  function startCall(catName:string){
    setCCat(catName);const min=80+Math.floor(Math.random()*80);setCPrice({min,max:min+100});
    setCOpen(true);setCStage('dialing');
    setCSelectedProv(null);
    cTimer.current=setTimeout(()=>setCStage('connected'),1800);
    setTimeout(()=>setCStage('listening'),3200);
    setTimeout(()=>setCStage('processing'),8000);
    setTimeout(()=>{setCProviders(getNearbyProviders());setCStage('done');},10200);
  }
  function confirmCall(){
    if(!currentUser)return;
    const prov=cSelectedProv??cProviders[0]??PROVIDER_POOL[0];
    const cat=MOCK_CATEGORIES.find(c=>c.name===cCat);
    createJob({clientId:currentUser.id,providerId:'provider-001',categoryId:cat?.id??'cat-001',
      subcategoryId:'sub-001',description:`${cCat} service request`,
      estimatedPrice:prov.priceMin,status:'pending_agreement',commissionRate:10,
      clientLocation:{lat:MAP_CTR[0],lng:MAP_CTR[1],address:'Your location'},
      createdAt:new Date().toISOString()} as any);
    closeCall();
    notifications.show({title:'Booked!',message:`Your ${cCat} request is live.`,color:'teal'});
  }
  function closeCall(){if(cTimer.current)clearTimeout(cTimer.current);setCOpen(false);setTimeout(()=>setCStage('idle'),300);}
  // Client declines via category call modal — open voice decline modal
  function cancelFromCall(){
    if(cTimer.current)clearTimeout(cTimer.current);
    setCOpen(false);
    setTimeout(()=>{setCStage('idle');openDecline();},300);
  }

  function openPick(catName:string){setPickCat(catName);setPickOpen(true);}
  function pickAI(){setPickOpen(false);if(pickCat)startCall(pickCat);else startAssist();}

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
            <Avatar radius="xl" size="md" color="teal">{clientProfile?.fullName?.charAt(0)?.charAt(0) ?? 'C'}</Avatar>
            <Box>
              <Text size="sm" fw={700}>{clientProfile?.fullName??'Client'}</Text>
              <Text size="xs" c="var(--ot-text-muted)">{currentUser?.phone}</Text>
            </Box>
          </Group>
        </Box>
        <Divider/>
        <Stack gap={2} p="sm" style={{flex:1}}>
          {NAV.map(n=>(
            <Box key={n.label} p={10}
              style={{borderRadius:10,display:'flex',alignItems:'center',gap:10,
                fontWeight:600,fontSize:14,color:'var(--ot-text-muted)'}}>
              {n.icon} {n.label}
            </Box>
          ))}
        </Stack>
        <Box p="md" style={{borderTop:'1px solid var(--ot-border)'}}>
          <Box p={10} style={{borderRadius:10,display:'flex',alignItems:'center',
            gap:10,color:'var(--ot-text-muted)'}}>
            <IconLogout size={18}/> Sign out
          </Box>
        </Box>
      </Box>

      {/* Header */}
      <Box style={{position:'sticky',top:0,zIndex:200,background:'var(--ot-bg-card)',
        borderBottom:'1px solid var(--ot-border)'}}>
        <Box px={20} py={12} style={{maxWidth:960,margin:'0 auto'}}>
          <Group justify="space-between">
            <Group gap={12}>
              <ActionIcon variant="subtle" size="lg" onClick={()=>setSidebar(true)}><IconMenu2 size={22}/></ActionIcon>
              <Group gap={8}>
                <Box w={32} h={32} style={{borderRadius:9,background:N,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Text fw={900} size="11px" c="white">OT</Text>
                </Box>
                <Text fw={800} size="sm" c={N} visibleFrom="sm">OneTouch</Text>
              </Group>
            </Group>
            <Group gap={10}>
              {/* AI Call button */}
              <Box
                role="button" aria-label="Call In-App AI" tabIndex={0}
                onClick={()=>startCall('AI Assistant')}
                onKeyDown={e=>e.key==='Enter'&&startCall('AI Assistant')}
                style={{display:'flex',alignItems:'center',gap:6,
                  padding:'7px 13px',borderRadius:20,flexShrink:0,cursor:'pointer',
                  background:`linear-gradient(135deg,${T},${N})`,
                  color:'white',fontWeight:700,fontSize:13,
                  boxShadow:`0 2px 10px ${T}55`,minHeight:44}}>
                <IconMicrophone size={15} color="white"/>
                <Text size="xs" fw={800} c="white" visibleFrom="xs">AI Call</Text>
              </Box>
              {/* Call Center button */}
              <Box
                component="a" href="tel:8182" aria-label="Call center 8182"
                style={{display:'flex',alignItems:'center',gap:6,
                  padding:'7px 13px',borderRadius:20,flexShrink:0,
                  background:`linear-gradient(135deg,${N},${T})`,
                  color:'white',textDecoration:'none',fontWeight:700,fontSize:13,
                  boxShadow:`0 2px 10px ${N}55`,minHeight:44}}>
                <IconPhone size={15} color="white"/>
                <Text size="xs" fw={800} c="white" visibleFrom="xs">8182</Text>
              </Box>
              <ActionIcon variant="subtle" size="lg" style={{position:'relative'}}
                aria-label="Notifications">
                {unreadCount>0?<IconBellFilled size={22} color={T}/>:<IconBell size={22}/>}
                {unreadCount>0&&<Box style={{position:'absolute',top:2,right:2,width:14,height:14,
                  borderRadius:'50%',background:COLORS.error,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Text size="8px" c="white" fw={700}>{unreadCount}</Text></Box>}
              </ActionIcon>
              <Avatar radius="xl" size="sm" color="teal" style={{cursor:'pointer'}} onClick={()=>setSidebar(true)}>
                {clientProfile?.fullName?.charAt(0)?.charAt(0) ?? 'C'}
              </Avatar>
            </Group>
          </Group>
        </Box>
      </Box>

      {/* Body */}
      <Box style={{maxWidth:960,margin:'0 auto',padding:'24px 16px 64px'}}>

        {/* Active job banner */}
        {activeJob&&(
          <Paper mb={20} p="md" radius="xl"
            style={{background:`linear-gradient(135deg,${N}f0,${T}dd)`,color:'white'}}>
            <Group justify="space-between" wrap="nowrap">
              <Group gap={12} wrap="nowrap">
                <ThemeIcon size={42} radius="xl" style={{background:'rgba(255,255,255,.2)'}}>
                  <IconBriefcase size={22} color="white"/>
                </ThemeIcon>
                <Box>
                  <Group gap={8}><Text size="xs" c="rgba(255,255,255,.8)">Active Request</Text><Badge size="xs" color="yellow">Live</Badge></Group>
                  <Text fw={700} size="sm" c="white" lineClamp={1}>{MOCK_CATEGORIES.find(c=>c.id===activeJob.categoryId)?.name??'Service Request'}</Text>
                  <Text size="xs" c="rgba(255,255,255,.7)">{statusLabel(activeJob.status)} · {CURRENCY_SYMBOL} {activeJob.estimatedPrice}</Text>
                </Box>
              </Group>
              <ActionIcon variant="subtle" size="lg" style={{color:'white'}} onClick={()=>nav(ROUTES.clientHistory)}>
                <IconChevronRight size={20}/>
              </ActionIcon>
            </Group>
          </Paper>
        )}

        {/* Hero — Live Provider Map */}
        <Box mb={28}>
          <Paper radius="xl"
            style={{overflow:'hidden',border:'1px solid var(--ot-border)',
              boxShadow:'0 4px 24px rgba(0,0,0,.07)',position:'relative'}}>

            <MapContainer center={MAP_CTR} zoom={14} style={{width:'100%',height:300}}
              zoomControl={false} dragging={false} scrollWheelZoom={false}
              doubleClickZoom={false} keyboard={false} attributionControl={false}>
              <TileLayer url={mapTile}/>
              <AnimRing ctr={MAP_CTR} color={T}/>
              {PROV_DOTS.map((p,i)=>(
                <Marker key={i} position={p.pos} icon={provDot(p.color)}/>
              ))}
              <Marker position={MAP_CTR} icon={userDot}/>
            </MapContainer>

            {/* Top pill — providers online */}
            <Box style={{position:'absolute',top:12,left:12,zIndex:500}}>
              <Group gap={6} px={10} py={6}
                style={{borderRadius:20,background:'rgba(255,255,255,.92)',
                  backdropFilter:'blur(6px)',boxShadow:'0 2px 10px rgba(0,0,0,.12)'}}>
                <Box w={7} h={7} style={{borderRadius:'50%',background:COLORS.success,
                  boxShadow:`0 0 0 3px ${COLORS.success}44`,flexShrink:0}}/>
                <Text size="xs" fw={700} c={N}>{PROV_DOTS.length} providers online</Text>
              </Group>
            </Box>

            {/* Top-right pill — location */}
            <Box style={{position:'absolute',top:12,right:12,zIndex:500}}>
              <Group gap={5} px={9} py={6}
                style={{borderRadius:20,background:'rgba(255,255,255,.92)',
                  backdropFilter:'blur(6px)',boxShadow:'0 2px 10px rgba(0,0,0,.12)'}}>
                <IconMapPin size={12} color={T}/>
                <Text size="xs" fw={600} c={N}>Near you</Text>
              </Group>
            </Box>
          </Paper>

          {/* CTA bar below the map — no overlay, clean card */}
          <Paper mt={10} p="md" radius="xl"
            style={{background:'var(--ot-bg-card)',border:'1px solid var(--ot-border)'}}>
            <Group justify="space-between" align="center" wrap="nowrap">
              <Group gap={12} wrap="nowrap">
                <Box w={44} h={44} style={{borderRadius:14,flexShrink:0,
                  background:`linear-gradient(135deg,${N},${T})`,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <IconMessage size={22} color="white"/>
                </Box>
                <Box>
                  <Text fw={800} size="sm" c={N}>Chat in App</Text>
                  <Text size="xs" c="dimmed">AI finds &amp; connects you to the right pro</Text>
                </Box>
              </Group>
              <Button size="sm" radius="xl" onClick={startAssist}
                style={{background:`linear-gradient(135deg,${N},${T})`,border:'none',flexShrink:0}}
                leftSection={<IconMessage size={14}/>}>
                Chat Now
              </Button>
            </Group>
          </Paper>
        </Box>

        {/* Category grid */}
        <Text fw={800} size="sm" c={N} mb={14}>All Services</Text>
        <SimpleGrid cols={{base:4,sm:7}} spacing={10} mb={32}>
          {MOCK_CATEGORIES.map(cat=>(
            <Paper key={cat.id} p="12px 8px" radius="xl" onClick={()=>openPick(cat.name)}
              role="button" aria-label={`Book ${cat.name}`} tabIndex={0}
              onKeyDown={e=>e.key==='Enter'&&openPick(cat.name)}
              style={{background:'var(--ot-bg-card)',border:'1px solid var(--ot-border)',
                cursor:'pointer',textAlign:'center',transition:'transform .18s,box-shadow .18s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-3px)';
                (e.currentTarget as HTMLElement).style.boxShadow='0 8px 20px rgba(0,0,0,.1)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='';
                (e.currentTarget as HTMLElement).style.boxShadow=''}}>
              <Stack align="center" gap={5}>
                <Text style={{fontSize:26,lineHeight:1}}>{catEmoji(cat.icon)}</Text>
                <Text size="10px" fw={700} c="var(--ot-text-body)" ta="center" lh={1.2}>{cat.name}</Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Recent requests */}
        {recent.length>0?(
          <Box>
            <Group justify="space-between" mb={14}>
              <Text fw={800} size="sm" c={N}>Recent Requests</Text>
              <Text size="xs" c={T} style={{cursor:'pointer'}} onClick={()=>nav(ROUTES.clientHistory)}>
                View all
              </Text>
            </Group>
            <Stack gap={10}>
              {recent.map(job=>{
                const cat=MOCK_CATEGORIES.find(c=>c.id===job.categoryId);
                return(
                  <Paper key={job.id} p="md" radius="xl"
                    style={{background:'var(--ot-bg-card)',border:'1px solid var(--ot-border)'}}>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap={12} wrap="nowrap">
                        <Box w={42} h={42} style={{borderRadius:12,flexShrink:0,
                          background:`${cat?.color??T}20`,display:'flex',alignItems:'center',
                          justifyContent:'center',fontSize:20}}>
                          {catEmoji(cat?.icon??'tool')}
                        </Box>
                        <Box>
                          <Text size="sm" fw={700} lineClamp={1}>{MOCK_CATEGORIES.find(c=>c.id===job.categoryId)?.name??'Service Request'}</Text>
                          <Group gap={10}>
                            <Text size="xs" c="var(--ot-text-muted)">{CURRENCY_SYMBOL} {job.estimatedPrice}</Text>
                            <Text size="xs" c="var(--ot-text-muted)">·</Text>
                            <Text size="xs" c="var(--ot-text-muted)">{new Date(job.createdAt).toLocaleDateString()}</Text>
                          </Group>
                        </Box>
                      </Group>
                      <Badge size="sm" color={statusColor(job.status)} variant="light" style={{flexShrink:0}}>
                        {statusLabel(job.status)}
                      </Badge>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        ):null}
      </Box>

      {/* ══ VOICE ASSISTANT MODAL ══════════════════════════════════════════════ */}
      <Modal opened={aOpen} onClose={closeAssist} centered radius="xl" size="sm"
        withCloseButton={false} styles={{content:{background:'white'},header:{display:'none'}}}>

        {/* Dialing */}
        {aStage==='dialing'&&(
          <Stack align="center" gap="lg" py={40}>
            <Box style={{position:'relative',width:100,height:100}}>
              <Box style={{position:'absolute',inset:-22,borderRadius:'50%',
                border:`3px solid ${T}30`,animation:'pulse 1.4s ease-in-out infinite'}}/>
              <Box style={{position:'absolute',inset:-8,borderRadius:'50%',
                border:`3px solid ${T}55`,animation:'pulse 1.4s ease-in-out .4s infinite'}}/>
              <Box w={100} h={100} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${N},${T})`,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconMessage size={44} color="white"/>
              </Box>
            </Box>
            <Stack align="center" gap={4}>
              <Text fw={800} size="lg" c={N}>Connecting…</Text>
              <Text size="sm" c="dimmed">Reaching OneTouch AI</Text>
            </Stack>
            
          </Stack>
        )}

        {/* Connected */}
        {aStage==='connected'&&(
          <Stack align="center" gap="md" py={40}>
            <Box w={80} h={80} style={{borderRadius:'50%',
              background:`linear-gradient(135deg,${N},${T})`,
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <IconCheck size={38} color="white"/>
            </Box>
            <Text fw={800} size="lg" c={N}>Connected!</Text>
            <Text size="sm" c="dimmed">Preparing AI assistant…</Text>
          </Stack>
        )}

        {/* Listening — voice call style */}
        {aStage==='listening'&&(
          <Stack gap="md" p={4}>
            {/* Active chat pill */}
            <Group gap={8} px={14} py={8}
              style={{background:`${N}08`,borderRadius:24,alignSelf:'center'}}>
              <Box w={8} h={8} style={{borderRadius:'50%',background:COLORS.success,
                boxShadow:`0 0 0 3px ${COLORS.success}33`,flexShrink:0,
                animation:'pulse 1.4s ease-in-out infinite'}}/>
              <Text size="xs" fw={700} c={N}>AI Connected . Start Chatting</Text>
            </Group>
            {/* Pulsing message orb */}
            <Stack align="center" py={20} gap={0}>
              <Box style={{position:'relative',width:110,height:110}}>
                <Box style={{position:'absolute',inset:-18,borderRadius:'50%',
                  border:`3px solid ${T}22`,animation:'pulse 1.4s ease-in-out infinite'}}/>
                <Box style={{position:'absolute',inset:-7,borderRadius:'50%',
                  border:`3px solid ${T}44`,animation:'pulse 1.4s ease-in-out .5s infinite'}}/>
                <Box w={110} h={110} style={{borderRadius:'50%',
                  background:`linear-gradient(135deg,${N},${T})`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:`0 6px 28px ${N}55`}}>
                  <IconMessage size={46} color="white"/>
                </Box>
              </Box>
              <Text size="xs" c="dimmed" mt={16}>Describe what you need below</Text>
            </Stack>
            <Textarea autosize minRows={2} maxRows={6}
              placeholder="e.g. My kitchen sink is leaking under the cabinet…"
              value={desc} onChange={e=>setDesc(e.currentTarget.value)}
              radius="lg"
              styles={{input:{border:`2px solid ${T}55`,fontSize:14}}}/>
            <Group gap={8}>
              <Button flex={1} size="md" radius="xl"
                style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                disabled={!desc.trim()} onClick={submitDesc}>
                Continue <IconArrowRight size={16}/>
              </Button>
              {/* Removed End Call button */}
            </Group>
          </Stack>
        )}

        {/* Follow-up */}
        {aStage==='followup'&&(
          <Stack gap="md" p={4}>
            <Group gap={12} p="md" style={{background:`${T}10`,borderRadius:16}}>
              <Box w={44} h={44} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${T},${N})`,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <IconSparkles size={22} color="white"/>
              </Box>
              <Box style={{flex:1}}>
                <Text fw={700} size="sm" c={N}>One more question…</Text>
                <Text size="sm" c="var(--ot-text-body)" mt={4}>{fQ}</Text>
              </Box>
            </Group>
            <Textarea autosize minRows={2} maxRows={6}
              placeholder="Your answer…"
              value={fA} onChange={e=>setFA(e.currentTarget.value)}
              radius="lg"
              styles={{input:{border:`2px solid ${N}44`,fontSize:14}}}/>
            <Button size="md" radius="xl"
              style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
              disabled={!fA.trim()} onClick={submitFollowup}>
              Find Me a Provider
            </Button>
          </Stack>
        )}

        {/* Searching */}
        {aStage==='searching'&&(
          <Stack gap="md" p={4}>
            <Group gap={10} p="md" style={{background:`${N}08`,borderRadius:16}}>
              <Box w={40} h={40} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${N},${T})`,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <IconSearch size={20} color="white"/>
              </Box>
              <Box>
                <Text fw={700} size="sm" c={N}>Scanning nearby providers…</Text>
                <Text size="xs" c={T}>Live map search active</Text>
              </Box>
            </Group>
            <Box style={{height:220,borderRadius:16,overflow:'hidden',border:'1px solid var(--ot-border)'}}>
              <MapContainer center={MAP_CTR} zoom={14} style={{width:'100%',height:'100%'}}
                zoomControl={false} dragging={false} scrollWheelZoom={false}>
                <TileLayer url={mapTile}/>
                <AnimRing ctr={MAP_CTR} color={T}/>
              </MapContainer>
            </Box>
            <Progress value={70} color="teal" size="sm" radius="xl" animated/>
          </Stack>
        )}

        {/* Found — provider list */}
        {aStage==='found'&&(
          <Stack gap="md" p={4}>
            <Group gap={8} justify="space-between" align="center">
              <Badge size="lg" variant="filled" color="yellow"
                leftSection={<IconSparkles size={12}/>}>
                {foundProviders.length} Nearby Providers Found
              </Badge>
              <Text size="xs" c="dimmed">Tap a card to select</Text>
            </Group>
            <Box style={{maxHeight:340,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
              {foundProviders.map((prov)=>{
                const active=selectedProv?.name===prov.name;
                return(
                  <Paper key={prov.name} p="md" radius="xl"
                    onClick={()=>setSelectedProv(prov)}
                    style={{cursor:'pointer',transition:'box-shadow .18s',
                      border:active?'none':'1px solid var(--ot-border)',
                      background:active?`linear-gradient(135deg,${N}f0,${T}dd)`:'var(--ot-bg-card)',
                      boxShadow:active?`0 4px 20px ${N}44`:'none'}}>
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                      <Group gap={12} wrap="nowrap">
                        <Avatar size={48} radius="xl" color="teal"
                          style={{border:active?'2px solid rgba(255,255,255,.5)':'none'}}>
                          {prov.avatar}
                        </Avatar>
                        <Stack gap={3}>
                          <Text fw={800} size="sm" c={active?'white':N}>{prov.name}</Text>
                          <Text size="xs" c={active?'rgba(255,255,255,.75)':'dimmed'}>{prov.specialty}</Text>
                          <Group gap={8}>
                            <Group gap={3}>
                              <IconStarFilled size={11} color={COLORS.warning}/>
                              <Text size="xs" fw={700} c={active?'white':'var(--ot-text-body)'}>{prov.rating}</Text>
                            </Group>
                            <Text size="xs" c={active?'rgba(255,255,255,.5)':'dimmed'}>·</Text>
                            <Group gap={3}>
                              <IconMapPin size={11} color={active?'rgba(255,255,255,.7)':T}/>
                              <Text size="xs" c={active?'rgba(255,255,255,.8)':'var(--ot-text-body)'}>{prov.dist} km</Text>
                            </Group>
                            <Text size="xs" c={active?'rgba(255,255,255,.5)':'dimmed'}>·</Text>
                            <Text size="xs" c={active?'rgba(255,255,255,.8)':'var(--ot-text-body)'}>{prov.yearsExp} yrs exp</Text>
                          </Group>
                        </Stack>
                      </Group>
                      <Stack gap={4} align="flex-end" style={{flexShrink:0}}>
                        <Text size="sm" fw={900} c={active?'white':N}>
                          {CURRENCY_SYMBOL} {prov.priceMin}–{prov.priceMax}
                        </Text>
                        {active&&<Badge size="xs" color="yellow" variant="filled">Selected</Badge>}
                      </Stack>
                    </Group>
                  </Paper>
                );
              })}
            </Box>
            <Group gap={8}>
              <Button flex={1} size="md" radius="xl"
                style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                disabled={!selectedProv}
                onClick={confirmJob}>Confirm &amp; Request</Button>
              <Button flex={1} size="md" radius="xl" variant="light" color="red"
                onClick={cancelFromFound}>Decline</Button>
            </Group>
          </Stack>
        )}

        {/* Confirmed */}
        {aStage==='confirmed'&&(
          <Stack align="center" gap="md" py={32} px={8}>
            <Box w={80} h={80} style={{borderRadius:'50%',
              background:`linear-gradient(135deg,${COLORS.success},${T})`,
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <IconCheck size={40} color="white"/>
            </Box>
            <Text fw={900} size="xl" c={N} ta="center">Request Sent!</Text>
            <Text size="sm" c="dimmed" ta="center">
              {foundProv.name} has been notified and will contact you shortly.
            </Text>
            <Paper p="md" radius="lg" w="100%" style={{background:`${T}10`,border:`1px solid ${T}44`}}>
              <Stack gap={6}>
                <Text size="xs" fw={600} c={T}>What happens next?</Text>
                <Text size="xs" c="var(--ot-text-sub)">1. Provider calls you within 10 minutes</Text>
                <Text size="xs" c="var(--ot-text-sub)">2. Confirm arrival time together</Text>
                <Text size="xs" c="var(--ot-text-sub)">3. Service is performed &amp; you pay in-app</Text>
              </Stack>
            </Paper>
            <Button size="md" radius="xl" fullWidth
              style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
              onClick={closeAssist}>Back to Home</Button>
          </Stack>
        )}
      </Modal>

      {/* ══ CATEGORY CALL MODAL ════════════════════════════════════════════════ */}
      <Modal opened={cOpen} onClose={closeCall} centered radius="xl" size="sm"
        withCloseButton={false} styles={{content:{background:'white'},header:{display:'none'}}}>
        <Stack gap="md" py={24} px={8}>

          {cStage==='dialing'&&(
            <Stack align="center" gap="lg">
              <Box style={{position:'relative',width:96,height:96}}>
                <Box style={{position:'absolute',inset:-20,borderRadius:'50%',
                  border:`3px solid ${T}30`,animation:'pulse 1.4s ease-in-out infinite'}}/>
                <Box style={{position:'absolute',inset:-6,borderRadius:'50%',
                  border:`3px solid ${T}55`,animation:'pulse 1.4s ease-in-out .5s infinite'}}/>
                <Box w={96} h={96} style={{borderRadius:'50%',
                  background:`linear-gradient(135deg,${N},${T})`,
                  display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <IconPhone size={40} color="white"/>
                </Box>
              </Box>
              <Stack align="center" gap={4}>
                <Text fw={800} size="lg" c={N}>Calling…</Text>
                <Text size="sm" c="dimmed">Connecting to {cCat} provider</Text>
              </Stack>
              <Button variant="light" color="red" radius="xl" size="sm"
                leftSection={<IconPhoneOff size={14}/>} onClick={closeCall}>Cancel</Button>
            </Stack>
          )}

          {cStage==='connected'&&(
            <Stack align="center" gap="md">
              <Box w={80} h={80} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${COLORS.success},#27ae60)`,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconPhone size={36} color="white"/>
              </Box>
              <Text fw={800} size="lg" c={N}>Connected!</Text>
              <Text size="sm" c="dimmed">Gathering details…</Text>
            </Stack>
          )}

          {cStage==='listening'&&(
            <Stack align="center" gap="md">
              <Box w={80} h={80} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${N},${T})`,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconMicrophone size={36} color="white"/>
              </Box>
              <Text fw={700} size="md" c={N} ta="center">Describe your {cCat} needs…</Text>
              <Text size="xs" c="dimmed" ta="center">Our AI is listening and matching you with the best provider nearby</Text>
              <Progress value={55} color="teal" size="sm" radius="xl" w="100%" animated/>
            </Stack>
          )}

          {cStage==='processing'&&(
            <Stack align="center" gap="md">
              <Box w={80} h={80} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${T},${N})`,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconSearch size={36} color="white"/>
              </Box>
              <Text fw={700} size="md" c={N}>Finding best match…</Text>
              <Progress value={85} color="teal" size="sm" radius="xl" w="100%" animated/>
            </Stack>
          )}

          {cStage==='done'&&(
            <Stack gap="md">
              <Group gap={8} justify="space-between" align="center">
                <Badge size="lg" color="yellow" variant="filled"
                  leftSection={<IconCheck size={11}/>}>
                  {cProviders.length} Providers Ready!
                </Badge>
                <Text size="xs" c="dimmed">Tap a card to select</Text>
              </Group>
              <Box style={{maxHeight:320,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
                {cProviders.map((prov)=>{
                  const active=cSelectedProv?.name===prov.name;
                  return(
                    <Paper key={prov.name} p="md" radius="xl"
                      onClick={()=>setCSelectedProv(prov)}
                      style={{cursor:'pointer',transition:'box-shadow .18s',
                        border:active?'none':'1px solid var(--ot-border)',
                        background:active?`linear-gradient(135deg,${N}f0,${T}dd)`:'var(--ot-bg-card)',
                        boxShadow:active?`0 4px 20px ${N}44`:'none'}}>
                      <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Group gap={12} wrap="nowrap">
                          <Avatar size={48} radius="xl" color="teal"
                            style={{border:active?'2px solid rgba(255,255,255,.5)':'none'}}>
                            {prov.avatar}
                          </Avatar>
                          <Stack gap={3}>
                            <Text fw={800} size="sm" c={active?'white':N}>{prov.name}</Text>
                            <Text size="xs" c={active?'rgba(255,255,255,.75)':'dimmed'}>{prov.specialty}</Text>
                            <Group gap={8}>
                              <Group gap={3}>
                                <IconStarFilled size={11} color={COLORS.warning}/>
                                <Text size="xs" fw={700} c={active?'white':'var(--ot-text-body)'}>{prov.rating}</Text>
                              </Group>
                              <Text size="xs" c={active?'rgba(255,255,255,.5)':'dimmed'}>·</Text>
                              <Group gap={3}>
                                <IconMapPin size={11} color={active?'rgba(255,255,255,.7)':T}/>
                                <Text size="xs" c={active?'rgba(255,255,255,.8)':'var(--ot-text-body)'}>{prov.dist} km</Text>
                              </Group>
                              <Text size="xs" c={active?'rgba(255,255,255,.5)':'dimmed'}>·</Text>
                              <Text size="xs" c={active?'rgba(255,255,255,.8)':'var(--ot-text-body)'}>{prov.yearsExp} yrs exp</Text>
                            </Group>
                          </Stack>
                        </Group>
                        <Stack gap={4} align="flex-end" style={{flexShrink:0}}>
                          <Text size="sm" fw={900} c={active?'white':N}>
                            {CURRENCY_SYMBOL} {prov.priceMin}–{prov.priceMax}
                          </Text>
                          {active&&<Badge size="xs" color="yellow" variant="filled">Selected</Badge>}
                        </Stack>
                      </Group>
                    </Paper>
                  );
                })}
              </Box>
              <Group gap={8}>
                <Button flex={1} size="md" radius="xl"
                  style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                  disabled={!cSelectedProv}
                  onClick={confirmCall}>Confirm</Button>
                <Button flex={1} size="md" radius="xl" variant="light" color="red"
                  onClick={cancelFromCall}>Decline</Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>

      {/* ══ DECLINE VOICE MODAL ════════════════════════════════════════════════ */}
      <Modal opened={declineOpen} onClose={closeDecline} centered radius="xl" size="sm"
        withCloseButton={false}
        styles={{content:{background:'var(--ot-bg-card)'},header:{display:'none'}}}>
        <Box p="xl">
          {declineStage==='asking'&&(
            <Stack gap="lg" align="center">
              {/* Pulsing AI orb */}
              <Box style={{position:'relative',width:88,height:88}}>
                <Box style={{position:'absolute',inset:-16,borderRadius:'50%',
                  border:`3px solid ${T}22`,animation:'pulse 1.4s ease-in-out infinite'}}/>
                <Box style={{position:'absolute',inset:-6,borderRadius:'50%',
                  border:`3px solid ${T}44`,animation:'pulse 1.4s ease-in-out .5s infinite'}}/>
                <Box w={88} h={88} style={{borderRadius:'50%',
                  background:`linear-gradient(135deg,${N},${T})`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow:`0 4px 20px ${N}44`}}>
                  <IconSparkles size={36} color="white"/>
                </Box>
              </Box>
              <Stack gap={4} align="center">
                <Text fw={800} size="md" c={N}>Why did you decline?</Text>
                <Text size="xs" c="dimmed">Select a reason — we'll improve your matches</Text>
              </Stack>
              <Stack gap={10} w="100%">
                {DECLINE_REASONS.map(r=>(
                  <Button key={r} size="sm" radius="xl" variant="light" color="gray"
                    fullWidth onClick={()=>pickReason(r)}
                    styles={{root:{fontWeight:600,justifyContent:'flex-start',paddingLeft:20}}}>
                    {r}
                  </Button>
                ))}
              </Stack>
              <Button size="xs" radius="xl" variant="subtle" color="gray"
                onClick={closeDecline}>Never mind</Button>
            </Stack>
          )}
          {declineStage==='confirmed'&&(
            <Stack align="center" gap="lg" py={12}>
              <Box w={80} h={80} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${COLORS.success},${T})`,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconCheck size={40} color="white"/>
              </Box>
              <Stack gap={6} align="center">
                <Text fw={800} size="lg" c={N}>Noted!</Text>
                <Text size="sm" c="dimmed" ta="center">
                  I've recorded your reason. Feel free to order again anytime.
                </Text>
              </Stack>
            </Stack>
          )}
        </Box>
      </Modal>

      {/* ══ SERVICE CHOICE MODAL ══════════════════════════════════════════════ */}
      <Modal opened={pickOpen} onClose={()=>setPickOpen(false)} centered radius="xl" size="sm"
        withCloseButton={false}
        styles={{content:{background:'var(--ot-bg-card)'},header:{display:'none'},
          body:{padding:0}}}>
        <Box p="xl">
          <Group justify="space-between" mb="lg">
            <Box>
              <Text fw={900} size="lg" c={N} lh={1}>{pickCat||'Services'}</Text>
              <Text size="xs" c="dimmed" mt={2}>How would you like to get help?</Text>
            </Box>
            <ActionIcon variant="subtle" onClick={()=>setPickOpen(false)}
              aria-label="Close" size="lg"><IconX size={18}/></ActionIcon>
          </Group>

          <Stack gap={12}>
            {/* Option 1 — Call Center */}
            <Paper
              component="a" href="tel:8182"
              aria-label="Call call center 8182"
              p="lg" radius="xl"
              onClick={()=>setPickOpen(false)}
              style={{display:'block',textDecoration:'none',
                background:`linear-gradient(135deg,${N},${T})`,
                cursor:'pointer',border:'none',minHeight:44}}>
              <Group gap={14} wrap="nowrap">
                <Box w={52} h={52} style={{borderRadius:16,background:'rgba(255,255,255,.2)',
                  flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <IconPhone size={26} color="white"/>
                </Box>
                <Box>
                  <Text fw={800} size="md" c="white">Call Call Center</Text>
                  <Text size="xs" c="rgba(255,255,255,.8)" mt={2}>
                    Speaks to a real agent · <Text span fw={800} c="white">📞 8182</Text>
                  </Text>
                  <Badge mt={6} size="xs" style={{background:'rgba(255,255,255,.2)',color:'white',border:'none'}}>
                    Human assistance
                  </Badge>
                </Box>
              </Group>
            </Paper>

            {/* Option 2 — AI Assistant */}
            <Paper
              p="lg" radius="xl" onClick={pickAI}
              aria-label="Use in-app AI assistant"
              role="button" tabIndex={0}
              onKeyDown={e=>e.key==='Enter'&&pickAI()}
              style={{cursor:'pointer',border:`2px solid ${T}55`,
                background:'var(--ot-bg-card)',minHeight:44}}>
              <Group gap={14} wrap="nowrap">
                <Box w={52} h={52} style={{borderRadius:16,background:`${T}18`,
                  flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <IconMicrophone size={26} color={T}/>
                </Box>
                <Box>
                  <Text fw={800} size="md" c={N}>Call In-App AI</Text>
                  <Text size="xs" c="dimmed" mt={2}>AI asks your problem &amp; finds the best pro</Text>
                  <Group gap={6} mt={6}>
                    <Badge size="xs" variant="light" color="teal">Smart match</Badge>
                    <Badge size="xs" variant="light" color="blue">Auto-locate</Badge>
                  </Group>
                </Box>
              </Group>
            </Paper>
          </Stack>

          <Text size="xs" c="dimmed" ta="center" mt={14}>
            Both options are free to use · tap outside to dismiss
          </Text>
        </Box>
      </Modal>

      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.55}}
        .ot-prov-dot{
          width:18px;height:18px;border-radius:50%;
          background:var(--dc);border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,.3);
          animation:prov-blink 2.2s ease-in-out infinite;
        }
        .ot-prov-dot::after{
          content:'';position:absolute;inset:-5px;border-radius:50%;
          border:2px solid var(--dc);opacity:0;
          animation:prov-ring 2.2s ease-out infinite;
        }
        @keyframes prov-blink{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
        @keyframes prov-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.2);opacity:0}}
        .ot-user-dot{
          width:24px;height:24px;border-radius:50%;
          background:${N};border:4px solid white;
          box-shadow:0 0 0 4px ${T}66,0 3px 12px rgba(0,0,0,.4);
          animation:user-pulse 1.8s ease-in-out infinite;
        }
        @keyframes user-pulse{0%,100%{box-shadow:0 0 0 4px ${T}66,0 3px 12px rgba(0,0,0,.4)}50%{box-shadow:0 0 0 8px ${T}33,0 3px 12px rgba(0,0,0,.4)}}
      `}</style>
    </Box>
  );
}

export default ClientHome;
