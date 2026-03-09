import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import { AuthService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [username, setUsername] = useState(null);
  const appState = React.useRef(AppState.currentState);
  const backgroundedAt = React.useRef(null);

  // Monitor app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('[AuthContext] App state changed from:', appState.current, 'to:', nextAppState);

      // Track when we truly go to background. (Opening notification/control center often causes
      // an 'inactive' blip on iOS; we don't want to trigger re-auth for that.)
      if (nextAppState === 'background') {
        backgroundedAt.current = Date.now();
      }
      
      // Require re-auth only when returning from BACKGROUND (not from INACTIVE).
      if (appState.current === 'background' && nextAppState === 'active') {
        const elapsedMs = backgroundedAt.current ? Date.now() - backgroundedAt.current : null;
        const shouldReauth = elapsedMs == null ? true : elapsedMs >= 1500;

        // Only force re-auth if the user was actually authenticated before backgrounding.
        // This prevents loops where the biometric prompt/background transition retriggers the auth screen.
        if (isAuthenticated && shouldReauth) {
          console.log('[AuthContext] App came from background, requiring re-authentication');
          setIsAuthenticated(false);
          setNeedsReauth(true);
          setJustLoggedOut(false);
        }
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

    if (userExists) {
      const storedUsername = await AuthService.getUsername();
      setUsername(storedUsername);
    } else {
      setUsername(null);
    }

    setIsLoading(false);
    // User must authenticate each time
    setIsAuthenticated(false);
    setNeedsReauth(false);
  };

  const login = (nextUsername) => {
    console.log('[AuthContext] Login called, setting isAuthenticated to true');
    setIsAuthenticated(true);
    if (nextUsername) setUsername(nextUsername);
    setJustLoggedOut(false);
    setNeedsReauth(false);
  };

  const logout = () => {
    console.log('[AuthContext] Logout called, setting isAuthenticated to false');
    // Just log out, don't delete credentials so user can log back in
    setIsAuthenticated(false);
    setUsername(null);
    setJustLoggedOut(true); // Mark that this was a manual logout
    setNeedsReauth(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        justLoggedOut,
        needsReauth,
        username,
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
