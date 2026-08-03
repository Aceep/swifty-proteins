import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, Share, SafeAreaView } from 'react-native';
import MoleculeCanvas from '../components/MoleculeCanvas';
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
  const [viewerMode, setViewerMode] = useState('3d'); // '3d' | '2d'
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

    // 2D Lewis-style depiction (SVG) via RDKit.js
    if (viewerMode === '2d') {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #0f3460;
      font-family: Arial, sans-serif;
    }
    #container {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #drawing {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #drawing svg {
      width: 100% !important;
      height: 100% !important;
    }
    .hint {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      color: rgba(229, 231, 235, 0.85);
      font-size: 12px;
      text-align: center;
    }
  </style>
  <script>
    function postMessage(payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    function handleScriptError() {
      postMessage({ type: 'error', message: 'Failed to load RDKit.js library' });
    }
  </script>
  <script src="https://unpkg.com/@rdkit/rdkit/dist/RDKit_minimal.js" onerror="handleScriptError()"></script>
</head>
<body>
  <div id="container">
    <div id="drawing"></div>
  </div>
  <div class="hint" id="hint"></div>

  <script>
    const MOLECULE_DATA = ${JSON.stringify(moleculeData.data)};
    const MOLECULE_FORMAT = ${JSON.stringify(moleculeData.format)};
    const STRUCTURE_ID = ${JSON.stringify(structureId)};

    function extractMolBlockFromSdf(s) {
      const text = String(s || '');
      // RCSB ligand downloads are typically SDF with a single record; strip anything after $$$$.
      const idx = text.indexOf('$$$$');
      const mol = (idx >= 0 ? text.slice(0, idx) : text).trim();
      return mol;
    }

    function setHint(message) {
      const el = document.getElementById('hint');
      if (el) el.textContent = message || '';
    }

    async function renderLewis() {
      if (MOLECULE_FORMAT !== 'sdf') {
        setHint('This structure format cannot be depicted as a Lewis diagram here.');
        postMessage({ type: 'loaded' });
        return;
      }

      try {
        if (!window.initRDKitModule) {
          throw new Error('RDKit init function not available');
        }

        const RDKit = await window.initRDKitModule({
          locateFile: (file) => 'https://unpkg.com/@rdkit/rdkit/dist/' + file
        });

        // Use CoordGen for better 2D layouts (fewer overlaps)
        try {
          RDKit.prefer_coordgen(true);
        } catch (e) {
          // ignore
        }

        const molBlock = extractMolBlockFromSdf(MOLECULE_DATA);
        if (!molBlock) throw new Error('Empty molecule data');

        let mol = RDKit.get_mol(molBlock);
        if (!mol) throw new Error('RDKit could not parse molecule');

        // Kekulé form tends to be closer to “Lewis-style” line structures.
        try {
          const kekule = mol.get_kekule_form();
          if (kekule && typeof kekule === 'string') {
            mol.delete && mol.delete();
            mol = RDKit.get_mol(kekule) || RDKit.get_mol(molBlock);
          }
        } catch (e) {
          // ignore
        }

        if (!mol) throw new Error('RDKit could not parse molecule');

        // Force generation of 2D coordinates (avoid projecting any existing 3D coords)
        try {
          mol.set_new_coords(true);
        } catch (e) {
          try {
            mol.set_new_coords(false);
          } catch (e2) {
            // ignore
          }
        }

        // Render in Kekulé form (closer to a Lewis-style line structure). Lone pairs are not
        // explicitly drawn by RDKit; charges/radicals are included when present.
        const mdetails = {
          width: Math.max(320, window.innerWidth),
          height: Math.max(480, window.innerHeight),
          addStereoAnnotation: true,
          explicitMethyl: true,
          clearBackground: false,
          backgroundColour: [0.0588, 0.2039, 0.3765],
          legendColour: [0.0, 0.7294, 0.7373],
          bondLineWidth: 2,
          padding: 0.1,
          rotate: 0,
          includeRadicals: true
        };

        const svg = mol.get_svg_with_highlights(JSON.stringify(mdetails));
        const dest = document.getElementById('drawing');
        dest.innerHTML = svg;

        // Ensure the SVG fills the viewport
        const svgEl = dest.querySelector('svg');
        if (svgEl) {
          svgEl.setAttribute('width', '100%');
          svgEl.setAttribute('height', '100%');
          svgEl.style.maxWidth = '100%';
          svgEl.style.maxHeight = '100%';
        }

        mol.delete && mol.delete();
        postMessage({ type: 'loaded' });
      } catch (err) {
        setHint('Failed to render Lewis structure.');
        postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    }

    renderLewis();
  </script>
</body>
</html>
`;
    }
    
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
  <script src="https://unpkg.com/three@0.128.0/build/three.min.js" onerror="handleScriptError()"></script>
</head>
<body>
  <div id="container"></div>
  
  <script>
    const MOLECULE_DATA = ${JSON.stringify(moleculeData.data)};
    const MOLECULE_FORMAT = ${JSON.stringify(moleculeData.format)};
    const VIEW_MODE = ${JSON.stringify(viewerMode)}; // '3d' | '2d'
    
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

    function getWebGLContext() {
      try {
        const canvas = document.createElement('canvas');
        return canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      } catch (e) {
        return null;
      }
    }

    function assertWebGLAvailable() {
      const gl = getWebGLContext();
      if (!gl) {
        throw new Error(
          'WebGL is not available in this WebView. On Android this usually means hardware acceleration/GPU is unavailable (common on emulators) or Android System WebView is outdated.'
        );
      }
    }

    let scene, camera, renderer;
    let moleculeGroup;
    let atomMeshes = [];
    let bondObjects = [];
    let isDragging = false;
    let previousTouch = { x: 0, y: 0 };
    let rotationVelocity = { x: 0, y: 0 };
    let pinchDistance = 0;

    const CPK_COLORS = ${JSON.stringify(cpkColors)};

    function init() {
      assertWebGLAvailable();
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f3460);

      const aspect = window.innerWidth / window.innerHeight;
      if (VIEW_MODE === '2d') {
        const frustumSize = 12;
        camera = new THREE.OrthographicCamera(
          (-frustumSize * aspect) / 2,
          (frustumSize * aspect) / 2,
          frustumSize / 2,
          -frustumSize / 2,
          0.1,
          1000
        );
        camera.position.set(0, 0, 50);
        camera.lookAt(0, 0, 0);
      } else {
        camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        camera.position.z = 15;
      }

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      } catch (e) {
        // Some Android WebViews fail to create an AA context; retry without antialiasing.
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
      }
      try {
        renderer.setPixelRatio(window.devicePixelRatio || 1);
      } catch (e) {
        // ignore
      }
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

      moleculeGroup = new THREE.Group();
      scene.add(moleculeGroup);

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

          if (VIEW_MODE === '2d') {
            // Rotate the 3D ligand; orthographic camera turns it into a 2D projection.
            rotationVelocity.x = deltaY * 0.01;
            rotationVelocity.y = deltaX * 0.01;

            moleculeGroup.rotation.y += rotationVelocity.y;
            moleculeGroup.rotation.x += rotationVelocity.x;
          } else {
            rotationVelocity.x = deltaY * 0.01;
            rotationVelocity.y = deltaX * 0.01;

            scene.rotation.y += rotationVelocity.y;
            scene.rotation.x += rotationVelocity.x;
          }

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

          if (VIEW_MODE === '2d') {
            camera.zoom += delta * 0.01;
            camera.zoom = Math.max(0.5, Math.min(40, camera.zoom));
            camera.updateProjectionMatrix();
          } else {
            camera.position.z -= delta * 0.01;
            camera.position.z = Math.max(5, Math.min(50, camera.position.z));
          }
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

          const intersects = raycaster.intersectObjects(atomMeshes);
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
      centerMolecule(MOLECULE_DATA);
    }

    else {
      throw new Error('Unknown format: ' + MOLECULE_FORMAT);
    }

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
      
      centerMolecule(atomPositions);
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
      if (bondObjects.length === 0) {
        createBondsByDistance(atomPositions);
      }

      // Center the molecule
      centerMolecule(atomPositions);
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

      centerMolecule(atomPositions);
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

      centerMolecule(atomPositions);
    }

    function createAtom(x, y, z, element) {
      if (VIEW_MODE === '2d') {
        // Skeletal view: hide implicit atoms
        const el = String(element || '').toUpperCase();
        if (el === 'H' || el === 'C') return;
      }

      const color = CPK_COLORS[element] || '#FF1493'; // Default to hot pink
      const radius = VIEW_MODE === '2d' ? 0.18 : 0.3;
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        shininess: 100,
        specular: 0x555555
      });
      const sphere = new THREE.Mesh(geometry, material);
      // Keep true 3D coordinates; orthographic camera handles the projection in 2D mode.
      sphere.position.set(x, y, z);
      sphere.userData = { element: element };
      atomMeshes.push(sphere);
      moleculeGroup.add(sphere);
    }

    function createBond(atom1, atom2, bondType) {
      if (VIEW_MODE === '2d') {
        createBondLines2D(atom1, atom2, bondType);
        return;
      }

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

      bondObjects.push(cylinder);
      moleculeGroup.add(cylinder);
    }

    function createBondLines2D(atom1, atom2, bondType) {
      // In skeletal mode we omit explicit H bonds (if present).
      const e1 = String(atom1?.element || '').toUpperCase();
      const e2 = String(atom2?.element || '').toUpperCase();
      if (e1 === 'H' || e2 === 'H') return;

      const x1 = atom1.x, y1 = atom1.y;
      const x2 = atom2.x, y2 = atom2.y;
      const z1 = atom1.z || 0;
      const z2 = atom2.z || 0;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const order = Math.max(1, Math.min(3, parseInt(bondType, 10) || 1));
      const offset = 0.10;

      const makeLine = (ox, oy) => {
        const points = [
          new THREE.Vector3(x1 + ox, y1 + oy, z1),
          new THREE.Vector3(x2 + ox, y2 + oy, z2),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xE5E7EB });
        const line = new THREE.Line(geometry, material);
        bondObjects.push(line);
        moleculeGroup.add(line);
      };

      if (order === 1) {
        makeLine(0, 0);
      } else if (order === 2) {
        makeLine(nx * offset, ny * offset);
        makeLine(-nx * offset, -ny * offset);
      } else {
        makeLine(0, 0);
        makeLine(nx * offset * 1.25, ny * offset * 1.25);
        makeLine(-nx * offset * 1.25, -ny * offset * 1.25);
      }
    }

    function centerMolecule(atomPositions) {
      const positions = Array.isArray(atomPositions) ? atomPositions : [];
      if (positions.length === 0) return;

      const center = new THREE.Vector3();
      for (let i = 0; i < positions.length; i++) {
        center.x += positions[i].x;
        center.y += positions[i].y;
        center.z += positions[i].z;
      }
      center.divideScalar(positions.length);

      moleculeGroup.position.set(-center.x, -center.y, -center.z);

      if (VIEW_MODE === '2d') {
        fitCamera2D(positions, center);
      }
    }

    function fitCamera2D(atomPositions, center) {
      const positions = Array.isArray(atomPositions) ? atomPositions : [];
      if (positions.length === 0) return;

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < positions.length; i++) {
        const x = positions[i].x - center.x;
        const y = positions[i].y - center.y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      const width = Math.max(1e-6, maxX - minX);
      const height = Math.max(1e-6, maxY - minY);

      // Set zoom so molecule fits in viewport.
      const aspect = window.innerWidth / window.innerHeight;
      const frustumWidth = camera.right - camera.left;
      const frustumHeight = camera.top - camera.bottom;

      const zoomX = (frustumWidth / width) * 0.85;
      const zoomY = (frustumHeight / height) * 0.85;
      camera.zoom = Math.max(0.5, Math.min(40, Math.min(zoomX, zoomY)));
      camera.updateProjectionMatrix();
    }

    function onWindowResize() {
      const aspect = window.innerWidth / window.innerHeight;
      if (VIEW_MODE === '2d') {
        const frustumHeight = camera.top - camera.bottom;
        const frustumWidth = frustumHeight * aspect;
        const centerX = (camera.left + camera.right) / 2;
        camera.left = centerX - frustumWidth / 2;
        camera.right = centerX + frustumWidth / 2;
        camera.updateProjectionMatrix();
      } else {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
      requestAnimationFrame(animate);

      // Apply rotation decay (used by both modes)
      rotationVelocity.x *= 0.95;
      rotationVelocity.y *= 0.95;

      if (!isDragging && (Math.abs(rotationVelocity.x) > 0.001 || Math.abs(rotationVelocity.y) > 0.001)) {
        if (VIEW_MODE === '2d') {
          moleculeGroup.rotation.y += rotationVelocity.y;
          moleculeGroup.rotation.x += rotationVelocity.x;
        } else {
          scene.rotation.y += rotationVelocity.y;
          scene.rotation.x += rotationVelocity.x;
        }
      }

      renderer.render(scene, camera);
    }

    try {
      init();
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'error', message: message })
      );
    }
  </script>
</body>
</html>
`;
  };

  const htmlContent = useMemo(() => {
    return moleculeData ? getHtmlContent() : '';
  }, [moleculeData, structureId, viewerMode]);

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
        message: `Check out this molecular structure of ${structureId}!`,
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
            <TouchableOpacity
                onPress={() => {
                  setShowTooltip(false);
                  setSelectedAtom(null);
                  setError(false);
                  setLoading(true);
                  setViewerMode((m) => (m === '3d' ? '2d' : '3d'));
                }}
              style={[styles.actionButton, styles.actionButtonRight]}
              accessibilityRole="button"
              accessibilityLabel={viewerMode === '3d' ? 'Switch to 2D Lewis structure view' : 'Switch to 3D view'}
            >
              <Text style={styles.modeButtonText}>{viewerMode === '3d' ? '2D' : '3D'}</Text>
            </TouchableOpacity>
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
              <MoleculeCanvas
                key={`webview-${structureId}-${viewerMode}`}
                html={htmlContent}
                style={styles.webview}
                onMessage={handleWebViewMessage}
                onError={(syntheticEvent) => {
                  const nativeEvent = syntheticEvent?.nativeEvent;
                  console.error('Viewer error:', nativeEvent || syntheticEvent);
                  setError(true);
                  setLoading(false);
                }}
                onHttpError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.error('Viewer HTTP error:', nativeEvent);
                }}
                onLoad={() => {
                  console.log('Viewer loaded successfully for structure:', structureId);
                }}
              />
            </ViewShot>
          </View>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#00babc" />
            <Text style={styles.loadingText}>{viewerMode === '2d' ? 'Loading 2D view...' : 'Loading 3D model...'}</Text>
          </View>
        )}

        <View style={styles.controls}>
          <Text style={styles.controlsText}>
            {viewerMode === '2d'
              ? 'Lewis structure (2D)'
              : '👆 Drag to rotate • 🤏 Pinch to zoom'}
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
  modeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 2,
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
