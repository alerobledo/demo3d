/* js/corridor.js */
import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';

// Importamos la función showPopup del popup
import { showPopup } from './popup.js';

// Definición del corredor como recorrido cuadrado (anillo)
const corridorSize = 20;   // Tamaño exterior (por ejemplo, 20 unidades => de -10 a 10)
const innerSize = 12;      // Tamaño del cuadrado interior (por ejemplo, 12 unidades => de -6 a 6)
const corridorHeight = 3;  // Altura del corredor

let corridorRenderer, corridorScene, corridorCamera;
let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let model = null; // Aquí cargamos el modelo (Duck)
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
  // Posición inicial: debe estar en el pasillo (fuera del cuadrado interior).
  // Por ejemplo, si el cuadrado interior abarca de -6 a 6, podemos poner la cámara en x = 8.
  corridorCamera.position.set(8, 1.5, 0);

  // Luces
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  corridorScene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  corridorScene.add(dirLight);

  // Crear el corredor: en este ejemplo, usamos un conjunto de planos para piso, techo y paredes del cuadrado exterior.
  createCorridor();

  // Cargar el modelo (Duck) en el corredor
  const loader = new GLTFLoader();
  // Desde "js/" y el Duck.glb está en la raíz → usamos "../Duck.glb"
  loader.load(
    'https://alerobledo.github.io/demo3d/Duck.glb',
    (gltf) => {
      model = gltf.scene;
      // Colocar el modelo en la pared derecha (por ejemplo, en x = 9, que está cerca del borde exterior)
      // y en el centro de Z.
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
    if (moveForward)  mz -= step;
    if (moveBackward) mz += step;
    if (moveLeft)     mx -= step;
    if (moveRight)    mx += step;

    if (mx !== 0) controls.moveRight(mx);
    if (mz !== 0) controls.moveForward(mz);

    clampCameraToRing();
  }

  corridorRenderer.render(corridorScene, corridorCamera);
}

/**
 * Crea el corredor (recorrido cuadrado).
 * Aquí creamos el piso, techo y las cuatro paredes a lo largo del cuadrado exterior.
 */
function createCorridor() {
  // Suelo: un plano de tamaño corridorSize
  const floorGeo = new THREE.PlaneGeometry(corridorSize, corridorSize);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  corridorScene.add(floor);

  // Techo
  const ceilGeo = new THREE.PlaneGeometry(corridorSize, corridorSize);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = corridorHeight;
  corridorScene.add(ceiling);

  // Paredes (las paredes se ubican en los bordes del cuadrado exterior)
  const wallGeo = new THREE.PlaneGeometry(corridorSize, corridorHeight);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x999999 });

  // Pared frontal (z = -corridorSize/2)
  const frontWall = new THREE.Mesh(wallGeo, wallMat);
  frontWall.position.set(0, corridorHeight / 2, -corridorSize / 2);
  corridorScene.add(frontWall);

  // Pared trasera (z = corridorSize/2)
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.rotation.y = Math.PI;
  backWall.position.set(0, corridorHeight / 2, corridorSize / 2);
  corridorScene.add(backWall);

  // Pared izquierda (x = -corridorSize/2)
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(leftWall);

  // Pared derecha (x = corridorSize/2)
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(rightWall);
}

/**
 * Esta función limita la posición de la cámara para que se mantenga
 * en la zona del corredor, es decir, entre el cuadrado interior y el exterior.
 */
function clampCameraToRing() {
  const outer = corridorSize / 2 - 0.2;  // Límite exterior (10 - 0.2 = 9.8 si corridorSize es 20)
  const inner = innerSize / 2 + 0.2;       // Límite interior (6 + 0.2 = 6.2 si innerSize es 12)

  // Primero, clamp a los límites exteriores:
  corridorCamera.position.x = THREE.MathUtils.clamp(corridorCamera.position.x, -outer, outer);
  corridorCamera.position.z = THREE.MathUtils.clamp(corridorCamera.position.z, -outer, outer);

  // Si la cámara está dentro del cuadrado interior, la empujamos hacia la frontera más cercana:
  if (Math.abs(corridorCamera.position.x) < inner && Math.abs(corridorCamera.position.z) < inner) {
    let dx = inner - Math.abs(corridorCamera.position.x);
    let dz = inner - Math.abs(corridorCamera.position.z);
    if (dx < dz) {
      corridorCamera.position.x = corridorCamera.position.x < 0 ? -inner : inner;
    } else {
      corridorCamera.position.z = corridorCamera.position.z < 0 ? -inner : inner;
    }
  }
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
        showPopup(); // Llamada a la función importada de popup.js
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
