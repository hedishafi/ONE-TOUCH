import { useState } from 'react';
import { Box, Text, Group, Stack, Card, Paper, Accordion, Button, Textarea, Select, SimpleGrid, Badge, Divider, FileButton } from '@mantine/core';
import { IconLifebuoy, IconMessageCircle, IconPhone, IconMail, IconAlertCircle, IconCheck, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/DashboardLayout';
import { COLORS } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const FAQS = [
  { q: 'csup.faq1_q', a: 'csup.faq1_a' },
  { q: 'csup.faq2_q', a: 'csup.faq2_a' },
  { q: 'csup.faq3_q', a: 'csup.faq3_a' },
  { q: 'csup.faq4_q', a: 'csup.faq4_a' },
  { q: 'csup.faq5_q', a: 'csup.faq5_a' },
];

const MOCK_TICKETS = [
  { id: 'TKT-001', subject: 'csup.ticket1_subject', status: 'csup.status_resolved', open: false, date: 'csup.ticket1_date' },
  { id: 'TKT-002', subject: 'csup.ticket2_subject', status: 'csup.status_open', open: true, date: 'csup.ticket2_date' },
];

export function ClientHelp() {
  const { t } = useTranslation();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [booking, setBooking] = useState('');
  const [sending, setSending] = useState(false);

  const submit = () => {
    if (!issueType || !description.trim()) { notifications.show({ title: t('csup.required'), message: t('csup.required_msg'), color: 'red' }); return; }
    setSending(true);
    setTimeout(() => { setSending(false); setIssueType(''); setDescription(''); setBooking(''); notifications.show({ title: t('csup.submitted'), message: t('csup.submitted_msg'), color: 'teal' }); }, 1000);
  };

  return (
    <DashboardLayout title={t('csup.title')}>
      <Stack gap="lg">

        {/* Contact options */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {[
            { icon: <IconPhone size={22} />, label: t('csup.call_us'), value: '8182', sub: t('csup.call_us_sub'), color: T },
            { icon: <IconMail size={22} />, label: t('csup.email_support'), value: 'support@onetouch.et', sub: t('csup.email_support_sub'), color: N },
            { icon: <IconMessageCircle size={22} />, label: t('csup.live_chat'), value: t('csup.live_chat_value'), sub: t('csup.live_chat_sub'), color: COLORS.success },
          ].map(item => (
            <Paper key={item.label} p="lg" radius="xl" withBorder style={{ background: 'var(--ot-bg-card)', textAlign: 'center' }}>
              <Box style={{ color: item.color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{item.icon}</Box>
              <Text fw={700} size="sm" c={N}>{item.label}</Text>
              <Text fw={800} size="sm" c={item.color} mt={4}>{item.value}</Text>
              <Text size="xs" c="dimmed" mt={2}>{item.sub}</Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* FAQs */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} size="md" mb="md" c={N}>{t('csup.faq_title')}</Text>
          <Accordion variant="separated" radius="lg">
            {FAQS.map((faq, i) => (
              <Accordion.Item key={i} value={String(i)}>
                <Accordion.Control><Text fw={600} size="sm">{t(faq.q)}</Text></Accordion.Control>
                <Accordion.Panel><Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{t(faq.a)}</Text></Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>

        {/* Report a Problem */}
        <Card radius="lg" withBorder p="xl">
          <Group gap={8} mb="md">
            <IconAlertCircle size={20} color={COLORS.error} />
            <Text fw={700} size="md" c={N}>{t('csup.report_title')}</Text>
          </Group>
          <Stack gap="md">
            <Select label={t('csup.booking_optional')} placeholder={t('csup.select_booking')} value={booking} onChange={v => setBooking(v ?? '')}
              data={[{ value: 'b1', label: t('csup.booking_opt1') }, { value: 'b2', label: t('csup.booking_opt2') }]} />
            <Select label={t('csup.issue_type')} placeholder={t('csup.select_issue')} value={issueType} onChange={v => setIssueType(v ?? '')}
              data={[{ value: 'noshow', label: t('csup.issue_noshow') }, { value: 'quality', label: t('csup.issue_quality') }, { value: 'overcharged', label: t('csup.issue_overcharged') }, { value: 'other', label: t('csup.issue_other') }]} />
            <Textarea label={t('csup.description')} placeholder={t('csup.description_ph')} rows={4} value={description} onChange={e => setDescription(e.target.value)} />
            <Group>
              <FileButton onChange={() => {}} accept="image/*">
                {(props) => <Button {...props} variant="light" color="gray" size="sm" leftSection={<IconUpload size={14} />}>{t('csup.attach_photo')}</Button>}
              </FileButton>
            </Group>
            <Button size="md" radius="xl" loading={sending} leftSection={<IconCheck size={16} />}
              style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none', width: 'fit-content' }} onClick={submit}>
              {t('csup.submit_report')}
            </Button>
          </Stack>
        </Card>

        {/* My Tickets */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} size="md" mb="md" c={N}>{t('csup.my_tickets')}</Text>
          {MOCK_TICKETS.length === 0 ? (
            <Text size="sm" c="dimmed">{t('csup.no_tickets')}</Text>
          ) : (
            <Stack gap={0}>
              {MOCK_TICKETS.map((tk, i) => (
                <Box key={tk.id}>
                  {i > 0 && <Divider my="sm" />}
                  <Group justify="space-between" wrap="nowrap">
                    <Box>
                      <Text size="sm" fw={600}>{t(tk.subject)}</Text>
                      <Text size="xs" c="dimmed">{tk.id} · {t(tk.date)}</Text>
                    </Box>
                    <Badge color={tk.open ? 'orange' : 'teal'} variant="light" size="sm">{t(tk.status)}</Badge>
                  </Group>
                </Box>
              ))}
            </Stack>
          )}
        </Card>

      </Stack>
    </DashboardLayout>
  );
}
