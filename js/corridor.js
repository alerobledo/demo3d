import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';
import { showPopup } from './popup.js';

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const corridorSize = 20;
const innerSize = 12;
const corridorHeight = 3;

let corridorRenderer, corridorScene, corridorCamera;
let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let model = null;
let corridorRaycaster;
let corridorCanvas, instructions;

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

  corridorCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  corridorCamera.position.set(8, 1.5, 0);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  corridorScene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  corridorScene.add(dirLight);

  createCorridor();

  const loader = new GLTFLoader();
  loader.load(
    'https://alerobledo.github.io/demo3d/Duck.glb',
    (gltf) => {
      model = gltf.scene;
      model.position.set(9, 1, 0);
      model.scale.set(0.3, 0.3, 0.3);
      corridorScene.add(model);
    },
    undefined,
    (err) => console.error(err)
  );

  if (isMobile()) {
    const joystickZone = document.getElementById('joystickZone');
    const joystick = nipplejs.create({
      zone: joystickZone,
      mode: 'static',
      position: { left: '20%', bottom: '20%' },
      color: 'white'
    });

    let joystickData = { x: 0, y: 0 };
    joystick.on('move', (evt, data) => {
      if (data && data.vector) {
        joystickData.x = data.vector.x;
        joystickData.y = data.vector.y;
      }
    });
    joystick.on('end', () => {
      joystickData.x = 0;
      joystickData.y = 0;
    });
    window.mobileJoystickData = joystickData;

    const rotationZone = document.createElement('div');
    rotationZone.id = 'rotationZone';
    document.body.appendChild(rotationZone);
    const rotationJoystick = nipplejs.create({
      zone: rotationZone,
      mode: 'static',
      position: { right: '20%', bottom: '20%' },
      color: 'white'
    });
    let rotationData = { x: 0, y: 0 };
    rotationJoystick.on('move', (evt, data) => {
      if (data && data.vector) {
        let angle = data.angle.degree;
        angle = (angle + 360) % 360;
        if (angle >= 45 && angle < 135) {
          rotationData.x = 0;
          rotationData.y = 1;
        } else if (angle >= 135 && angle < 225) {
          rotationData.x = -1;
          rotationData.y = 0;
        } else if (angle >= 225 && angle < 315) {
          rotationData.x = 0;
          rotationData.y = -1;
        } else {
          rotationData.x = 1;
          rotationData.y = 0;
        }
      }
    });
    rotationJoystick.on('end', () => {
      rotationData.x = 0;
      rotationData.y = 0;
    });
    window.mobileRotationData = rotationData;
  } else {
    controls = new PointerLockControls(corridorCamera, corridorRenderer.domElement);
    instructions = document.getElementById('instructions');
    controls.addEventListener('lock', () => {});
    controls.addEventListener('unlock', () => {});
    instructions.addEventListener('click', () => controls.lock());
    corridorScene.add(controls.getObject());
  }

  if (!isMobile()) {
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
  }

  corridorRaycaster = new THREE.Raycaster();
  document.addEventListener('click', onCorridorClick);
  document.addEventListener('touchend', onCorridorClick);

  window.addEventListener('resize', onWindowResize);
}

export function animateCorridor() {
  requestAnimationFrame(animateCorridor);

  if (isMobile()) {
    const moveFactor = 0.025;

    let dx = window.mobileJoystickData ? window.mobileJoystickData.x : 0;
    let dy = window.mobileJoystickData ? window.mobileJoystickData.y : 0;
    const right = new THREE.Vector3();
    right.crossVectors(corridorCamera.up, corridorCamera.getWorldDirection(new THREE.Vector3())).normalize();
    const forward = new THREE.Vector3();
    forward.set(0, 0, -1).applyQuaternion(corridorCamera.quaternion).normalize();
    const moveOffset = new THREE.Vector3();
    moveOffset.addScaledVector(right, dx * moveFactor);
    moveOffset.addScaledVector(forward, -dy * moveFactor);
    corridorCamera.position.add(moveOffset);
    clampCameraToRing();

    let rotationX = window.mobileRotationData ? window.mobileRotationData.x : 0;

    if (rotationX !== 0) {
      corridorCamera.rotation.y -= rotationX * 0.005;
    }
  }

  if (!isMobile() && controls.isLocked) {
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

function createCorridor() {
  const floorGeo = new THREE.PlaneGeometry(corridorSize, corridorSize);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  corridorScene.add(floor);

  const ceilGeo = new THREE.PlaneGeometry(corridorSize, corridorSize);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = corridorHeight;
  corridorScene.add(ceiling);

  const wallGeo = new THREE.PlaneGeometry(corridorSize, corridorHeight);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
  const frontWall = new THREE.Mesh(wallGeo, wallMat);
  frontWall.position.set(0, corridorHeight / 2, -corridorSize / 2);
  corridorScene.add(frontWall);
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.rotation.y = Math.PI;
  backWall.position.set(0, corridorHeight / 2, corridorSize / 2);
  corridorScene.add(backWall);
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(leftWall);
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(rightWall);
}

function clampCameraToRing() {
  const outer = corridorSize / 2 - 0.2;

  corridorCamera.position.x = THREE.MathUtils.clamp(corridorCamera.position.x, -outer, outer);
  corridorCamera.position.z = THREE.MathUtils.clamp(corridorCamera.position.z, -outer, outer);
}

function onKeyDown(e) {
  if (isMobile()) return;
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
  }
}

function onKeyUp(e) {
  if (isMobile()) return;
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
}

function onCorridorClick(e) {
  if (!controls) return;
  corridorRaycaster.setFromCamera(new THREE.Vector2(0, 0), corridorCamera);
  const intersects = corridorRaycaster.intersectObjects(corridorScene.children, true);
  if (intersects.length > 0 && model) {
    for (let i = 0; i < intersects.length; i++) {
      const obj = intersects[i].object;
      if (isDescendantOf(obj, model)) {
        console.log('Duck clickeado → abrir popup');
        if (!isMobile()) {
          controls.unlock();
        }
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
