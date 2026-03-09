import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import ligands from '../data/ligands';
import { useAuth } from '../context/AuthContext';

export default function ProteinListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { logout } = useAuth();
  const [filteredLigands, setFilteredLigands] = useState(ligands);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFilteredLigands(
      ligands.filter((ligand) =>
        ligand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery]);

  const handleLigandLoad = (ligand) => {
    console.log('Navigating to ProteinViewer with ligand:', ligand);
    navigation.navigate('ProteinViewer', { ligandId: ligand });
  };

  const renderLigand = ({ item }) => (
    <TouchableOpacity
      style={styles.ligandItem}
      onPress={() => handleLigandLoad(item)}
      disabled={loading}
    >
      <Text style={styles.ligandText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={logout} style={styles.backButton}>
            <MaterialIcons name="logout" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ligands</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Favorites')}
            style={styles.favoritesButton}
          >
            <MaterialIcons name="favorite" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search Ligands"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {loading && <ActivityIndicator size="large" color="#00babc" />}
          <FlatList
            data={filteredLigands}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderLigand}
            contentContainerStyle={styles.listContainer}
          />
        </View>
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
  backButton: {
    padding: 8,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    color: '#00babc',
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  favoritesButton: {
    padding: 8,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0f3460',
  },
  searchBar: {
    height: 50,
    borderColor: '#00babc',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    color: '#fff',
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  ligandItem: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#16213e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  ligandText: {
    fontSize: 18,
    color: '#00babc',
    fontWeight: '600',
  },
});