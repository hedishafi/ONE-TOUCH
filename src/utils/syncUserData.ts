/**
 * User Data Sync Utility
 * 
 * Syncs user data between localStorage.user (API storage) and localStorage.ot_current_user (authStore storage)
 * This ensures the authStore has access to the latest user data including multi-role fields.
 */

import { storage, STORAGE_KEYS } from './storage';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

/**
 * Sync user data from API storage to authStore storage
 */
export const syncUserDataToAuthStore = (): void => {
  try {
    console.log('🔄 Starting user data sync...');
    
    // Check if we have user data from the API (stored in localStorage.user)
    const apiUserData = localStorage.getItem('user');
    
    if (apiUserData) {
      const parsedUser = JSON.parse(apiUserData);
      console.log('📥 API user data:', parsedUser);
      
      // Map the API user data to the frontend User type
      const mappedUser: User = {
        id: String(parsedUser.id),
        email: parsedUser.email || '',
        phone: parsedUser.phone_number || parsedUser.phone || '',
        role: parsedUser.role,
        createdAt: parsedUser.date_joined || parsedUser.createdAt || new Date().toISOString(),
        verificationStatus: parsedUser.verification_status || 'pending',
        providerUid: parsedUser.provider_uid,
        isOnline: parsedUser.is_online,
        has_provider_role: parsedUser.has_provider_role,
        has_client_role: parsedUser.has_client_role,
        provider_onboarding_completed: parsedUser.provider_onboarding_completed,
      };
      
      console.log('🔄 Mapped user data:', mappedUser);
      
      // Store in ot_current_user for authStore
      storage.set(STORAGE_KEYS.currentUser, mappedUser);
      
      // Trigger authStore refresh
      useAuthStore.getState().refreshCurrentUser();
      
      console.log('✅ User data synced to authStore:', mappedUser);
      
      // Also verify the authStore was updated
      const authStoreUser = useAuthStore.getState().currentUser;
      console.log('🔍 AuthStore currentUser after sync:', authStoreUser);
      
    } else {
      console.log('ℹ️ No API user data found in localStorage.user');
      
      // Check if there's any user data at all
      const otCurrentUser = localStorage.getItem('ot_current_user');
      console.log('🔍 ot_current_user data:', otCurrentUser ? JSON.parse(otCurrentUser) : null);
    }
  } catch (error) {
    console.error('❌ Error syncing user data:', error);
  }
};

/**
 * Initialize user data sync on app load
 * Call this in your main App component
 */
export const initUserDataSync = (): void => {
  // Sync immediately
  syncUserDataToAuthStore();
  
  // Also sync when storage changes (e.g., after login in another tab)
  window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
      syncUserDataToAuthStore();
    }
  });
};
