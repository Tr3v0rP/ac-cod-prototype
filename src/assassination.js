import * as THREE from 'three';
import { sounds } from './audio.js';

export class AerialAssassinationSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Target detection state
    this.activeTarget = null;
    this.screenPos = { x: 0, y: 0, visible: false };

    // Execution Animation State
    this.isAssassinating = false;
    this.animProgress = 0;
    this.animDuration = 0.42; // Seconds for leap & strike
    this.startPos = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.executingEnemy = null;
  }

  // Scan for viable assassination targets
  updateTargeting(playerPos, isGrounded, isTPS, lookDir, enemyManager) {
    // Aerial assassination is available when airborne in TPS mode (or jumping down from a ledge)
    if (this.isAssassinating) return null;

    if (!isTPS || isGrounded) {
      this.activeTarget = null;
      return null;
    }

    const living = enemyManager.getLivingEnemies();
    let bestTarget = null;
    let minScore = Infinity;

    for (const enemy of living) {
      const ePos = enemy.mesh.position;
      const heightDelta = playerPos.y - ePos.y;

      // Must be above enemy (between 1.5m and 10.0m)
      if (heightDelta < 1.5 || heightDelta > 10.0) continue;

      // Horizontal distance
      const xzDist = Math.hypot(playerPos.x - ePos.x, playerPos.z - ePos.z);
      if (xzDist > 7.0) continue;

      // Angle check (is player looking somewhat towards enemy?)
      const toEnemy = new THREE.Vector3(ePos.x - playerPos.x, 0, ePos.z - playerPos.z).normalize();
      const horizontalLook = new THREE.Vector3(lookDir.x, 0, lookDir.z).normalize();
      const dot = horizontalLook.dot(toEnemy);

      if (dot < 0.3) continue; // Must be in front

      const score = xzDist - dot * 2.0;
      if (score < minScore) {
        minScore = score;
        bestTarget = enemy;
      }
    }

    this.activeTarget = bestTarget;

    // Project enemy position to screen coordinates for HUD bracket
    if (this.activeTarget) {
      const targetWorldPos = this.activeTarget.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const projected = targetWorldPos.project(this.camera);

      // Check if in front of camera
      if (projected.z < 1) {
        this.screenPos.x = (projected.x * 0.5 + 0.5) * window.innerWidth;
        this.screenPos.y = (-(projected.y * 0.5) + 0.5) * window.innerHeight;
        this.screenPos.visible = true;
      } else {
        this.screenPos.visible = false;
      }
    } else {
      this.screenPos.visible = false;
    }

    return this.activeTarget;
  }

  // Trigger the lethal takedown!
  startAssassination(playerPos, enemy) {
    if (!enemy || this.isAssassinating) return false;

    this.isAssassinating = true;
    this.animProgress = 0;
    this.startPos.copy(playerPos);
    this.targetPos.copy(enemy.mesh.position).add(new THREE.Vector3(0, 0.2, 0));
    this.executingEnemy = enemy;

    // Audio cue: wind whoosh leap
    sounds.playVault();

    return true;
  }

  updateExecution(delta, player, enemyManager) {
    if (!this.isAssassinating) return;

    this.animProgress += delta / this.animDuration;
    const t = Math.min(1.0, this.animProgress);

    // Parabolic leap curve towards enemy's neck/shoulders
    const currentPos = new THREE.Vector3().lerpVectors(this.startPos, this.targetPos, t);
    // Add arc height in middle of leap
    const arcHeight = Math.sin(t * Math.PI) * 1.2;
    currentPos.y += arcHeight;

    player.position.copy(currentPos);

    // Rotate player to face target
    const lookTarget = this.targetPos.clone();
    lookTarget.y = player.position.y;
    player.mesh.lookAt(lookTarget);

    // Strike moment
    if (t >= 1.0) {
      this.isAssassinating = false;

      // Heavy blade impact sound
      sounds.playAssassinationImpact();

      // Execute fatal damage on enemy
      if (this.executingEnemy) {
        enemyManager.executeAssassination(this.executingEnemy);
      }

      // Finish positioning
      player.position.copy(this.targetPos);
      player.velocity.set(0, 0, 0);
      player.isGrounded = true;
      this.executingEnemy = null;
      this.activeTarget = null;
    }
  }
}
