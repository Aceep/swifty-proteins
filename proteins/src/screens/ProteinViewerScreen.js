import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, Share, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import ViewShot from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchMoleculeData } from '../api/api';
import { useFavorites } from '../context/FavoritesContext';
import ligands from '../data/ligands';

export default function ProteinViewerScreen({ route, navigation }) {
  const structureId = (route?.params?.structureId || route?.params?.pdbId || route?.params?.ligandId || '').toUpperCase();

  const ligandShotRef = useRef(null);

  const safeBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  };

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(structureId);
  const canFavorite = /^[A-Z0-9]{3}$/.test(structureId) && ligands.includes(structureId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [moleculeData, setMoleculeData] = useState(null);
  const [selectedAtom, setSelectedAtom] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!structureId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(false);

        const molecule = await fetchMoleculeData(structureId);
        console.log('Loaded molecule:', {
          id: structureId,
          format: molecule?.format,
          dataType: typeof molecule?.data,
          dataSize: typeof molecule?.data === 'string' ? molecule.data.length : undefined,
        });
        setMoleculeData(molecule);
      } catch (err) {
        console.error(err);
        Alert.alert('Warning', 'Unable to load this ligand from the website.');
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [structureId]);

  // CPK color scheme for atoms
  const cpkColors = {
    H: '#FFFFFF', // Hydrogen - White
    C: '#909090', // Carbon - Grey
    N: '#3050F8', // Nitrogen - Blue
    O: '#FF0D0D', // Oxygen - Red
    F: '#90E050', // Fluorine - Green
    CL: '#1FF01F', // Chlorine - Green
    BR: '#A62929', // Bromine - Dark red
    I: '#940094', // Iodine - Purple
    P: '#FF8000', // Phosphorus - Orange
    S: '#FFFF30', // Sulfur - Yellow
    B: '#FFB5B5', // Boron - Peach
    LI: '#CC80FF', // Lithium - Violet
    NA: '#AB5CF2', // Sodium - Blue violet
    MG: '#8AFF00', // Magnesium - Green
    AL: '#BFA6A6', // Aluminum - Grey
    SI: '#F0C8A0', // Silicon - Beige
    K: '#8F40D4', // Potassium - Violet
    CA: '#3DFF00', // Calcium - Green
    TI: '#BFC2C7', // Titanium - Grey
    CR: '#8A99C7', // Chromium - Grey
    MN: '#9C7AC7', // Manganese - Grey
    FE: '#E06633', // Iron - Orange
    NI: '#50D050', // Nickel - Green
    CU: '#C88033', // Copper - Brown
    ZN: '#7D80B0', // Zinc - Blue grey
  };

  const getHtmlContent = () => {
    if (!moleculeData) return '';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #0f3460;
      touch-action: none;
    }
    #container {
      width: 100vw;
      height: 100vh;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #00babc;
      font-size: 18px;
      font-family: Arial, sans-serif;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" onerror="handleScriptError()"></script>
</head>
<body>
  <div id="container"></div>
  <div class="loading" id="loading">Rendering 3D model...</div>
  
  <script>
    const MOLECULE_DATA = ${JSON.stringify(moleculeData.data)};
    const MOLECULE_FORMAT = ${JSON.stringify(moleculeData.format)};
    
    function handleScriptError() {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: 'Failed to load Three.js library'
      }));
    }

    function logMessage(message) {
      console.log(message);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'log',
        message: message
      }));
    }

    // Check if Three.js loaded
    if (typeof THREE === 'undefined') {
      logMessage('THREE.js not loaded');
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: 'Three.js library not available'
      }));
    } else {
      logMessage('THREE.js loaded successfully');
    }

    let scene, camera, renderer, controls;
    let atoms = [];
    let bonds = [];
    let isDragging = false;
    let previousTouch = { x: 0, y: 0 };
    let rotationVelocity = { x: 0, y: 0 };
    let pinchDistance = 0;

    const CPK_COLORS = ${JSON.stringify(cpkColors)};

    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f3460);

      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 15;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.getElementById('container').appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);

      const pointLight = new THREE.PointLight(0x00babc, 0.5);
      pointLight.position.set(-10, -10, 10);
      scene.add(pointLight);

      // Load ligand data
      loadLigand();

      // Touch controls
      setupTouchControls();

      // Handle window resize
      window.addEventListener('resize', onWindowResize);

      animate();
    }

    function setupTouchControls() {
      const container = renderer.domElement;

      container.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          isDragging = true;
          previousTouch = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
          };
        } else if (e.touches.length === 2) {
          pinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      });

      container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && isDragging) {
          const deltaX = e.touches[0].clientX - previousTouch.x;
          const deltaY = e.touches[0].clientY - previousTouch.y;

          rotationVelocity.x = deltaY * 0.01;
          rotationVelocity.y = deltaX * 0.01;

          scene.rotation.y += rotationVelocity.y;
          scene.rotation.x += rotationVelocity.x;

          previousTouch = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
          };
        } else if (e.touches.length === 2) {
          const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const delta = currentDistance - pinchDistance;
          camera.position.z -= delta * 0.01;
          camera.position.z = Math.max(5, Math.min(50, camera.position.z));
          pinchDistance = currentDistance;
        }
      });

      container.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDragging = false;
        
        // Check for tap on atom
        if (e.changedTouches.length === 1) {
          const touch = e.changedTouches[0];
          const rect = container.getBoundingClientRect();
          const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera({ x, y }, camera);

          const intersects = raycaster.intersectObjects(atoms);
          if (intersects.length > 0) {
            const atom = intersects[0].object;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'atomClicked',
              atom: {
                element: atom.userData.element,
                x: touch.clientX,
                y: touch.clientY
              }
            }));
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'backgroundClicked'
            }));
          }
        }
      });
    }

