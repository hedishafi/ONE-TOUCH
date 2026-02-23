import { useState } from 'react';
import {
  Box, Button, Center, Container, Divider, Group,
  Paper, PasswordInput, Stack, Text, TextInput, ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconShieldCheck, IconArrowRight, IconMail, IconLock } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';

// Demo credentials hint
const DEMO_ACCOUNTS = [
  { role: 'Client', email: 'abebe.girma@gmail.com' },
  { role: 'Business Client', email: 'sara.haile@company.et' },
  { role: 'Provider', email: 'yohannes.teferi@gmail.com' },
  { role: 'Admin', email: 'admin@onetouch.et' },
];

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length >= 1 ? null : 'Password required'),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    setLoading(true);
    setTimeout(() => {
      const result = login(values.email, values.password);
      setLoading(false);
      if (result.success) {
        const user = useAuthStore.getState().currentUser;
        notifications.show({ title: 'Welcome back!', message: `Logged in as ${user?.email}`, color: 'teal' });
        if (user?.role === 'client') navigate(ROUTES.clientDashboard);
        else if (user?.role === 'provider') navigate(ROUTES.providerDashboard);
        else navigate(ROUTES.adminDashboard);
      } else {
        notifications.show({ title: 'Login Failed', message: result.error, color: 'red' });
      }
    }, 600);
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: `linear-gradient(150deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 40%, ${COLORS.tealBlue}40 100%)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <Group justify="space-between" p="md" px="xl">
        <Group gap="sm" onClick={() => navigate(ROUTES.landing)} style={{ cursor: 'pointer' }}>
          <Box
            w={36}
            h={36}
            style={{
              borderRadius: 10,
              background: COLORS.lemonYellow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconShieldCheck size={18} color={COLORS.navyBlue} stroke={2.5} />
          </Box>
          <Text fw={800} size="lg" c="white">ONE TOUCH</Text>
        </Group>
        <LanguageSwitcher />
      </Group>

      <Center flex={1} p="md">
        <Container size={440} w="100%">
          <Paper shadow="xl" radius="xl" p={40}>
            <Stack gap="xl">
              {/* Header */}
              <Stack gap={4} align="center">
                <ThemeIcon size={56} radius="xl" style={{ background: `${COLORS.navyBlue}15` }} variant="light" color="navy">
                  <IconShieldCheck size={28} />
                </ThemeIcon>
                <Text fw={800} size="xl" c={COLORS.navyBlue}>Welcome back</Text>
                <Text c="dimmed" size="sm">Sign in to your ONE TOUCH account</Text>
              </Stack>

              {/* Form */}
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                  <TextInput
                    label={t('auth.email')}
                    placeholder="you@example.com"
                    leftSection={<IconMail size={16} />}
                    {...form.getInputProps('email')}
                  />
                  <PasswordInput
                    label={t('auth.password')}
                    placeholder="Your password"
                    leftSection={<IconLock size={16} />}
                    {...form.getInputProps('password')}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    loading={loading}
                    rightSection={<IconArrowRight size={16} />}
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.navyBlue} 0%, ${COLORS.navyLight} 100%)`,
                    }}
                  >
                    {t('auth.login')}
                  </Button>
                </Stack>
              </form>

              <Divider label="Demo accounts" labelPosition="center" />

              {/* Demo credentials */}
              <Stack gap="xs">
                {DEMO_ACCOUNTS.map(acc => (
                  <Button
                    key={acc.email}
                    variant="light"
                    color="navy"
                    size="xs"
                    fullWidth
                    onClick={() => {
                      form.setValues({ email: acc.email, password: 'demo' });
                    }}
                  >
                    {acc.role}: {acc.email}
                  </Button>
                ))}
              </Stack>

              <Text size="sm" ta="center" c="dimmed">
                {t('auth.no_account')}{' '}
                <Text
                  component="span"
                  c={COLORS.tealBlue}
                  fw={600}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(ROUTES.signup)}
                >
                  {t('nav.signup')}
                </Text>
              </Text>
            </Stack>
          </Paper>
        </Container>
      </Center>
      <AIHelpCenter />
    </Box>
  );
}
