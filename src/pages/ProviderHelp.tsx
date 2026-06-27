import { useState } from 'react';
import {
  Box, Text, Group, Stack, Card, Paper, Accordion, Button,
  Textarea, TextInput, SimpleGrid,
} from '@mantine/core';
import {
  IconLifebuoy, IconMessageCircle, IconPhone, IconMail,
  IconAlertCircle, IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { ProviderLayout } from '../components/ProviderLayout';
import { COLORS } from '../utils/constants';

const N = COLORS.navyBlue;
const T = COLORS.tealBlue;

const FAQ_KEYS = ['faq1','faq2','faq3','faq4','faq5','faq6','faq7'];

export function ProviderHelp() {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = () => {
    if (!subject.trim() || !message.trim()) {
      notifications.show({ title: t('providerHelp.required'), message: t('providerHelp.required_msg'), color: 'red' });
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubject('');
      setMessage('');
      notifications.show({ title: t('providerHelp.sent_title'), message: t('providerHelp.sent_msg'), color: 'teal' });
    }, 1000);
  };

  return (
    <ProviderLayout title={t('providerHelp.title')}>
      <Stack gap="lg">

        {/* Contact options */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {[
            { icon: <IconPhone size={22} />, label: t('providerHelp.call_us'), value: t('providerHelp.call_us_val'), sub: t('providerHelp.call_us_sub'), color: T },
            { icon: <IconMail size={22} />, label: t('providerHelp.email_support'), value: t('providerHelp.email_val'), sub: t('providerHelp.email_sub'), color: N },
            { icon: <IconMessageCircle size={22} />, label: t('providerHelp.live_chat'), value: t('providerHelp.live_chat_val'), sub: t('providerHelp.live_chat_sub'), color: COLORS.success },
          ].map(item => (
            <Paper key={item.label} p="lg" radius="xl" withBorder style={{ background: 'var(--ot-bg-card)', textAlign: 'center' }}>
              <Box style={{ color: item.color, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{item.icon}</Box>
              <Text fw={700} size="sm" c={N}>{item.label}</Text>
              <Text fw={800} size="sm" c={item.color} mt={4}>{item.value}</Text>
              <Text size="xs" c="dimmed" mt={2}>{item.sub}</Text>
            </Paper>
          ))}
        </SimpleGrid>

        {/* Dispute notice */}
        <Paper p="md" radius="lg" style={{ background: `${COLORS.warning}12`, border: `1px solid ${COLORS.warning}44` }}>
          <Group gap={10}>
            <IconAlertCircle size={18} color={COLORS.warning} />
            <Box>
              <Text fw={700} size="sm" c={N}>{t('providerHelp.dispute_title')}</Text>
              <Text size="xs" c="dimmed">{t('providerHelp.dispute_body')}</Text>
            </Box>
          </Group>
        </Paper>

        {/* FAQs */}
        <Card radius="lg" withBorder p="xl">
          <Text fw={700} size="md" mb="md" c={N}>{t('providerHelp.faq_title')}</Text>
          <Accordion variant="separated" radius="lg">
            {FAQ_KEYS.map((key) => (
              <Accordion.Item key={key} value={key}>
                <Accordion.Control>
                  <Text fw={600} size="sm">{t(`providerHelp.${key}_q`)}</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" c="dimmed" style={{ lineHeight: 1.7 }}>{t(`providerHelp.${key}_a`)}</Text>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>

        {/* Contact form */}
        <Card radius="lg" withBorder p="xl">
          <Group gap={8} mb="md">
            <IconMessageCircle size={20} color={T} />
            <Text fw={700} size="md" c={N}>{t('providerHelp.send_message')}</Text>
          </Group>
          <Stack gap="md">
            <TextInput
              label={t('providerHelp.subject_label')}
              placeholder={t('providerHelp.subject_placeholder')}
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <Textarea
              label={t('providerHelp.message_label')}
              placeholder={t('providerHelp.message_placeholder')}
              rows={5}
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <Button
              size="md"
              radius="xl"
              loading={sending}
              leftSection={<IconCheck size={16} />}
              style={{ background: `linear-gradient(135deg,${N},${T})`, border: 'none', width: 'fit-content' }}
              onClick={submit}
            >
              {t('providerHelp.send_btn')}
            </Button>
          </Stack>
        </Card>

      </Stack>
    </ProviderLayout>
  );
}
