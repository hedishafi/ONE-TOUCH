import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Button, Tabs, Switch, Select, Divider, PasswordInput, Paper, Modal, UnstyledButton, SimpleGrid } from '@mantine/core';
import { IconBell, IconShieldCheck, IconSun, IconMoon, IconDeviceDesktop, IconCheck, IconTrash, IconLock } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';
import { useTranslation } from 'react-i18next';
import { storage, STORAGE_KEYS } from '../utils/storage';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState({ bookingUpdates: true, newMessages: true, promotions: false, emailNotifs: true, smsNotifs: true });
  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }));
  const rows = [
    { key: 'bookingUpdates' as const, label: t('cset.booking_updates'), desc: t('cset.booking_updates_desc') },
    { key: 'newMessages' as const, label: t('cset.new_messages'), desc: t('cset.new_messages_desc') },
    { key: 'promotions' as const, label: t('cset.promotions'), desc: t('cset.promotions_desc') },
    { key: 'emailNotifs' as const, label: t('cset.email_notifs'), desc: t('cset.email_notifs_desc') },
    { key: 'smsNotifs' as const, label: t('cset.sms_notifs'), desc: t('cset.sms_notifs_desc') },
  ];
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="md">{t('cset.notif_prefs')}</Text>
        <Stack gap={0}>
          {rows.map((row, i) => (
            <Box key={row.key}>
              {i > 0 && <Divider my="sm" />}
              <Group justify="space-between" wrap="nowrap">
                <Box><Text size="sm" fw={600}>{row.label}</Text><Text size="xs" c="dimmed">{row.desc}</Text></Box>
                <Switch checked={prefs[row.key]} onChange={() => toggle(row.key)} color="teal" />
              </Group>
            </Box>
          ))}
        </Stack>
        <Button mt="lg" size="sm" style={{ background: N }} onClick={() => notifications.show({ title: t('cset.saved_toast'), message: t('cset.saved_toast_msg'), color: 'teal' })}>
          {t('cset.save_prefs')}
        </Button>
      </Card>
    </Stack>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const { t } = useTranslation();
  const [cp, setCp] = useState(''); const [np, setNp] = useState(''); const [conf, setConf] = useState('');
  const [twoFA, setTwoFA] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const changePw = () => {
    if (!cp) { notifications.show({ title: t('cset.error'), message: t('cset.err_current'), color: 'red' }); return; }
    if (np.length < 8) { notifications.show({ title: t('cset.error'), message: t('cset.err_min8'), color: 'red' }); return; }
    if (np !== conf) { notifications.show({ title: t('cset.error'), message: t('cset.err_match'), color: 'red' }); return; }
    setSaving(true);
    setTimeout(() => { setCp(''); setNp(''); setConf(''); setSaving(false); notifications.show({ title: t('cset.pw_changed'), message: t('cset.pw_changed_msg'), color: 'teal' }); }, 900);
  };

  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Group gap={8} mb="md"><IconLock size={18} color={N} /><Text fw={700}>{t('cset.change_password')}</Text></Group>
        <Stack gap="md">
          <PasswordInput label={t('cset.current_password')} value={cp} onChange={e => setCp(e.target.value)} placeholder={t('cset.current_password_ph')} />
          <PasswordInput label={t('cset.new_password')} value={np} onChange={e => setNp(e.target.value)} placeholder={t('cset.new_password_ph')} />
          <PasswordInput label={t('cset.confirm_password')} value={conf} onChange={e => setConf(e.target.value)} placeholder={t('cset.confirm_password_ph')} />
        </Stack>
        <Button mt="md" size="sm" style={{ background: N }} onClick={changePw} loading={saving}>{t('cset.update_password')}</Button>
      </Card>

      <Card radius="lg" withBorder p="xl">
        <Group justify="space-between" wrap="nowrap">
          <Box>
            <Text fw={700}>{t('cset.twofa')}</Text>
            <Text size="xs" c="dimmed">{t('cset.twofa_desc')}</Text>
          </Box>
          <Switch checked={twoFA} onChange={() => { setTwoFA(v => !v); notifications.show({ title: twoFA ? t('cset.twofa_off') : t('cset.twofa_on'), message: twoFA ? t('cset.twofa_off_msg') : t('cset.twofa_on_msg'), color: twoFA ? 'gray' : 'teal' }); }} color="teal" />
        </Group>
      </Card>

      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="xs">{t('cset.privacy')}</Text>
        <Group justify="space-between" wrap="nowrap">
          <Box><Text size="sm" fw={600}>{t('cset.show_photo')}</Text><Text size="xs" c="dimmed">{t('cset.show_photo_desc')}</Text></Box>
          <Switch defaultChecked color="teal" />
        </Group>
      </Card>

      <Card radius="lg" withBorder p="xl" style={{ border: '1px solid #FCA5A5' }}>
        <Text fw={700} c="red" mb="xs">{t('cset.danger_zone')}</Text>
        <Text size="sm" c="dimmed" mb="md">{t('cset.danger_desc')}</Text>
        <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={() => setDeleteOpen(true)}>{t('cset.delete_account')}</Button>
      </Card>

      <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} centered radius="xl" title={t('cset.delete_q')} styles={{ content: { background: 'var(--ot-bg-card)' } }}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t('cset.delete_body')}</Text>
          <Group>
            <Button color="red" onClick={() => { setDeleteOpen(false); notifications.show({ title: t('cset.account_deleted'), message: t('cset.account_deleted_msg'), color: 'red' }); }}>{t('cset.yes_delete')}</Button>
            <Button variant="light" onClick={() => setDeleteOpen(false)}>{t('cset.cancel')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ─── Appearance Tab ───────────────────────────────────────────────────────────
function AppearanceTab() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { t, i18n } = useTranslation();
  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    storage.set(STORAGE_KEYS.language, code);
  };
  const opts = [
    { value: 'light' as const, label: t('cset.light'), desc: t('cset.light_desc'), icon: <IconSun size={22} /> },
    { value: 'dark' as const, label: t('cset.dark'), desc: t('cset.dark_desc'), icon: <IconMoon size={22} /> },
    { value: 'auto' as const, label: t('cset.system'), desc: t('cset.system_desc'), icon: <IconDeviceDesktop size={22} /> },
  ];
  return (
    <Stack gap="lg">
      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb={4}>{t('cset.theme')}</Text>
        <Text size="sm" c="dimmed" mb="lg">{t('cset.theme_desc')}</Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {opts.map(opt => {
            const active = colorScheme === opt.value;
            return (
              <UnstyledButton key={opt.value} onClick={() => setColorScheme(opt.value)} style={{ width: '100%' }}>
                <Box style={{ borderRadius: 14, border: `2px solid ${active ? T : 'var(--ot-border)'}`, background: active ? `${T}10` : 'var(--ot-bg-row)', padding: 16, cursor: 'pointer', position: 'relative' }}>
                  {active && <Box style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: T, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={12} color="white" stroke={3} /></Box>}
                  <Group gap={10}><Box style={{ color: active ? T : 'var(--ot-text-muted)' }}>{opt.icon}</Box><Box><Text fw={700} size="sm" c={active ? T : 'var(--ot-text-body)'}>{opt.label}</Text><Text size="xs" c="dimmed">{opt.desc}</Text></Box></Group>
                </Box>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      </Card>

      <Card radius="lg" withBorder p="xl">
        <Text fw={700} mb="md">{t('cset.language')}</Text>
        <Select value={i18n.language} onChange={v => changeLang(v ?? 'en')}
          data={[{ value: 'en', label: 'English' }, { value: 'am', label: 'አማርኛ' }]}
          style={{ maxWidth: 240 }} />
      </Card>
    </Stack>
  );
}

// ─── CLIENT SETTINGS ─────────────────────────────────────────────────────────
export function ClientSettings() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<string | null>('notifications');
  return (
    <DashboardLayout title={t('cset.settings')}>
      <Group gap="sm" mb="md">
        <Box w={44} h={44} style={{ borderRadius: 12, background: `${N}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconShieldCheck size={20} color={N} />
        </Box>
        <Box><Text fw={800} size="lg" c={N}>{t('cset.settings')}</Text><Text size="sm" c="dimmed">{t('cset.subtitle')}</Text></Box>
      </Group>
      <Tabs value={tab} onChange={setTab} styles={{ tab: { fontWeight: 600, fontSize: 14, paddingTop: 10, paddingBottom: 10 }, list: { borderBottom: '2px solid var(--ot-border)', gap: 4, marginBottom: 20 } }}>
        <Tabs.List>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>{t('cset.tab_notifications')}</Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>{t('cset.tab_security')}</Tabs.Tab>
          <Tabs.Tab value="appearance" leftSection={<IconSun size={16} />}>{t('cset.tab_appearance')}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="notifications"><NotificationsTab /></Tabs.Panel>
        <Tabs.Panel value="security"><SecurityTab /></Tabs.Panel>
        <Tabs.Panel value="appearance"><AppearanceTab /></Tabs.Panel>
      </Tabs>
    </DashboardLayout>
  );
}
