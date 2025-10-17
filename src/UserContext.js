// UserContext.js
import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userPhoneNumber, setUserPhoneNumber] = useState('');
  
    console.log("User Phone Number:", userPhoneNumber); // Debugging line
  
    return (
      <UserContext.Provider value={{ userPhoneNumber, setUserPhoneNumber }}>
        {children}
      </UserContext.Provider>
    );
  };
  

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider'); // Error handling
  }
  return context;
};

