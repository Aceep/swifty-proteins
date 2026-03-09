# Welcome to your Expo app 👋

## Swifty Proteins — Mandatory Requirements Checklist

This section maps each **mandatory** requirement to the place it is implemented in the codebase.

### App icon

- Configured in `app.json` via `expo.icon`
- Assets in `assets/images/`:
   - `icon.png`
   - Android adaptive icons: `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`

### Launch screen

- Native splash configured in `app.json` (`expo.splash` + `expo-splash-screen` plugin)
- Custom launch screen shown for ~3 seconds in `App.js`
   - Custom screen: `src/screens/SplashScreen.js`

### Login view / authentication

- **Always show login when app returns to foreground**: `src/context/AuthContext.js` (AppState-based re-auth)
- Account storage & management (local): `src/services/authService.js`
   - Multiple accounts stored locally (SecureStore on native, AsyncStorage on web)
- Create account: `src/screens/RegisterScreen.js`
- Login with password fallback: `src/screens/LoginScreen.js`
- Biometric login (TouchID/FaceID on iOS, BiometricManager on Android via Expo):
   - `src/services/authService.js` uses `expo-local-authentication`
   - UI entrypoint: `src/screens/LoginScreen.js`
- Failed login warning popup: `Alert.alert(...)` in `src/screens/LoginScreen.js`

### Protein (Ligand) list view

- Lists all ligands from resources:
   - Source list: `src/data/ligands.js`
   - Original file: `ligands.txt`
- Search within list: `src/screens/ProteinListScreen.js`

### Protein view (3D ligand)

- 3D ligand display (interactive): `src/screens/ProteinViewerScreen.js`
   - Zoom: pinch
   - Rotate: drag
- CPK coloring: `cpkColors` mapping in `src/screens/ProteinViewerScreen.js`
- Balls & sticks model:
   - atoms rendered as spheres
   - bonds rendered as cylinders
- Atom tooltip popup on tap + dismiss on background tap:
   - WebView posts `atomClicked` / `backgroundClicked`
   - RN modal tooltip in `src/screens/ProteinViewerScreen.js`
- Share button: `Share.share(...)` in `src/screens/ProteinViewerScreen.js`

### Loading & error handling

- Loading animation (spinner overlay): `src/screens/ProteinViewerScreen.js`
- Warning popup if ligand cannot be loaded from the website:
   - fetch failure: `Alert.alert('Warning', ...)` in `src/screens/ProteinViewerScreen.js`
   - WebView load/parse errors also surface as alerts

## Stack & Tool Choices (and why)

### App framework

- **Expo + React Native**
   - Why: fast cross-platform iteration (iOS/Android), good DX, and built-in access to device capabilities (biometrics, secure storage) via Expo modules.

### Navigation

- **React Navigation (native stack)**
   - Why: simple, stable navigation for an authentication gate + list → viewer flow.
   - Where: `src/navigation/AppNavigator.js`

### Authentication & user account storage

- **Local accounts stored on-device**
   - Why: project requirement is user account creation/login; local storage keeps the project self-contained with no backend dependency.
   - Implementation:
      - `expo-secure-store` on native (secure at-rest storage)
      - `@react-native-async-storage/async-storage` as a web fallback
   - Where: `src/services/authService.js`

### Biometrics

- **expo-local-authentication** (TouchID/FaceID on iOS, BiometricManager-backed on Android)
   - Why: meets the “fingerprint/biometric” requirement with a unified API across platforms.
   - Where: `src/services/authService.js`, `src/screens/LoginScreen.js`

### “Login always shown on relaunch” behavior

- **AppState re-auth gating**
   - Why: ensures that returning from background requires authentication again, per the subject.
   - Where: `src/context/AuthContext.js`, `src/screens/AuthScreen.js`

### Data fetching

- **Axios**
   - Why: simple HTTP client with good error handling.
   - Where: `src/api/api.js`

- **RCSB endpoints used**
   - Ligands: `https://files.rcsb.org/ligands/download/<ID>_ideal.sdf` (provides 3D coordinates)
   - PDB: `https://files.rcsb.org/download/<PDB>.pdb` (text PDB for parsing)
   - Why: these formats contain coordinates suitable for rendering.

### 3D rendering

- **react-native-webview + Three.js**
   - Why: lightweight 3D rendering inside a classic app without a full game engine; supports rotation/zoom interactions and custom rendering.
   - Rendering model:
      - balls (atoms) as spheres
      - sticks (bonds) as cylinders
      - CPK coloring mapping per element
   - Where: `src/screens/ProteinViewerScreen.js` (HTML/JS injected into WebView)

### UI & styling

- **expo-linear-gradient + StyleSheet**
   - Why: consistent “molecular / science” theme with minimal dependencies.
   - Where: most screens under `src/screens/`

### Share

- **React Native Share API**
   - Why: meets the “Share” requirement using the platform-native share sheet.
   - Where: `src/screens/ProteinViewerScreen.js`

## Get started

```bash
./start.sh