import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen({ route }) {
  const { user } = route.params;
  const navigation = useNavigation();

  const handleViewLigands = () => {
    navigation.navigate('ProteinList');
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.profileCard}>
            {user.image?.link && (
              <Image source={{ uri: user.image.link }} style={styles.avatar} />
            )}
            
            <Text style={styles.name}>{user.usual_full_name || user.displayname}</Text>
            <Text style={styles.login}>@{user.login}</Text>
            
            {user.email && (
              <View style={styles.infoRow}>
                <MaterialIcons name="email" size={20} color="#6B7280" />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>
            )}

            {user.location && (
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color="#6B7280" />
                <Text style={styles.infoText}>{user.location}</Text>
              </View>
            )}

            {user.wallet !== undefined && (
              <View style={styles.infoRow}>
                <MaterialIcons name="account-balance-wallet" size={20} color="#6B7280" />
                <Text style={styles.infoText}>{user.wallet} ₳</Text>
              </View>
            )}

            {user.correction_point !== undefined && (
              <View style={styles.infoRow}>
                <MaterialIcons name="star" size={20} color="#6B7280" />
                <Text style={styles.infoText}>{user.correction_point} Correction Points</Text>
              </View>
            )}
          </View>

          {user.cursus_users && user.cursus_users.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cursus Information</Text>
              {user.cursus_users.map((cursus, index) => (
                <View key={index} style={styles.cursusItem}>
                  <Text style={styles.cursusName}>{cursus.cursus.name}</Text>
                  <Text style={styles.cursusLevel}>Level: {cursus.level?.toFixed(2) || '0.00'}</Text>
                  {cursus.grade && (
                    <Text style={styles.cursusGrade}>Grade: {cursus.grade}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {user.projects_users && user.projects_users.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Projects</Text>
              {user.projects_users.slice(0, 10).map((project, index) => (
                <View key={index} style={styles.projectItem}>
                  <Text style={styles.projectName}>{project.project.name}</Text>
                  <View style={styles.projectDetails}>
                    <Text style={[
                      styles.projectStatus,
                      project.validated === true && styles.projectValidated,
                      project.validated === false && styles.projectFailed,
                    ]}>
                      {project.status}
                    </Text>
                    {project.final_mark !== null && (
                      <Text style={styles.projectMark}>{project.final_mark}/100</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {user.achievements && user.achievements.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Achievements</Text>
              <Text style={styles.achievementCount}>
                {user.achievements.length} achievements unlocked
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleViewLigands}
          >
            <Text style={styles.buttonText}>View Ligands</Text>
          </TouchableOpacity>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 20,
    color: '#00babc',
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#00babc',
    shadowColor: '#00babc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  name: {
    fontSize: 26,
    color: '#00babc',
    fontWeight: 'bold',
    marginTop: 8,
  },
  login: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#16213e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00babc',
    marginBottom: 16,
  },
  cursusItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  cursusName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cursusLevel: {
    fontSize: 14,
    color: '#00babc',
    marginBottom: 2,
  },
  cursusGrade: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  projectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  projectDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectStatus: {
    fontSize: 14,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  projectValidated: {
    color: '#10B981',
    fontWeight: '600',
  },
  projectFailed: {
    color: '#EF4444',
    fontWeight: '600',
  },
  projectMark: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00babc',
  },
  achievementCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  button: {
    backgroundColor: '#00babc',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#00babc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
