/* js/corridor.js */
import * as THREE from 'three';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/PointerLockControls.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';

// Importamos la función showPopup desde popup.js
import { showPopup } from './popup.js';

/* Función para detectar dispositivos móviles */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Dimensiones del corredor (recorrido cuadrado tipo "anillo")
const corridorSize = 20;   // Cuadrado exterior (de -10 a 10)
const innerSize = 12;      // Cuadrado interior (de -6 a 6)
const corridorHeight = 3;  // Altura del corredor

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
  // Posición inicial: fuera del cuadrado interior (por ejemplo, x=8)
  corridorCamera.position.set(8, 1.5, 0);

  // Luces
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  corridorScene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 7);
  corridorScene.add(dirLight);

  // Crear el corredor (pasillo) en forma de anillo
  createCorridor();

  // Cargar el modelo (Duck) usando la URL proporcionada.
  const loader = new GLTFLoader();
  loader.load(
    'https://alerobledo.github.io/demo3d/Duck.glb',
    (gltf) => {
      model = gltf.scene;
      // Colocar el modelo en la pared exterior, por ejemplo, en x=9 (cerca del límite exterior)
      model.position.set(9, 1, 0);
      // Reducir la escala para que se vea como un producto pequeño
      model.scale.set(0.3, 0.3, 0.3);
      corridorScene.add(model);
    },
    undefined,
    (err) => console.error(err)
  );

  // Configurar controles según el dispositivo
  if (isMobile()) {
    // En móviles, en lugar de usar OrbitControls para todo, usaremos un joystick virtual
    // Crearemos el joystick en el contenedor con id "joystickZone"
    const joystickZone = document.getElementById('joystickZone');
    // Crea el joystick usando nipplejs en modo "static"
    const joystick = nipplejs.create({
      zone: joystickZone,
      mode: 'static',
      position: { left: '50%', bottom: '50%' },
      color: 'white'
    });
    
    // Variable para almacenar el movimiento del joystick (vector normalizado)
    let joystickData = { x: 0, y: 0 };
    // Al mover el joystick, actualizamos joystickData
    joystick.on('move', (evt, data) => {
      if (data && data.vector) {
        joystickData.x = data.vector.x; // Valores entre -1 y 1
        joystickData.y = data.vector.y; // Valores entre -1 y 1
      }
    });
    joystick.on('end', () => {
      joystickData.x = 0;
      joystickData.y = 0;
    });
    // Guardamos joystickData en una variable global para usar en el animate loop
    window.mobileJoystickData = joystickData;
  
    // Desactivamos cualquier otro control táctil
    // Ocultamos el overlay (blocker)
    let blocker = document.getElementById('blocker');
    if (blocker) {
      blocker.style.display = 'none';
    }
    
    // (No usamos OrbitControls en móviles con joystick)
  
  } else {
    // En escritorio, usamos PointerLockControls
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
    // Solo para PointerLockControls, usamos getObject() y lo añadimos a la escena:
    corridorScene.add(controls.getObject());
  }

  // Sólo en escritorio, añadimos eventos de teclado
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
    // Usamos los datos del joystick para mover la cámara.
    // Por ejemplo, mapeamos el valor x del joystick a movimiento lateral,
    // y el valor y a movimiento forward/backward (invirtiendo y para que un toque hacia arriba avance).
    const factor = 0.05; // Factor de sensibilidad (ajusta según prefieras)
    let dx = window.mobileJoystickData ? window.mobileJoystickData.x : 0;
    let dy = window.mobileJoystickData ? window.mobileJoystickData.y : 0;
    
    // Calculamos el vector de movimiento usando los vectores "right" y "forward" de la cámara.
    const right = new THREE.Vector3();
    right.crossVectors(corridorCamera.up, corridorCamera.getWorldDirection(new THREE.Vector3())).normalize();
    const forward = new THREE.Vector3();
    corridorCamera.getWorldDirection(forward).normalize();
    
    const moveOffset = new THREE.Vector3();
    moveOffset.addScaledVector(right, dx * factor);
    moveOffset.addScaledVector(forward, -dy * factor);
    
    corridorCamera.position.add(moveOffset);
    // Puedes actualizar el target de OrbitControls si lo estás usando, pero aquí no lo usamos.
    clampCameraToRing();
  }
  
  // Solo en escritorio con PointerLockControls usamos el movimiento por teclado
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

