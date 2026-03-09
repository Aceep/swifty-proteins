import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const USERS_KEY = 'users';
const LAST_USER_KEY = 'last_user';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

// SecureStore is not available on web, use AsyncStorage as fallback
const isWeb = Platform.OS === 'web';

const storageGetItem = async (key) => {
  if (isWeb) return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
};

const storageSetItem = async (key, value) => {
  if (isWeb) return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
};

const storageRemoveItem = async (key) => {
  if (isWeb) return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
};

const normalizeUsernameKey = (username) => String(username || '').trim().toLowerCase();

const readUsers = async () => {
  try {
    const raw = await storageGetItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
};

const writeUsers = async (users) => {
  await storageSetItem(USERS_KEY, JSON.stringify(users));
};

export const AuthService = {
  // Check if device supports biometric authentication
  async isBiometricSupported() {
    if (isWeb) return false; // Biometrics not supported on web
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return compatible && enrolled;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  },

  // Get available biometric types
  async getBiometricTypes() {
    if (isWeb) return [];
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types;
    } catch (error) {
      console.error('Error getting biometric types:', error);
      return [];
    }
  },

  // Authenticate with biometric
  async authenticateWithBiometric() {
    if (isWeb) {
      return { success: false, error: 'Biometrics not supported on web' };
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Swifty proteins',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
      });
      return result;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: error.message };
    }
  },

  // Save user credentials securely (supports multiple local accounts)
  async saveCredentials(username, password) {
    try {
      const cleanUsername = String(username || '').trim();
      const cleanPassword = String(password || '');
      if (!cleanUsername || !cleanPassword) return false;

      const key = normalizeUsernameKey(cleanUsername);
      const users = await readUsers();
      if (users[key]) {
        // Username already exists
        return false;
      }

      users[key] = { username: cleanUsername, password: cleanPassword };
      await writeUsers(users);
      await storageSetItem(LAST_USER_KEY, cleanUsername);
      return true;
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  },

  // Get saved credentials for the last logged-in user (backward-compatible)
  async getCredentials() {
    try {
      const lastUser = await this.getUsername();
      if (!lastUser) return null;

      const users = await readUsers();
      const entry = users[normalizeUsernameKey(lastUser)];
      return entry ? { username: entry.username, password: entry.password } : null;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  },

  // Check if user exists
  async userExists() {
    const users = await readUsers();
    return Object.keys(users).length > 0;
  },

  // Get username
  async getUsername() {
    try {
      const last = await storageGetItem(LAST_USER_KEY);
      return last ? String(last) : null;
    } catch (e) {
      return null;
    }
  },

  // Verify password
  async verifyPassword(password, username) {
    const cleanUsername = String(username || '').trim();
    if (!cleanUsername) return false;

    const users = await readUsers();
    const entry = users[normalizeUsernameKey(cleanUsername)];
    if (!entry) return false;
    const ok = entry.password === String(password || '');
    if (ok) {
      // Keep track of the last successful user for biometric/reconnect flow
      await storageSetItem(LAST_USER_KEY, entry.username);
    }
    return ok;
  },

  // Enable/disable biometric authentication
  async setBiometricEnabled(enabled) {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, JSON.stringify(enabled));
    } catch (error) {
      console.error('Error setting biometric preference:', error);
    }
  },

  // Check if biometric is enabled
  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return enabled ? JSON.parse(enabled) : false;
    } catch (error) {
      console.error('Error getting biometric preference:', error);
      return false;
    }
  },

  // Delete credentials (logout)
  async deleteCredentials() {
    try {
      await storageRemoveItem(USERS_KEY);
      await storageRemoveItem(LAST_USER_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      return true;
    } catch (error) {
      console.error('Error deleting credentials:', error);
      return false;
    }
  },
};
