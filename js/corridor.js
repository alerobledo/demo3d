/* js/corridor.js */
import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';

// Importamos la función showPopup del módulo del popup
import { showPopup } from './popup.js';

// Variables y constantes del corredor
let corridorRenderer, corridorScene, corridorCamera;
let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let model = null; // aquí cargaremos el modelo (Duck, en este ejemplo)
let corridorRaycaster;

const corridorWidth = 6,    // Este valor ya no se usará directamente,
      corridorHeight = 3;   // pero lo dejamos para la altura.
      
// Nuevo parámetro: en lugar de corridorLength, definimos corridorSize para el cuadrado.
const corridorSize = 20;    // Tamaño del cuadrado exterior
const innerSize = 12;       // Tamaño del cuadrado interior (agujero)

// Variables para elementos del DOM
let corridorCanvas, blocker, instructions;

/**
 * Inicializa la escena del corredor (ahora un recorrido cuadrado).
 */
export function initCorridor() {
  corridorCanvas = document.getElementById('corridorCanvas');

  corridorRenderer = new THREE.WebGLRenderer({
    canvas: corridorCanvas,
    antialias: true
  });
  corridorRenderer.setSize(window.innerWidth, window.innerHeight);
  corridorRenderer.setPixelRatio(window.devicePixelRatio);

  corridorScene = new THREE.Scene();
  corridorScene.background = new THREE.Color(0xcccccc);

  // Reducir el FOV para suavizar la perspectiva (60° en lugar de 75°)
  corridorCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  corridorCamera.position.set(0, 1.5, 0);

  // Luces
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  corridorScene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  corridorScene.add(dirLight);

  // Crear el corredor en forma de anillo (recorrido cuadrado)
  createCorridor();

  // Cargar el modelo (Duck.glb)
  const loader = new GLTFLoader();
  // Debido a que este archivo está en la carpeta js/ y Duck.glb en la raíz,
  // usamos '../Duck.glb'
  loader.load(
    'https://alerobledo.github.io/demo3d/Duck.glb',
    (gltf) => {
      model = gltf.scene;
      // Posición: en este caso, lo ubicamos a la derecha (por ejemplo, en x = 3)
      // y un poco adelantado en z (para que se vea en el recorrido)
      model.position.set(3, 1, -corridorSize / 2);
      // Reducir la escala para que parezca un producto
      model.scale.set(0.3, 0.3, 0.3);
      corridorScene.add(model);
    },
    undefined,
    (err) => console.error(err)
  );

  // Configurar PointerLockControls
  controls = new PointerLockControls(corridorCamera, corridorRenderer.domElement);
  blocker = document.getElementById('blocker');
  instructions = document.getElementById('instructions');

  controls.addEventListener('lock', () => {
    blocker.style.display = 'none';
  });
  controls.addEventListener('unlock', () => {
    blocker.style.display = 'flex';
  });
  blocker.addEventListener('click', () => controls.lock());

  corridorScene.add(controls.getObject());

  // Eventos de teclado
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Raycaster para detectar clic en el modelo
  corridorRaycaster = new THREE.Raycaster();
  document.addEventListener('click', onCorridorClick);

  window.addEventListener('resize', onWindowResize);
}

/**
 * Crea el corredor en forma de recorrido cuadrado (anillo)
 * utilizando ExtrudeGeometry a partir de un Shape.
 */
