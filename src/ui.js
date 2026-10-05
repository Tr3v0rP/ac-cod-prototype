export class UIManager {
  constructor() {
    this.modeBadge = document.getElementById('mode-badge');
    this.modeTitle = this.modeBadge.querySelector('.mode-title');
    this.modeSub = this.modeBadge.querySelector('.mode-sub');
    this.modeIcon = this.modeBadge.querySelector('.mode-icon');

    this.fpsCrosshair = document.getElementById('crosshair-fps');
    this.tpsCrosshair = document.getElementById('crosshair-tps');
    this.assassinationPrompt = document.getElementById('assassination-prompt');

    this.weaponName = document.getElementById('weapon-name');
    this.ammoClip = document.getElementById('ammo-clip');
    this.ammoReserve = document.getElementById('ammo-reserve');
    this.weaponStatus = document.getElementById('weapon-status');

    this.parkourStatus = document.getElementById('parkour-status');
    this.heightVal = document.getElementById('height-val');
    this.targetVal = document.getElementById('target-val');
    this.feedContainer = document.getElementById('feed-container');

    window.onEnemyKilled = (name, reason) => {
      this.addFeedItem(name, reason);
    };

    window.onNotification = (msg) => {
      this.addNotification(msg);
    };
  }

  setMode(mode) {
    if (mode === 'TPS') {
      this.modeBadge.className = 'mode-badge tps-mode';
      this.modeIcon.textContent = '⚔️';
      this.modeTitle.textContent = 'PARKOUR MODE';
      this.modeSub.textContent = 'THIRD PERSON • CLIMBING & BLADE READY';

      this.fpsCrosshair.classList.add('hidden');
      this.tpsCrosshair.classList.remove('hidden');

      this.weaponName.textContent = 'ASSASSIN DAGGER';
      this.ammoClip.textContent = 'MELEE';
      this.ammoReserve.textContent = 'STOWED M4';
      this.weaponStatus.textContent = 'LETHAL';
      this.weaponStatus.style.color = '#fb7185';
    } else {
      this.modeBadge.className = 'mode-badge fps-mode';
      this.modeIcon.textContent = '🔫';
      this.modeTitle.textContent = 'COMBAT MODE';
      this.modeSub.textContent = 'FIRST PERSON • FIREARM DRAWN';

      this.fpsCrosshair.classList.remove('hidden');
      this.tpsCrosshair.classList.add('hidden');

      this.weaponName.textContent = 'M4 TACTICAL CARBINE';
      this.weaponStatus.textContent = 'READY';
      this.weaponStatus.style.color = '#22c55e';
    }
  }

  update(player, cameraController, weaponSystem, assassinationSystem, livingEnemyCount) {
    const isTPS = cameraController.modeBlend > 0.5;

    if (!isTPS) {
      this.ammoClip.textContent = weaponSystem.currentClip;
      this.ammoReserve.textContent = weaponSystem.reserveAmmo;
      if (weaponSystem.isReloading) {
        this.weaponStatus.textContent = 'RELOADING...';
        this.weaponStatus.style.color = '#f59e0b';
      } else if (weaponSystem.currentClip === 0) {
        this.weaponStatus.textContent = 'NO AMMO (R TO RELOAD)';
        this.weaponStatus.style.color = '#ef4444';
      } else {
        this.weaponStatus.textContent = 'READY';
        this.weaponStatus.style.color = '#22c55e';
      }
    }

    // Traversal Status Display
    if (assassinationSystem.isAssassinating) {
      this.parkourStatus.textContent = 'AERIAL STRIKE';
      this.parkourStatus.style.color = '#fb7185';
    } else if (player.state === 'CLIMBING') {
      this.parkourStatus.textContent = 'WALL CLIMB (W: UP • C: DROP)';
      this.parkourStatus.style.color = '#f59e0b';
    } else if (player.state === 'MANTLING') {
      this.parkourStatus.textContent = 'LEDGE MANTLE';
      this.parkourStatus.style.color = '#38bdf8';
    } else if (!player.isGrounded) {
      this.parkourStatus.textContent = 'AIRBORNE';
      this.parkourStatus.style.color = '#facc15';
    } else if (player.isSprinting && player.isMoving) {
      this.parkourStatus.textContent = isTPS ? 'AC FREE-RUN SPRINT' : 'TACTICAL SPRINT';
      this.parkourStatus.style.color = '#22c55e';
    } else if (player.isMoving) {
      this.parkourStatus.textContent = 'MOVING';
      this.parkourStatus.style.color = '#f8fafc';
    } else {
      this.parkourStatus.textContent = 'IDLE';
      this.parkourStatus.style.color = '#94a3b8';
    }

    this.heightVal.textContent = `${Math.max(0, player.position.y).toFixed(1)} m`;
    this.targetVal.textContent = `${livingEnemyCount} PATROLLING`;

    // Aerial Assassination Target HUD Bracket
    if (assassinationSystem.screenPos.visible && assassinationSystem.activeTarget) {
      this.assassinationPrompt.classList.remove('hidden');
      this.assassinationPrompt.style.left = `${assassinationSystem.screenPos.x}px`;
      this.assassinationPrompt.style.top = `${assassinationSystem.screenPos.y}px`;
    } else {
      this.assassinationPrompt.classList.add('hidden');
    }
  }

  addFeedItem(victim, reason) {
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `⚔️ <strong>ASSASSIN</strong> eliminated <span style="color:#ef4444;">${victim}</span> [${reason}]`;
    this.feedContainer.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.5s';
      setTimeout(() => item.remove(), 500);
    }, 4000);
  }

  addNotification(msg) {
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.style.borderLeftColor = '#38bdf8';
    item.innerHTML = `⚙️ <strong>SETTINGS</strong>: ${msg}`;
    this.feedContainer.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transition = 'opacity 0.5s';
      setTimeout(() => item.remove(), 500);
    }, 3000);
  }
}