/**
 * Crea el corredor (recorrido cuadrado tipo anillo) con piso, techo, paredes exteriores e interiores.
 */
function createCorridor() {
  // Piso
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

  // Paredes exteriores
  const wallGeo = new THREE.PlaneGeometry(corridorSize, corridorHeight);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
  // Frontal
  const frontWall = new THREE.Mesh(wallGeo, wallMat);
  frontWall.position.set(0, corridorHeight / 2, -corridorSize / 2);
  corridorScene.add(frontWall);
  // Trasera
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.rotation.y = Math.PI;
  backWall.position.set(0, corridorHeight / 2, corridorSize / 2);
  corridorScene.add(backWall);
  // Izquierda
  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(leftWall);
  // Derecha
  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(corridorSize / 2, corridorHeight / 2, 0);
  corridorScene.add(rightWall);

  // Paredes interiores (del hueco)
  const innerWallMat = new THREE.MeshStandardMaterial({ color: 0xd3d3d3, side: THREE.DoubleSide });
  const innerBoundary = innerSize / 2; // 6 si innerSize es 12

  // Frontal interior
  const innerWallGeoH = new THREE.PlaneGeometry(innerSize, corridorHeight);
  const innerFrontWall = new THREE.Mesh(innerWallGeoH, innerWallMat);
  innerFrontWall.position.set(0, corridorHeight / 2, -innerBoundary);
  corridorScene.add(innerFrontWall);

  // Trasera interior
  const innerBackWall = new THREE.Mesh(innerWallGeoH, innerWallMat);
  innerBackWall.rotation.y = Math.PI;
  innerBackWall.position.set(0, corridorHeight / 2, innerBoundary);
  corridorScene.add(innerBackWall);

  // Izquierda interior
  const innerWallGeoV = new THREE.PlaneGeometry(innerSize, corridorHeight);
  const innerLeftWall = new THREE.Mesh(innerWallGeoV, innerWallMat);
  innerLeftWall.rotation.y = Math.PI / 2;
  innerLeftWall.position.set(-innerBoundary, corridorHeight / 2, 0);
  corridorScene.add(innerLeftWall);

  // Derecha interior
  const innerRightWall = new THREE.Mesh(innerWallGeoV, innerWallMat);
  innerRightWall.rotation.y = -Math.PI / 2;
  innerRightWall.position.set(innerBoundary, corridorHeight / 2, 0);
  corridorScene.add(innerRightWall);
}

/**
 * Limita la posición de la cámara para que se mantenga en la región del corredor
 * (el anillo entre el cuadrado exterior e interior).
 */
function clampCameraToRing() {
  const outer = corridorSize / 2 - 0.2;  // Límite exterior (10 - 0.2 = 9.8)
  const inner = innerSize / 2 + 0.2;       // Límite interior (6 + 0.2 = 6.2)

  // Primero, clampa la posición para que no se salga del cuadrado exterior:
  corridorCamera.position.x = THREE.MathUtils.clamp(corridorCamera.position.x, -outer, outer);
  corridorCamera.position.z = THREE.MathUtils.clamp(corridorCamera.position.z, -outer, outer);

  // Si la cámara cae dentro del cuadrado interior, la empujamos hacia la frontera más cercana:
  if (Math.abs(corridorCamera.position.x) < inner && Math.abs(corridorCamera.position.z) < inner) {
    if (Math.abs(corridorCamera.position.x) < Math.abs(corridorCamera.position.z)) {
      corridorCamera.position.x = corridorCamera.position.x < 0 ? -inner : inner;
    } else {
      corridorCamera.position.z = corridorCamera.position.z < 0 ? -inner : inner;
    }
  }
}

function onKeyDown(e) {
  if (isMobile()) return; // En móviles, no usamos teclado
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
  if (isMobile()) return;
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
  if (!controls) return;
  // Usamos el centro de la pantalla (0,0) para detectar clic en el modelo.
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
