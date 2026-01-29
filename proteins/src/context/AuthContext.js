import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import { AuthService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const appState = React.useRef(AppState.currentState);

  // Monitor app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 [AuthContext] App state changed from:', appState.current, 'to:', nextAppState);
      
      if (appState.current === 'background' && nextAppState === 'active') {
        console.log('🔒 [AuthContext] App came from background, prompting for authentication');
        setIsAuthenticated(false);
        setJustLoggedOut(false);
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    const userExists = await AuthService.userExists();
    setIsLoading(false);
    // User must authenticate each time
    setIsAuthenticated(false);
  };

  const login = () => {
    console.log('🔑 [AuthContext] Login called, setting isAuthenticated to true');
    setIsAuthenticated(true);
    setJustLoggedOut(false);
  };

  const logout = () => {
    console.log('🚪 [AuthContext] Logout called, setting isAuthenticated to false');
    // Just log out, don't delete credentials so user can log back in
    setIsAuthenticated(false);
    setJustLoggedOut(true); // Mark that this was a manual logout
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        justLoggedOut,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
