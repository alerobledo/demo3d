/* popup.js */
import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';

// Variables del popup
let popupRenderer, popupScene, popupCamera;
let popupControls;
let popupModal, popupCanvas;
let btnClose, btnBuy;

let modelInPopup = null;

/**
 * Inicializa los elementos del popup (canvas, renderer, cámara, botones, etc.)
 * Se llamará una sola vez (por ejemplo, desde el index.html).
 */
export function initPopup() {
  popupModal = document.getElementById('popupModal');
  popupCanvas = document.getElementById('popupCanvas');
  btnClose = document.getElementById('btnClose');
  btnBuy = document.getElementById('btnBuy');

  popupRenderer = new THREE.WebGLRenderer({
    canvas: popupCanvas,
    antialias: true
  });
  // El tamaño real se ajustará en showPopup() según el contenedor

  popupScene = new THREE.Scene();
  popupScene.background = new THREE.Color(0x222222);

  popupCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  popupCamera.position.set(0, 0, 3);

  // Luz básica en el popup
  const popLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  popupScene.add(popLight);

  // OrbitControls
  popupControls = new OrbitControls(popupCamera, popupRenderer.domElement);
  popupControls.enableDamping = true;
  popupControls.dampingFactor = 0.05;

  // Botones
  btnClose.onclick = hidePopup;
  btnBuy.onclick = () => {
    alert('¡Compraste el pato (demo)!');
    hidePopup();
  };
}

/**
 * Muestra el popup, carga de nuevo el modelo .glb (o podrías clonar el del pasillo),
 * y arranca el bucle de animación del popup.
 */
export function showPopup() {
  popupModal.style.display = 'flex';

  // Ajustar tamaño del renderer al canvas
  const pw = popupCanvas.clientWidth;
  const ph = popupCanvas.clientHeight;
  popupRenderer.setSize(pw, ph);

  // Limpiar la escena
  popupScene.clear();
  popupCamera.position.set(0, 0, 3);
  popupControls.reset();
  popupControls.update();

  // Luz en la escena (otra vez, por si la quitamos al limpiar)
  const popLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  popupScene.add(popLight);

  // Cargamos otra vez el .glb (aquí: Duck.glb)
  const loader = new GLTFLoader();
  loader.load(
    'Duck.glb',
    (gltf) => {
      modelInPopup = gltf.scene;
      // Ajustes de escala y posición para que se vea centrado
      modelInPopup.scale.set(0.5, 0.5, 0.5);
      modelInPopup.position.set(0, -0.3, 0);
      popupScene.add(modelInPopup);
    },
    undefined,
    (err) => console.error(err)
  );

  animatePopup();
}

/**
 * Oculta el popup y limpia su escena
 */
export function hidePopup() {
  popupModal.style.display = 'none';
  popupScene.clear();
}

/**
 * Bucle de animación del popup (OrbitControls)
 */
function animatePopup() {
  if (popupModal.style.display === 'none') {
    return; // si se cerró el popup, detenemos el bucle
  }
  requestAnimationFrame(animatePopup);

  popupControls.update();
  popupRenderer.render(popupScene, popupCamera);
}
