import { useState } from 'react';
import {
  Box, Button, Center, Container, Group, Paper, PasswordInput,
  Stack, Text, TextInput, ThemeIcon, SimpleGrid, Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconShieldCheck, IconArrowRight, IconMail, IconLock,
  IconPhone, IconUser, IconBriefcase,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../store/authStore';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { AIHelpCenter } from '../components/AIHelpCenter';
import type { UserRole } from '../types';

export function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signup } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const form = useForm({
    initialValues: { email: '', phone: '', password: '', confirmPassword: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      phone: (v) => (v.length >= 7 ? null : 'Valid phone required'),
      password: (v) => (v.length >= 6 ? null : 'Min 6 characters'),
      confirmPassword: (v, values) => (v === values.password ? null : 'Passwords do not match'),
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    if (!selectedRole) {
      notifications.show({ title: 'Select a Role', message: 'Please select Client or Provider.', color: 'yellow' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = signup({ email: values.email, password: values.password, phone: values.phone, role: selectedRole });
      setLoading(false);
      if (result.success) {
        notifications.show({ title: 'Account Created!', message: 'Complete your profile to get started.', color: 'teal' });
        if (selectedRole === 'client') navigate(ROUTES.clientTypeSelect);
        else navigate(ROUTES.providerRegister);
      } else {
        notifications.show({ title: 'Signup Failed', message: result.error, color: 'red' });
      }
    }, 800);
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
            style={{ borderRadius: 10, background: COLORS.lemonYellow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconShieldCheck size={18} color={COLORS.navyBlue} stroke={2.5} />
          </Box>
          <Text fw={800} size="lg" c="white">ONE TOUCH</Text>
        </Group>
        <LanguageSwitcher />
      </Group>

      <Center flex={1} p="md">
        <Container size={500} w="100%">
          <Paper shadow="xl" radius="xl" p={40}>
            <Stack gap="xl">
              <Stack gap={4} align="center">
                <ThemeIcon size={56} radius="xl" style={{ background: `${COLORS.tealBlue}15` }} variant="light" color="teal">
                  <IconShieldCheck size={28} />
                </ThemeIcon>
                <Text fw={800} size="xl" c={COLORS.navyBlue}>Create your account</Text>
                <Text c="dimmed" size="sm">Join ONE TOUCH in seconds</Text>
              </Stack>

              {/* Role Selection */}
              <Stack gap="sm">
                <Text size="sm" fw={600} c={COLORS.navyBlue}>{t('role.select_role')}</Text>
                <SimpleGrid cols={2} spacing="md">
                  {[
                    { role: 'client' as UserRole, label: t('role.client'), desc: t('role.client_desc'), icon: <IconUser size={24} /> },
                    { role: 'provider' as UserRole, label: t('role.provider'), desc: t('role.provider_desc'), icon: <IconBriefcase size={24} /> },
                  ].map(item => (
                    <Box
                      key={item.role}
                      p="md"
                      style={{
                        borderRadius: 16,
                        border: `2px solid ${selectedRole === item.role ? COLORS.tealBlue : '#E9ECEF'}`,
                        background: selectedRole === item.role ? `${COLORS.tealBlue}08` : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => setSelectedRole(item.role)}
                    >
                      <Stack gap={6} align="center" ta="center">
                        <ThemeIcon
                          size={48}
                          radius="xl"
                          color={selectedRole === item.role ? 'teal' : 'gray'}
                          variant={selectedRole === item.role ? 'filled' : 'light'}
                        >
                          {item.icon}
                        </ThemeIcon>
                        <Text fw={700} size="sm" c={selectedRole === item.role ? COLORS.tealBlue : COLORS.navyBlue}>
                          {item.label}
                        </Text>
                        <Text size="xs" c="dimmed" lh={1.4}>{item.desc}</Text>
                      </Stack>
                    </Box>
                  ))}
                </SimpleGrid>
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
                  <TextInput
                    label={t('auth.phone')}
                    placeholder="+1 555 000 000"
                    leftSection={<IconPhone size={16} />}
                    {...form.getInputProps('phone')}
                  />
                  <SimpleGrid cols={2}>
                    <PasswordInput
                      label={t('auth.password')}
                      placeholder="Min 6 chars"
                      leftSection={<IconLock size={16} />}
                      {...form.getInputProps('password')}
                    />
                    <PasswordInput
                      label="Confirm Password"
                      placeholder="Repeat password"
                      leftSection={<IconLock size={16} />}
                      {...form.getInputProps('confirmPassword')}
                    />
                  </SimpleGrid>
                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    loading={loading}
                    rightSection={<IconArrowRight size={16} />}
                    style={{
                      background: `linear-gradient(135deg, ${COLORS.tealBlue} 0%, ${COLORS.tealDark} 100%)`,
                    }}
                  >
                    {t('auth.signup')}
                  </Button>
                </Stack>
              </form>

              <Text size="sm" ta="center" c="dimmed">
                {t('auth.have_account')}{' '}
                <Text
                  component="span"
                  c={COLORS.navyBlue}
                  fw={600}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(ROUTES.login)}
                >
                  {t('nav.login')}
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
