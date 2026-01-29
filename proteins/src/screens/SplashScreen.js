import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreenComponent() {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const orbit1 = useRef(new Animated.Value(0)).current;
  const orbit2 = useRef(new Animated.Value(0)).current;
  const orbit3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Central molecule scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Orbit animations with different speeds
    Animated.loop(
      Animated.timing(orbit1, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(orbit2, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(orbit3, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbit1Rotate = orbit1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbit2Rotate = orbit2.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const orbit3Rotate = orbit3.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#0f2027', '#203a43', '#2c5364']}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Central Molecule Core */}
        <Animated.View
          style={[
            styles.moleculeCore,
            {
              transform: [{ scale: scaleAnim }, { rotate: spin }],
            },
          ]}
        >
          <View style={styles.atom} />
          <View style={[styles.bond, styles.bond1]} />
          <View style={[styles.bond, styles.bond2]} />
          <View style={[styles.bond, styles.bond3]} />
          <View style={[styles.bond, styles.bond4]} />
        </Animated.View>

        {/* Orbiting Electrons/Atoms */}
        <Animated.View
          style={[
            styles.orbitContainer,
            styles.orbit1,
            { transform: [{ rotate: orbit1Rotate }] },
          ]}
        >
          <View style={styles.electronSmall} />
        </Animated.View>

        <Animated.View
          style={[
            styles.orbitContainer,
            styles.orbit2,
            { transform: [{ rotate: orbit2Rotate }] },
          ]}
        >
          <View style={styles.electronMedium} />
        </Animated.View>

        <Animated.View
          style={[
            styles.orbitContainer,
            styles.orbit3,
            { transform: [{ rotate: orbit3Rotate }] },
          ]}
        >
          <View style={styles.electronLarge} />
        </Animated.View>

        {/* Title */}
        <Animated.View style={[styles.titleContainer, { opacity: fadeAnim }]}>
          <Text style={styles.title}>SWIFTY PROTEINS</Text>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moleculeCore: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atom: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00d4ff',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  bond: {
    position: 'absolute',
    width: 80,
    height: 4,
    backgroundColor: '#4dd0e1',
    opacity: 0.6,
  },
  bond1: {
    transform: [{ rotate: '0deg' }],
  },
  bond2: {
    transform: [{ rotate: '45deg' }],
  },
  bond3: {
    transform: [{ rotate: '90deg' }],
  },
  bond4: {
    transform: [{ rotate: '135deg' }],
  },
  orbitContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  orbit1: {
    width: 180,
    height: 180,
  },
  orbit2: {
    width: 240,
    height: 240,
  },
  orbit3: {
    width: 300,
    height: 300,
  },
  electronSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff6b6b',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  electronMedium: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#4ecdc4',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 5,
  },
  electronLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#95e1d3',
    shadowColor: '#95e1d3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 5,
  },
  titleContainer: {
    marginTop: 180,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 212, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#4dd0e1',
    marginTop: 10,
    letterSpacing: 4,
    fontWeight: '300',
  },
});
