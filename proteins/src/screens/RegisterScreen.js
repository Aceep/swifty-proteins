import React, { useEffect, useState } from 'react';
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

export default function RegisterScreen({ setMode }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    // Check for biometric support on mount
    const checkBiometricSupport = async () => {
      const supported = await AuthService.isBiometricSupported();
      setBiometricSupported(supported);
    };
    checkBiometricSupport();
  }, []);

  const handleRegister = async () => {
    if (username.trim() === '' || password.trim() === '') {
      Alert.alert('Error', 'Username and password cannot be empty');
      return;
    }
    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const saved = await AuthService.saveCredentials(username.trim(), password);
      if (!saved) {
        Alert.alert('Error', 'Failed to create account');
        return;
      }

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
    } catch (error) {
      Alert.alert('Error', 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
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