function createCorridor() {
  // Creamos una forma que es un cuadrado con un agujero (otro cuadrado)
  const outerSize = corridorSize;    // Por ejemplo, 20 unidades
  const innerSizeLocal = innerSize;    // Por ejemplo, 12 unidades

  // Definir la forma del cuadrado exterior en el plano XY
  const shape = new THREE.Shape();
  shape.moveTo(-outerSize / 2, -outerSize / 2);
  shape.lineTo(outerSize / 2, -outerSize / 2);
  shape.lineTo(outerSize / 2, outerSize / 2);
  shape.lineTo(-outerSize / 2, outerSize / 2);
  shape.lineTo(-outerSize / 2, -outerSize / 2);

  // Definir el agujero (cuadrado interior) en el mismo plano
  const hole = new THREE.Path();
  hole.moveTo(-innerSizeLocal / 2, -innerSizeLocal / 2);
  hole.lineTo(-innerSizeLocal / 2, innerSizeLocal / 2);
  hole.lineTo(innerSizeLocal / 2, innerSizeLocal / 2);
  hole.lineTo(innerSizeLocal / 2, -innerSizeLocal / 2);
  hole.lineTo(-innerSizeLocal / 2, -innerSizeLocal / 2);
  shape.holes.push(hole);

  const extrudeSettings = {
    steps: 1,
    depth: corridorHeight, // La "altura" de la extrusión, que serán las paredes
    bevelEnabled: false
  };

  // Crear la geometría extruida
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // La extrusión por defecto va en el eje Z, queremos que vaya en Y, así que rotamos:
  geometry.rotateX(-Math.PI / 2);

  // Material para el corredor; DoubleSide para que se vean ambos lados
  const material = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide });
  const corridorMesh = new THREE.Mesh(geometry, material);

  // Añadimos la malla a la escena
  corridorScene.add(corridorMesh);
}

export function animateCorridor() {
  requestAnimationFrame(animateCorridor);

  if (controls.isLocked) {
    let step = 0.1;
    let mx = 0, mz = 0;
    if (moveForward)  mz -= step;
    if (moveBackward) mz += step;
    if (moveLeft)     mx -= step;
    if (moveRight)    mx += step;

    if (mx !== 0) controls.moveRight(mx);
    if (mz !== 0) controls.moveForward(mz);

    clampCorridor();
  }

  corridorRenderer.render(corridorScene, corridorCamera);
}

function onKeyDown(e) {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = true; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = true; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = true; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW': moveForward = false; break;
    case 'ArrowLeft':
    case 'KeyA': moveLeft = false; break;
    case 'ArrowDown':
    case 'KeyS': moveBackward = false; break;
    case 'ArrowRight':
    case 'KeyD': moveRight = false; break;
  }
}

function onCorridorClick(e) {
  if (!controls.isLocked) return;
  corridorRaycaster.setFromCamera(new THREE.Vector2(0, 0), corridorCamera);
  const intersects = corridorRaycaster.intersectObjects(corridorScene.children, true);
  if (intersects.length > 0 && model) {
    for (let i = 0; i < intersects.length; i++) {
      const obj = intersects[i].object;
      if (isDescendantOf(obj, model)) {
        console.log('Duck clickeado → abrir popup');
        controls.unlock();
        showPopup(); // Función importada desde popup.js
        break;
      }
    }
  }
}

function clampCorridor() {
  // Para un recorrido cuadrado, podríamos limitar la posición de la cámara
  // al interior de la forma exterior del corredor.
  const halfOuter = corridorSize / 2 - 0.2;
  if (corridorCamera.position.x < -halfOuter) corridorCamera.position.x = -halfOuter;
  if (corridorCamera.position.x > halfOuter) corridorCamera.position.x = halfOuter;

  const halfOuterZ = corridorSize / 2 - 0.2;
  if (corridorCamera.position.z < -halfOuterZ) corridorCamera.position.z = -halfOuterZ;
  if (corridorCamera.position.z > halfOuterZ) corridorCamera.position.z = halfOuterZ;
}

function onWindowResize() {
  corridorRenderer.setSize(window.innerWidth, window.innerHeight);
  corridorCamera.aspect = window.innerWidth / window.innerHeight;
  corridorCamera.updateProjectionMatrix();
}

function isDescendantOf(child, parent) {
  let current = child;
  while (current) {
    if (current === parent) return true;
    current = current.parent;
  }
  return false;
}
