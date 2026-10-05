import * as THREE from 'three';
import { sounds } from './audio.js';

export class WeaponSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Ammo
    this.clipSize = 30;
    this.currentClip = 30;
    this.reserveAmmo = 120;
    this.isReloading = false;
    this.lastShotTime = 0;
    this.fireRate = 0.11; // ~550 RPM

    // Recoil
    this.recoilOffset = new THREE.Vector3();
    this.recoilRotation = new THREE.Euler();

    // Visuals: FPS Gun Viewmodel
    this.fpsGunGroup = new THREE.Group();
    this.createFPSGunMesh();
    this.camera.add(this.fpsGunGroup);

    // Muzzle Flash
    this.muzzleLight = new THREE.PointLight(0xffaa33, 0, 8);
    this.fpsGunGroup.add(this.muzzleLight);
    this.muzzleLight.position.set(0.18, -0.16, -0.75);

    // Dynamic Tracer Lines & Spark Particles
    this.tracers = [];
    this.sparks = [];

    // Slash animation state
    this.isSlashing = false;
    this.slashTime = 0;
  }

  createFPSGunMesh() {
    // Stylized Tactical Carbine Viewmodel
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3
    });
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.5
    });

    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.32), gunMat);
    receiver.position.set(0.18, -0.2, -0.45);

    // Barrel & Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.28), gunMat);
    handguard.position.set(0.18, -0.18, -0.68);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.18, -0.18, -0.78);

    // Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.08), gunMat);
    mag.position.set(0.18, -0.29, -0.48);
    mag.rotation.x = 0.15;

    // Tactical Sight / Optic
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.1), railMat);
    optic.position.set(0.18, -0.13, -0.45);

    // Holographic Reticle Dot inside optic
    const holoDot = new THREE.Mesh(
      new THREE.RingGeometry(0.005, 0.012, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    holoDot.position.set(0.18, -0.13, -0.49);

    this.gunBody = new THREE.Group();
    this.gunBody.add(receiver, handguard, barrel, mag, optic, holoDot);
    this.fpsGunGroup.add(this.gunBody);

    // Default resting position
    this.gunRestPos = new THREE.Vector3(0, 0, 0);
    this.gunAdsPos = new THREE.Vector3(-0.18, 0.045, 0.08); // Centers sight directly in front of camera
  }

  update(delta, cameraController, playerState) {
    const isTPS = cameraController.modeBlend > 0.4;

    // Holster / hide FPS gun when transitioning to TPS parkour
    this.fpsGunGroup.visible = cameraController.modeBlend < 0.95;
    
    // Smooth gun holster animation: slides down and out of frame as modeBlend increases
    const holsterY = -cameraController.modeBlend * 0.6;
    const adsT = cameraController.adsBlend * (1.0 - cameraController.modeBlend);

    // Lerp gun position between rest and ADS
    const targetGunPos = new THREE.Vector3().lerpVectors(this.gunRestPos, this.gunAdsPos, adsT);
    targetGunPos.y += holsterY;

    // Walking / sprinting weapon bob
    if (playerState.isMoving && playerState.isGrounded) {
      const bobFreq = playerState.isSprinting ? 14 : 9;
      const bobAmp = playerState.isSprinting ? 0.015 : 0.006;
      targetGunPos.x += Math.cos(playerState.moveTime * bobFreq) * bobAmp;
      targetGunPos.y += Math.sin(playerState.moveTime * bobFreq * 2) * bobAmp;
    }

    // Apply recoil recovery
    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), Math.min(1.0, 16.0 * delta));
    this.recoilRotation.x = THREE.MathUtils.lerp(this.recoilRotation.x, 0, Math.min(1.0, 16.0 * delta));

    this.gunBody.position.copy(targetGunPos).add(this.recoilOffset);
    this.gunBody.rotation.x = this.recoilRotation.x;

    // Decay muzzle light
    if (this.muzzleLight.intensity > 0) {
      this.muzzleLight.intensity -= delta * 40;
      if (this.muzzleLight.intensity < 0) this.muzzleLight.intensity = 0;
    }

    // Update tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= delta;
      tr.mesh.material.opacity = tr.life / tr.maxLife;
      if (tr.life <= 0) {
        this.scene.remove(tr.mesh);
        tr.mesh.geometry.dispose();
        tr.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.life -= delta * 3;
      sp.mesh.position.addScaledVector(sp.vel, delta);
      sp.mesh.scale.multiplyScalar(0.92);
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.sparks.splice(i, 1);
      }
    }
  }

  canShoot(currentTime) {
    return !this.isReloading && 
           this.currentClip > 0 && 
           (currentTime - this.lastShotTime >= this.fireRate);
  }

  shoot(currentTime, raycaster, enemies, worldColliders) {
    if (!this.canShoot(currentTime)) {
      if (this.currentClip === 0 && !this.isReloading) {
        this.reload();
      }
      return false;
    }

    this.lastShotTime = currentTime;
    this.currentClip--;

    // Play punchy gunshot sound
    sounds.playGunshot();

    // Muzzle Flash
    this.muzzleLight.intensity = 3.5;

    // Recoil Kick
    this.recoilOffset.z += 0.04;
    this.recoilOffset.y += 0.01;
    this.recoilRotation.x += 0.04;

    // Bullet Raycast hitscan
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    let hitPoint = null;
    let hitEnemy = null;

    for (const hit of intersects) {
      // Ignore player or gun viewmodel meshes
      if (hit.object.isDescendantOf(this.fpsGunGroup)) continue;

      // Check if it hit an enemy
      for (const enemy of enemies) {
        if (enemy.mesh.getObjectById(hit.object.id)) {
          hitEnemy = enemy;
          break;
        }
      }

      hitPoint = hit.point;
      break;
    }

    if (!hitPoint) {
      hitPoint = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 80);
    }

    // Spawn tracer line
    this.spawnTracer(this.camera.position, hitPoint);

    // If hit enemy, deal damage
    if (hitEnemy) {
      hitEnemy.manager.applyDamage(hitEnemy.data, 35);
      this.spawnSparks(hitPoint, 0xef4444); // Red blood/armor spark
    } else {
      this.spawnSparks(hitPoint, 0xfacc15); // Concrete spark
    }

    return true;
  }

  spawnTracer(start, end) {
    const points = [start.clone(), end.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.08, maxLife: 0.08 });
  }

  spawnSparks(pos, color) {
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.03, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      this.scene.add(p);
      this.sparks.push({ mesh: p, vel, life: 0.25 });
    }
  }

  reload() {
    if (this.isReloading || this.currentClip >= this.clipSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    sounds.playReload();

    setTimeout(() => {
      const needed = this.clipSize - this.currentClip;
      const amount = Math.min(needed, this.reserveAmmo);
      this.currentClip += amount;
      this.reserveAmmo -= amount;
      this.isReloading = false;
    }, 1200);
  }
}
