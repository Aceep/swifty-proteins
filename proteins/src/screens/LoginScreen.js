import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    // No need to navigate manually; the Auth screen will be displayed automatically
  };

  const handleViewLigands = () => {
    navigation.navigate('ProteinList');
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.container}>
          <View style={styles.card}>
            <MaterialIcons name="check-circle" size={80} color="#00babc" />
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>You are successfully authenticated</Text>
            <Text style={styles.message}>
              This is your home screen. You can now access all features of the app.
            </Text>

            {/* View Ligands Button */}
            <TouchableOpacity style={styles.button} onPress={handleViewLigands}>
              <Text style={styles.buttonText}>View Ligands</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#0f3460', // Molecular theme background
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
    padding: 40,
    width: '100%',
    maxWidth: 450,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00babc', // Molecular theme accent
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#00babc',
    marginBottom: 16,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    backgroundColor: '#e63946',
    borderRadius: 8,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#00babc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
