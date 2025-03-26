import React, { useState, useEffect } from 'react';
import { User } from '../lib/supabase';
import { UserContext, loadUserFromStorage, saveUserToStorage } from '../lib/user-context';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());

  // Update localStorage whenever user state changes
  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    saveUserToStorage(newUser);
  };

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser }}>
      {children}
    </UserContext.Provider>
  );
}; 