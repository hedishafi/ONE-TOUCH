/**
 * ClientHome.tsx — Client dashboard
 * Request Service · Only Call in App (AI voice assistant with 7 stages)
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Text, Group, Stack, Badge, Button, Paper, ThemeIcon, ActionIcon,
  Avatar, Modal, Divider, SimpleGrid, Textarea, Progress,
} from '@mantine/core';
import {
  IconPhone, IconMapPin, IconCheck, IconHistory, IconWallet, IconStar,
  IconHeart, IconLogout, IconMenu2, IconX, IconMicrophone, IconPhoneCall,
  IconPhoneOff, IconSearch, IconChevronRight,
  IconBell, IconBellFilled, IconCircleFilled, IconSparkles, IconBriefcase,
  IconArrowRight, IconStarFilled,
} from '@tabler/icons-react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
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

const FAKE_PROVIDERS = [
  {name:'Abebe T.', rating:4.9, dist:1.2},
  {name:'Sara M.',  rating:4.8, dist:1.7},
  {name:'Dawit K.', rating:4.7, dist:2.0},
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
  const {currentUser,clientProfile,logout}=useAuthStore();
  const {jobs,createJob}=useJobStore();
  const {unreadCount,fetchNotifications,addNotification}=useNotificationStore();

  const [sidebar,setSidebar]=useState(false);
  const [aOpen,setAOpen]=useState(false);
  const [aStage,setAStage]=useState<AStage>('idle');
  const [desc,setDesc]=useState('');
  const [fQ,setFQ]=useState('');
  const [fA,setFA]=useState('');
  const [foundProv,setFoundProv]=useState(FAKE_PROVIDERS[0]);
  const [estPrice,setEstPrice]=useState({min:120,max:280});
  const aTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  const [cOpen,setCOpen]=useState(false);
  const [cStage,setCStage]=useState<CStage>('idle');
  const [cCat,setCCat]=useState('');
  const [cPrice,setCPrice]=useState({min:80,max:200});
  const cTimer=useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{
    if(!currentUser){nav(ROUTES.login);return;}
    fetchNotifications(currentUser.id);
    return()=>{if(aTimer.current)clearTimeout(aTimer.current);if(cTimer.current)clearTimeout(cTimer.current);};
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
    const min=80+Math.floor(Math.random()*120);
    setEstPrice({min,max:min+130});
    aTimer.current=setTimeout(()=>{
      setFoundProv(FAKE_PROVIDERS[Math.floor(Math.random()*FAKE_PROVIDERS.length)]);
      setAStage('found');
    },3500);
  }
  function confirmJob(){
    if(!currentUser)return;
    const catId=MOCK_CATEGORIES[Math.floor(Math.random()*MOCK_CATEGORIES.length)]?.id??'cat-001';
    createJob({clientId:currentUser.id,providerId:'provider-001',categoryId:catId,
      subcategoryId:'sub-001',description:desc,estimatedPrice:estPrice.min,
      status:'pending_agreement',commissionRate:10,
      clientLocation:{lat:MAP_CTR[0],lng:MAP_CTR[1],address:'Your location, Addis Ababa'},
      createdAt:new Date().toISOString()} as any);
    addNotification({id:`n-${Date.now()}`,userId:'provider-001',type:'new_job' as any,
      title:'New Job Request',message:`Client needs: ${desc.slice(0,60)}`,isRead:false,createdAt:new Date().toISOString()});
    setAStage('confirmed');
    notifications.show({title:'Request Sent!',message:'A provider will contact you shortly.',color:'teal'});
  }
  function closeAssist(){if(aTimer.current)clearTimeout(aTimer.current);setAOpen(false);setTimeout(()=>setAStage('idle'),300);}

  /* ── Category call ───────────────────────────────────────────────────────── */
  function startCall(catName:string){
    setCCat(catName);const min=80+Math.floor(Math.random()*80);setCPrice({min,max:min+100});
    setCOpen(true);setCStage('dialing');
    cTimer.current=setTimeout(()=>setCStage('connected'),1800);
    setTimeout(()=>setCStage('listening'),3200);
    setTimeout(()=>setCStage('processing'),8000);
    setTimeout(()=>setCStage('done'),10200);
  }
  function confirmCall(){
    if(!currentUser)return;
    const cat=MOCK_CATEGORIES.find(c=>c.name===cCat);
    createJob({clientId:currentUser.id,providerId:'provider-001',categoryId:cat?.id??'cat-001',
      subcategoryId:'sub-001',description:`${cCat} service request`,
      estimatedPrice:cPrice.min,status:'pending_agreement',commissionRate:10,
      clientLocation:{lat:MAP_CTR[0],lng:MAP_CTR[1],address:'Your location'},
      createdAt:new Date().toISOString()} as any);
    closeCall();
    notifications.show({title:'Booked!',message:`Your ${cCat} request is live.`,color:'teal'});
  }
  function closeCall(){if(cTimer.current)clearTimeout(cTimer.current);setCOpen(false);setTimeout(()=>setCStage('idle'),300);}

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
              <Box px={12} py={5} style={{borderRadius:20,background:`${T}15`,border:`1px solid ${T}40`}}>
                <Text size="xs" fw={600} c={T}>
                  Hi, {clientProfile?.fullName?.split(' ')[0]??'there'} 👋
                </Text>
              </Box>
              <ActionIcon variant="subtle" size="lg" style={{position:'relative'}}>
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

        {/* Hero CTAs */}
        <SimpleGrid cols={2} spacing={14} mb={28}>
          {/* Only Call in App */}
          <Paper p="xl" radius="xl" onClick={startAssist}
            style={{background:`linear-gradient(145deg,${N},${T})`,cursor:'pointer',
              position:'relative',overflow:'hidden',minHeight:180}}>
            <Box style={{position:'absolute',top:-24,right:-24,width:130,height:130,
              borderRadius:'50%',background:'rgba(255,255,255,.07)'}}/>
            <Stack gap={10} style={{position:'relative',zIndex:1}}>
              <Box w={52} h={52} style={{borderRadius:16,background:'rgba(255,255,255,.2)',
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconPhoneCall size={28} color="white"/>
              </Box>
              <Box>
                <Text fw={900} size="lg" c="white" lh={1.1}>Only Call</Text>
                <Text fw={900} size="lg" c="rgba(255,255,255,.9)" lh={1.1}>in App</Text>
              </Box>
              <Text size="xs" c="rgba(255,255,255,.72)">AI assistant finds the right pro for you</Text>
              <Group gap={6}>
                <Badge size="xs" style={{background:'rgba(255,255,255,.2)',color:'white',border:'none'}}>Smart match</Badge>
                <Badge size="xs" style={{background:'rgba(255,255,255,.2)',color:'white',border:'none'}}>Fast</Badge>
              </Group>
            </Stack>
          </Paper>

          {/* Browse Services */}
          <Paper p="xl" radius="xl"
            style={{background:'var(--ot-bg-card)',border:`2px solid ${T}44`,
              cursor:'pointer',position:'relative',overflow:'hidden',minHeight:180}}>
            <Box style={{position:'absolute',top:-20,right:-20,width:110,height:110,
              borderRadius:'50%',background:`${T}10`}}/>
            <Stack gap={10} style={{position:'relative',zIndex:1}}>
              <Box w={52} h={52} style={{borderRadius:16,background:`${T}18`,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconSearch size={28} color={T}/>
              </Box>
              <Box>
                <Text fw={900} size="lg" c={N} lh={1.1}>Browse</Text>
                <Text fw={900} size="lg" c={N} lh={1.1}>Services</Text>
              </Box>
              <Text size="xs" c="var(--ot-text-sub)">Pick from all categories below</Text>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Category grid */}
        <Text fw={800} size="sm" c={N} mb={14}>All Services</Text>
        <SimpleGrid cols={{base:4,sm:7}} spacing={10} mb={32}>
          {MOCK_CATEGORIES.map(cat=>(
            <Paper key={cat.id} p="12px 8px" radius="xl" onClick={()=>startCall(cat.name)}
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
        ):(
          <Paper p="xl" radius="xl"
            style={{background:'var(--ot-bg-card)',border:'2px dashed var(--ot-border)',textAlign:'center'}}>
            <Stack align="center" gap={12}>
              <Text style={{fontSize:44}}>🛠️</Text>
              <Text fw={700} size="md" c={N}>No requests yet</Text>
              <Text size="sm" c="var(--ot-text-sub)">Tap "Only Call in App" or choose a category above.</Text>
              <Button size="sm" radius="xl"
                style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                leftSection={<IconPhoneCall size={15}/>} onClick={startAssist}>
                Call AI Assistant
              </Button>
            </Stack>
          </Paper>
        )}
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
                <IconPhoneCall size={44} color="white"/>
              </Box>
            </Box>
            <Stack align="center" gap={4}>
              <Text fw={800} size="lg" c={N}>Connecting…</Text>
              <Text size="sm" c="dimmed">Reaching OneTouch AI</Text>
            </Stack>
            <Button variant="light" color="red" radius="xl" size="sm"
              leftSection={<IconPhoneOff size={14}/>} onClick={closeAssist}>Cancel</Button>
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

        {/* Listening */}
        {aStage==='listening'&&(
          <Stack gap="md" p={4}>
            <Group gap={12} p="md" style={{background:`${N}08`,borderRadius:16}}>
              <Box w={44} h={44} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${N},${T})`,
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <IconMicrophone size={22} color="white"/>
              </Box>
              <Box>
                <Text fw={700} size="sm" c={N}>Describe your problem</Text>
                <Text size="xs" c="dimmed">What service do you need today?</Text>
              </Box>
            </Group>
            <Textarea autosize minRows={3} maxRows={7}
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
              <ActionIcon size="xl" radius="xl" variant="light" color="gray" onClick={closeAssist}>
                <IconX size={18}/>
              </ActionIcon>
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
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                <AnimRing ctr={MAP_CTR} color={T}/>
              </MapContainer>
            </Box>
            <Progress value={70} color="teal" size="sm" radius="xl" animated/>
          </Stack>
        )}

        {/* Found */}
        {aStage==='found'&&(
          <Stack gap="md" p={4}>
            <Paper p="lg" radius="xl"
              style={{background:`linear-gradient(135deg,${N}f0,${T}e0)`}}>
              <Stack align="center" gap={8}>
                <Badge size="lg" variant="filled" color="yellow"
                  leftSection={<IconSparkles size={12}/>}>Provider Found!</Badge>
                <Avatar size={60} radius="xl" color="teal" fw={800}
                  style={{fontSize:24}}>{foundProv.name.charAt(0)}</Avatar>
                <Text fw={900} size="lg" c="white">{foundProv.name}</Text>
                <Group gap={16}>
                  <Group gap={4}><IconStarFilled size={13} color={COLORS.warning}/><Text size="sm" fw={700} c="white">{foundProv.rating}</Text></Group>
                  <Group gap={4}><IconMapPin size={13} color="rgba(255,255,255,.7)"/><Text size="sm" c="rgba(255,255,255,.85)">{foundProv.dist} km</Text></Group>
                </Group>
              </Stack>
            </Paper>
            <Paper p="md" radius="lg" style={{background:'var(--ot-bg-row)',border:'1px solid var(--ot-border)'}}>
              <Group justify="space-between">
                <Text size="sm" c="var(--ot-text-sub)">Estimated price</Text>
                <Text size="lg" fw={800} c={N}>{CURRENCY_SYMBOL} {estPrice.min}–{estPrice.max}</Text>
              </Group>
            </Paper>
            <Group gap={8}>
              <Button flex={1} size="md" radius="xl"
                style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                onClick={confirmJob}>Confirm & Request</Button>
              <Button flex={1} size="md" radius="xl" variant="light" color="gray"
                onClick={closeAssist}>Cancel</Button>
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
              <Paper p="lg" radius="xl"
                style={{background:`linear-gradient(135deg,${N}f0,${T}dd)`}}>
                <Stack align="center" gap={8}>
                  <Badge size="lg" color="yellow" variant="filled"
                    leftSection={<IconCheck size={11}/>}>Provider Ready!</Badge>
                  <Text fw={900} size="xl" c="white">{FAKE_PROVIDERS[0].name}</Text>
                  <Group gap={16}>
                    <Group gap={4}><IconStarFilled size={13} color={COLORS.warning}/><Text size="sm" fw={700} c="white">{FAKE_PROVIDERS[0].rating}</Text></Group>
                    <Group gap={4}><IconMapPin size={13} color="rgba(255,255,255,.7)"/><Text size="sm" c="rgba(255,255,255,.85)">{FAKE_PROVIDERS[0].dist} km</Text></Group>
                  </Group>
                  <Text size="xl" fw={800} c="white">{CURRENCY_SYMBOL} {cPrice.min}–{cPrice.max}</Text>
                </Stack>
              </Paper>
              <Group gap={8}>
                <Button flex={1} size="md" radius="xl"
                  style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                  onClick={confirmCall}>Confirm</Button>
                <Button flex={1} size="md" radius="xl" variant="light" color="gray"
                  onClick={closeCall}>Cancel</Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>

      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.55}}
      `}</style>
    </Box>
  );
}

export default ClientHome;
