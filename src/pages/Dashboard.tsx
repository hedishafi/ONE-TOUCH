import { Box, Stack, Text, Center } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { COLORS, ROUTES } from '../utils/constants';
import { useAuthStore } from '../store/authStore';

const ANIMATIONS = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.6s ease both; }
`;

export function Dashboard() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.currentUser);

  useEffect(() => {
    if (!currentUser) {
      navigate(ROUTES.login);
      return;
    }
    
    // Redirect to role-based dashboard
    if (currentUser.role === 'client') {
      navigate(ROUTES.clientDashboard);
    } else if (currentUser.role === 'provider') {
      navigate(ROUTES.providerDashboard);
    } else if (currentUser.role === 'admin') {
      navigate(ROUTES.adminDashboard);
    } else {
      navigate(ROUTES.login);
    }
  }, [currentUser, navigate]);

  return (
    <>
      <style>{ANIMATIONS}</style>
      <Box style={{ minHeight: '100vh', background: '#FFFFFF', position: 'relative' }}>
        <Center style={{ minHeight: '100vh' }}>
          <Stack align="center" gap="md" className="fade-in">
            <Text fw={700} size="lg" c={COLORS.navyBlue}>
              Redirecting to your dashboard...
            </Text>
            <Box style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: `3px solid ${COLORS.tealBlue}20`,
              borderTopColor: COLORS.tealBlue,
              animation: 'spin 0.8s linear infinite'
            }} />
          </Stack>
        </Center>
      </Box>
    </>
  );
}
