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
export let controls;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let model = null; // Aquí se cargará el modelo (Duck)
let corridorRaycaster;

let corridorCanvas, instructions;
const modelUrls = [
    'https://alerobledo.github.io/demo3d/Duck.glb',
    'https://alerobledo.github.io/demo3d/Duck2.glb',
  'https://alerobledo.github.io/demo3d/Duck3.glb',
    'https://alerobledo.github.io/demo3d/happy_face_emogi.glb'
];

const modelsIds = [];

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

  // Cargar los modelos
  const loader = new GLTFLoader();
  modelUrls.forEach((url, index) => {
    loader.load(
      url,
      (gltf) => {
        model = gltf.scene;
        console.log('Loaded model - uuid: ', model.uuid); 
        const spacing = 1;
        const zPos = -((modelUrls.length - 1) * spacing) / 2 + index * spacing;
        model.position.set(9, 1, zPos);
        model.scale.set(0.3, 0.3, 0.3);
        model.rotation.y = Math.PI; // Rotate the model 180 degrees to face the camera
        modelsIds.push(model.uuid); // for trigger the popup
        corridorScene.add(model);
      },
      undefined,
      (err) => console.error(err)
    );
  });

  loader.load(
      'https://alerobledo.github.io/demo3d/happy_face_emogi.glb',
      (gltf) => {
        model = gltf.scene;
        console.log('Loaded model happy_face_emogi - uuid: ', model.uuid); 
        const spacing = 1;
        //const zPos = -((modelUrls.length - 1) * spacing) / 2 + index * spacing;
        model.position.set(9, 1, 5);
        model.scale.set(5, 5, 5);
        //model.rotation.y = Math.PI; // Rotate the model 180 degrees to face the camera
        modelsIds.push(model.uuid); // for trigger the popup
        corridorScene.add(model);
      },
      undefined,
      (err) => console.error(err)
    );
  
  // Configurar controles según el dispositivo
  if (isMobile()) {
    // En móviles, en lugar de usar OrbitControls para todo, usaremos un joystick virtual
    // Crearemos el joystick en el contenedor con id "joystickZone"
    //const joystickZone = document.getElementById('joystickZone');
    // Crea el joystick usando nipplejs en modo "static"
    const joystickArrowZone = document.createElement('div');
    joystickArrowZone.id = 'joystickArrowZone';
    document.body.appendChild(joystickArrowZone);
    const joystick = nipplejs.create({
      zone: joystickArrowZone,
      mode: 'static',
      position: { left: '25%', bottom: '25%' },
      color: 'white'
    });
    
    // Variable para almacenar el movimiento del joystick (vector normalizado)
    let joystickData = { x: 0, y: 0 };
    // Al mover el joystick, actualizamos joystickData
    joystick.on('move', (evt, data) => {
      if (data && data.vector) {
        joystickData.x = -data.vector.x; // Valores entre -1 y 1
        joystickData.y = -data.vector.y; // Valores entre -1 y 1
      }
    });
    joystick.on('end', () => {
      joystickData.x = 0;
      joystickData.y = 0;
    });
    // Guardamos joystickData en una variable global para usar en el animate loop
    window.mobileJoystickData = joystickData;

    // Create a second joystick for rotation
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
           // Normalize the angle to be within the range [0, 360)
           angle = (angle + 360) % 360;
           if (angle >= 45 && angle < 135) {
                // Up
                rotationData.x = 0;
                rotationData.y = 1;
            } else if (angle >= 135 && angle < 225) {
                // Left
                rotationData.x = -1;
                rotationData.y = 0;
            } else if (angle >= 225 && angle < 315) {
                // Down
                rotationData.x = 0;
                rotationData.y = -1;
            } else {
                // Right
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
    
    // Desactivamos cualquier otro control táctil
    // Ocultamos el overlay (blocker)
    // let blocker = document.getElementById('blocker');
    // if (blocker) {
    //   blocker.style.display = 'none';
    // }
    
    // (No usamos OrbitControls en móviles con joystick)
  
  } else { // desktop
    
    // En escritorio, usamos PointerLockControls
    controls = new PointerLockControls(corridorCamera, corridorRenderer.domElement);
    
    // Request pointer lock on canvas click
    corridorCanvas.addEventListener('click', () => {
      controls.lock();
    });

    controls.addEventListener('lock', () => {
      console.log('Pointer locked');
    });

    controls.addEventListener('unlock', () => {
      console.log('Pointer unlocked');
    });

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
  //document.addEventListener('touchend', onCorridorClick);  // Ensure touchend event listener is added
  corridorCanvas.addEventListener('touchend', onCorridorClick, { passive: false });
  corridorCanvas.addEventListener('pointerup', onCorridorClick);
  corridorCanvas.addEventListener('click', onCorridorClick);
  
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

    // Rotate camera using normalized rotation joystick data
    let rotationX = window.mobileRotationData ? window.mobileRotationData.x : 0;

    if (rotationX !== 0) {
      // Rotate left or right
      corridorCamera.rotation.y -= rotationX * 0.005;
    }
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
}

/**
 * Limita la posición de la cámara para que se mantenga en la región del corredor
 * (el anillo entre el cuadrado exterior e interior).
 */
function clampCameraToRing() {
  const outer = corridorSize / 2 - 0.2;  // Límite exterior (10 - 0.2 = 9.8)
 
  // Primero, clampa la posición para que no se salga del cuadrado exterior:
  corridorCamera.position.x = THREE.MathUtils.clamp(corridorCamera.position.x, -outer, outer);
  corridorCamera.position.z = THREE.MathUtils.clamp(corridorCamera.position.z, -outer, outer);
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
  console.log('onCorridorClick called');
  let ndc;
  if (e.changedTouches && e.changedTouches.length > 0) {
    // Extraer la posición del primer toque
    const touch = e.changedTouches[0];
    const rect = corridorCanvas.getBoundingClientRect();
    // Convertir a coordenadas normalizadas (NDC)
    const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    ndc = new THREE.Vector2(x, y);
  } else {
    ndc = new THREE.Vector2(0, 0); // Para mouse, usar el centro
  }
  
  corridorRaycaster.setFromCamera(ndc, corridorCamera);
  const intersects = corridorRaycaster.intersectObjects(corridorScene.children, true);
  console.log('Intersects count:', intersects.length);
  console.log('modelUrls:',modelUrls);
  console.log('modelsIds:',modelsIds);
      
 if (intersects.length > 0) {
    for (let i = 0; i < intersects.length; i++) {
      const obj = intersects[i].object;
      console.log('obj:',obj, '  - uuid: ', obj.uuid);
      console.log('parent.parent: ', obj.parent.parent);
      console.log('parent.parent.uuid: ', obj.parent.parent.uuid);
      if (modelsIds.includes(obj.parent.parent.uuid)) { // Check if the object is one of the models
        const modelIndex = modelsIds.indexOf(obj.parent.parent.uuid);
         const modelUrl = modelUrls[modelIndex];
         console.log('Model clicked, opening popup with URL:', modelUrl);
         showPopup(modelUrl);
         if (controls && !isMobile()) {
           controls.unlock();
         }
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
