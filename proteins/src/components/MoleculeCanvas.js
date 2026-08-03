import React from 'react';
import { Platform } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * Renders the viewer HTML on native platforms.
 *
 * The web build resolves MoleculeCanvas.web.js instead, which swaps the
 * WebView for an iframe. Both expose the same props so ProteinViewerScreen
 * stays platform-agnostic.
 */
export default function MoleculeCanvas({ html, style, onMessage, onLoad, onError, onHttpError }) {
  return (
    <WebView
      source={{ html }}
      style={style}
      onMessage={onMessage}
      onError={onError}
      onHttpError={onHttpError}
      onLoad={onLoad}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      mixedContentMode="always"
      originWhitelist={['*']}
      startInLoadingState={false}
      {...(Platform.OS === 'android'
        ? {
            androidLayerType: 'hardware',
            androidHardwareAccelerationDisabled: false,
          }
        : {})}
    />
  );
}
