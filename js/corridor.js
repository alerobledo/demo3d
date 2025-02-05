/* corridor.js */
import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';

// Importamos showPopup (y/o hidePopup) desde popup.js
import { showPopup } from './popup.js';

let corridorRenderer, corridorScene, corridorCamera;
let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let helmetModel = null;  // En este caso, es el pato
let corridorRaycaster;

const corridorWidth = 4,
      corridorHeight = 3,
      corridorLength = 20;

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

  corridorCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  corridorCamera.position.set(0, 1.5, 0);

  // Luces
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  corridorScene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  corridorScene.add(dirLight);

  createCorridor();

  // Cargar Duck.glb
  const loader = new GLTFLoader();
  loader.load(
    '/Duck.glb',
    (gltf) => {
      helmetModel = gltf.scene;
      helmetModel.position.set(0, 1, -10);
      helmetModel.scale.set(1, 1, 1);
      corridorScene.add(helmetModel);
    },
    undefined,
    (err) => console.error(err)
  );

  // PointerLock
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

  // Eventos de teclado y mouse
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  corridorRaycaster = new THREE.Raycaster();
  document.addEventListener('click', onCorridorClick);

  // Resize
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

    clampCorridor();
  }

  corridorRenderer.render(corridorScene, corridorCamera);
}

// -------------- Funciones internas --------------

function createCorridor() {
  // Suelo
  const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -corridorLength / 2;
  corridorScene.add(floor);

  // Techo
  const ceilGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = corridorHeight;
  ceiling.position.z = -corridorLength / 2;
  corridorScene.add(ceiling);

  // Pared izquierda
  const wallGeo = new THREE.PlaneGeometry(corridorHeight, corridorLength);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.rotation.z = -Math.PI / 2;
  leftWall.position.x = -corridorWidth / 2;
  leftWall.position.z = -corridorLength / 2;
  leftWall.position.y = corridorHeight / 2;
  corridorScene.add(leftWall);

  // Pared derecha
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.rotation.z = -Math.PI / 2;
  rightWall.position.x = corridorWidth / 2;
  rightWall.position.z = -corridorLength / 2;
  rightWall.position.y = corridorHeight / 2;
  corridorScene.add(rightWall);
}

function onCorridorClick(e) {
  if (!controls.isLocked) return;

  corridorRaycaster.setFromCamera(new THREE.Vector2(0, 0), corridorCamera);
  const intersects = corridorRaycaster.intersectObjects(corridorScene.children, true);
  if (intersects.length > 0 && helmetModel) {
    for (let i = 0; i < intersects.length; i++) {
      const obj = intersects[i].object;
      if (isDescendantOf(obj, helmetModel)) {
        console.log('Duck clickeado → showPopup');
        controls.unlock();
        // Aquí llamamos a la función importada de popup.js
        showPopup();
        break;
      }
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

function clampCorridor() {
  const halfW = corridorWidth / 2 - 0.2;
  if (corridorCamera.position.x < -halfW) corridorCamera.position.x = -halfW;
  if (corridorCamera.position.x >  halfW) corridorCamera.position.x =  halfW;

  if (corridorCamera.position.z > 0) corridorCamera.position.z = 0;
  let minZ = -corridorLength;
  if (corridorCamera.position.z < minZ) corridorCamera.position.z = minZ;
}

function onWindowResize() {
  corridorRenderer.setSize(window.innerWidth, window.innerHeight);
  corridorCamera.aspect = window.innerWidth / window.innerHeight;
  corridorCamera.updateProjectionMatrix();
}

// Recorre la jerarquía de objetos para ver si child es descendiente de parent
function isDescendantOf(child, parent) {
  let current = child;
  while (current) {
    if (current === parent) return true;
    current = current.parent;
  }
  return false;
}
