/* js/corridor.js */
import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';

// Importamos la función showPopup del popup
import { showPopup } from './popup.js';

// Dimensiones para el corredor (recorrido cuadrado tipo "anillo")
const corridorSize = 20;   // Cuadrado exterior (de -10 a 10)
const innerSize = 12;      // Cuadrado interior (de -6 a 6)
const corridorHeight = 3;  // Altura de las paredes

let corridorRenderer, corridorScene, corridorCamera;
let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let model = null; // Aquí se cargará el modelo (Duck)
let corridorRaycaster;

let corridorCanvas, blocker, instructions;

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

  // Usamos un FOV de 60° para suavizar la perspectiva.
  corridorCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  // Posición inicial: debemos ubicar la cámara en el "pasillo" (fuera del cuadrado interior).
  // Con corridorSize/2 = 10 y innerSize/2 = 6, por ejemplo, x=8 es una posición válida.
  corridorCamera.position.set(8, 1.5, 0);

  // Luces
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  corridorScene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  corridorScene.add(dirLight);

  // Crear el corredor "anular" (con piso, techo, paredes exteriores e interiores)
  createCorridor();

  // Cargar el modelo (Duck.glb) en el corredor.
  // Nota: Dado que este archivo está en "js/" y Duck.glb en la raíz, usamos "../Duck.glb"
  const loader = new GLTFLoader();
  loader.load(
    'https://alerobledo.github.io/demo3d/Duck.glb',
    (gltf) => {
      model = gltf.scene;
      // Colocar el modelo en la pared exterior, por ejemplo, en la pared derecha:
      // El límite exterior en X es 10, así que lo colocamos cerca, en x = 9, y en y = 1.
      model.position.set(9, 1, 0);
      // Reducir la escala para que se vea como un producto pequeño.
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

export function animateCorridor() {
  requestAnimationFrame(animateCorridor);

  if (controls.isLocked) {
    let step = 0.1;
    let mx = 0, mz = 0;
    if (moveForward) mz -= step;
    if (moveBackward) mz += step;
    if (moveLeft) mx -= step;
    if (moveRight) mx += step;

    if (mx !== 0) controls.moveRight(mx);
    if (mz !== 0) controls.moveForward(mz);

    clampCameraToRing();
  }

  corridorRenderer.render(corridorScene, corridorCamera);
}

/**
 * Limita la posición de la cámara para que se mantenga dentro del "anillo" del corredor:
 * - No salga del cuadrado exterior (limite = corridorSize/2)
 * - No entre en el cuadrado interior (limite = innerSize/2)
 */
function clampCameraToRing() {
  const outer = corridorSize / 2 - 0.2;  // Límite exterior (10 - 0.2 = 9.8)
  const inner = innerSize / 2 + 0.2;       // Límite interior (6 + 0.2 = 6.2)

  // Clampea la posición a estar dentro del cuadrado exterior:
  corridorCamera.position.x = THREE.MathUtils.clamp(corridorCamera.position.x, -outer, outer);
  corridorCamera.position.z = THREE.MathUtils.clamp(corridorCamera.position.z, -outer, outer);

  // Si la cámara se encuentra dentro del cuadrado interior, la empujamos hacia la frontera más cercana:
  if (Math.abs(corridorCamera.position.x) < inner && Math.abs(corridorCamera.position.z) < inner) {
    if (Math.abs(corridorCamera.position.x) < Math.abs(corridorCamera.position.z)) {
      corridorCamera.position.x = corridorCamera.position.x < 0 ? -inner : inner;
    } else {
      corridorCamera.position.z = corridorCamera.position.z < 0 ? -inner : inner;
    }
  }
}

/**
 * Crea el corredor (recorrido cuadrado) con piso, techo, paredes exteriores e interiores.
 */
function createCorridor() {
  // --- Piso ---
  const floorGeo = new THREE.PlaneGeometry(corridorSize, corridorSize);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  corridorScene.add(floor);

  // --- Techo ---
  const ceilGeo = new THREE.PlaneGeometry(corridorSize, corridorSize);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = corridorHeight;
  corridorScene.add(ceiling);

  // --- Paredes exteriores ---
  const wallGeo = new THREE.PlaneGeometry(corridorSize, corridorHeight);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
  // Frontal (z = -corridorSize/2)
  const frontWall = new THREE.Mesh(wallGeo, wallMat);
  frontWall.position.set(0, corridorHeight / 2, -corridorSize / 2);
  corridorScene.add(frontWall);
  // Trasera (z = corridorSize/2)
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.rotation.y = Math.PI;
  backWall.position.set(0, corridorHeight / 2, corridorSize / 2);
  corridorScene.add(backWall);
  // Izquierda (x = -corridorSize/2)
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(leftWall);
  // Derecha (x = corridorSize/2)
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(rightWall);

  // --- Paredes interiores (del hueco) ---
  // Material para las paredes interiores: color clarito (por ejemplo, light grey 0xd3d3d3)
  const innerWallMat = new THREE.MeshStandardMaterial({ color: 0xd3d3d3, side: THREE.DoubleSide });
  // Ancho del hueco interior
  const innerBoundary = innerSize / 2; // = 6 si innerSize es 12

  // Pared interior frontal (z = -innerBoundary)
  const innerWallGeoH = new THREE.PlaneGeometry(innerSize, corridorHeight);
  const innerFrontWall = new THREE.Mesh(innerWallGeoH, innerWallMat);
  innerFrontWall.position.set(0, corridorHeight / 2, -innerBoundary);
  corridorScene.add(innerFrontWall);

  // Pared interior trasera (z = innerBoundary)
  const innerBackWall = new THREE.Mesh(innerWallGeoH, innerWallMat);
  innerBackWall.rotation.y = Math.PI;
  innerBackWall.position.set(0, corridorHeight / 2, innerBoundary);
  corridorScene.add(innerBackWall);

  // Pared interior izquierda (x = -innerBoundary)
  const innerWallGeoV = new THREE.PlaneGeometry(innerSize, corridorHeight);
  const innerLeftWall = new THREE.Mesh(innerWallGeoV, innerWallMat);
  innerLeftWall.rotation.y = Math.PI / 2;
  innerLeftWall.position.set(-innerBoundary, corridorHeight / 2, 0);
  corridorScene.add(innerLeftWall);

  // Pared interior derecha (x = innerBoundary)
  const innerRightWall = new THREE.Mesh(innerWallGeoV, innerWallMat);
  innerRightWall.rotation.y = -Math.PI / 2;
  innerRightWall.position.set(innerBoundary, corridorHeight / 2, 0);
  corridorScene.add(innerRightWall);
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
        showPopup();
        break;
      }
    }
  }
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
