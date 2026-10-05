import * as THREE from 'three';

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
    this.initEnemies();
  }

  initEnemies() {
    // 5 patrol routes in courtyards, alleyways, and beneath rooftops
    const patrolData = [
      {
        id: 1,
        name: "Abstergo Sentinel A",
        waypoints: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, -12),
          new THREE.Vector3(-10, 0, -12),
          new THREE.Vector3(-10, 0, 0),
        ],
        speed: 1.8
      },
      {
        id: 2,
        name: "Abstergo Sentinel B",
        waypoints: [
          new THREE.Vector3(0, 0, 8),
          new THREE.Vector3(12, 0, 8),
          new THREE.Vector3(12, 0, 20),
          new THREE.Vector3(0, 0, 20),
        ],
        speed: 2.0
      },
      {
        id: 3,
        name: "Rooftop Guard C",
        waypoints: [
          new THREE.Vector3(-16, 6, -16),
          new THREE.Vector3(-12, 6, -20),
          new THREE.Vector3(-20, 6, -20),
        ],
        speed: 1.4
      },
      {
        id: 4,
        name: "Alleyway Enforcer D",
        waypoints: [
          new THREE.Vector3(-26, 0, -8),
          new THREE.Vector3(-26, 0, 15),
        ],
        speed: 2.2
      },
      {
        id: 5,
        name: "Courtyard Overseer E",
        waypoints: [
          new THREE.Vector3(25, 0, -10),
          new THREE.Vector3(25, 0, 10),
          new THREE.Vector3(15, 0, 0),
        ],
        speed: 1.6
      }
    ];

    patrolData.forEach(data => {
      this.createEnemy(data);
    });
  }

  createEnemy(data) {
    const group = new THREE.Group();
    group.position.copy(data.waypoints[0]);

    // Materials
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5, metalness: 0.4 }); // Crimson tactical armor
    const underMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // Black fatigues
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red glow visor

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 8);
    const legL = new THREE.Mesh(legGeo, underMat);
    legL.position.set(-0.2, 0.4, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, underMat);
    legR.position.set(0.2, 0.4, 0);
    legR.castShadow = true;

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.position.set(0, 1.15, 0);
    torso.castShadow = true;

    // Head + Tactical Helmet
    const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
    const head = new THREE.Mesh(headGeo, armorMat);
    head.position.set(0, 1.7, 0);
    head.castShadow = true;

    // Glowing Visor
    const visorGeo = new THREE.BoxGeometry(0.26, 0.08, 0.12);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.7, 0.16);

    // Weapon held
    const gunGeo = new THREE.BoxGeometry(0.08, 0.12, 0.6);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.25, 1.1, 0.25);
    gun.rotation.x = 0.2;

    group.add(legL, legR, torso, head, visor, gun);
    this.scene.add(group);

    const enemy = {
      id: data.id,
      name: data.name,
      mesh: group,
      torso: torso,
      head: head,
      gun: gun,
      legL: legL,
      legR: legR,
      waypoints: data.waypoints,
      currentWpIndex: 0,
      speed: data.speed,
      health: 100,
      maxHealth: 100,
      state: 'PATROL', // 'PATROL', 'ALERT', 'DEAD'
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
        // Fall over animation if freshly dead
        if (enemy.deathTimer < 1.0) {
          enemy.deathTimer += delta * 2.5;
          const tilt = Math.min(enemy.deathTimer, 1.0) * (Math.PI / 2);
          enemy.mesh.rotation.x = tilt;
          enemy.mesh.position.y = Math.max(0.15, enemy.mesh.position.y - delta * 2.0);
        }
        continue;
      }

      // Patrol movement
      enemy.animTime += delta * 4;
      const targetWp = enemy.waypoints[enemy.currentWpIndex];
      const dir = new THREE.Vector3().subVectors(targetWp, enemy.mesh.position);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.4) {
        // Advance waypoint
        enemy.currentWpIndex = (enemy.currentWpIndex + 1) % enemy.waypoints.length;
      } else {
        dir.normalize();
        enemy.mesh.position.addScaledVector(dir, enemy.speed * delta);
        
        // Face moving direction
        const angle = Math.atan2(dir.x, dir.z);
        enemy.mesh.rotation.y = angle;

        // Walking animation
        enemy.legL.rotation.x = Math.sin(enemy.animTime) * 0.4;
        enemy.legR.rotation.x = -Math.sin(enemy.animTime) * 0.4;
      }
    }
  }

  // Handle damage from shooting
  applyDamage(enemy, amount) {
    if (enemy.state === 'DEAD') return false;
    enemy.health -= amount;

    // Flash hit effect
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

  // Handle fatal assassination
  executeAssassination(enemy) {
    if (enemy.state === 'DEAD') return;
    this.killEnemy(enemy, 'AERIAL ASSASSINATION');
  }

  killEnemy(enemy, reason) {
    enemy.state = 'DEAD';
    enemy.health = 0;
    // Notify UI / feed
    if (window.onEnemyKilled) {
      window.onEnemyKilled(enemy.name, reason);
    }
  }

  getLivingEnemies() {
    return this.enemies.filter(e => e.state !== 'DEAD');
  }
}