function loadLigand() {
  try {
    logMessage('Starting to load ligand with format: ' + MOLECULE_FORMAT);

    if (MOLECULE_FORMAT === 'demo') {
      createDemoMolecule();
    }

    else if (MOLECULE_FORMAT === 'pdb') {
      parsePDB(MOLECULE_DATA);
    }

    else if (MOLECULE_FORMAT === 'sdf') {
      parseSDF(MOLECULE_DATA);
    }

    else if (MOLECULE_FORMAT === 'ligand') {
      // Already parsed array of atoms
      if (!Array.isArray(MOLECULE_DATA)) {
        throw new Error('Ligand data is not an array');
      }

      MOLECULE_DATA.forEach(atom => {
        createAtom(atom.x, atom.y, atom.z, atom.element);
      });

      createBondsByDistance(MOLECULE_DATA);
      centerMolecule();
    }

    else {
      throw new Error('Unknown format: ' + MOLECULE_FORMAT);
    }

    document.getElementById('loading').style.display = 'none';

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'loaded'
    }));

  } catch (error) {
    logMessage('Load error: ' + error.message);

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'error',
      message: error.message
    }));
  }
}


    function createDemoMolecule() {
      // Create a simple water molecule (H2O) as demo
      logMessage('Creating H2O demo molecule');
      
      // Oxygen at center
      createAtom(0, 0, 0, 'O');
      
      // Two hydrogens
      createAtom(0.96, 0, 0, 'H');
      createAtom(-0.24, 0.93, 0, 'H');
      
      // Bonds
      const atomPositions = [
        { x: 0, y: 0, z: 0, element: 'O' },
        { x: 0.96, y: 0, z: 0, element: 'H' },
        { x: -0.24, y: 0.93, z: 0, element: 'H' }
      ];
      
      createBond(atomPositions[0], atomPositions[1], 1);
      createBond(atomPositions[0], atomPositions[2], 1);
      
      centerMolecule();
    }

    function parsePDB(pdbData) {
      const lines = pdbData.split('\\n');
      const atomPositions = [];
      const atomMap = {};

      // Parse ATOM and HETATM records
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
          // PDB format: columns are fixed-width
          const atomSerial = parseInt(line.substring(6, 11).trim());
          const atomName = line.substring(12, 16).trim();
          const x = parseFloat(line.substring(30, 38).trim());
          const y = parseFloat(line.substring(38, 46).trim());
          const z = parseFloat(line.substring(46, 54).trim());
          const element = line.substring(76, 78).trim().toUpperCase() || atomName.charAt(0).toUpperCase();

          const atomData = { x, y, z, element, serial: atomSerial };
          atomPositions.push(atomData);
          atomMap[atomSerial] = atomPositions.length - 1;
          createAtom(x, y, z, element);
        }
        
        // Parse CONECT records for bonds
        if (line.startsWith('CONECT')) {
          const parts = line.substring(6).trim().split(/\\s+/).map(s => parseInt(s));
          const atom1Serial = parts[0];
          
          for (let j = 1; j < parts.length; j++) {
            const atom2Serial = parts[j];
            const idx1 = atomMap[atom1Serial];
            const idx2 = atomMap[atom2Serial];
            
            if (idx1 !== undefined && idx2 !== undefined && idx1 < idx2) {
              createBond(atomPositions[idx1], atomPositions[idx2], 1);
            }
          }
        }
      }

      // If no CONECT records, create bonds based on distance
      if (bonds.length === 0) {
        createBondsByDistance(atomPositions);
      }

      // Center the molecule
      centerMolecule();
    }

    function createBondsByDistance(atomPositions) {
      const maxBondDistance = 1.7; // Typical bond length in Angstroms
      
      for (let i = 0; i < atomPositions.length; i++) {
        for (let j = i + 1; j < atomPositions.length; j++) {
          const dx = atomPositions[j].x - atomPositions[i].x;
          const dy = atomPositions[j].y - atomPositions[i].y;
          const dz = atomPositions[j].z - atomPositions[i].z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < maxBondDistance) {
            createBond(atomPositions[i], atomPositions[j], 1);
          }
        }
      }
    }

    function parseSDF(sdfData) {
      const lines = String(sdfData || '').split(/\\r?\\n/);
      if (lines.length < 4) {
        throw new Error('SDF parse error: file too short');
      }

      const isV3000 = lines.some((l) => (l || '').includes('V3000')) || lines.some((l) => (l || '').trim().startsWith('M  V30'));
      if (isV3000) {
        return parseSDFV3000(lines);
      }
      return parseSDFV2000(lines);
    }

    function parseSDFV2000(lines) {
      let countsIndex = -1;
      for (let i = 0; i < Math.min(20, lines.length); i++) {
        if ((lines[i] || '').includes('V2000')) {
          countsIndex = i;
          break;
        }
      }
      if (countsIndex === -1) {
        // Fallback: common molfile layout has counts at line 4
        countsIndex = 3;
      }

      const countsLine = lines[countsIndex] || '';
      // V2000 counts are fixed width: first 3 chars = atoms, next 3 = bonds.
      // This correctly handles cases like "126133" (126 atoms, 133 bonds).
      const atomCount = parseInt(countsLine.substring(0, 3).trim(), 10);
      const bondCount = parseInt(countsLine.substring(3, 6).trim(), 10);
      if (!Number.isFinite(atomCount) || atomCount <= 0) {
        throw new Error('SDF parse error: invalid atom count');
      }
      if (!Number.isFinite(bondCount) || bondCount < 0) {
        throw new Error('SDF parse error: invalid bond count');
      }

      const atomStart = countsIndex + 1;
      const bondStart = atomStart + atomCount;
      if (atomStart >= lines.length) {
        throw new Error('SDF parse error: missing atom block');
      }
      if (bondStart > lines.length) {
        throw new Error('SDF parse error: truncated file (atom block)');
      }

      const atomPositions = [];
      for (let i = 0; i < atomCount; i++) {
        const line = lines[atomStart + i] || '';
        const parts = line.trim().split(/\\s+/);
        if (parts.length < 4) {
          throw new Error('SDF parse error: malformed atom line');
        }

        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        const z = parseFloat(parts[2]);
        const element = String(parts[3] || '').replace(/\\r/g, '').toUpperCase();

        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          throw new Error('SDF parse error: invalid atom coordinates');
        }
        if (!element) {
          throw new Error('SDF parse error: missing atom element');
        }

        const atom = { x, y, z, element };
        atomPositions.push(atom);
        createAtom(x, y, z, element);
      }

      for (let i = 0; i < bondCount; i++) {
        const line = lines[bondStart + i] || '';
        const parts = line.trim().split(/\\s+/);
        if (parts.length < 3) continue;
        const atom1 = parseInt(parts[0], 10) - 1;
        const atom2 = parseInt(parts[1], 10) - 1;
        const bondType = parseInt(parts[2], 10);
        if (!Number.isFinite(atom1) || !Number.isFinite(atom2)) continue;
        if (atom1 < 0 || atom2 < 0 || atom1 >= atomPositions.length || atom2 >= atomPositions.length) {
          continue;
        }
        createBond(atomPositions[atom1], atomPositions[atom2], Number.isFinite(bondType) ? bondType : 1);
      }

      if (atomPositions.length === 0) {
        throw new Error('SDF parse error: no atoms parsed');
      }

      centerMolecule();
    }

    function parseSDFV3000(lines) {
      // Minimal V3000 support for ligands that ship as V3000.
      const atomPositions = [];
      const atomIndexToArrayIndex = {};
      let inAtom = false;
      let inBond = false;
      const bondLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = (lines[i] || '').trim();
        if (!line) continue;

        if (line.startsWith('M  V30 BEGIN ATOM')) {
          inAtom = true;
          continue;
        }
        if (line.startsWith('M  V30 END ATOM')) {
          inAtom = false;
          continue;
        }
        if (line.startsWith('M  V30 BEGIN BOND')) {
          inBond = true;
          continue;
        }
        if (line.startsWith('M  V30 END BOND')) {
          inBond = false;
          continue;
        }

        if (inAtom && line.startsWith('M  V30')) {
          // Format: M  V30 <idx> <type> <x> <y> <z> ...
          const parts = line.split(/\\s+/);
          const idx = parseInt(parts[2], 10);
          const element = String(parts[3] || '').toUpperCase();
          const x = parseFloat(parts[4]);
          const y = parseFloat(parts[5]);
          const z = parseFloat(parts[6]);
          if (Number.isFinite(idx) && Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && element) {
            const atom = { x, y, z, element };
            atomIndexToArrayIndex[idx] = atomPositions.length;
            atomPositions.push(atom);
            createAtom(x, y, z, element);
          }
          continue;
        }

        if (inBond && line.startsWith('M  V30')) {
          bondLines.push(line);
        }
      }

      for (let i = 0; i < bondLines.length; i++) {
        const parts = bondLines[i].split(/\\s+/);
        const bondType = parseInt(parts[3], 10);
        const a1 = parseInt(parts[4], 10);
        const a2 = parseInt(parts[5], 10);
        const idx1 = atomIndexToArrayIndex[a1];
        const idx2 = atomIndexToArrayIndex[a2];
        if (idx1 != null && idx2 != null) {
          createBond(atomPositions[idx1], atomPositions[idx2], Number.isFinite(bondType) ? bondType : 1);
        }
      }

      if (atomPositions.length === 0) {
        throw new Error('SDF parse error: no atoms parsed (V3000)');
      }

      centerMolecule();
    }

    function createAtom(x, y, z, element) {
      const color = CPK_COLORS[element] || '#FF1493'; // Default to hot pink
      const geometry = new THREE.SphereGeometry(0.3, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 100,
        specular: 0x555555
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(x, y, z);
      sphere.userData = { element: element };
      atoms.push(sphere);
      scene.add(sphere);
    }

    function createBond(atom1, atom2, bondType) {
      const direction = new THREE.Vector3(
        atom2.x - atom1.x,
        atom2.y - atom1.y,
        atom2.z - atom1.z
      );
      const length = direction.length();
      
      const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
      const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
      const cylinder = new THREE.Mesh(geometry, material);

      cylinder.position.set(
        (atom1.x + atom2.x) / 2,
        (atom1.y + atom2.y) / 2,
        (atom1.z + atom2.z) / 2
      );

      const axis = new THREE.Vector3(0, 1, 0);
      cylinder.quaternion.setFromUnitVectors(axis, direction.normalize());

      bonds.push(cylinder);
      scene.add(cylinder);
    }

    function centerMolecule() {
      if (atoms.length === 0) return;

      const center = new THREE.Vector3();
      atoms.forEach(atom => {
        center.add(atom.position);
      });
      center.divideScalar(atoms.length);

      atoms.forEach(atom => {
        atom.position.sub(center);
      });
      bonds.forEach(bond => {
        bond.position.sub(center);
      });
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);

      // Apply rotation decay
      rotationVelocity.x *= 0.95;
      rotationVelocity.y *= 0.95;

      if (!isDragging && (Math.abs(rotationVelocity.x) > 0.001 || Math.abs(rotationVelocity.y) > 0.001)) {
        scene.rotation.y += rotationVelocity.y;
        scene.rotation.x += rotationVelocity.x;
      }

      renderer.render(scene, camera);
    }

    init();
  </script>
