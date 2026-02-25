import {
  Box, Button, Group, Stack, Text, Drawer, ThemeIcon,
} from '@mantine/core';
import { IconShieldCheck, IconX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { COLORS, ROUTES } from '../utils/constants';
import { LanguageSwitcher } from './LanguageSwitcher';
import { DarkModeToggle } from './DarkModeToggle';
import { useMediaQuery } from '@mantine/hooks';

const NAV_STYLE = `
@keyframes slideInDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.nav-fade { animation: slideInDown 0.4s ease both; }
.nav-link {
  transition: all 0.18s ease;
  cursor: pointer;
  position: relative;
  padding-bottom: 2px;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: ${COLORS.tealBlue};
  transition: width 0.25s ease;
}
.nav-link:hover::after {
  width: 100%;
}
.nav-link:hover {
  color: ${COLORS.tealBlue} !important;
}
`;

export function LandingNavbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [prevScrollY, setPrevScrollY] = useState(0);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > prevScrollY && currentScrollY > 100) {
        // Scrolling down
        setIsNavVisible(false);
      } else {
        // Scrolling up
        setIsNavVisible(true);
      }
      setPrevScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollY]);

  const navLinks = [
    { label: 'Browse Services', path: ROUTES.services },
    { label: 'How It Works', path: ROUTES.howItWorks },
    { label: 'About', path: ROUTES.about },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <style>{NAV_STYLE}</style>
      <Box
        className="nav-fade"
        px={{ base: 'md', sm: 'lg', md: 'xl' }}
        py="md"
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'var(--ot-nav-bg)',
          borderBottom: '1px solid var(--ot-nav-border)',
          boxShadow: '0 2px 16px rgba(0,0,137,0.05)',
          transform: isNavVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <Group justify="space-between" align="center" maw={1200} mx="auto">
          {/* Logo - Always visible */}
          <Group gap="xs" style={{ cursor: 'pointer', minWidth: 'fit-content' }} onClick={() => navigate(ROUTES.landing)}>
            <Box
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: `linear-gradient(135deg,${COLORS.navyBlue} 0%,${COLORS.tealBlue} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,137,0.25)',
              }}
            >
              <IconShieldCheck size={20} color="white" stroke={2.5} />
            </Box>
            <Text fw={800} size="lg" c={COLORS.navyBlue} style={{ letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
              ONE TOUCH
            </Text>
          </Group>

          {/* Desktop Navigation - Hidden on mobile */}
          {!isMobile ? (
            <>
              {/* Center Links */}
              <Group gap="xl" align="center" grow={false} style={{ flex: 1, justifyContent: 'center' }}>
                {navLinks.map((link) => (
                  <Text
                    key={link.label}
                    size="sm"
                    fw={600}
                    c={COLORS.navyBlue}
                    className="nav-link"
                    onClick={() => handleNavClick(link.path)}
                  >
                    {link.label}
                  </Text>
                ))}
              </Group>

              {/* Right Actions */}
              <Group gap="lg" align="center" wrap="nowrap">
                <DarkModeToggle />
                <LanguageSwitcher />
                <Button
                  variant="subtle"
                  size="sm"
                  c={COLORS.navyBlue}
                  fw={600}
                  onClick={() => navigate(ROUTES.login)}
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  style={{
                    background: COLORS.tealBlue,
                    color: 'white',
                    fontWeight: 700,
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,128,128,0.35)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                  onClick={() => navigate(ROUTES.signup)}
                >
                  Sign Up
                </Button>
              </Group>
            </>
          ) : (
            /* Mobile Hamburger Menu */
            <Group gap="sm" align="center" wrap="nowrap">
              <LanguageSwitcher />
              <ThemeIcon
                variant="subtle"
                size="lg"
                c={COLORS.navyBlue}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ cursor: 'pointer' }}
              >
                {mobileMenuOpen ? <IconX size={24} /> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>}
              </ThemeIcon>
            </Group>
          )}
        </Group>
      </Box>

      {/* Mobile Menu Drawer */}
      <Drawer
        opened={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="right"
        size="xs"
        overlayProps={{ blur: 0.5, opacity: 0.4 }}
        transitionProps={{ transition: 'slide-left', duration: 300 }}
        zIndex={150}
      >
        <Stack gap="md" p="xl">
          <Text fw={800} size="lg" c={COLORS.navyBlue} mb="md">
            Menu
          </Text>

          {/* Mobile Navigation Links */}
          {navLinks.map((link) => (
            <Text
              key={link.label}
              size="sm"
              fw={600}
              c={COLORS.navyBlue}
              style={{
                cursor: 'pointer',
                padding: '12px 0',
                borderBottom: '1px solid #F1F3F5',
                transition: 'all 0.18s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = COLORS.tealBlue;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = COLORS.navyBlue;
              }}
              onClick={() => handleNavClick(link.path)}
            >
              {link.label}
            </Text>
          ))}

          <Box style={{ borderBottom: '1px solid #F1F3F5', margin: '8px 0' }} />

          {/* Mobile Auth Buttons */}
          <Button
            variant="subtle"
            size="md"
            c={COLORS.navyBlue}
            fw={600}
            fullWidth
            onClick={() => {
              navigate(ROUTES.login);
              setMobileMenuOpen(false);
            }}
          >
            Login
          </Button>
          <Button
            size="md"
            fullWidth
            style={{
              background: COLORS.tealBlue,
              color: 'white',
              fontWeight: 700,
              transition: 'all 0.18s',
            }}
            onClick={() => {
              navigate(ROUTES.signup);
              setMobileMenuOpen(false);
            }}
          >
            Sign Up
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
