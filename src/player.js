import * as THREE from 'three';
import { sounds } from './audio.js';

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Position and Physics
    this.position = new THREE.Vector3(0, 0.5, 0);
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
    this.isMoving = false;
    this.isSprinting = false;
    this.moveTime = 0;

    // Movement States: 'NORMAL', 'CLIMBING', 'MANTLING'
    this.state = 'NORMAL';

    // Assassin's Creed Free-Climbing System
    this.climbWall = null;        // Active building/wall collider
    this.climbNormal = new THREE.Vector3(); // Normal of the wall face
    this.climbSpeed = 4.2;        // Vertical scaling speed
    this.shimmySpeed = 3.0;       // Lateral shimmy speed
    this.climbAnimTime = 0;

    // Mantle / Ledge Vault
    this.mantleStart = new THREE.Vector3();
    this.mantleTarget = new THREE.Vector3();
    this.mantleProgress = 0;
    this.mantleDuration = 0.26;

    // Movement Speeds
    this.fpsWalkSpeed = 4.2;
    this.fpsSprintSpeed = 6.4;
    this.tpsRunSpeed = 5.8;
    this.tpsSprintSpeed = 9.2; // High-agility AC sprint
    this.jumpVelocity = 8.5;
    this.gravity = 24.0;

    // Mesh Rig
    this.mesh = new THREE.Group();
    this.createCharacterMesh();
    this.scene.add(this.mesh);
  }

  createCharacterMesh() {
    // Ezio / Operative Aesthetic: White tunic, crimson sash, leather bracers
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const sashMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.85, 8);
    this.legL = new THREE.Mesh(legGeo, pantsMat);
    this.legL.position.set(-0.2, 0.42, 0);
    this.legL.castShadow = true;

    this.legR = new THREE.Mesh(legGeo, pantsMat);
    this.legR.position.set(0.2, 0.42, 0);
    this.legR.castShadow = true;

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.16, 0.22, 0.26);
    const bootL = new THREE.Mesh(bootGeo, leatherMat);
    bootL.position.set(0, -0.35, 0.05);
    this.legL.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, leatherMat);
    bootR.position.set(0, -0.35, 0.05);
    this.legR.add(bootR);

    // Torso / Assassin Coat
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.32);
    this.torso = new THREE.Mesh(torsoGeo, coatMat);
    this.torso.position.set(0, 1.2, 0);
    this.torso.castShadow = true;

    // Crimson Waist Sash
    const sashGeo = new THREE.BoxGeometry(0.58, 0.16, 0.35);
    const sash = new THREE.Mesh(sashGeo, sashMat);
    sash.position.set(0, -0.28, 0);
    this.torso.add(sash);

    // Assassin Beaked Hood
    const hoodGeo = new THREE.ConeGeometry(0.26, 0.45, 8);
    this.hood = new THREE.Mesh(hoodGeo, coatMat);
    this.hood.position.set(0, 1.82, -0.05);
    this.hood.rotation.x = -0.15;
    this.hood.castShadow = true;

    // Shadow face
    const faceGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const faceMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.set(0, 1.72, 0.04);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.65, 8);
    this.armL = new THREE.Mesh(armGeo, coatMat);
    this.armL.position.set(-0.35, 1.25, 0);
    this.armL.castShadow = true;

    this.armR = new THREE.Mesh(armGeo, coatMat);
    this.armR.position.set(0.35, 1.25, 0);
    this.armR.castShadow = true;

    // Back Slung Rifle (COD loadout stowed during parkour)
    this.backRifle = new THREE.Group();
    const rifleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.14), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
    this.backRifle.add(rifleMesh);
    this.backRifle.position.set(0.05, 0, -0.22);
    this.backRifle.rotation.z = 0.55;
    this.torso.add(this.backRifle);

    // Assassin Hidden Blade / Dagger in Right Hand
    this.handKnife = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.02, 0.28, 0.05);
    const blade = new THREE.Mesh(bladeGeo, steelMat);
    blade.position.set(0, -0.25, 0);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.06), leatherMat);
    hilt.position.set(0, -0.1, 0);
    this.handKnife.add(blade, hilt);
    this.handKnife.position.set(0, -0.35, 0.05);
    this.armR.add(this.handKnife);

    this.mesh.add(this.legL, this.legR, this.torso, this.hood, face, this.armL, this.armR);
  }

  jump() {
    if (this.state === 'CLIMBING') {
      // Wall Eject / Kick off backwards
      this.state = 'NORMAL';
      this.velocity.copy(this.climbNormal).multiplyScalar(6.5);
      this.velocity.y = 7.0;
      sounds.playVault();
      return;
    }

    if (this.isGrounded && this.state === 'NORMAL') {
      this.velocity.y = this.jumpVelocity;
      this.isGrounded = false;
      sounds.playVault();
    }
  }

  // Detect wall facing and initiate Assassin Free-Climb
  tryGrabWall(moveDir, worldColliders) {
    if (this.state === 'CLIMBING' || this.state === 'MANTLING') return false;

    // Cast ray forward from chest height
    const forward = moveDir.lengthSq() > 0.01 ? moveDir.clone().normalize() : new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, this.mesh.rotation.y, 0));
    const chestPos = this.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const ray = new THREE.Ray(chestPos, forward);

    for (const col of worldColliders) {
      if (col.type === 'ground' || col.type === 'haystack') continue;

      const hit = ray.intersectBox(col.box, new THREE.Vector3());
      if (hit && chestPos.distanceTo(hit) < 1.1) {
        // Find which face of the box was hit to calculate wall normal
        const box = col.box;
        const normal = new THREE.Vector3();
        const eps = 0.08;

        if (Math.abs(hit.x - box.max.x) < eps) normal.set(1, 0, 0);
        else if (Math.abs(hit.x - box.min.x) < eps) normal.set(-1, 0, 0);
        else if (Math.abs(hit.z - box.max.z) < eps) normal.set(0, 0, 1);
        else if (Math.abs(hit.z - box.min.z) < eps) normal.set(0, 0, -1);
        else continue;

        // If player is airborne, running at wall, or pressing jump: GRAB WALL!
        this.state = 'CLIMBING';
        this.climbWall = col;
        this.climbNormal.copy(normal);

        // Snap player slightly in front of wall face
        this.position.x = hit.x + normal.x * 0.4;
        this.position.z = hit.z + normal.z * 0.4;
        this.velocity.set(0, 0, 0);

        // Turn character to face INTO the wall
        const faceAngle = Math.atan2(-normal.x, -normal.z);
        this.mesh.rotation.y = faceAngle;

        sounds.playVault();
        return true;
      }
    }
    return false;
  }

  // Handle climbing vertical scaling, lateral shimmying, and rooftop ledge vaulting
  updateClimbing(delta, inputDir, isDropping) {
    if (this.state !== 'CLIMBING' || !this.climbWall) return;

    this.velocity.set(0, 0, 0);

    // Drop off wall
    if (isDropping) {
      this.state = 'NORMAL';
      this.climbWall = null;
      this.velocity.y = -2;
      return;
    }

    const box = this.climbWall.box;
    const topY = box.max.y;

    // Check if player has reached or scaled past the top ledge of the roof
    if (this.position.y + 1.4 >= topY) {
      // Reached the roof! Auto-mantle over the ledge!
      this.state = 'MANTLING';
      this.mantleProgress = 0;
      this.mantleStart.copy(this.position);
      
      // Target position safely on top of roof
      const pullDir = this.climbNormal.clone().negate();
      this.mantleTarget.copy(this.position).addScaledVector(pullDir, 1.2);
      this.mantleTarget.y = topY;

      sounds.playVault();
      return;
    }

    // Climb UP when pressing W / Forward / Up
    let isClimbingUp = false;
    if (inputDir.z > 0.1) {
      this.position.y += this.climbSpeed * delta;
      isClimbingUp = true;
    } else if (inputDir.z < -0.1) {
      // Climb down
      this.position.y -= this.climbSpeed * delta;
      if (this.position.y <= 0.1) {
        this.state = 'NORMAL';
        this.climbWall = null;
      }
    }

    // Shimmy laterally along wall when pressing A / D
    if (Math.abs(inputDir.x) > 0.1) {
      // Lateral vector is cross product of wall normal and Up (0, 1, 0)
      const lateral = new THREE.Vector3().crossVectors(this.climbNormal, new THREE.Vector3(0, 1, 0)).normalize();
      this.position.addScaledVector(lateral, inputDir.x * this.shimmySpeed * delta);
    }

    // Procedural Assassin Climbing Pose (reaching arms up to grips)
    this.climbAnimTime += delta * (isClimbingUp ? 12 : 2);
    this.armL.rotation.x = Math.PI - 0.3 + Math.sin(this.climbAnimTime) * 0.4;
    this.armR.rotation.x = Math.PI - 0.3 - Math.sin(this.climbAnimTime) * 0.4;
    this.legL.rotation.x = 0.5 + Math.sin(this.climbAnimTime) * 0.3;
    this.legR.rotation.x = 0.5 - Math.sin(this.climbAnimTime) * 0.3;

    this.mesh.position.copy(this.position);
  }

  update(delta, inputDir, isSprinting, cameraYaw, modeBlend, worldColliders, isDropping) {
    const isTPS = modeBlend > 0.5;

    // 1. MANTLING STATE (Pulling up onto roof ledge)
    if (this.state === 'MANTLING') {
      this.mantleProgress += delta / this.mantleDuration;
      const t = Math.min(1.0, this.mantleProgress);
      const smoothT = t * t * (3 - 2 * t);
      this.position.lerpVectors(this.mantleStart, this.mantleTarget, smoothT);
      this.velocity.set(0, 0, 0);

      if (t >= 1.0) {
        this.state = 'NORMAL';
        this.climbWall = null;
        this.position.copy(this.mantleTarget);
        this.isGrounded = true;
      }
      this.mesh.position.copy(this.position);
      return;
    }

    // 2. ASSASSIN FREE-CLIMBING STATE
    if (this.state === 'CLIMBING') {
      this.updateClimbing(delta, inputDir, isDropping);
      return;
    }

    // 3. NORMAL MOVEMENT
    this.isSprinting = isSprinting;
    const speed = isTPS
      ? (isSprinting ? this.tpsSprintSpeed : this.tpsRunSpeed)
      : (isSprinting ? this.fpsSprintSpeed : this.fpsWalkSpeed);

    const moveVector = new THREE.Vector3();
    if (inputDir.lengthSq() > 0.01) {
      this.isMoving = true;
      this.moveTime += delta;

      const angle = cameraYaw + Math.atan2(inputDir.x, inputDir.z);
      moveVector.set(Math.sin(angle), 0, Math.cos(angle)).normalize();

      // IN PARKOUR MODE: Running into any building wall triggers Assassin Free-Climb!
      if (isTPS && this.tryGrabWall(moveVector, worldColliders)) {
        return;
      }
    } else {
      this.isMoving = false;
    }

    this.velocity.x = moveVector.x * speed;
    this.velocity.z = moveVector.z * speed;
    this.velocity.y -= this.gravity * delta;

    const nextPos = this.position.clone().addScaledVector(this.velocity, delta);

    // Collision Detection against World Colliders
    this.isGrounded = false;
    const playerRadius = 0.35;
    const playerHeight = 1.8;

    for (const col of worldColliders) {
      const box = col.box;

      // Vertical surface landings (Ground, Rooftops, Balconies, Haycarts)
      if (nextPos.x + playerRadius > box.min.x && nextPos.x - playerRadius < box.max.x &&
          nextPos.z + playerRadius > box.min.z && nextPos.z - playerRadius < box.max.z) {
        if (this.position.y >= box.max.y - 0.28 && nextPos.y <= box.max.y) {
          nextPos.y = box.max.y;
          this.velocity.y = 0;
          this.isGrounded = true;
        }
      }

      // Horizontal Wall Collisions
      if (nextPos.y < box.max.y && nextPos.y + playerHeight > box.min.y) {
        if (nextPos.z + playerRadius > box.min.z && nextPos.z - playerRadius < box.max.z) {
          if (this.position.x <= box.min.x - playerRadius && nextPos.x > box.min.x - playerRadius) {
            nextPos.x = box.min.x - playerRadius;
            this.velocity.x = 0;
          } else if (this.position.x >= box.max.x + playerRadius && nextPos.x < box.max.x + playerRadius) {
            nextPos.x = box.max.x + playerRadius;
            this.velocity.x = 0;
          }
        }
        if (nextPos.x + playerRadius > box.min.x && nextPos.x - playerRadius < box.max.x) {
          if (this.position.z <= box.min.z - playerRadius && nextPos.z > box.min.z - playerRadius) {
            nextPos.z = box.min.z - playerRadius;
            this.velocity.z = 0;
          } else if (this.position.z >= box.max.z + playerRadius && nextPos.x < box.max.z + playerRadius) {
            nextPos.z = box.max.z + playerRadius;
            this.velocity.z = 0;
          }
        }
      }
    }

    this.position.copy(nextPos);
    this.mesh.position.copy(this.position);

    // Procedural animations & mode adjustments
    this.mesh.visible = modeBlend > 0.08;

    if (this.isMoving) {
      const moveAngle = Math.atan2(moveVector.x, moveVector.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, moveAngle, Math.min(1.0, 14.0 * delta));
    } else {
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, cameraYaw, Math.min(1.0, 10.0 * delta));
    }

    if (this.isMoving && this.isGrounded) {
      const legFreq = this.isSprinting ? 16 : 10;
      this.legL.rotation.x = Math.sin(this.moveTime * legFreq) * 0.7;
      this.legR.rotation.x = -Math.sin(this.moveTime * legFreq) * 0.7;
      this.armL.rotation.x = -Math.sin(this.moveTime * legFreq) * 0.6;
      this.armR.rotation.x = Math.sin(this.moveTime * legFreq) * 0.6;
    } else {
      this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, 0.2);
      this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, 0.2);
      this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, 0, 0.2);
      this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, 0, 0.2);
    }

    this.backRifle.visible = isTPS;
    this.handKnife.visible = isTPS;
  }
}
