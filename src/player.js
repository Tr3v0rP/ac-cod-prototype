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

    // Parkour & Mantle state
    this.isMantling = false;
    this.mantleStart = new THREE.Vector3();
    this.mantleTarget = new THREE.Vector3();
    this.mantleProgress = 0;
    this.mantleDuration = 0.28;

    // Speeds
    this.fpsWalkSpeed = 4.2;
    this.fpsSprintSpeed = 6.2;
    this.tpsRunSpeed = 5.5;
    this.tpsSprintSpeed = 8.8; // Agile parkour sprint
    this.jumpVelocity = 8.2;
    this.gravity = 24.0;

    // Mesh
    this.mesh = new THREE.Group();
    this.createCharacterMesh();
    this.scene.add(this.mesh);
  }

  createCharacterMesh() {
    // Stylized Assassin Operative (White & Slate Coat, Red Sash, Tactical Gear)
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 }); // White/Silver Assassin tunic
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }); // Dark tactical cargo pants
    const sashMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 }); // Crimson sash
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 }); // Leather straps/boots
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 }); // Hidden blade/knife

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

    // Torso / Tunic
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.32);
    this.torso = new THREE.Mesh(torsoGeo, coatMat);
    this.torso.position.set(0, 1.2, 0);
    this.torso.castShadow = true;

    // Crimson Assassin Waist Sash
    const sashGeo = new THREE.BoxGeometry(0.58, 0.16, 0.35);
    const sash = new THREE.Mesh(sashGeo, sashMat);
    sash.position.set(0, -0.28, 0);
    this.torso.add(sash);

    // Assassin Hood & Head
    const hoodGeo = new THREE.ConeGeometry(0.26, 0.45, 8);
    this.hood = new THREE.Mesh(hoodGeo, coatMat);
    this.hood.position.set(0, 1.82, -0.05);
    this.hood.rotation.x = -0.15;
    this.hood.castShadow = true;

    // Face / Shadow inside hood
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

    // Holstered Rifle on Back (Visible in TPS Mode!)
    this.backRifle = new THREE.Group();
    const rifleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.14), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 }));
    this.backRifle.add(rifleMesh);
    this.backRifle.position.set(0.05, 0, -0.22);
    this.backRifle.rotation.z = 0.55; // Slung diagonally across back
    this.torso.add(this.backRifle);

    // Tactical Knife in Right Hand (Drawn in TPS Mode!)
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
    if (this.isGrounded && !this.isMantling) {
      this.velocity.y = this.jumpVelocity;
      this.isGrounded = false;
      sounds.playVault();
    }
  }

  // Attempt parkour ledge mantle/vault
  tryMantle(moveDir, worldColliders) {
    if (this.isMantling) return false;
    if (moveDir.lengthSq() < 0.01) return false;

    // Raycast forward from chest height (~1.2m)
    const forward = moveDir.clone().normalize();
    const chestOrigin = this.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const ray = new THREE.Ray(chestOrigin, forward);

    for (const col of worldColliders) {
      if (col.type === 'ground') continue;
      const hit = ray.intersectBox(col.box, new THREE.Vector3());
      if (hit && chestOrigin.distanceTo(hit) < 1.1) {
        // Found obstacle ahead! Check if top of obstacle is reachable
        const topY = col.box.max.y;
        const heightDiff = topY - this.position.y;

        // Mantle window: between 0.8m and 3.0m high
        if (heightDiff >= 0.7 && heightDiff <= 3.2) {
          this.isMantling = true;
          this.mantleProgress = 0;
          this.mantleStart.copy(this.position);
          // Target landing spot on top of obstacle
          this.mantleTarget.copy(hit).add(new THREE.Vector3(0, 0.05, 0)).addScaledVector(forward, 0.6);
          this.mantleTarget.y = topY;
          sounds.playVault();
          return true;
        }
      }
    }
    return false;
  }

  update(delta, inputDir, isSprinting, cameraYaw, modeBlend, worldColliders) {
    // Mantling animation takes priority
    if (this.isMantling) {
      this.mantleProgress += delta / this.mantleDuration;
      const t = Math.min(1.0, this.mantleProgress);
      // Smooth hermite step
      const smoothT = t * t * (3 - 2 * t);
      this.position.lerpVectors(this.mantleStart, this.mantleTarget, smoothT);
      this.velocity.set(0, 0, 0);

      if (t >= 1.0) {
        this.isMantling = false;
        this.position.copy(this.mantleTarget);
        this.isGrounded = true;
      }
      this.mesh.position.copy(this.position);
      return;
    }

    // Determine movement speed based on mode (Combat FPS vs Parkour TPS)
    const isTPS = modeBlend > 0.5;
    this.isSprinting = isSprinting;
    let speed = isTPS
      ? (isSprinting ? this.tpsSprintSpeed : this.tpsRunSpeed)
      : (isSprinting ? this.fpsSprintSpeed : this.fpsWalkSpeed);

    // Calculate world move direction from input and camera yaw
    const moveVector = new THREE.Vector3();
    if (inputDir.lengthSq() > 0.01) {
      this.isMoving = true;
      this.moveTime += delta;

      const angle = cameraYaw + Math.atan2(inputDir.x, inputDir.z);
      moveVector.set(Math.sin(angle), 0, Math.cos(angle)).normalize();

      // Check for parkour mantle
      if (isTPS && (this.tryMantle(moveVector, worldColliders))) {
        return;
      }
    } else {
      this.isMoving = false;
    }

    // Apply horizontal velocity
    this.velocity.x = moveVector.x * speed;
    this.velocity.z = moveVector.z * speed;

    // Apply gravity
    this.velocity.y -= this.gravity * delta;

    // Proposed new position
    const nextPos = this.position.clone().addScaledVector(this.velocity, delta);

    // Collision Detection against World Colliders
    this.isGrounded = false;
    const playerRadius = 0.35;
    const playerHeight = 1.8;

    for (const col of worldColliders) {
      const box = col.box;

      // Vertical ground / rooftop landing check
      if (nextPos.x + playerRadius > box.min.x && nextPos.x - playerRadius < box.max.x &&
          nextPos.z + playerRadius > box.min.z && nextPos.z - playerRadius < box.max.z) {
        // Feet landing on top of surface
        if (this.position.y >= box.max.y - 0.25 && nextPos.y <= box.max.y) {
          nextPos.y = box.max.y;
          this.velocity.y = 0;
          this.isGrounded = true;
        }
      }

      // Horizontal wall collisions
      if (nextPos.y < box.max.y && nextPos.y + playerHeight > box.min.y) {
        // Clamp X
        if (nextPos.z + playerRadius > box.min.z && nextPos.z - playerRadius < box.max.z) {
          if (this.position.x <= box.min.x - playerRadius && nextPos.x > box.min.x - playerRadius) {
            nextPos.x = box.min.x - playerRadius;
            this.velocity.x = 0;
          } else if (this.position.x >= box.max.x + playerRadius && nextPos.x < box.max.x + playerRadius) {
            nextPos.x = box.max.x + playerRadius;
            this.velocity.x = 0;
          }
        }
        // Clamp Z
        if (nextPos.x + playerRadius > box.min.x && nextPos.x - playerRadius < box.max.x) {
          if (this.position.z <= box.min.z - playerRadius && nextPos.z > box.min.z - playerRadius) {
            nextPos.z = box.min.z - playerRadius;
            this.velocity.z = 0;
          } else if (this.position.z >= box.max.z + playerRadius && nextPos.z < box.max.z + playerRadius) {
            nextPos.z = box.max.z + playerRadius;
            this.velocity.z = 0;
          }
        }
      }
    }

    this.position.copy(nextPos);
    this.mesh.position.copy(this.position);

    // Procedural animations & mode adjustments
    // In FPS mode: hide player model to prevent camera clipping inside
    // In TPS mode: show full character model
    this.mesh.visible = modeBlend > 0.08;

    // Rotate character mesh towards movement or camera direction
    if (this.isMoving) {
      const moveAngle = Math.atan2(moveVector.x, moveVector.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, moveAngle, Math.min(1.0, 14.0 * delta));
    } else {
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, cameraYaw, Math.min(1.0, 10.0 * delta));
    }

    // Running procedural leg swing
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

    // In TPS mode: back rifle is holstered, knife is equipped in right hand
    this.backRifle.visible = isTPS;
    this.handKnife.visible = isTPS;
  }
}
