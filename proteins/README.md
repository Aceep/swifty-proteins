

## Swifty Proteins — Mandatory Requirements Checklist

This section maps each **mandatory** requirement to the place it is implemented in the codebase.

## Swifty Proteins

Expo + React Native app that lets users browse ligands, view them in 3D (balls & sticks + CPK coloring), authenticate with password/biometrics, favorite eligible ligands per user, and share a preview of the 3D view.

### Features

- Local accounts (register/login) + biometric login
- Re-authentication when returning from background -> which is different from returning from inative state.
- Ligand list (from `ligands.txt`) + search
- 3D ligand viewer (rotate/zoom) + atom tooltip
- Favorites per user (restricted to ligands from the provided list)
- Share from viewer (includes a screenshot preview of the 3D area when available)

## Mandatory Requirements Checklist (mapping)

- App icon: `app.json` + `assets/images/` (icon + Android adaptive icons)
- Launch screen: `app.json` splash + `src/screens/SplashScreen.js`
- Login view + account creation: `src/screens/LoginScreen.js`, `src/screens/RegisterScreen.js`
- Biometrics: `src/services/authService.js` (uses `expo-local-authentication`)
- “Login always shown on relaunch”: `src/context/AuthContext.js` (AppState-based gating)
- Ligand list + search: `src/screens/ProteinListScreen.js`, `src/data/ligands.js`
- 3D ligand view + interactions: `src/screens/ProteinViewerScreen.js`
- Share: `src/screens/ProteinViewerScreen.js`
- Loading & errors: `src/screens/ProteinViewerScreen.js`

## Data Sources

- Ligand coordinates (SDF): `https://files.rcsb.org/ligands/download/<ID>_ideal.sdf`
- Protein structures (PDB): `https://files.rcsb.org/download/<PDB>.pdb`

A correct parsing of the SDF file is :
- The `ATOM` lines in the SDF file represent the atoms in the ligand, with their coordinates and element types.
- The `CONECT` lines represent the bonds between the atoms, specifying which atoms are connected to each other.

Example of an `ATOM` line:
```ATOM      1  C   LIG     1      12.011  0.000  0.000  0.00  0.00           C``
This line indicates that there is a carbon atom (C) with an atomic number of 6, located at coordinates (12.011, 0.000, 0.000). The `CONECT` lines would then specify how this carbon atom is bonded to other atoms in the ligand.


### What is a pdb file?
A PDB (Protein Data Bank) file is a standard format for representing three-dimensional structures of molecules
such as proteins, nucleic acids, and small molecules. It contains information about the atomic coordinates, connectivity, 
and other properties of the molecule, allowing researchers to visualize and analyze its structure.


## Run the app

From the repo root:

```bash
./start.sh
```
will build the docker without cache and start the container, then install JS dependencies and start Expo in tunnel mode to make it accecsible on the local network.

### Connect on phone ?

1. Ensure to install the Expo Go app on your phone (available on iOS and Android).
2. Scan the QR code printed in the terminal after running `./start.sh` with your phone’s camera or Expo Go’s built-in scanner.

## Stack (high level)

- Expo SDK + React Native
-> SDK is used for biometrics, secure storage, and other native features such as app state monitoring (eg state from background/inactive/active)
-> How does it work ? Expo SDK provides a set of tools and services built on top of React Native that simplify the development process and give us access to native device features without needing to write native code. For example, we use `expo-local-authentication` for biometrics, which abstracts away the platform-specific implementations and provides a unified API for both iOS and Android.
- React Navigation (native stack)
-> For screen navigation (login, list, viewer)
-> How does it work ? React Navigation is a popular library for handling navigation in React Native apps. We use the native stack navigator, which provides a platform-specific look and feel for navigation (like a stack of screens). It allows us to easily define our app’s navigation structure and handle transitions between screens.
- `react-native-webview` + Three.js for 3D rendering
-> Native WebView allows us to use Three.js for 3D rendering without needing a complex native module setup, and it’s performant enough for our use case (simple molecules)
-> How does it work ? We embed a WebView in our React Native app, which loads a local HTML/JS bundle that initializes a Three.js scene. We then communicate between the React Native code and the WebView using the messaging system to send ligand data and user interactions back and forth.
- Axios for HTTP
-> For fetching ligand/protein data from RCSB.
-> How does it work ? Axios is a promise-based HTTP client that allows us to make requests to external APIs (like RCSB) to fetch ligand and protein data. It provides an easy-to-use API for sending GET requests and handling responses, including error handling.
- SecureStore / AsyncStorage for local account persistence
-> SecureStore is used for storing sensitive data like authentication tokens, while AsyncStorage is used for less sensitive data like user preferences.
- `react-native-view-shot` for sharing a screenshot preview
-> Allows us to capture a screenshot of the 3D viewer area to include in the share content.
-> How does it work ? `react-native-view-shot` provides a simple API for capturing screenshots of React Native components. We use it to take a picture of the 3D viewer area and include it in the share content.