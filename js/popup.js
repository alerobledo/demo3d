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

import { controls } from './corridor.js';

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
    antialias: true,
    alpha: true  // Esto permite que se muestre la transparencia
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
    alert('Producto agregado al carrito. Segúi disfrutando de la compra!!');
    hidePopup();
  };
}

// ... existing imports and variables ...

/**
 * Muestra el popup, carga de nuevo el modelo .glb (o podrías clonar el del pasillo),
 * y arranca el bucle de animación del popup.
 * @param {string} modelUrl - La URL del modelo GLB a cargar.
 */
export function showPopup(modelUrl) {
   console.log('showPopup called with modelUrl:', modelUrl);
   popupModal.style.display = 'flex';
   console.log('Popup display set to flex');

   // Prevent event propagation when clicking inside the popup
   popupModal.addEventListener('click', (event) => {
     event.stopPropagation();
   });
   
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

   // Cargamos otra vez el .glb usando la URL proporcionada
   const loader = new GLTFLoader();
   loader.load(
     modelUrl,
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

// ... existing code ...

/**
 * Oculta el popup y limpia su escena
 */
export function hidePopup() {
  console.log('hidePopup called');
  popupModal.style.display = 'none';
  popupScene.clear();

  // Request pointer lock again after hiding the popup
  const corridorCanvas = document.getElementById('corridorCanvas');
  corridorCanvas.addEventListener('click', () => {
    controls.lock();
  });
  controls.lock();
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
