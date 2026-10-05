import * as THREE from 'three';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.climbables = [];
    this.buildItalianDistrict();
  }

  buildItalianDistrict() {
    // 1. Italian Piazza Cobblestone Ground
    const groundGeo = new THREE.PlaneGeometry(180, 180, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x574a3f, // Tuscan warm cobblestone / flagstone
      roughness: 0.88,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.colliders.push({
      box: new THREE.Box3(new THREE.Vector3(-90, -1, -90), new THREE.Vector3(90, 0, 90)),
      type: 'ground'
    });

    // Piazza Stone Grid
    const piazzaGrid = new THREE.GridHelper(180, 45, 0xd97706, 0x3d332a);
    piazzaGrid.position.y = 0.02;
    this.scene.add(piazzaGrid);

    // 2. Palette: Authentic Florentine / Venetian Renaissance
    const plasterColors = [
      0xd8c29d, // Tuscan warm ochre stucco
      0xead5be, // Sun-bleached sandstone
      0xcab394, // Weathered Siena plaster
      0xd4a373, // Warm terracotta plaster
      0xa89f91  // Florentine grey pietra serena stone
    ];

    // Terracotta roof tile color
    this.tileMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412, // Burnt Tuscan terracotta orange
      roughness: 0.72,
      metalness: 0.08
    });

    // Wood beam material
    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03, // Dark aged walnut timber
      roughness: 0.85
    });

    // Stone trim material
    this.stoneTrimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // White Carrara marble accents
      roughness: 0.65
    });

    // 3. Central Landmark: The Renaissance Campanile (Bell Tower & Sync Perch)
    this.createCampanile(0, -22, 9, 9, 24);

    // 4. Italian Renaissance Palazzos surrounding the Piazza
    // East Palazzos
    this.createRenaissancePalazzo(18, -12, 14, 18, 7.5, plasterColors[0], 'pitched');
    this.createRenaissancePalazzo(20, 14, 16, 20, 10.0, plasterColors[1], 'loggia');
    this.createRenaissancePalazzo(38, 0, 14, 28, 8.5, plasterColors[2], 'pitched');

    // West Palazzos
    this.createRenaissancePalazzo(-18, -12, 14, 18, 8.0, plasterColors[3], 'loggia');
    this.createRenaissancePalazzo(-20, 14, 16, 20, 9.5, plasterColors[0], 'pitched');
    this.createRenaissancePalazzo(-38, 0, 14, 28, 7.5, plasterColors[4], 'pitched');

    // North Entrance Palazzos & Arcades
    this.createRenaissancePalazzo(0, 36, 32, 14, 11.0, plasterColors[1], 'loggia');
    this.createRenaissancePalazzo(-28, 38, 16, 16, 8.5, plasterColors[3], 'pitched');
    this.createRenaissancePalazzo(28, 38, 16, 16, 8.5, plasterColors[2], 'pitched');

    // South District Boundary
    this.createRenaissancePalazzo(-22, -38, 20, 16, 9.0, plasterColors[4], 'pitched');
    this.createRenaissancePalazzo(22, -38, 20, 16, 9.0, plasterColors[0], 'pitched');

    // 5. Classic AC Rooftop Bridges, Wooden Beams & Connecting Ropes
    this.createRooftopBeam(-11, -12, 8.0, 11, -12, 7.5);
    this.createRooftopBeam(-12, 14, 9.5, 12, 14, 10.0);
    this.createRooftopBeam(-20, 24, 9.5, -20, 30, 8.5);
    this.createRooftopBeam(20, 24, 10.0, 20, 30, 8.5);

    // 6. Iconic Haycarts / Haystacks (Leap of Faith landing spots!)
    this.createHayCart(0, -14, 3.2, 2.0, 1.4);
    this.createHayCart(10, 6, 2.8, 1.8, 1.3);
    this.createHayCart(-10, 6, 2.8, 1.8, 1.3);

    // 7. Parkour Market Stalls, Scaffolding & Crates
    this.createMarketStall(5, -2, 0xef4444); // Red/white awning
    this.createMarketStall(-5, -2, 0x0284c7); // Blue/white awning
    this.createMarketStall(6, 18, 0x16a34a); // Green awning

    // Scaffolding ladders for rooftop scaling
    this.createScaffoldStructure(-11, -4, 2.5, 2.5, 4.0);
    this.createScaffoldStructure(11, -4, 2.5, 2.5, 4.0);
    this.createScaffoldStructure(12, 24, 2.5, 2.5, 5.0);

    // Stone fountain in the center of the piazza
    this.createPiazzaFountain(0, 0);
  }

  // Renaissance Palazzo with tiled roofs, balconies, and optional ground-floor Loggia / Arcade
  createRenaissancePalazzo(x, z, w, d, h, plasterColor, style) {
    const wallMat = new THREE.MeshStandardMaterial({
      color: plasterColor,
      roughness: 0.85,
      metalness: 0.05
    });

    // Main Palazzo Building
    const wallGeo = new THREE.BoxGeometry(w, h, d);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(x, h / 2, z);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    this.scene.add(wallMesh);

    const box = new THREE.Box3().setFromObject(wallMesh);
    this.colliders.push({ box, type: 'building', height: h });
    this.climbables.push({ box, topY: h });

    // Decorative Carrara Marble Stringcourse / Cornice between floors
    const corniceGeo = new THREE.BoxGeometry(w + 0.4, 0.35, d + 0.4);
    const cornice = new THREE.Mesh(corniceGeo, this.stoneTrimMat);
    cornice.position.set(x, h - 0.2, z);
    this.scene.add(cornice);

    // Overhanging Terracotta Tile Roof
    const roofOverhang = 0.8;
    const roofGeo = new THREE.BoxGeometry(w + roofOverhang * 2, 0.4, d + roofOverhang * 2);
    const roof = new THREE.Mesh(roofGeo, this.tileMat);
    roof.position.set(x, h + 0.2, z);
    roof.castShadow = true;
    this.scene.add(roof);

    // Pitched terracotta roof center
    if (style === 'pitched') {
      const pitchHeight = 2.4;
      const pitchGeo = new THREE.ConeGeometry(Math.min(w, d) * 0.7, pitchHeight, 4);
      const pitchedRoof = new THREE.Mesh(pitchGeo, this.tileMat);
      pitchedRoof.rotation.y = Math.PI / 4;
      pitchedRoof.position.set(x, h + pitchHeight / 2 + 0.4, z);
      pitchedRoof.castShadow = true;
      this.scene.add(pitchedRoof);

      const pitchBox = new THREE.Box3().setFromObject(pitchedRoof);
      this.colliders.push({ box: pitchBox, type: 'sloped_roof', height: h + pitchHeight });
    }

    // Italian Stone Balconies with railings for parkour ledges
    const balconyGeo = new THREE.BoxGeometry(2.4, 0.3, 1.2);
    const bal1 = new THREE.Mesh(balconyGeo, this.stoneTrimMat);
    bal1.position.set(x, h * 0.58, z + d / 2 + 0.6);
    this.scene.add(bal1);
    const balBox1 = new THREE.Box3().setFromObject(bal1);
    this.colliders.push({ box: balBox1, type: 'balcony', height: h * 0.58 });
    this.climbables.push({ box: balBox1, topY: h * 0.58 });

    // Ground Floor Loggia Columns (Arcade Arches)
    if (style === 'loggia') {
      const colGeo = new THREE.CylinderGeometry(0.25, 0.3, 3.2, 8);
      for (let cx = -w / 2 + 1.5; cx <= w / 2 - 1.5; cx += 2.8) {
        const col = new THREE.Mesh(colGeo, this.stoneTrimMat);
        col.position.set(x + cx, 1.6, z + d / 2 + 0.4);
        col.castShadow = true;
        this.scene.add(col);
      }
    }

    // Renaissance Chimneys on Rooftops
    const chimneyGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const chimney = new THREE.Mesh(chimneyGeo, this.stoneTrimMat);
    chimney.position.set(x + w * 0.3, h + 1.0, z + d * 0.3);
    chimney.castShadow = true;
    this.scene.add(chimney);
    this.colliders.push({ box: new THREE.Box3().setFromObject(chimney), type: 'chimney' });
  }

  // The Grand Campanile (Cathedral Bell Tower with Synchronization Perch)
  createCampanile(x, z, w, d, h) {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xb59e82, // Weathered Tuscan limestone
      roughness: 0.9,
      metalness: 0.05
    });

    // Main Tower Shaft
    const towerGeo = new THREE.BoxGeometry(w, h, d);
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(x, h / 2, z);
    tower.castShadow = true;
    tower.receiveShadow = true;
    this.scene.add(tower);

    const box = new THREE.Box3().setFromObject(tower);
    this.colliders.push({ box, type: 'tower', height: h });
    this.climbables.push({ box, topY: h });

    // Upper Belfry (Arched Openings where bell hangs)
    const belfryHeight = 5.0;
    const belfryGeo = new THREE.BoxGeometry(w - 0.8, belfryHeight, d - 0.8);
    const belfry = new THREE.Mesh(belfryGeo, this.stoneTrimMat);
    belfry.position.set(x, h + belfryHeight / 2, z);
    belfry.castShadow = true;
    this.scene.add(belfry);

    const belfryBox = new THREE.Box3().setFromObject(belfry);
    this.colliders.push({ box: belfryBox, type: 'tower', height: h + belfryHeight });
    this.climbables.push({ box: belfryBox, topY: h + belfryHeight });

    // Church Bronze Bell
    const bellGeo = new THREE.CylinderGeometry(0.8, 1.4, 1.6, 12);
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.8, roughness: 0.3 });
    const bell = new THREE.Mesh(bellGeo, bronzeMat);
    bell.position.set(x, h + 2.5, z);
    this.scene.add(bell);

    // Tower Pyramidal Spire
    const spireHeight = 6.0;
    const spireGeo = new THREE.ConeGeometry((w - 0.8) * 0.72, spireHeight, 4);
    const spire = new THREE.Mesh(spireGeo, this.tileMat);
    spire.rotation.y = Math.PI / 4;
    spire.position.set(x, h + belfryHeight + spireHeight / 2, z);
    spire.castShadow = true;
    this.scene.add(spire);

    // THE ICONIC ASSASSIN'S CREED PERCH BEAM (Synchronization Point)
    // Extends outward from the belfry over the courtyard below
    const beamGeo = new THREE.BoxGeometry(0.4, 0.4, 5.0);
    const beam = new THREE.Mesh(beamGeo, this.woodMat);
    beam.position.set(x, h + 1.2, z + d / 2 + 2.0);
    beam.castShadow = true;
    this.scene.add(beam);

    const beamBox = new THREE.Box3().setFromObject(beam);
    this.colliders.push({ box: beamBox, type: 'perch_beam', height: h + 1.4 });

    // Perch Cross / Eagle at end of beam
    const perchEndGeo = new THREE.BoxGeometry(0.5, 0.6, 0.5);
    const perchEnd = new THREE.Mesh(perchEndGeo, this.stoneTrimMat);
    perchEnd.position.set(x, h + 1.4, z + d / 2 + 4.4);
    this.scene.add(perchEnd);
  }

  // Classic AC Haycart for Leaps of Faith
  createHayCart(x, z, length, width, height) {
    const cartGroup = new THREE.Group();

    // Wooden Cart Frame
    const frameGeo = new THREE.BoxGeometry(length, 0.5, width);
    const frame = new THREE.Mesh(frameGeo, this.woodMat);
    frame.position.y = 0.5;
    cartGroup.add(frame);

    // Wooden Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.15, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const w1 = new THREE.Mesh(wheelGeo, this.woodMat);
    w1.position.set(-length * 0.35, 0.45, width * 0.55);
    const w2 = new THREE.Mesh(wheelGeo, this.woodMat);
    w2.position.set(length * 0.35, 0.45, width * 0.55);
    const w3 = new THREE.Mesh(wheelGeo, this.woodMat);
    w3.position.set(-length * 0.35, 0.45, -width * 0.55);
    const w4 = new THREE.Mesh(wheelGeo, this.woodMat);
    w4.position.set(length * 0.35, 0.45, -width * 0.55);
    cartGroup.add(w1, w2, w3, w4);

    // Golden Hay Stack
    const hayMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Golden dried wheat hay
      roughness: 0.95
    });
    const hayGeo = new THREE.BoxGeometry(length * 0.9, height, width * 0.85);
    const hay = new THREE.Mesh(hayGeo, hayMat);
    hay.position.y = 0.5 + height / 2;
    cartGroup.add(hay);

    cartGroup.position.set(x, 0, z);
    this.scene.add(cartGroup);

    const box = new THREE.Box3().setFromObject(cartGroup);
    this.colliders.push({ box, type: 'haystack', height: height + 0.5 });
    this.climbables.push({ box, topY: height + 0.5 });
  }

  // Market Stalls with colorful striped fabric canopies (Springboards for parkour)
  createMarketStall(x, z, canopyColor) {
    const stallGroup = new THREE.Group();

    // 4 Corner Wooden Posts
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6);
    for (const [px, pz] of [[-1, -0.8], [1, -0.8], [-1, 0.8], [1, 0.8]]) {
      const post = new THREE.Mesh(postGeo, this.woodMat);
      post.position.set(px, 1.2, pz);
      stallGroup.add(post);
    }

    // Fabric Canopy / Awning (Sloped)
    const canopyGeo = new THREE.BoxGeometry(2.4, 0.1, 2.0);
    const canopyMat = new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.7 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 2.3, 0);
    canopy.rotation.x = 0.15;
    stallGroup.add(canopy);

    stallGroup.position.set(x, 0, z);
    this.scene.add(stallGroup);

    const box = new THREE.Box3().setFromObject(stallGroup);
    this.colliders.push({ box, type: 'stall', height: 2.3 });
    this.climbables.push({ box, topY: 2.3 });
  }

  // Wooden Rooftop Walkway Beams connecting buildings
  createRooftopBeam(x1, z1, h1, x2, z2, h2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const midY = (h1 + h2) / 2;

    const geo = new THREE.BoxGeometry(0.8, 0.25, length);
    const beam = new THREE.Mesh(geo, this.woodMat);
    beam.position.set(midX, midY, midZ);
    beam.lookAt(x2, midY, z2);
    beam.castShadow = true;
    this.scene.add(beam);

    const box = new THREE.Box3().setFromObject(beam);
    this.colliders.push({ box, type: 'bridge', height: midY });
  }

  // Wooden Scaffolding Ladder structures
  createScaffoldStructure(x, z, w, d, h) {
    const scaffold = new THREE.Group();

    // 4 Corner Posts
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, h, 6);
    for (const [px, pz] of [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]]) {
      const post = new THREE.Mesh(postGeo, this.woodMat);
      post.position.set(px, h / 2, pz);
      scaffold.add(post);
    }

    // Platforms at intervals
    for (let py = 1.6; py <= h; py += 1.6) {
      const plankGeo = new THREE.BoxGeometry(w + 0.3, 0.12, d + 0.3);
      const plank = new THREE.Mesh(plankGeo, this.woodMat);
      plank.position.set(0, py, 0);
      scaffold.add(plank);
    }

    scaffold.position.set(x, 0, z);
    this.scene.add(scaffold);

    const box = new THREE.Box3().setFromObject(scaffold);
    this.colliders.push({ box, type: 'scaffold', height: h });
    this.climbables.push({ box, topY: h });
  }

  // Central Stone Fountain
  createPiazzaFountain(x, z) {
    const fountainGroup = new THREE.Group();

    // Circular stone basin
    const basinGeo = new THREE.CylinderGeometry(3.0, 3.2, 0.9, 16);
    const basin = new THREE.Mesh(basinGeo, this.stoneTrimMat);
    basin.position.y = 0.45;
    fountainGroup.add(basin);

    // Water surface
    const waterGeo = new THREE.CylinderGeometry(2.7, 2.7, 0.1, 16);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.75
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.85;
    fountainGroup.add(water);

    // Center pedestal
    const pedestalGeo = new THREE.CylinderGeometry(0.8, 1.0, 2.0, 12);
    const ped = new THREE.Mesh(pedestalGeo, this.stoneTrimMat);
    ped.position.y = 1.0;
    fountainGroup.add(ped);

    fountainGroup.position.set(x, 0, z);
    this.scene.add(fountainGroup);

    const box = new THREE.Box3().setFromObject(fountainGroup);
    this.colliders.push({ box, type: 'fountain', height: 1.8 });
    this.climbables.push({ box, topY: 1.8 });
  }
}
