# 3D Viewer — Minimal Working Example (MWE)

This document is a small, “explain it like I’m new to the codebase” version of the 3D ligand viewer.
It focuses on **two things**:

1) **Download** a ligand structure file (SDF text)
2) **Push** atoms/bonds into a Three.js scene

It is not production-grade (no edge cases, minimal error handling).

---

## 1) Download the ligand (SDF)

Ligands on RCSB can be downloaded as an SDF file.
For a ligand ID like `ATP` the URL is:

- `https://files.rcsb.org/ligands/download/ATP_ideal.sdf`

In React Native we fetch it as text:

```js
import axios from 'axios';

export async function fetchLigandSdf(ligandId) {
  const id = String(ligandId || '').toUpperCase();
  const url = `https://files.rcsb.org/ligands/download/${id}_ideal.sdf`;
  const res = await axios.get(url, { responseType: 'text' });
  return res.data; // SDF text
}
```

What you get back is a big string. It contains atoms, bonds, and some metadata.

---

## 2) Pass the downloaded text into a WebView

The simplest pattern is:

- Build an HTML string in React Native
- Put the SDF text into that HTML as a JavaScript constant
- Let the HTML run Three.js and render

```js
import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';

export function MweLigandWebView({ sdfText }) {
  const html = useMemo(() => {
    return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { margin: 0; background: #0f3460; overflow: hidden; }
      #c { width: 100vw; height: 100vh; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  </head>
  <body>
    <div id="c"></div>
    <script>
      const SDF_TEXT = ${JSON.stringify(sdfText)};

      // We will: (1) parse atoms+bonds from SDF, (2) create meshes, (3) add them to the scene.

      // --- Three.js boot ---
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0f3460);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 15;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.getElementById('c').appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const key = new THREE.DirectionalLight(0xffffff, 0.7);
      key.position.set(10, 10, 10);
      scene.add(key);

      // --- Minimal SDF parsing (V2000 only) ---
      // SDF is a text file. In V2000:
      // - The counts line tells how many atoms/bonds exist.
      // - Then we read atom lines and bond lines.
      function parseSdfV2000(sdf) {
        const lines = String(sdf || '').split(/\r?\n/);
        const countsLine = lines[3] || '';
        const atomCount = parseInt(countsLine.substring(0, 3).trim(), 10);
        const bondCount = parseInt(countsLine.substring(3, 6).trim(), 10);

        const atoms = [];
        const bonds = [];

        const atomStart = 4;
        const bondStart = atomStart + atomCount;

        for (let i = 0; i < atomCount; i++) {
          const parts = (lines[atomStart + i] || '').trim().split(/\s+/);
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          const z = parseFloat(parts[2]);
          const element = String(parts[3] || 'C').toUpperCase();
          atoms.push({ x, y, z, element });
        }

        for (let i = 0; i < bondCount; i++) {
          const parts = (lines[bondStart + i] || '').trim().split(/\s+/);
          const a1 = parseInt(parts[0], 10) - 1; // 1-based in file
          const a2 = parseInt(parts[1], 10) - 1;
          const order = parseInt(parts[2], 10) || 1;
          if (Number.isFinite(a1) && Number.isFinite(a2)) {
            bonds.push({ a1, a2, order });
          }
        }

        return { atoms, bonds };
      }

      // --- “Push to the scene” ---
      // This is the key idea:
      // - create a mesh (sphere/cylinder)
      // - call scene.add(mesh)
      function addAtomsAndBondsToScene({ atoms, bonds }) {
        const atomMeshes = [];

        // 1) Atoms: spheres
        for (const a of atoms) {
          const geometry = new THREE.SphereGeometry(0.3, 24, 24);
          const material = new THREE.MeshPhongMaterial({ color: 0x9CA3AF });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.set(a.x, a.y, a.z);
          scene.add(sphere);
          atomMeshes.push(sphere);
        }

        // 2) Bonds: cylinders between atom positions
        for (const b of bonds) {
          const p1 = atoms[b.a1];
          const p2 = atoms[b.a2];
          if (!p1 || !p2) continue;

          const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
          const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);

          const dir = new THREE.Vector3().subVectors(v2, v1);
          const len = dir.length();

          const cylGeo = new THREE.CylinderGeometry(0.1, 0.1, len, 12);
          const cylMat = new THREE.MeshPhongMaterial({ color: 0xE5E7EB });
          const cyl = new THREE.Mesh(cylGeo, cylMat);

          // place in the middle
          cyl.position.copy(v1.clone().add(v2).multiplyScalar(0.5));

          // rotate cylinder to match the bond direction
          cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

          scene.add(cyl);
        }
      }

      // 3) Load + render
      const model = parseSdfV2000(SDF_TEXT);
      addAtomsAndBondsToScene(model);

      // 4) Animate loop
      function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      }
      animate();

      // Resize
      window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });
    </script>
  </body>
</html>`;
  }, [sdfText]);

  return <WebView source={{ html }} originWhitelist={['*']} />;
}
```

### What “push to the scene” means

In Three.js the scene is a container.

- If you create a sphere mesh and call `scene.add(sphere)`, it becomes visible.
- If you create a cylinder mesh and call `scene.add(cylinder)`, it becomes visible.

That is the whole idea.

---

## 3) Common gotchas (short)

- SDF can be V2000 or V3000. The MWE only shows V2000 parsing.
- Some structures have no bond list. In that case you can create bonds by distance.
- Large ligands can have hundreds of atoms. Rendering every sphere at high detail can be slow.

---

## 4) Where the real app does this

The production implementation is in:

- `src/screens/ProteinViewerScreen.js`

That file contains:

- a more complete SDF parser (V2000 + minimal V3000)
- PDB parsing
- touch controls
- click-to-tooltip messaging


FAQ:
How do i know which atom/bond corresponds to which line in the SDF?
- The SDF format is standardized. The counts line (4th line) tells you how many atoms and bonds there are. The next `atomCount` lines are the atom block, and the following `bondCount` lines are the bond block. Each atom line has coordinates and element info, and each bond line has indices of the connected atoms and bond order. You can refer to the SDF specification for more details: https://en.wikipedia.org/wiki/Chemical_table_file#Structure-Data_File


For the 2D Lewis view, how do you determine the 2D coordinates of the atoms?
- The 2D Lewis view is generated using a different algorithm that computes 2D coordinates based on the connectivity of the atoms. It typically uses a force-directed layout or a similar method to position the atoms in a way that minimizes overlaps and reflects the structure of the molecule. The specific implementation can be complex and may involve additional libraries or custom code to achieve a clear and informative 2D representation.

What librairy is used for the 2D Lewis view?
- The 2D Lewis view in the app is generated using a custom implementation that calculates 2D coordinates for the atoms based on their connectivity. It does not rely on an external library for this purpose. The algorithm takes into account the bonds between atoms and their types to create a visually coherent 2D representation of the molecule. This allows users to toggle between the 3D viewer and the 2D Lewis view seamlessly within the app.


