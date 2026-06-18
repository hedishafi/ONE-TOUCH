// ProviderSettings
import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Button, Tabs, Avatar, Textarea, NumberInput, Select, Slider, FileButton, TextInput, PasswordInput, Paper, Badge, Divider, SimpleGrid, UnstyledButton } from '@mantine/core';
import { IconUser, IconBriefcase, IconShieldCheck, IconUpload, IconPhoto, IconCheck, IconLock, IconSun, IconMoon, IconDeviceDesktop, IconSettings } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ProviderLayout } from '../components/ProviderLayout';
import { useAuthStore } from '../store/authStore';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { COLORS } from '../utils/constants';
import type { ProviderProfile, PricingModel } from '../types';
const N = COLORS.navyBlue;
const T = COLORS.tealBlue;
function AppearanceTab() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const opts = [
    { value: 'light' as const, label: 'Light', desc: 'Clean white interface', icon: <IconSun size={22}/> },
    { value: 'dark' as const, label: 'Dark', desc: 'Easy on the eyes', icon: <IconMoon size={22}/> },
    { value: 'auto' as const, label: 'System', desc: 'Follows your device', icon: <IconDeviceDesktop size={22}/> },
  ];
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb={4}>Theme</Text>
        <Text size="sm" c="dimmed" mb="lg">Choose how the dashboard looks.</Text>
        <SimpleGrid cols={{ base:1, sm:3 }} spacing="md">
          {opts.map(opt => {
            const active = colorScheme === opt.value;
            return (
              <UnstyledButton key={opt.value} onClick={() => setColorScheme(opt.value)} style={{width:'100%'}}>
                <Box style={{ borderRadius:14, border:`2px solid ${active?T:'var(--ot-border)'}`, background:active?`${T}10`:'var(--ot-bg-row)', padding:16, cursor:'pointer', position:'relative' }}>
                  {active && <Box style={{ position:'absolute', top:10, right:10, width:20, height:20, borderRadius:'50%', background:T, display:'flex', alignItems:'center', justifyContent:'center' }}><IconCheck size={12} color="white" stroke={3}/></Box>}
                  <Group gap={10}><Box style={{color:active?T:'var(--ot-text-muted)'}}>{opt.icon}</Box><Box><Text fw={700} size="sm" c={active?T:'var(--ot-text-body)'}>{opt.label}</Text><Text size="xs" c="dimmed">{opt.desc}</Text></Box></Group>
                </Box>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
        <Paper mt="lg" p="md" radius="lg" style={{ background:`${T}10`, border:`1px solid ${T}30` }}>
          <Group gap={8}><Box style={{color:T}}>{colorScheme==='dark'?<IconMoon size={16}/>:colorScheme==='auto'?<IconDeviceDesktop size={16}/>:<IconSun size={16}/>}</Box><Text size="sm" fw={600} c={T}>{colorScheme==='dark'?'Dark mode active':colorScheme==='auto'?'Following system':'Light mode active'}</Text></Group>
        </Paper>
      </Card>
    </Stack>
  );
}
function ProfileTab() {
  const { currentUser } = useAuthStore();
  const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const [bio, setBio] = useState(myProfile?.bio ?? '');
  const [radius, setRadius] = useState(myProfile?.coverageRadius ?? 10);
  const [pm, setPm] = useState<PricingModel>(myProfile?.pricingModel ?? 'hourly');
  const [rate, setRate] = useState(myProfile?.hourlyRate ?? 50);
  const [saving, setSaving] = useState(false);
  const save = () => { setSaving(true); setTimeout(() => { const u = profiles.map(p => p.userId===currentUser?.id?{...p,bio,coverageRadius:radius,pricingModel:pm,hourlyRate:rate}:p); storage.set(STORAGE_KEYS.providerProfiles,u); setSaving(false); notifications.show({title:'Saved',message:'Profile updated.',color:'teal'}); }, 900); };
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Group gap="lg">
          <Box style={{position:'relative'}}><Avatar size={80} radius="xl" color="teal">{myProfile?.fullName?.charAt(0)??'P'}</Avatar><Box style={{position:'absolute',bottom:-2,right:-2,width:20,height:20,background:T,borderRadius:'50%',border:'2px solid white',display:'flex',alignItems:'center',justifyContent:'center'}}><IconCheck size={10} color="white"/></Box></Box>
          <Stack gap="xs"><Text fw={700} size="lg">{myProfile?.fullName}</Text><Text c="dimmed" size="sm">{currentUser?.email}</Text><Badge color="teal" size="sm" leftSection={<IconShieldCheck size={10}/>}>Verified Provider</Badge></Stack>
          <Box style={{marginLeft:'auto'}}><FileButton onChange={()=>{}} accept="image/*">{(p)=><Button {...p} variant="light" color="teal" size="sm" leftSection={<IconUpload size={14}/>}>Update Photo</Button>}</FileButton></Box>
        </Group>
      </Card>
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="md">Service Details</Text>
        <Stack gap="md">
          <Textarea label="Professional Bio" value={bio} onChange={e=>setBio(e.target.value)} rows={3} placeholder="Describe your expertise..."/>
          <Select label="Pricing Model" data={[{value:'hourly',label:'⏱ Hourly Rate'},{value:'fixed',label:'💰 Fixed Price'},{value:'custom',label:'🤝 Custom Estimate'}]} value={pm} onChange={v=>setPm((v as PricingModel)??'hourly')}/>
          {pm!=='custom'&&<NumberInput label={pm==='hourly'?'Hourly Rate (ETB)':'Fixed Price (ETB)'} value={rate} onChange={v=>setRate(Number(v))} prefix="ETB " min={10}/>}
          <Box><Text size="sm" fw={600} mb="xs">Coverage Radius: {radius} km</Text><Slider value={radius} onChange={setRadius} min={1} max={50} step={1} color="teal"/></Box>
        </Stack>
      </Card>
      <Card radius="lg" withBorder p="xl">
        <Group justify="space-between" mb="md"><Text fw={700}>Portfolio Photos</Text><FileButton onChange={()=>{}} accept="image/*" multiple>{(p)=><Button {...p} variant="light" color="teal" size="sm" leftSection={<IconPhoto size={14}/>}>Add Photos</Button>}</FileButton></Group>
        <Box p="xl" style={{borderRadius:12,border:'2px dashed var(--ot-border)',textAlign:'center'}}><IconPhoto size={32} color="var(--ot-border)" style={{margin:'0 auto'}}/><Text c="dimmed" size="sm" mt="xs">No portfolio photos yet</Text></Box>
      </Card>
      <Button size="md" onClick={save} loading={saving} style={{background:N}}>Save Profile Changes</Button>
    </Stack>
  );
}
function ServicesTab() {
  const { currentUser } = useAuthStore();
  const profiles = storage.get<ProviderProfile[]>(STORAGE_KEYS.providerProfiles, []);
  const myProfile = profiles.find(p => p.userId === currentUser?.id);
  const [cat, setCat] = useState(myProfile?.categoryId ?? '');
  const [sub, setSub] = useState(myProfile?.subcategoryId ?? '');
  const [saving, setSaving] = useState(false);
  const save = () => { setSaving(true); setTimeout(() => { const u = profiles.map(p => p.userId===currentUser?.id?{...p,categoryId:cat,subcategoryId:sub}:p); storage.set(STORAGE_KEYS.providerProfiles,u); setSaving(false); notifications.show({title:'Saved',message:'Services updated.',color:'teal'}); }, 900); };
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="md">Service Selection</Text>
        <Stack gap="md">
          <TextInput label="Service Category" value={cat} onChange={e=>setCat(e.target.value)} placeholder="e.g. Home Cleaning, Plumbing..."/>
          <TextInput label="Subservice / Specialization" value={sub} onChange={e=>setSub(e.target.value)} placeholder="e.g. Deep Cleaning, Pipe Repair..."/>
          <Divider label="Skills" labelPosition="left"/>
          <Group gap="xs">{['Reliable','Punctual','Professional'].map(s=><Badge key={s} color="teal" variant="light">{s}</Badge>)}</Group>
          <Divider label="Certifications" labelPosition="left"/>
          <Text size="sm" c="dimmed">Contact support to add or update your certifications.</Text>
        </Stack>
      </Card>
      <Button size="md" onClick={save} loading={saving} style={{background:N}}>Save Service Changes</Button>
    </Stack>
  );
}
function AccountTab() {
  const { currentUser } = useAuthStore();
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [cp, setCp] = useState(''); const [np, setNp] = useState(''); const [conf, setConf] = useState('');
  const [saving, setSaving] = useState(false);
  const saveAcc = () => { setSaving(true); setTimeout(()=>{setSaving(false);notifications.show({title:'Saved',message:'Account info updated.',color:'teal'});},900); };
  const changePw = () => { if(!cp){notifications.show({title:'Error',message:'Enter current password.',color:'red'});return;} if(np.length<8){notifications.show({title:'Error',message:'Min 8 characters.',color:'red'});return;} if(np!==conf){notifications.show({title:'Error',message:'Passwords do not match.',color:'red'});return;} setSaving(true); setTimeout(()=>{setCp('');setNp('');setConf('');setSaving(false);notifications.show({title:'Password Changed',message:'Password updated.',color:'teal'});},900); };
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="md">Account Information</Text>
        <Stack gap="md"><TextInput label="Email Address" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"/><TextInput label="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+251..."/></Stack>
        <Button mt="md" size="sm" onClick={saveAcc} loading={saving} style={{background:N}}>Save Account Info</Button>
      </Card>
      <Card radius="lg" withBorder p="xl">
        <Group gap={8} mb="md"><IconLock size={18} color={N}/><Text fw={700}>Change Password</Text></Group>
        <Stack gap="md"><PasswordInput label="Current Password" value={cp} onChange={e=>setCp(e.target.value)} placeholder="Enter current password"/><PasswordInput label="New Password" value={np} onChange={e=>setNp(e.target.value)} placeholder="Min 8 characters"/><PasswordInput label="Confirm New Password" value={conf} onChange={e=>setConf(e.target.value)} placeholder="Repeat new password"/></Stack>
        <Button mt="md" size="sm" color="red" variant="light" onClick={changePw} loading={saving}>Update Password</Button>
      </Card>
    </Stack>
  );
}
export function ProviderSettings() {
  const [tab, setTab] = useState<string|null>('profile');
  return (
    <ProviderLayout title="Settings">
      <Group gap="sm" mb="md">
        <Box w={44} h={44} style={{borderRadius:12,background:`${N}12`,display:'flex',alignItems:'center',justifyContent:'center'}}><IconSettings size={20} color={N}/></Box>
        <Box><Text fw={800} size="lg" c={N}>Settings</Text><Text size="sm" c="dimmed">Manage your profile, services, and account.</Text></Box>
      </Group>
      <Tabs value={tab} onChange={setTab} styles={{ tab:{fontWeight:600,fontSize:14,paddingTop:10,paddingBottom:10}, list:{borderBottom:'2px solid var(--ot-border)',gap:4,marginBottom:20} }}>
        <Tabs.List>
          <Tabs.Tab value="profile" leftSection={<IconUser size={16}/>}>Profile</Tabs.Tab>
          <Tabs.Tab value="services" leftSection={<IconBriefcase size={16}/>}>Services</Tabs.Tab>
          <Tabs.Tab value="account" leftSection={<IconShieldCheck size={16}/>}>Account</Tabs.Tab>
          <Tabs.Tab value="appearance" leftSection={<IconSun size={16}/>}>Appearance</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="profile"><ProfileTab/></Tabs.Panel>
        <Tabs.Panel value="services"><ServicesTab/></Tabs.Panel>
        <Tabs.Panel value="account"><AccountTab/></Tabs.Panel>
        <Tabs.Panel value="appearance"><AppearanceTab/></Tabs.Panel>
      </Tabs>
    </ProviderLayout>
  );
}
