import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { notifications } from '@mantine/notifications';
import api from '../services/api';

export const useRoleUpdateChecker = () => {
  const { currentUser, setCurrentUser, isAuthenticated } = useAuthStore();
  const previousApprovedRolesRef = useRef<string[] | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    const checkForRoleUpdates = async () => {
      try {
        const response = await api.get('/auth/profile/');
        const updatedUser = response.data;

        const newApprovedRoles = updatedUser.approved_roles || [];

        if (!isInitializedRef.current) {
          previousApprovedRolesRef.current = newApprovedRoles;
          isInitializedRef.current = true;
          return;
        }

        if (previousApprovedRolesRef.current === null) {
          previousApprovedRolesRef.current = newApprovedRoles;
          return;
        }

        const newRoles = newApprovedRoles.filter(
          (role: string) => !previousApprovedRolesRef.current!.includes(role)
        );

        if (newRoles.length > 0) {
          setCurrentUser(updatedUser);

          const roleLabel = newRoles[0] === 'provider' ? 'Service Provider' : 'Client';
          notifications.show({
            title: 'New Role Approved!',
            message: `You now have access to the ${roleLabel} role. Use the role switcher in the sidebar to switch between roles.`,
            color: 'green',
            autoClose: 10000,
          });

          previousApprovedRolesRef.current = newApprovedRoles;
        }
      } catch (error) {
        console.error('Failed to check for role updates:', error);
      }
    };

    checkForRoleUpdates();

    checkIntervalRef.current = setInterval(checkForRoleUpdates, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, currentUser?.id, setCurrentUser]);
};
