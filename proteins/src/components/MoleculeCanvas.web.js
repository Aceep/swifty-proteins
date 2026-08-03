import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';

/**
 * Web counterpart of MoleculeCanvas.js.
 *
 * react-native-webview ships no web implementation (there is no WebView.web.js
 * in the package), so on web it renders a "does not support this platform"
 * placeholder. The viewer payload is already plain HTML + three.js + RDKit,
 * so a srcDoc iframe runs it directly.
 *
 * Two gaps are bridged by BRIDGE_SCRIPT below, injected into the document head:
 *
 *   1. The viewer reports back through window.ReactNativeWebView.postMessage.
 *      We define that object so every existing call site keeps working.
 *   2. The viewer binds touch events only, which leaves it inert on desktop.
 *      We add mouse and wheel handlers that reuse its own scene state.
 *
 * The script must land in <head>: the viewer emits 'loaded' and 'error' from
 * its body script, so a bridge injected any later would drop them and leave
 * the loading spinner up forever.
 */

const BRIDGE_SCRIPT = `
(function () {
  if (!window.ReactNativeWebView) {
    window.ReactNativeWebView = {
      postMessage: function (data) {
        window.parent.postMessage(data, '*');
      }
    };
  }

  var DRAG_SLOP = 4;

  function send(payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  // The 2D Lewis view is an RDKit SVG with no three.js scene, so there is
  // nothing to bind there and this simply never succeeds.
  function bindPointerControls() {
    if (typeof renderer === 'undefined' || !renderer || !renderer.domElement) return false;
    if (typeof THREE === 'undefined') return false;

    var el = renderer.domElement;
    var dragging = false;
    var travelled = 0;
    var prev = { x: 0, y: 0 };

    el.addEventListener('mousedown', function (e) {
      dragging = true;
      travelled = 0;
      prev = { x: e.clientX, y: e.clientY };
    });

    // Bound on window so a drag that leaves the canvas still tracks.
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - prev.x;
      var dy = e.clientY - prev.y;
      travelled += Math.abs(dx) + Math.abs(dy);

      // Mirrors the touchmove handler: 2d rotates the group under an
      // orthographic camera, 3d rotates the whole scene.
      if (typeof VIEW_MODE !== 'undefined' && VIEW_MODE === '2d') {
        if (moleculeGroup) {
          moleculeGroup.rotation.y += dx * 0.01;
          moleculeGroup.rotation.x += dy * 0.01;
        }
      } else if (scene) {
        scene.rotation.y += dx * 0.01;
        scene.rotation.x += dy * 0.01;
      }

      prev = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', function (e) {
      if (!dragging) return;
      dragging = false;

      // A drag is not an atom selection.
      if (travelled > DRAG_SLOP) return;

      var rect = el.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x: x, y: y }, camera);

      var hits = raycaster.intersectObjects(atomMeshes);
      if (hits.length > 0) {
        var atom = hits[0].object;
        send({
          type: 'atomClicked',
          atom: { element: atom.userData.element, x: e.clientX, y: e.clientY }
        });
      } else {
        send({ type: 'backgroundClicked' });
      }
    });

    // Wheel stands in for pinch. Clamps match the touchmove handler.
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = -e.deltaY * 0.05;

      if (typeof VIEW_MODE !== 'undefined' && VIEW_MODE === '2d') {
        camera.zoom = Math.max(0.5, Math.min(40, camera.zoom + delta * 0.05));
        camera.updateProjectionMatrix();
      } else {
        camera.position.z = Math.max(5, Math.min(50, camera.position.z - delta * 0.25));
      }
    }, { passive: false });

    return true;
  }

  // init() runs after the CDN scripts land, so poll rather than race it.
  var attempts = 0;
  var timer = setInterval(function () {
    if (bindPointerControls() || ++attempts > 100) clearInterval(timer);
  }, 50);
})();
`;

function withWebBridge(html) {
  if (!html) return html;
  const tag = '<script>' + BRIDGE_SCRIPT + '</script>';
  const headMatch = /<head[^>]*>/i.exec(html);
  if (!headMatch) return tag + html;
  const at = headMatch.index + headMatch[0].length;
  return html.slice(0, at) + tag + html.slice(at);
}

export default function MoleculeCanvas({ html, style, onMessage, onLoad, onError }) {
  const iframeRef = useRef(null);

  // Kept in a ref so the listener is attached once instead of on every
  // render of the parent screen.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const srcDoc = useMemo(() => withWebBridge(html), [html]);

  useEffect(() => {
    const handleMessage = (event) => {
      const frame = iframeRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      if (typeof event.data !== 'string') return;

      // Reshaped to match the WebView event so the screen's existing
      // handler (which reads event.nativeEvent.data) works unchanged.
      if (onMessageRef.current) {
        onMessageRef.current({ nativeEvent: { data: event.data } });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <View style={style}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        onLoad={onLoad}
        onError={onError}
        title="Molecule viewer"
        // sandbox omitted deliberately: the viewer needs same-origin so the
        // three.js canvas can be reached for sharing.
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </View>
  );
}
