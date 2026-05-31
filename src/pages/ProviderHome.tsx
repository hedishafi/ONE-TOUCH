/**
 * ProviderHome.tsx — Provider dashboard
 * Live map · Online/Offline toggle · Incoming requests · Accept → Chapa → Reveal phone
 */
import { useState, useEffect, memo, useCallback } from 'react';
import {
  Box, Text, Group, Stack, Badge, Button, Paper, ThemeIcon, Switch,
  ActionIcon, Avatar, Divider, SimpleGrid, Modal, ScrollArea, PasswordInput,
} from '@mantine/core';
import {
  IconBriefcase, IconTrendingUp, IconUser, IconWallet,
  IconBell, IconBellFilled, IconMenu2, IconX, IconLogout,
  IconCheck, IconClock, IconMapPin, IconCircleFilled, IconGift,
  IconShieldCheck, IconCurrencyDollar, IconPhoneCall, IconRadar, IconStar,
  IconAlertCircle, IconWifiOff,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { useJobStore, useNotificationStore } from '../store/jobStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { COLORS, ROUTES } from '../utils/constants';
import * as authService from '../services/authService';
import { RoleSwitcher } from '../components/RoleSwitcher';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { OnlineOfflineToggle } from '../components/OnlineOfflineToggle';
import { OSMProviderMap } from '../components/OSMProviderMap';
import { useServiceCatalog } from '../hooks/useServiceCatalog';
import { getAvailableOrders, acceptOrder, declineOrder, getProviderMe } from '../api/ordersApi';
// import { ChapaModal } from '../components/ChapaModal';
import type { ProviderProfile, User } from '../types';

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

interface Req {
  id: string; clientName: string; clientId: string; clientRating: number; clientJobsDone: number;
  catId: string; desc: string; addr: string;
  price: number; dist: number; coords: [number, number]; at: string;
}

const CANCEL_REASONS = [
  'Already on another job',
  'Location is too far',
  'Price does not match my rate',
  'Service outside my expertise',
  'Personal emergency',
  'Other',
];


// Memoized map component — prevents Leaflet from re-mounting when sidebar opens/closes
interface ProviderMapProps {
  online: boolean;
  restricted: boolean;
  profileName: string;
  onGoOnline: () => void;
}

const ProviderMap = memo(function ProviderMap({ online }: ProviderMapProps) {
  const handleLocationUpdate = (lat: number, lng: number) => {
    console.log('Provider location updated:', lat, lng);
  };

  return (
    <OSMProviderMap
      isOnline={online}
      searchRadius={10}
      onLocationUpdate={handleLocationUpdate}
      height="420px"
    />
  );
});

const NAV = [
  {labelKey:'providerHome.nav_dashboard',          icon:<IconCircleFilled size={16}/>, r:ROUTES.providerDashboard},
  {labelKey:'providerHome.nav_my_orders',          icon:<IconBriefcase    size={16}/>, r:ROUTES.providerOrders},
  {labelKey:'providerHome.nav_profile_setup',      icon:<IconUser         size={16}/>, r:'/provider/profile-setup'},
  {labelKey:'providerHome.nav_services',           icon:<IconBriefcase    size={16}/>, r:'/provider/profile-setup'},
  {labelKey:'providerHome.nav_wallet',             icon:<IconWallet       size={16}/>, r:ROUTES.providerWallet},
  {labelKey:'providerHome.nav_earnings',           icon:<IconTrendingUp   size={16}/>, r:ROUTES.providerEarnings},
];

export function ProviderHome() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const RESUBMIT_SUCCESS_FLAG = 'provider_verification_resubmitted';
  const {currentUser, providerProfile:authProf, updateProviderOnlineStatus, logout} = useAuthStore();
  const {jobs} = useJobStore();
  const {unreadCount, fetchNotifications, addNotification} = useNotificationStore();
  const { categories } = useServiceCatalog();

  console.log('🏠 ProviderHome rendered, currentUser:', currentUser);

  const [profile,   setProfile]   = useState<ProviderProfile|null>(authProf);
  const [online,    setOnline]    = useState(authProf?.isOnline ?? false);
  const [sidebar,   setSidebar]   = useState(false);
  const [realOrders, setRealOrders] = useState<any[]>([]);

  // Real free jobs remaining — fetched from backend, decremented on each accept
  const [trials, setTrials] = useState(FREE_TRIAL_TOTAL);
  // const [chapaOpen, setChapaOpen] = useState(false);
  const [pending,   setPending]   = useState<Req|null>(null);
  const [payOpen,   setPayOpen]   = useState(false);
  const [payPassword, setPayPassword] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [revOpen,   setRevOpen]   = useState(false);
  const [revealed,  setRevealed]  = useState<{req:Req;phone:string}|null>(null);

  // Cancel-reason modal
  const [cancelTarget,  setCancelTarget]  = useState<Req|null>(null);
  const [cancelReason,  setCancelReason]  = useState('');
  const [cancelDone,    setCancelDone]    = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showResubmittedNotice, setShowResubmittedNotice] = useState(false);

  const verificationStatus = currentUser?.verificationStatus ?? 'pending';
  const isVerified = verificationStatus === 'verified';
  const isUnderReview = verificationStatus === 'pending';
  const isRestricted = !isVerified;
  const localizedDate = new Intl.DateTimeFormat('en-ET', { dateStyle: 'medium' }).format(new Date());
  // Platform commission percentage (fixed)
  const commPct  = 2;
  const getCategoryName = useCallback(
    (id: string) => categories.find(c => c.id === id)?.name ?? 'Service',
    [categories]
  );

  useEffect(()=>{
    if (!currentUser) { nav(ROUTES.login); return; }
    const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
    const p = profiles.find(x=>x.userId===currentUser.id);
    if (p) { setProfile(p); setOnline(p.isOnline); }
    // Fetch real free_jobs_remaining from backend (source of truth)
    getProviderMe().then((data: any) => {
      const backendTrials = data?.free_jobs_remaining ?? FREE_TRIAL_TOTAL;
      setTrials(backendTrials);
      // Keep localStorage in sync
      if (currentUser) saveTrials(currentUser.id, backendTrials);
    }).catch(() => {
      // Fallback to localStorage if backend unavailable
      setTrials(getTrials(currentUser.id));
    });
    fetchNotifications(currentUser.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentUser?.id]);

  useEffect(() => {
    if (sessionStorage.getItem(RESUBMIT_SUCCESS_FLAG) === '1') {
      setShowResubmittedNotice(true);
      sessionStorage.removeItem(RESUBMIT_SUCCESS_FLAG);
    }
  }, []);

  useEffect(() => {
    if (!online) return;
    const fetchOrders = async () => {
      try {
        const data = await getAvailableOrders() as any;
        setRealOrders(Array.isArray(data) ? data : data.results ?? []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [online]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'provider') return;

    let isMounted = true;

    const refreshProviderStatus = async () => {
      try {
        const [latest, onboardingStatus] = await Promise.all([
          authService.getProfile(),
          authService.getProviderOnboardingStatus(),
        ]);
        if (!isMounted || latest.role !== 'provider') return;

        const latestStatus: 'pending' | 'verified' | 'rejected' | 're-verification-requested' =
          latest.verification_status === 'verified'
            ? 'verified'
            : latest.verification_status === 'rejected'
              ? 'rejected'
              : latest.verification_status === 're-verification-requested'
                ? 're-verification-requested'
                : 'pending';

        const updatedUser = {
          ...currentUser,
          phone: latest.phone_number,
          verificationStatus: latestStatus,
          providerUid: latest.provider_uid,
        };

        storage.set(STORAGE_KEYS.currentUser, updatedUser);
        useAuthStore.setState({ currentUser: updatedUser });

        if (latestStatus === 'rejected' && onboardingStatus.rejection_reason) {
          setRejectionReason(onboardingStatus.rejection_reason);
        } else {
          setRejectionReason('');
        }
      } catch {
        // Keep local status if refresh fails.
      }
    };

    refreshProviderStatus();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const visible   = online ? realOrders : [];
  const myJobs    = jobs.filter(j=>j.providerId===currentUser?.id);
  const done      = myJobs.filter(j=>j.status==='completed');
  

  const toggle = useCallback((v:boolean) => {
    if (isRestricted) {
      notifications.show({
        title: isUnderReview ? t('providerHome.account_under_review') : t('providerHome.account_not_verified'),
        message: isUnderReview
          ? t('providerHome.cannot_go_online_review')
          : t('providerHome.cannot_go_online_unverified'),
        color: 'yellow',
      });
      return;
    }
    setOnline(v); updateProviderOnlineStatus(v);
    notifications.show({title: v ? t('providerHome.now_online') : t('provider.now_offline'),
      message: v ? t('providerHome.now_online_msg') : t('provider.now_offline_msg'), color:v?'teal':'gray'});
  },[isRestricted, isUnderReview, updateProviderOnlineStatus, t]);

  function finalize(req:Req) {
    const all = storage.get<User[]>(STORAGE_KEYS.users,[]);
    const cl  = all.find(u=>u.id===req.clientId)??all.find(u=>u.role==='client');
    const ph  = cl?.phone??'+251-912-345-678';
    setRevealed({req,phone:ph}); setRevOpen(true);
    addNotification({id:`n-${Date.now()}`,userId:req.clientId,type:'job_update' as any,
      title:'Provider Confirmed!',message:`Provider accepted your ${getCategoryName(req.catId)} request.`,
      isRead:false,createdAt:new Date().toISOString()});
  }

  function submitCancel() {
    if (!cancelReason || !cancelTarget) return;
    setCancelDone(true);
    setTimeout(() => {
      notifications.show({title:'Request declined', message:'Passed to next available provider.', color:'gray'});
      setCancelTarget(null);
      setCancelDone(false);
      setCancelReason('');
    }, 1800);
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
                <Badge size="xs" variant="light" color={isVerified ? 'green' : isUnderReview ? 'yellow' : 'red'}>
                  {isVerified ? t('providerHome.verified') : isUnderReview ? t('providerHome.under_review') : t('providerHome.not_verified')}
                </Badge>
                <Box w={7} h={7} style={{borderRadius:'50%',background:online?COLORS.success:'#aaa'}}/>
                <Text size="10px" c={online?COLORS.success:'dimmed'} fw={600}>{online ? t('provider.online') : t('provider.offline')}</Text>
              </Group>
              <Text size="10px" c="dimmed">UID: {currentUser?.providerUid ?? '—'}</Text>
              <Text size="10px" c="dimmed">{localizedDate}</Text>
            </Box>
          </Group>
        </Box>
        <Divider/>
        <Stack gap={2} p="sm" style={{flex:1}}>
          {currentUser?.role === 'provider' && NAV.map(n=>(
            <Box key={n.labelKey} p={10}
              onClick={()=>{setSidebar(false);nav(n.r);}}
              style={{borderRadius:10,display:'flex',alignItems:'center',gap:10,
                fontWeight:600,fontSize:14,color:'var(--ot-text-muted)',
                cursor:'pointer'}}>
              {n.icon} {t(n.labelKey)}
            </Box>
          ))}
          <Paper p="xs" radius="md" mt="xs" style={{border:'1px solid var(--ot-border)'}}>
            <Text size="xs" fw={700} c={N}>{t('providerHome.id_verification_status')}</Text>
            <Badge mt={6} size="sm" variant="light" color={isVerified ? 'green' : isUnderReview ? 'yellow' : 'red'}>
              {isVerified ? t('providerHome.verified') : isUnderReview ? t('providerHome.under_review') : t('providerHome.not_verified')}
            </Badge>
          </Paper>
        </Stack>
        <Box p="md" style={{borderTop:'1px solid var(--ot-border)'}}>
          <LanguageSwitcher />
          <RoleSwitcher />
          <Box p={10}
            onClick={()=>{logout();nav(ROUTES.landing);}}
            style={{borderRadius:10,display:'flex',alignItems:'center',
              gap:10,color:'var(--ot-text-muted)',cursor:'pointer',marginTop:8}}>
            <IconLogout size={18}/> {t('nav.logout')}
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
                <Text fw={800} size="sm" c={N} visibleFrom="sm">{t('providerHome.header_title')}</Text>
              </Group>
            </Group>
            <Group gap={12}>
              <OnlineOfflineToggle 
                initialOnline={online} 
                disabled={isRestricted}
                onStatusChange={(isOnline) => {
                  setOnline(isOnline);
                  updateProviderOnlineStatus(isOnline);
                }}
              />
              {/* Language Switcher */}
              <LanguageSwitcher />
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

        {isUnderReview && (
          <Paper mb={20} p="md" radius="xl" style={{background:'#FFFBEA', border:'1px solid #FCD34D'}}>
            <Text fw={700} size="sm" c={N}>{t('providerHome.under_review_title')}</Text>
            <Text size="xs" c="dimmed">{t('providerHome.under_review_hint')}</Text>
          </Paper>
        )}

        {showResubmittedNotice && (
          <Paper mb={20} p="md" radius="xl" style={{background:'#ECFDF5', border:'1px solid #6EE7B7'}}>
            <Group justify="space-between" align="flex-start" gap={12}>
              <Box>
                <Text fw={700} size="sm" c={N}>{t('providerHome.resubmitted_title')}</Text>
                <Text size="xs" c="dimmed">{t('providerHome.resubmitted_hint')}</Text>
              </Box>
              <Button size="xs" variant="subtle" color="teal" onClick={() => setShowResubmittedNotice(false)}>
                {t('providerHome.dismiss')}
              </Button>
            </Group>
          </Paper>
        )}

        {verificationStatus === 'rejected' && rejectionReason && (
          <Paper mb={20} p="md" radius="xl" style={{background:'#FFF1F2', border:'1px solid #FCA5A5'}}>
            <Group gap={8} align="flex-start">
              <IconAlertCircle size={18} color={COLORS.error} />
              <Box>
                <Text fw={700} size="sm" c={N}>{t('providerHome.rejected_title')}</Text>
                <Text size="xs" c="dimmed">{t('providerHome.rejected_hint', { reason: rejectionReason })}</Text>
              </Box>
            </Group>
          </Paper>
        )}

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
                  {online ? t('provider.online') : t('provider.offline')}
                </Text>
              </Group>
              <Text size="sm" c={online?'rgba(255,255,255,.75)':'var(--ot-text-sub)'} mb={online?12:0}>
                {online ? t('providerHome.online_hint') : t('providerHome.offline_hint')}
              </Text>
              {online&&(
                <Group gap={8}>
                  <Badge variant="light" color="yellow" size="sm" leftSection={<IconRadar size={10}/>}>{t('providerHome.scanning')}</Badge>
                  {visible.length>0&&<Badge variant="filled" color="red" size="sm">
                    {visible.length} {t('providerHome.new_requests', { count: visible.length })}
                  </Badge>}
                </Group>
              )}
            </Box>
            <OnlineOfflineToggle 
              initialOnline={online} 
              disabled={isRestricted}
              onStatusChange={(isOnline) => {
                setOnline(isOnline);
                updateProviderOnlineStatus(isOnline);
              }}
            />
          </Group>
        </Paper>

        {/* Stats */}
        <SimpleGrid cols={{base:2,sm:2}} spacing={12} mb={20}>
          {[
            {label: t('providerHome.stat_rating'),        value:`${(profile?.rating??0).toFixed(1)} \u2605`, icon:<IconStar size={18}/>, c:COLORS.warning},
            {label: t('providerHome.stat_jobs_accepted'), value:`${profile?.totalJobsCompleted??done.length}`, icon:<IconCheck size={18}/>,   c:T},
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
                <Text fw={700} size="sm">{t('providerHome.free_trial_title')}</Text>
                <Text size="xs" c="var(--ot-text-sub)">
                  {trials>0 ? t('providerHome.free_trial_remaining', { count: trials }) : t('providerHome.free_trial_commission', { pct: commPct })}
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

          {/* Map — Google Maps with real-time location tracking */}
          <ProviderMap
            online={online}
            restricted={isRestricted}
            profileName={profile?.fullName??'You'}
            onGoOnline={() => toggle(true)}
          />

          {/* Request list */}
          <Box>
            <Group justify="space-between" mb={14}>
              <Text fw={800} size="sm" c={N}>{t('providerHome.incoming_requests')}</Text>
              {visible.length>0&&<Badge color="red" variant="filled" size="xs">{visible.length} {t('providerHome.new_badge')}</Badge>}
            </Group>

            {!online?(
              <Paper p="xl" radius="xl" style={{background:'var(--ot-bg-card)',border:'2px dashed var(--ot-border)',textAlign:'center'}}>
                <Stack align="center" gap={10}>
                  <Text style={{fontSize:44}}>📡</Text>
                  <Text size="sm" c="var(--ot-text-sub)">{isUnderReview ? t('providerHome.offline_under_review') : isVerified ? t('providerHome.offline_go_online') : t('providerHome.offline_not_verified')}</Text>
                  <Button size="xs" variant="light" color="teal" onClick={()=>toggle(true)} disabled={isRestricted}>{t('provider.online')}</Button>
                </Stack>
              </Paper>
            ):visible.length===0?(
              <Paper p="xl" radius="xl" style={{background:'var(--ot-bg-card)',border:'1px solid var(--ot-border)',textAlign:'center'}}>
                <Stack align="center" gap={10}>
                  <Text style={{fontSize:44}}>🔍</Text>
                  <Text size="sm" c="var(--ot-text-sub)">{t('providerHome.scanning_requests')}</Text>
                </Stack>
              </Paper>
            ):(
              <ScrollArea.Autosize mah={440} scrollbarSize={4}>
                <Stack gap={12}>
                  {visible.map((order: any) => (
                    <Paper key={order.id} p="md" radius="xl"
                      style={{background:'var(--ot-bg-card)', border:`2px solid ${COLORS.warning}55`,
                        position:'relative', overflow:'hidden'}}>
                      <Box style={{position:'absolute',top:0,left:0,width:4,height:'100%',
                        background:COLORS.warning,borderRadius:'4px 0 0 4px'}}/>
                      <Stack gap={10} pl={8}>
                        <Text size="sm" fw={700} c={N} lineClamp={2}>{order.description}</Text>
                        <Group gap={14}>
                          <Group gap={4}>
                            <IconMapPin size={11}/>
                            <Text size="xs" c="var(--ot-text-muted)">
                              {order.distance_km?.toFixed(1) ?? 'N/A'} km
                            </Text>
                          </Group>
                          <Group gap={4}>
                            <IconClock size={11}/>
                            <Text size="xs" c="var(--ot-text-muted)">
                              {order.expires_at ? Math.max(0, Math.floor((new Date(order.expires_at).getTime() - new Date().getTime()) / 60000)) + ` ${t('providerHome.min_left')}` : 'N/A'}
                            </Text>
                          </Group>
                        </Group>
                        <Group gap={4} py={8} px={12} style={{background:'var(--ot-bg-row)',borderRadius:10}}>
                          <Box style={{flex:1,textAlign:'center'}}>
                            <Text size="10px" c="var(--ot-text-muted)">
                              {trials > 0 ? t('providerHome.free_trial_label') : t('providerHome.commission_fee_label')}
                            </Text>
                            {trials > 0 ? (
                              <Badge size="xs" color="teal" variant="light">{t('providerHome.free_badge', { current: FREE_TRIAL_TOTAL - trials + 1, total: FREE_TRIAL_TOTAL })}</Badge>
                            ) : (
                              <Text size="xs" fw={700} c={COLORS.error}>{order.estimated_commission ?? t('providerHome.calc_on_accept')} ETB</Text>
                            )}
                          </Box>
                        </Group>
                        <Group gap={8}>
                          <Button flex={1} size="xs" radius="xl"
                            style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
                            leftSection={<IconCheck size={13}/>}
                            onClick={async () => {
                              try {
                                await acceptOrder(order.id);
                                setRealOrders(prev => prev.filter(o => o.id !== order.id));
                                notifications.show({title: t('providerHome.order_accepted_title'), message: t('providerHome.order_accepted_msg'), color:'teal'});
                              } catch(err: any) {
                                notifications.show({title: t('providerHome.error'), message: err?.detail || t('providerHome.failed_accept'), color:'red'});
                              }
                            }}>
                            {t('provider.accept')}
                          </Button>
                          <Button flex={1} size="xs" radius="xl" variant="light" color="red"
                            onClick={async () => {
                              try {
                                await declineOrder(order.id);
                                setRealOrders(prev => prev.filter(o => o.id !== order.id));
                              } catch(err: any) {
                                notifications.show({title: t('providerHome.error'), message: err?.detail || t('providerHome.failed_decline'), color:'red'});
                              }
                            }}>
                            {t('provider.decline')}
                          </Button>
                        </Group>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Box>
        </SimpleGrid>
      </Box>

      {/* Cancel reason modal */}
      <Modal opened={!!cancelTarget} onClose={()=>{if(!cancelDone)setCancelTarget(null);}}
        centered radius="xl" size="sm" withCloseButton={false}
        styles={{content:{background:'var(--ot-bg-card)'},header:{display:'none'}}}>
        <Stack gap="md" p="md">
          {!cancelDone ? (
            <>
              <Group justify="space-between">
                <Text fw={800} size="md" c={N}>{t('providerHome.decline_why')}</Text>
                <ActionIcon variant="subtle" onClick={()=>setCancelTarget(null)}><IconX size={18}/></ActionIcon>
              </Group>
              {cancelTarget&&(
                <Group gap={8} p="sm"
                  style={{background:`${N}08`,borderRadius:12,border:`1px solid ${N}18`}}>
                  <Avatar size={32} radius="xl" color="teal">{cancelTarget.clientName.charAt(0)}</Avatar>
                  <Box>
                    <Text size="xs" fw={700} c={N}>{cancelTarget.clientName}</Text>
                    <Text size="xs" c="dimmed">{getCategoryName(cancelTarget.catId)} · {cancelTarget.dist} km</Text>
                  </Box>
                </Group>
              )}
              <Text size="xs" c="dimmed">{t('providerHome.decline_reason_hint')}</Text>
              <Stack gap={8}>
                {CANCEL_REASONS.map((r, i)=>(
                  <Button key={r} size="sm" radius="xl" fullWidth
                    variant={cancelReason===r?'filled':'light'}
                    color={cancelReason===r?'red':'gray'}
                    styles={{root:{justifyContent:'flex-start',paddingLeft:20,fontWeight:600}}}
                    onClick={()=>setCancelReason(r)}>{t(`providerHome.decline_reason_${i}`)}</Button>
                ))}
              </Stack>
              {/* Offline nudge */}
              <Paper p="sm" radius="lg"
                style={{background:`${COLORS.warning}18`,border:`1px solid ${COLORS.warning}44`}}>
                <Group gap={8}>
                  <IconAlertCircle size={16} color={COLORS.warning}/>
                  <Text size="xs" c="dimmed" style={{flex:1}}>
                    {t('providerHome.offline_nudge_pre')}
                    <Text span fw={700} c={N}> {t('provider.offline')}</Text> {t('providerHome.offline_nudge_post')}
                  </Text>
                </Group>
                <Group gap={8} mt={10} align="center">
                  <IconWifiOff size={14} color={COLORS.warning}/>
                  <Text size="xs" fw={600} c={COLORS.warning}>{t('provider.go_offline')}</Text>
                  <Switch size="xs" color="orange"
                    disabled={isRestricted}
                    onChange={e=>{if(e.currentTarget.checked){toggle(false);notifications.show({title: t('provider.now_offline'), message: t('provider.now_offline_msg'), color:'orange'});}}} />
                </Group>
              </Paper>
              <Button size="md" radius="xl" color="red" disabled={!cancelReason} onClick={submitCancel}>
                {t('providerHome.decline_submit')}
              </Button>
            </>
          ):(
            <Stack align="center" gap="md" py={12}>
              <Box w={64} h={64} style={{borderRadius:'50%',
                background:`linear-gradient(135deg,${COLORS.warning},#ff6b35)`,
                display:'flex',alignItems:'center',justifyContent:'center'}}>
                <IconCheck size={32} color="white"/>
              </Box>
              <Text fw={800} size="lg" c={N}>{t('providerHome.decline_done_title')}</Text>
              <Text size="sm" c="dimmed" ta="center">{t('providerHome.decline_done_hint')}</Text>
            </Stack>
          )}
        </Stack>
      </Modal>

      {/* Chapa Modal */}
        {/* TeleBirr / payment confirmation modal (TeleBirr-only) */}
        <Modal opened={payOpen} onClose={()=>{ if(!pending) setPayOpen(false); }} centered radius="xl" size="sm" withCloseButton={false}
          styles={{content:{background:'var(--ot-bg-card)'},header:{display:'none'}}}>
          <Stack gap="md" p="lg" align="center">
            <Box w={64} h={64} style={{borderRadius:'50%',background:`linear-gradient(135deg,${COLORS.warning},${T})`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <IconCurrencyDollar size={32} color="white"/>
            </Box>
            <Text fw={800} size="lg" c={N}>{t('providerHome.telebirr_title')}</Text>
            <Text size="sm" c="dimmed" ta="center">{t('providerHome.telebirr_hint')}</Text>
            <Box style={{width:'100%'}}>
              <PasswordInput placeholder={t('providerDashboard.telebirr_password_placeholder')} value={payPassword} onChange={(e)=>{setPayPassword(e.currentTarget.value); setPayError('');}} required />
              {payError && <Text size="xs" c="red" mt={6}>{payError}</Text>}
              <Group w="100%" mt="md">
                <Button flex={1} size="md" radius="xl" color="teal" loading={payLoading} onClick={async ()=>{
                  if (!pending) { notifications.show({title: t('providerHome.error'), message: t('providerHome.no_pending'), color:'red'}); return; }
                  if (!payPassword || payPassword.trim().length < 4) { setPayError(t('providerDashboard.telebirr_err_short')); return; }
                  try {
                    setPayLoading(true);
                    // simulate TeleBirr verification delay
                    await new Promise(r=>setTimeout(r,1200));
                    finalize(pending);
                    setPayOpen(false);
                    setPending(null);
                    setPayPassword('');
                    notifications.show({title: t('providerHome.payment_confirmed'), message: t('providerHome.phone_revealed'), color:'teal'});
                  } catch(err) {
                    console.error(err);
                    setPayError(t('providerHome.telebirr_verify_fail'));
                    notifications.show({title: t('providerHome.payment_error'), message: t('providerHome.payment_error_msg'), color:'red'});
                  } finally { setPayLoading(false); }
                }}>{t('providerHome.confirm_reveal')}</Button>
                <Button flex={1} size="md" radius="xl" variant="light" color="gray" onClick={()=>{ setPayOpen(false); setPending(null); setPayPassword(''); setPayError(''); }}>{t('providerHome.cancel')}</Button>
              </Group>
            </Box>
          </Stack>
        </Modal>

      {/* Reveal phone modal */}
      <Modal opened={revOpen} onClose={()=>setRevOpen(false)} centered radius="xl" size="sm"
        withCloseButton={false} styles={{content:{background:'white'},header:{display:'none'}}}>
        <Stack align="center" gap="md" p="lg" pt="xl">
          <Box w={80} h={80} style={{borderRadius:'50%',
            background:`linear-gradient(135deg,${N},${T})`,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IconPhoneCall size={38} color="white"/>
          </Box>
          <Text fw={900} size="xl" c={N} ta="center">{t('providerHome.job_confirmed')}</Text>
          <Text size="sm" c="dimmed" ta="center">{t('providerHome.job_confirmed_hint')}</Text>
          <Paper p="lg" radius="lg" w="100%"
            style={{background:'#F0FFF8',border:`1px solid ${COLORS.success}55`}}>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">{t('providerHome.client_phone_label')}</Text>
              <Text fw={900} size="xl" c={N} style={{letterSpacing:2}}>{revealed?.phone}</Text>
              <Text size="xs" c={COLORS.success}>
                {revealed?.req.clientName} · {revealed?getCategoryName(revealed.req.catId):''}
              </Text>
            </Stack>
          </Paper>
          <Group gap={10} w="100%">
            <Button flex={1} size="md" radius="xl"
              style={{background:`linear-gradient(135deg,${N},${T})`,border:'none'}}
              leftSection={<IconPhoneCall size={16}/>}
              component="a" href={`tel:${revealed?.phone}`}>
              {t('providerHome.call_now')}
            </Button>
            <Button flex={1} size="md" radius="xl" variant="light" color="gray"
              onClick={()=>setRevOpen(false)}>
              {t('providerHome.close')}
            </Button>
          </Group>
          <Group gap={5}>
            <IconShieldCheck size={12} color={T}/>
            <Text size="xs" c="dimmed">{t('providerHome.client_notified')}</Text>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

export default ProviderHome;
