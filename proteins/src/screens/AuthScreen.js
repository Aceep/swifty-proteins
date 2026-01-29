import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthService } from '../services/authService';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { login, justLoggedOut, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('choice'); // 'choice', 'login', 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    console.log('🔐 [AuthScreen] Mounted, justLoggedOut:', justLoggedOut);
    checkBiometricSupport();
    checkIfReturningUser();
  }, []);

  const checkBiometricSupport = async () => {
    const supported = await AuthService.isBiometricSupported();
    setBiometricSupported(supported);
  };

  const checkIfReturningUser = async () => {
    console.log('🔍 [AuthScreen] Checking if returning user, justLoggedOut:', justLoggedOut);
    // Check if user already has an account and is returning
    const exists = await AuthService.userExists();
    console.log('👤 [AuthScreen] User exists:', exists);
    
    if (exists && !justLoggedOut) {
      // Returning user from app background - show login and auto-trigger biometric
      console.log('📱 [AuthScreen] Returning user from background, showing login with auto-biometric');
      setMode('login');
      
      const biometricPref = await AuthService.isBiometricEnabled();
      const supported = await AuthService.isBiometricSupported();
      
      if (biometricPref && supported) {
        setTimeout(() => handleBiometricAuth(), 500);
      }
    } else if (exists && justLoggedOut) {
      // User just logged out - show choice screen, no auto-biometric
      console.log('🚪 [AuthScreen] User just logged out, showing choice screen');
      setMode('choice');
    } else {
      // New user - show choice
      console.log('🆕 [AuthScreen] New user, showing choice screen');
      setMode('choice');
    }
  };

  const handleBiometricAuth = async () => {
    setLoading(true);
    try {
      const result = await AuthService.authenticateWithBiometric();
      
      if (result.success) {
        console.log('✅ Biometric authentication successful, logging in...');
        login();
      } else {
        console.log('❌ Biometric authentication failed:', result.error);
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. Please try again or use your password.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error during biometric auth:', error);
      Alert.alert('Error', 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    const saved = await AuthService.saveCredentials(username, password);
    
    if (saved) {
      // Ask if user wants to enable biometric
      if (biometricSupported) {
        Alert.alert(
          'Enable Biometric Authentication?',
          'Would you like to use fingerprint/face recognition to login?',
          [
            {
              text: 'No',
              onPress: async () => {
                await AuthService.setBiometricEnabled(false);
                login();
              },
            },
            {
              text: 'Yes',
              onPress: async () => {
                await AuthService.setBiometricEnabled(true);
                login();
              },
            },
          ]
        );
      } else {
        login();
      }
    } else {
      Alert.alert('Error', 'Failed to create account');
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your username and password');
      return;
    }

    setLoading(true);
    const verified = await AuthService.verifyPassword(password);
    const storedUsername = await AuthService.getUsername();
    
    if (verified && storedUsername === username) {
      login();
    } else {
      Alert.alert(
        'Authentication Failed',
        'Incorrect username or password. Please try again.'
      );
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {mode === 'choice' && (
            <View style={styles.card}>
              <View style={styles.header}>
                <MaterialIcons name="security" size={64} color="#00babc" />
                <Text style={styles.title}>Swifty Companion</Text>
                <Text style={styles.subtitle}>Welcome! Please choose an option</Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => setMode('login')}
              >
                <MaterialIcons name="login" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setMode('register')}
              >
                <MaterialIcons name="person-add" size={24} color="#00babc" style={styles.buttonIcon} />
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'login' &&(
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setMode('choice')}
              >
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>

              <View style={styles.header}>
                <MaterialIcons name="fingerprint" size={64} color="#00babc" />
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Authenticate to continue</Text>
              </View>

              {/* Biometric Button */}
              {biometricSupported && isAuthenticated && (
                <>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricAuth}
                    disabled={loading}
                  >
                    <MaterialIcons name="fingerprint" size={32} color="#fff" />
                    <Text style={styles.biometricText}>
                      Use Face ID / Touch ID
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}

              {/* Username field */}
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Password field */}
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {mode === 'register' && (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setMode('choice')}
              >
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>

              <View style={styles.header}>
                <MaterialIcons name="person-add" size={64} color="#00babc" />
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Register to access Swifty Companion</Text>
              </View>

              {/* Username field */}
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Password field */}
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm password */}
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#6B7280"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {!biometricSupported && (
                <View style={styles.infoBox}>
                  <MaterialIcons name="info" size={16} color="#6B7280" />
                  <Text style={styles.infoText}>
                    Biometric authentication not available on this device
                  </Text>
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00babc',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  biometricButton: {
    backgroundColor: '#00babc',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#00babc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  biometricText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#16213e',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#16213e',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#0f3460',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#00babc',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#00babc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00babc',
    marginTop: 12,
  },
  buttonTextSecondary: {
    color: '#00babc',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    zIndex: 10,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#00babc',
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
    flex: 1,
  },
});
