/**
 * DashboardLayout — client sidebar layout (desktop) + bottom tab bar (mobile)
 *
 * Desktop : 260 px left sidebar using ClientSidebar component
 * Mobile  : Burger-toggled overlay sidebar + fixed bottom tab bar (up to 5 tabs)
 */
import {
  AppShell, Box, Text, UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AIHelpCenter } from './AIHelpCenter';
import { ClientSidebar } from './ClientSidebar';
import { COLORS } from '../utils/constants';
import type { NavItem } from '../types/nav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  title?: string;
}

// ─── Bottom tab bar button (mobile only) ─────────────────────────────────────
function BottomNavBtn({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  const T = COLORS.tealBlue;

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '6px 4px',
        flex: 1,
        cursor: 'pointer',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* active indicator bar */}
      {active && (
        <Box
          style={{
            position: 'absolute',
            top: 0,
            width: 24,
            height: 3,
            borderRadius: 2,
            background: T,
          }}
        />
      )}
      <Box style={{ color: active ? T : '#ADB5BD', display: 'flex' }}>
        {item.icon}
      </Box>
      <Text
        style={{
          fontSize: 10,
          fontWeight: active ? 700 : 500,
          color: active ? T : '#ADB5BD',
          lineHeight: 1.2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </Text>
    </UnstyledButton>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export function DashboardLayout({ children, navItems }: DashboardLayoutProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={{ base: 'sm', md: 'md' }}
      style={{ background: 'var(--ot-bg-page)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <AppShell.Header
        style={{
          background: 'var(--ot-header-bg)',
          borderBottom: '1px solid var(--ot-border)',
        }}
      >
        <AppHeader onBurgerClick={toggle} mobileMenuOpened={opened} />
      </AppShell.Header>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <AppShell.Navbar style={{ padding: 0 }}>
        <ClientSidebar onClose={close} />
      </AppShell.Navbar>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <AppShell.Main
        style={{
          background: 'var(--ot-bg-page)',
          /* extra bottom padding so content clears the mobile tab bar */
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 76px)',
        }}
      >
        <Box style={{ animation: 'dlFadeIn 0.22s ease' }}>
          <style>{`
            @keyframes dlFadeIn {
              from { opacity:0; transform:translateY(6px); }
              to   { opacity:1; transform:translateY(0); }
            }
          `}</style>
          {children}
        </Box>
        <AIHelpCenter />
      </AppShell.Main>

      {/* ── Mobile bottom tab bar (hidden on ≥ sm) ──────────────────────── */}
      <Box
        hiddenFrom="sm"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: 'var(--ot-bg-card)',
          borderTop: `1px solid var(--ot-border)`,
          display: 'flex',
          alignItems: 'center',
          zIndex: 200,
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems && navItems.slice(0, 5).map((item) => (
          <BottomNavBtn
            key={item.path + '_btm'}
            item={item}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </Box>
    </AppShell>
  );
}
