import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import Register from './RegisterScreen';
import LoginScreen from './LoginScreen';

export default function AuthScreen() {
  const { justLoggedOut, needsReauth } = useAuth();
  const [mode, setMode] = useState('choice'); // 'choice', 'login', 'register', 'reconnect'
  const [autoBiometricToken, setAutoBiometricToken] = useState(0);

  useEffect(() => {
    checkIfReturningUser();
  }, [justLoggedOut, needsReauth]);

  const checkIfReturningUser = async () => {
    const exists = await AuthService.userExists();
    
    if (exists && !justLoggedOut) {
      if (needsReauth) {
        setMode('reconnect');
        setAutoBiometricToken((t) => t + 1);
      } else {
        setMode('login');
      }
    } else if (exists && justLoggedOut) {
      setMode('choice');
    } else {
      setMode('choice');
    }
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
                <Text style={styles.title}>Swifty Proteins</Text>
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

          {mode === 'login' && (
            <LoginScreen
              variant="login"
              onBack={() => setMode('choice')}
              onRegister={() => setMode('register')}
            />
          )}

          {mode === 'reconnect' && (
            <LoginScreen
              variant="reconnect"
              onBack={() => setMode('choice')}
              autoBiometricToken={autoBiometricToken}
            />
          )}

          {mode === 'register' && (
            <Register setMode={setMode} />
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
});
