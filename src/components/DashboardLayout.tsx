import { AppShell, NavLink, Stack, Box, Text, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
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
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      style={{ backgroundColor: 'var(--ot-bg-page)' }}
    >
      <AppShell.Header
        style={{
          backgroundColor: 'var(--ot-header-bg)',
          borderBottom: '1px solid var(--ot-header-border)',
        }}
      >
        <AppHeader onBurgerClick={toggle} mobileMenuOpened={opened} />
      </AppShell.Header>

      <AppShell.Navbar
        style={{
          background: 'var(--ot-bg-card)',
          borderRight: '1px solid var(--ot-border)',
        }}
      >
        <AppShell.Section p="md">
          <Text
            size="xs"
            fw={700}
            tt="uppercase"
            style={{
              color: COLORS.navyBlue,
              letterSpacing: 0.5,
              fontSize: '11px',
            }}
          >
            {title}
          </Text>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={4} px="sm">
            {navItems.map((item) => {
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
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? COLORS.navyBlue : '#6C757D',
                      backgroundColor: isActive ? 'rgba(0, 128, 128, 0.08)' : 'transparent',
                      borderLeft: isActive ? `3px solid ${COLORS.tealBlue}` : 'none',
                      paddingLeft: isActive ? '15px' : '18px',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 128, 128, 0.04)',
                        color: COLORS.tealBlue,
                      },
                    },
                    label: {
                      fontSize: 14,
                    },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          backgroundColor: '#FFFFFF',
        }}
      >
        <Box
          style={{
            position: 'relative',
            padding: '8px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}
          </style>
          {children}
        </Box>

        <AIHelpCenter />
      </AppShell.Main>
    </AppShell>
  );
}