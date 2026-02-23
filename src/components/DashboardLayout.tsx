import { AppShell, NavLink, Stack, Box, Text, ScrollArea, useMantineTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from './AppHeader';
import { AIHelpCenter } from './AIHelpCenter';
import { COLORS } from '../utils/constants';
import type { NavItem } from '../types/nav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
}

export function DashboardLayout({ children, navItems, title }: DashboardLayoutProps) {
  const [opened, { toggle }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <AppHeader onBurgerClick={toggle} mobileMenuOpened={opened} />
      </AppShell.Header>

      <AppShell.Navbar
        style={{
          background: `linear-gradient(180deg, ${COLORS.navyBlue} 0%, ${COLORS.navyDark} 100%)`,
          border: 'none',
        }}
      >
        <AppShell.Section p="md">
          <Text size="xs" c="rgba(255,255,255,0.5)" fw={600} tt="uppercase" ls={1}>
            {title}
          </Text>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4} px="sm">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  label={item.label}
                  leftSection={item.icon}
                  active={isActive}
                  onClick={() => navigate(item.path)}
                  styles={{
                    root: {
                      borderRadius: 10,
                      color: isActive ? COLORS.navyBlue : 'rgba(255,255,255,0.75)',
                      backgroundColor: isActive ? COLORS.lemonYellow : 'transparent',
                      fontWeight: isActive ? 700 : 400,
                      '&:hover': {
                        backgroundColor: isActive ? COLORS.lemonYellow : 'rgba(255,255,255,0.08)',
                        color: isActive ? COLORS.navyBlue : 'white',
                      },
                    },
                    label: { fontSize: 14 },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main bg="#F5F6FA">
        <Box maw="100%" style={{ position: 'relative' }}>
          {children}
        </Box>
        <AIHelpCenter />
      </AppShell.Main>
    </AppShell>
  );
}
