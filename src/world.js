import * as THREE from 'three';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Bounding boxes for collision
    this.climbables = []; // Walls / ledges that can be vaulted or mantled
    this.buildDistrict();
  }

  buildDistrict() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Ground collider
    this.colliders.push({
      box: new THREE.Box3(new THREE.Vector3(-80, -1, -80), new THREE.Vector3(80, 0, 80)),
      type: 'ground'
    });

    // Street markings / cobblestone grid pattern
    const gridHelper = new THREE.GridHelper(160, 40, 0x38bdf8, 0x242b35);
    gridHelper.position.y = 0.02;
    this.scene.add(gridHelper);

    // Color palette for Italian Renaissance / Modern Black-Ops Hybrid
    const wallColors = [0x2a303c, 0x374151, 0x1f2937, 0x475569];
    const roofColors = [0x7f1d1d, 0x991b1b, 0x334155];

    // Building definitions: { x, z, w, d, h, roofType }
    const buildings = [
      // Central courtyard surroundings
      { x: -16, z: -16, w: 14, d: 14, h: 6, roof: 'flat' },
      { x: 16, z: -16, w: 14, d: 14, h: 9, roof: 'sloped' },
      { x: -18, z: 18, w: 16, d: 12, h: 5, roof: 'parapet' },
      { x: 18, z: 18, w: 14, d: 16, h: 8, roof: 'flat' },

      // Rooftop vantage towers
      { x: -35, z: 0, w: 12, d: 20, h: 12, roof: 'parapet' },
      { x: 35, z: 0, w: 12, d: 20, h: 10, roof: 'sloped' },
      { x: 0, z: -35, w: 22, d: 12, h: 7, roof: 'flat' },
      { x: 0, z: 35, w: 22, d: 12, h: 11, roof: 'parapet' },

      // Perimeter blocks
      { x: -45, z: -40, w: 18, d: 18, h: 14, roof: 'flat' },
      { x: 45, z: -40, w: 18, d: 18, h: 12, roof: 'flat' },
      { x: -45, z: 40, w: 18, d: 18, h: 10, roof: 'sloped' },
      { x: 45, z: 40, w: 18, d: 18, h: 13, roof: 'parapet' },
    ];

    buildings.forEach((b, i) => {
      this.createBuilding(b.x, b.z, b.w, b.d, b.h, wallColors[i % wallColors.length], roofColors[i % roofColors.length], b.roof);
    });

    // Parkour Traversal Elements: Crates, scaffolds, low walls for vaulting
    this.createVaultableWall(0, -6, 8, 0.8, 1.3);
    this.createVaultableWall(-6, 2, 0.8, 6, 1.2);
    this.createVaultableWall(7, 3, 0.8, 7, 1.4);

    // Crate stacks (stairway onto lower rooftops)
    this.createCrate( -8, -8, 1.6, 1.6, 1.4 );
    this.createCrate( -8, -6, 1.6, 1.6, 2.8 ); // double height
    this.createCrate( -8, -4, 1.6, 1.6, 4.2 ); // step up to 5m roof!

    this.createCrate( 8, -8, 1.6, 1.6, 1.5 );
    this.createCrate( 8, -6, 1.6, 1.6, 3.0 );

    // Rooftop connector wooden beam / bridge
    this.createRooftopBridge(-9, -16, 6, 9, -16, 6, 1.2);
  }

  createBuilding(x, z, w, d, h, wallColor, roofColor, roofType) {
    const group = new THREE.Group();

    // Main building mesh
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.8,
      metalness: 0.15,
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(x, h / 2, z);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    this.scene.add(wallMesh);

    // Register primary collider
    const box = new THREE.Box3().setFromObject(wallMesh);
    this.colliders.push({ box, type: 'building', height: h });
    this.climbables.push({ box, topY: h });

    // Architectural features: Parapet, ledge, or sloped roof
    if (roofType === 'parapet') {
      // 0.6m ledge border around roof
      const rimThick = 0.4;
      const rimHeight = 0.7;
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });

      // 4 walls of parapet
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(w, rimHeight, rimThick), rimMat);
      p1.position.set(x, h + rimHeight / 2, z + d / 2 - rimThick / 2);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(w, rimHeight, rimThick), rimMat);
      p2.position.set(x, h + rimHeight / 2, z - d / 2 + rimThick / 2);
      const p3 = new THREE.Mesh(new THREE.BoxGeometry(rimThick, rimHeight, d), rimMat);
      p3.position.set(x - w / 2 + rimThick / 2, h + rimHeight / 2, z);
      const p4 = new THREE.Mesh(new THREE.BoxGeometry(rimThick, rimHeight, d), rimMat);
      p4.position.set(x + w / 2 - rimThick / 2, h + rimHeight / 2, z);

      this.scene.add(p1, p2, p3, p4);
    } else if (roofType === 'sloped') {
      // Sloped Italian tile roof
      const roofGeo = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 3.5, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(x, h + 1.75, z);
      roof.castShadow = true;
      this.scene.add(roof);

      const roofBox = new THREE.Box3().setFromObject(roof);
      this.colliders.push({ box: roofBox, type: 'sloped_roof', height: h + 3.0 });
    }

    // Windows / tactical lighting on facades
    const winGeo = new THREE.PlaneGeometry(1.2, 1.8);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.4 });
    for (let wy = 2; wy < h - 1; wy += 2.8) {
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(x, wy, z + d / 2 + 0.02);
      this.scene.add(win);
    }
  }

  createVaultableWall(x, z, w, d, h) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push({ box, type: 'obstacle', height: h });
    this.climbables.push({ box, topY: h });
  }

  createCrate(x, z, w, d, h) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.9,
    });
    const crate = new THREE.Mesh(geo, mat);
    crate.position.set(x, h / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);

    const box = new THREE.Box3().setFromObject(crate);
    this.colliders.push({ box, type: 'crate', height: h });
    this.climbables.push({ box, topY: h });
  }

  createRooftopBridge(x1, z1, h1, x2, z2, h2, width) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const midY = (h1 + h2) / 2;

    const geo = new THREE.BoxGeometry(width, 0.3, length);
    const mat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const beam = new THREE.Mesh(geo, mat);
    beam.position.set(midX, midY, midZ);
    beam.lookAt(x2, midY, z2);
    beam.castShadow = true;
    beam.receiveShadow = true;
    this.scene.add(beam);

    const box = new THREE.Box3().setFromObject(beam);
    this.colliders.push({ box, type: 'bridge', height: midY });
  }
}
