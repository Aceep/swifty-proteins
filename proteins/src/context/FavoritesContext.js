import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import ligands from '../data/ligands';

const FavoritesContext = createContext(null);

const favoritesStorageKey = (username) => `favorites:${(username || '').toLowerCase()}`;

const ligandSet = new Set(ligands.map((id) => String(id).toUpperCase()));

const isAllowedLigandId = (structureId) => {
  if (!structureId) return false;
  const id = String(structureId).toUpperCase();
  return /^[A-Z0-9]{3}$/.test(id) && ligandSet.has(id);
};

export const FavoritesProvider = ({ children }) => {
  const { username, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [isReady, setIsReady] = useState(false);

  const storageKey = useMemo(() => favoritesStorageKey(username), [username]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsReady(false);
      try {
        if (!isAuthenticated || !username) {
          if (!cancelled) setFavorites([]);
          return;
        }

        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        const normalized = Array.isArray(parsed)
          ? parsed.map((id) => String(id).toUpperCase()).filter(Boolean)
          : [];

        if (!cancelled) setFavorites(Array.from(new Set(normalized)));
      } catch (e) {
        if (!cancelled) setFavorites([]);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, storageKey, username]);

  useEffect(() => {
    if (!isAuthenticated || !username) return;
    if (!isReady) return;

    const persist = async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(favorites));
      } catch (e) {
        // Best-effort persistence; no UI error.
      }
    };

    persist();
  }, [favorites, isAuthenticated, isReady, storageKey, username]);

  const isFavorite = useCallback(
    (structureId) => {
      const id = String(structureId).toUpperCase();
      if (!isAllowedLigandId(id)) return false;
      return favorites.includes(id);
    },
    [favorites]
  );

  const toggleFavorite = useCallback((structureId) => {
    const id = String(structureId).toUpperCase();
    if (!isAllowedLigandId(id)) return;

    setFavorites((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [id, ...prev];
    });
  }, []);

  const value = useMemo(
    () => ({
      favorites,
      isReady,
      isFavorite,
      toggleFavorite,
    }),
    [favorites, isFavorite, isReady, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
};
