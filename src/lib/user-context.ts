import { createContext, useContext } from 'react';
import { User } from './supabase';

export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
});

export const useUser = () => useContext(UserContext);

// Local storage key for caching user data
export const USER_STORAGE_KEY = 'active_user';

// Helper functions for user data persistence
export const saveUserToStorage = (user: User | null) => {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const loadUserFromStorage = (): User | null => {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as User;
    } catch (e) {
      console.error('Failed to parse stored user data:', e);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }
  return null;
}; 