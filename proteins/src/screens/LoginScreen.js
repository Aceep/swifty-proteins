import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/authService';

export default function LoginScreen({
  variant = 'login',
  onBack,
  onRegister,
  autoBiometricToken = 0,
}) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const lastAutoBioToken = useRef(0);

  const isReconnect = variant === 'reconnect';
  const title = useMemo(() => (isReconnect ? 'Welcome back' : 'Welcome'), [isReconnect]);
  const subtitle = useMemo(
    () => (isReconnect ? 'Please reconnect to continue' : 'Authenticate to continue'),
    [isReconnect]
  );
  const primaryButtonLabel = useMemo(() => (isReconnect ? 'Reconnect' : 'Login'), [isReconnect]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = await AuthService.isBiometricSupported();
      const enabled = await AuthService.isBiometricEnabled();
      if (cancelled) return;
      setBiometricSupported(!!supported);
      setBiometricEnabled(!!enabled);

      const storedUsername = await AuthService.getUsername();
      if (!cancelled && storedUsername && !username) {
        setUsername(storedUsername);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Trigger biometric automatically when instructed (typically on app return)
    if (!isReconnect) return;
    if (!autoBiometricToken) return;
    if (autoBiometricToken === lastAutoBioToken.current) return;
    lastAutoBioToken.current = autoBiometricToken;

    if (biometricSupported && biometricEnabled) {
      handleBiometricAuth(true);
    }
  }, [autoBiometricToken, biometricSupported, biometricEnabled, isReconnect]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your username and password');
      return;
    }
    setLoading(true);
    const verified = await AuthService.verifyPassword(password, username);
    if (verified) {
      login(username.trim());
    } else {
      Alert.alert('Authentication Failed', 'Incorrect username or password. Please try again.');
    }
    setLoading(false);
  };

  const handleBiometricAuth = async (silent = false) => {
    setLoading(true);
    try {
      const result = await AuthService.authenticateWithBiometric();
      if (result.success) {
        const storedUsername = await AuthService.getUsername();
        login(storedUsername);
      } else if (!silent) {
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. Please try again or use your password.'
        );
      }
    } catch (e) {
      if (!silent) Alert.alert('Error', 'An error occurred during biometric authentication');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          {!!onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <MaterialIcons name="fingerprint" size={64} color="#00babc" />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {(biometricSupported && biometricEnabled) && (
            <>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={() => handleBiometricAuth(false)}
                disabled={loading}
              >
                <MaterialIcons name="fingerprint" size={32} color="#fff" />
                <Text style={styles.biometricText}>
                  {isReconnect ? 'Reconnect with Biometrics' : 'Login with Biometrics'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
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

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
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
              <Text style={styles.buttonText}>{primaryButtonLabel}</Text>
            )}
          </TouchableOpacity>

          {!isReconnect && !!onRegister && (
            <TouchableOpacity onPress={onRegister} style={styles.registerLink}>
              <Text style={styles.registerLinkText}>Don't have an account? Create one</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    zIndex: 10,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  registerLink: {
    marginTop: 20,
    alignSelf: 'center',
  },
  registerLinkText: {
    color: '#00babc',
  },
});
