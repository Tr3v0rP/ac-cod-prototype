import * as THREE from 'three';

export class DualCameraController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Perspective State: 'FPS' (0.0) <---> 'TPS' (1.0)
    this.mode = 'FPS';
    this.modeBlend = 0.0; // 0 = Pure FPS, 1 = Pure TPS
    this.targetBlend = 0.0;
    this.blendSpeed = 3.6; // Transition speed (~0.28s)

    // Orientation
    this.yaw = 0;
    this.pitch = 0;

    // Invert settings (default standard non-inverted)
    this.invertY = false;
    this.invertX = false;

    // ADS (Aim Down Sights - FPS only)
    this.isADS = false;
    this.adsBlend = 0.0;

    // Base Offsets relative to player center
    this.fpsOffset = new THREE.Vector3(0, 1.68, 0);
    this.tpsOffset = new THREE.Vector3(0.55, 2.05, -2.6);

    // Current interpolated camera position
    this.currentOffset = new THREE.Vector3().copy(this.fpsOffset);

    // Sensitivity
    this.mouseSensitivity = 0.0022;
    this.gamepadSensitivity = 2.4;
  }

  toggleMode() {
    if (this.mode === 'FPS') {
      this.setMode('TPS');
    } else {
      this.setMode('FPS');
    }
    return this.mode;
  }

  setMode(newMode) {
    this.mode = newMode;
    this.targetBlend = (this.mode === 'TPS') ? 1.0 : 0.0;
    if (this.mode === 'TPS') {
      this.isADS = false; // Cannot ADS in TPS parkour mode
    }
  }

  setADS(active) {
    if (this.mode === 'FPS') {
      this.isADS = active;
    } else {
      this.isADS = false;
    }
  }

  handleMouseMove(deltaX, deltaY) {
    // Standard FPS controls:
    // Move mouse RIGHT (deltaX > 0) -> Turn RIGHT (increase yaw)
    // Move mouse LEFT  (deltaX < 0) -> Turn LEFT  (decrease yaw)
    // Move mouse UP    (deltaY < 0) -> Look UP    (decrease pitch in Three.js Euler)
    // Move mouse DOWN  (deltaY > 0) -> Look DOWN  (increase pitch in Three.js Euler)
    
    const xMult = this.invertX ? -1 : 1;
    const yMult = this.invertY ? -1 : 1;

    this.yaw += deltaX * this.mouseSensitivity * xMult;
    this.pitch += deltaY * this.mouseSensitivity * yMult;

    // Clamp pitch (-85 to +85 degrees)
    const maxPitch = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  handleGamepadLook(stickX, stickY, delta) {
    const xMult = this.invertX ? -1 : 1;
    const yMult = this.invertY ? -1 : 1;

    if (Math.abs(stickX) > 0.1) {
      this.yaw += stickX * this.gamepadSensitivity * delta * xMult;
    }
    if (Math.abs(stickY) > 0.1) {
      this.pitch += stickY * this.gamepadSensitivity * delta * yMult;
      const maxPitch = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    }
  }

  update(playerPos, delta, worldColliders) {
    // Smoothstep transition between FPS and TPS
    const diff = this.targetBlend - this.modeBlend;
    if (Math.abs(diff) > 0.001) {
      this.modeBlend += Math.sign(diff) * Math.min(Math.abs(diff), this.blendSpeed * delta);
    } else {
      this.modeBlend = this.targetBlend;
    }

    // ADS blend
    const targetAds = this.isADS ? 1.0 : 0.0;
    this.adsBlend += (targetAds - this.adsBlend) * Math.min(1.0, 14.0 * delta);

    // FOV adjustment for ADS
    const baseFOV = 75.0;
    const adsFOV = 50.0;
    this.camera.fov = THREE.MathUtils.lerp(baseFOV, adsFOV, this.adsBlend * (1.0 - this.modeBlend));
    this.camera.updateProjectionMatrix();

    // Rotations
    const playerRotation = new THREE.Euler(0, this.yaw, 0, 'YXZ');
    const pitchRotation = new THREE.Euler(this.pitch, 0, 0, 'YXZ');

    // Desired camera local offset based on blend
    const blendedOffset = new THREE.Vector3().lerpVectors(this.fpsOffset, this.tpsOffset, this.modeBlend);

    // Apply player yaw to the offset
    const worldOffset = blendedOffset.clone().applyEuler(playerRotation);

    // In TPS mode, check camera collision with buildings so camera doesn't clip through walls
    let finalCamPos = playerPos.clone().add(worldOffset);
    if (this.modeBlend > 0.1 && worldColliders) {
      const headPos = playerPos.clone().add(this.fpsOffset);
      const camRay = new THREE.Ray(headPos, finalCamPos.clone().sub(headPos).normalize());
      const maxDist = headPos.distanceTo(finalCamPos);

      for (const col of worldColliders) {
        const hit = camRay.intersectBox(col.box, new THREE.Vector3());
        if (hit && headPos.distanceTo(hit) < maxDist) {
          // Push camera just in front of wall
          const safeDist = Math.max(0.3, headPos.distanceTo(hit) - 0.2);
          finalCamPos = headPos.clone().addScaledVector(camRay.direction, safeDist);
          break;
        }
      }
    }

    this.camera.position.copy(finalCamPos);

    // Camera view direction
    const lookDir = new THREE.Vector3(0, 0, 1);
    lookDir.applyEuler(pitchRotation);
    lookDir.applyEuler(playerRotation);

    const lookTarget = finalCamPos.clone().add(lookDir.clone().multiplyScalar(50.0));
    this.camera.lookAt(lookTarget);

    return {
      yaw: this.yaw,
      pitch: this.pitch,
      modeBlend: this.modeBlend,
      lookDirection: lookDir
    };
  }
}