</body>
</html>
`;
  };

  const htmlContent = useMemo(() => {
    return moleculeData ? getHtmlContent() : '';
  }, [moleculeData, structureId]);

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);
      
      if (data.type === 'log') {
        console.log('[WebView]:', data.message);
      } else if (data.type === 'loaded') {
        setLoading(false);
      } else if (data.type === 'error') {
        console.error('WebView error:', data.message);
        setLoading(false);
        setError(true);
        Alert.alert('Error', `Failed to load structure: ${data.message}`);
      } else if (data.type === 'atomClicked') {
        setSelectedAtom(data.atom);
        setShowTooltip(true);
      } else if (data.type === 'backgroundClicked') {
        setShowTooltip(false);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  const handleShare = async () => {
    try {
      let screenshotUri;
      try {
        screenshotUri = await ligandShotRef.current?.capture?.();
      } catch (e) {
        screenshotUri = undefined;
      }

      const payload = {
        message: `Check out this 3D molecular structure of ${structureId}!`,
        title: `Structure ${structureId}`,
      };
      if (screenshotUri) payload.url = screenshotUri;

      await Share.share(payload);
    } catch (error) {
      Alert.alert('Error', 'Failed to share the model');
    }
  };

  const getAtomInfo = (element) => {
    const atomInfo = {
      H: { name: 'Hydrogen', atomicNumber: 1 },
      C: { name: 'Carbon', atomicNumber: 6 },
      N: { name: 'Nitrogen', atomicNumber: 7 },
      O: { name: 'Oxygen', atomicNumber: 8 },
      F: { name: 'Fluorine', atomicNumber: 9 },
      P: { name: 'Phosphorus', atomicNumber: 15 },
      S: { name: 'Sulfur', atomicNumber: 16 },
      CL: { name: 'Chlorine', atomicNumber: 17 },
      BR: { name: 'Bromine', atomicNumber: 35 },
      I: { name: 'Iodine', atomicNumber: 53 },
    };

    return atomInfo[element] || { name: element, atomicNumber: '?' };
  };

  if (error) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={safeBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Structure {structureId}</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={80} color="#EF4444" />
            <Text style={styles.errorText}>Failed to load structure</Text>
            <Text style={styles.errorSubtext}>This structure may not be available</Text>
            <TouchableOpacity style={styles.retryButton} onPress={safeBack}>
              <Text style={styles.retryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={safeBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Structure {structureId}</Text>
          <View style={styles.headerActions}>
            {canFavorite && (
              <TouchableOpacity
                onPress={() => toggleFavorite(structureId)}
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <MaterialIcons name={favorite ? 'favorite' : 'favorite-border'} size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleShare} style={[styles.actionButton, styles.actionButtonRight]}>
              <MaterialIcons name="share" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {moleculeData && (
          <View style={styles.webviewContainer}>
            <ViewShot
              ref={ligandShotRef}
              style={styles.webviewShot}
              options={{ format: 'png', quality: 0.9, result: 'tmpfile' }}
            >
              <WebView
                key={`webview-${structureId}`}
                source={{ html: htmlContent }}
                style={styles.webview}
                onMessage={handleWebViewMessage}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView error:', nativeEvent);
                  setError(true);
                  setLoading(false);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('WebView HTTP error:', nativeEvent);
                }}
                onLoad={() => {
                  console.log('WebView loaded successfully for structure:', structureId);
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                mixedContentMode="always"
                originWhitelist={['*']}
                startInLoadingState={false}
                {...(Platform.OS === 'android' ? { androidLayerType: 'software' } : {})}
              />
            </ViewShot>
          </View>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00babc" />
            <Text style={styles.loadingText}>Loading 3D model...</Text>
          </View>
        )}

        <View style={styles.controls}>
          <Text style={styles.controlsText}>
            👆 Drag to rotate • 🤏 Pinch to zoom
          </Text>
        </View>

        <Modal
          visible={showTooltip}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTooltip(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setShowTooltip(false)}
          >
            {selectedAtom && (
              <View style={styles.tooltip}>
                <View style={styles.tooltipHeader}>
                  <Text style={styles.tooltipSymbol}>{selectedAtom.element}</Text>
                  <TouchableOpacity onPress={() => setShowTooltip(false)}>
                    <MaterialIcons name="close" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.tooltipName}>
                  {getAtomInfo(selectedAtom.element).name}
                </Text>
                <Text style={styles.tooltipNumber}>
                  Atomic Number: {getAtomInfo(selectedAtom.element).atomicNumber}
                </Text>
                <View style={[
                  styles.colorIndicator,
                  { backgroundColor: cpkColors[selectedAtom.element] || '#FF1493' }
                ]} />
                <Text style={styles.tooltipColor}>CPK Color</Text>
              </View>
            )}
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  actionButtonRight: {
    marginLeft: 8,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  webviewShot: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f3460',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 52, 96, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#00babc',
    fontWeight: '600',
  },
  controls: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#16213e',
  },
  controlsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    minWidth: 250,
    borderWidth: 2,
    borderColor: '#00babc',
    shadowColor: '#00babc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipSymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00babc',
  },
  tooltipName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  tooltipNumber: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  colorIndicator: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#16213e',
  },
  tooltipColor: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 20,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#00babc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
