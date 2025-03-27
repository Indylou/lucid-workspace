import React, { useState, useCallback } from 'react';
import { User } from '../lib/supabase';
import { UserContext, loadUserFromStorage, saveUserToStorage } from '../lib/user-context';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());

  // Update localStorage whenever user state changes
  const handleSetUser = useCallback((newUser: User | null) => {
    // Only update if the user has actually changed
    setUser(prev => {
      if (prev === newUser || JSON.stringify(prev) === JSON.stringify(newUser)) {
        return prev;
      }
      
      // Update localStorage after state change
      if (newUser) {
        saveUserToStorage(newUser);
      } else {
        localStorage.removeItem('active_user');
      }
      
      return newUser;
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser }}>
      {children}
    </UserContext.Provider>
  );
}; 