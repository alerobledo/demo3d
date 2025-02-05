// Ajustamos las dimensiones del corredor:
const corridorWidth = 6,
      corridorHeight = 3,
      corridorLength = 10;

// ... (resto del código)

// En initCorridor(), al crear la cámara:
corridorCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
corridorCamera.position.set(0, 1.5, 0);

// La función createCorridor() seguirá usando corridorWidth y corridorLength:
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
