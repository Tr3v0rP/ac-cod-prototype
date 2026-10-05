import * as THREE from 'three';

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.initEnemies();
  }

  initEnemies() {
    // 5 Italian Renaissance Guard Patrols
    const patrolData = [
      {
        id: 1,
        name: "Florentine Halberdier A",
        waypoints: [
          new THREE.Vector3(0, 0, 4),
          new THREE.Vector3(0, 0, -10),
          new THREE.Vector3(-8, 0, -10),
          new THREE.Vector3(-8, 0, 4),
        ],
        speed: 1.8
      },
      {
        id: 2,
        name: "Borgia Heavy Guard B",
        waypoints: [
          new THREE.Vector3(0, 0, 8),
          new THREE.Vector3(12, 0, 8),
          new THREE.Vector3(12, 0, 22),
          new THREE.Vector3(0, 0, 22),
        ],
        speed: 2.0
      },
      {
        id: 3,
        name: "Rooftop Crossbowman C",
        waypoints: [
          new THREE.Vector3(18, 7.5, -10),
          new THREE.Vector3(18, 7.5, -16),
          new THREE.Vector3(14, 7.5, -14),
        ],
        speed: 1.4
      },
      {
        id: 4,
        name: "Loggia Sentinel D",
        waypoints: [
          new THREE.Vector3(-20, 0, 10),
          new THREE.Vector3(-20, 0, 25),
        ],
        speed: 2.1
      },
      {
        id: 5,
        name: "Campanile Sentry E",
        waypoints: [
          new THREE.Vector3(0, 0, -14),
          new THREE.Vector3(6, 0, -18),
          new THREE.Vector3(-6, 0, -18),
        ],
        speed: 1.6
      }
    ];

    patrolData.forEach(data => {
      this.createRenaissanceGuard(data);
    });
  }

  createRenaissanceGuard(data) {
    const group = new THREE.Group();
    group.position.copy(data.waypoints[0]);

    // Authentic Renaissance Guard Materials
    const armorSteelMat = new THREE.MeshStandardMaterial({
      color: 0xc0c8d0, // Polished Italian plate steel
      metalness: 0.85,
      roughness: 0.25
    });
    const heraldryMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Crimson Borgia/Florentine tabard
      roughness: 0.7
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Gold filigree / brass buckle
      metalness: 0.8,
      roughness: 0.3
    });
    const plumeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Red feathered helmet plume
      roughness: 0.9
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85
    });

    // Armored Greaves / Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.85, 8);
    const legL = new THREE.Mesh(legGeo, armorSteelMat);
    legL.position.set(-0.2, 0.42, 0);
    legL.castShadow = true;

    const legR = new THREE.Mesh(legGeo, armorSteelMat);
    legR.position.set(0.2, 0.42, 0);
    legR.castShadow = true;

    // Steel Cuirass (Breastplate) over Crimson Tunic
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    const torso = new THREE.Mesh(torsoGeo, armorSteelMat);
    torso.position.set(0, 1.2, 0);
    torso.castShadow = true;

    // Crimson Tabard Sash across chest
    const tabardGeo = new THREE.BoxGeometry(0.57, 0.4, 0.37);
    const tabard = new THREE.Mesh(tabardGeo, heraldryMat);
    tabard.position.set(0, 1.15, 0);
    group.add(tabard);

    // Morion / Sallet Steel Helmet
    const helmetGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const helmet = new THREE.Mesh(helmetGeo, armorSteelMat);
    helmet.position.set(0, 1.75, 0);
    helmet.castShadow = true;

    // Helmet Crest / Comb
    const combGeo = new THREE.BoxGeometry(0.04, 0.22, 0.35);
    const comb = new THREE.Mesh(combGeo, goldTrimMat);
    comb.position.set(0, 1.9, 0);
    helmet.add(comb);

    // Feather Plume
    const plumeGeo = new THREE.ConeGeometry(0.06, 0.35, 6);
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.set(0, 1.95, -0.15);
    plume.rotation.x = -0.4;
    helmet.add(plume);

    // Italian Halberd (Polearm Weapon)
    const halberdGroup = new THREE.Group();
    // Long wooden shaft (2.2m)
    const shaftGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6);
    const shaft = new THREE.Mesh(shaftGeo, woodMat);
    shaft.position.y = 1.0;

    // Steel Axe Blade
    const axeGeo = new THREE.BoxGeometry(0.02, 0.35, 0.25);
    const axe = new THREE.Mesh(axeGeo, armorSteelMat);
    axe.position.set(0, 1.9, 0.12);

    // Spear Point
    const pointGeo = new THREE.ConeGeometry(0.05, 0.4, 6);
    const point = new THREE.Mesh(pointGeo, armorSteelMat);
    point.position.set(0, 2.2, 0);

    halberdGroup.add(shaft, axe, point);
    halberdGroup.position.set(0.35, 0, 0.2);
    halberdGroup.rotation.z = -0.15;
    halberdGroup.castShadow = true;

    group.add(legL, legR, torso, helmet, halberdGroup);
    this.scene.add(group);

    const enemy = {
      id: data.id,
      name: data.name,
      mesh: group,
      torso: torso,
      head: helmet,
      weapon: halberdGroup,
      legL: legL,
      legR: legR,
      waypoints: data.waypoints,
      currentWpIndex: 0,
      speed: data.speed,
      health: 100,
      maxHealth: 100,
      state: 'PATROL',
      deathTimer: 0,
      animTime: Math.random() * 10,
      radius: 0.6,
      height: 1.8
    };

    this.enemies.push(enemy);
  }

  update(delta) {
    for (const enemy of this.enemies) {
      if (enemy.state === 'DEAD') {
        if (enemy.deathTimer < 1.0) {
          enemy.deathTimer += delta * 2.5;
          const tilt = Math.min(enemy.deathTimer, 1.0) * (Math.PI / 2);
          enemy.mesh.rotation.x = tilt;
          enemy.mesh.position.y = Math.max(0.15, enemy.mesh.position.y - delta * 2.0);
        }
        continue;
      }

      enemy.animTime += delta * 4;
      const targetWp = enemy.waypoints[enemy.currentWpIndex];
      const dir = new THREE.Vector3().subVectors(targetWp, enemy.mesh.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.4) {
        enemy.currentWpIndex = (enemy.currentWpIndex + 1) % enemy.waypoints.length;
      } else {
        dir.normalize();
        enemy.mesh.position.addScaledVector(dir, enemy.speed * delta);
        
        const angle = Math.atan2(dir.x, dir.z);
        enemy.mesh.rotation.y = angle;

        enemy.legL.rotation.x = Math.sin(enemy.animTime) * 0.4;
        enemy.legR.rotation.x = -Math.sin(enemy.animTime) * 0.4;
      }
    }
  }

  applyDamage(enemy, amount) {
    if (enemy.state === 'DEAD') return false;
    enemy.health -= amount;

    const origColor = enemy.torso.material.color.getHex();
    enemy.torso.material.color.setHex(0xffffff);
    setTimeout(() => {
      if (enemy.torso) enemy.torso.material.color.setHex(origColor);
    }, 80);

    if (enemy.health <= 0) {
      this.killEnemy(enemy, 'KILLED IN ACTION (GUNFIRE)');
      return true;
    }
    return false;
  }

  executeAssassination(enemy) {
    if (enemy.state === 'DEAD') return;
    this.killEnemy(enemy, 'AERIAL ASSASSINATION');
  }

  killEnemy(enemy, reason) {
    enemy.state = 'DEAD';
    enemy.health = 0;
    if (window.onEnemyKilled) {
      window.onEnemyKilled(enemy.name, reason);
    }
  }

  getLivingEnemies() {
    return this.enemies.filter(e => e.state !== 'DEAD');
  }
}
