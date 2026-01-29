import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const USER_CREDENTIALS_KEY = 'user_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

// SecureStore is not available on web, use AsyncStorage as fallback
const isWeb = Platform.OS === 'web';

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

  // Save user credentials securely
  async saveCredentials(username, password) {
    try {
      const credentials = JSON.stringify({ username, password });
      if (isWeb) {
        // Use AsyncStorage on web as SecureStore is not available
        await AsyncStorage.setItem(USER_CREDENTIALS_KEY, credentials);
      } else {
        await SecureStore.setItemAsync(USER_CREDENTIALS_KEY, credentials);
      }
      return true;
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  },

  // Get saved credentials
  async getCredentials() {
    try {
      let credentials;
      if (isWeb) {
        credentials = await AsyncStorage.getItem(USER_CREDENTIALS_KEY);
      } else {
        credentials = await SecureStore.getItemAsync(USER_CREDENTIALS_KEY);
      }
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.error('Error retrieving credentials:', error);
      return null;
    }
  },

  // Check if user exists
  async userExists() {
    const credentials = await this.getCredentials();
    return credentials !== null;
  },

  // Get username
  async getUsername() {
    const credentials = await this.getCredentials();
    return credentials ? credentials.username : null;
  },

  // Verify password
  async verifyPassword(password) {
    const credentials = await this.getCredentials();
    if (!credentials) return false;
    return credentials.password === password;
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
      if (isWeb) {
        await AsyncStorage.removeItem(USER_CREDENTIALS_KEY);
      } else {
        await SecureStore.deleteItemAsync(USER_CREDENTIALS_KEY);
      }
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      return true;
    } catch (error) {
      console.error('Error deleting credentials:', error);
      return false;
    }
  },
};
