import * as THREE from 'three';

export class InputManager {
  constructor(domElement, onModeToggle, onAssassinateTrigger, cameraController) {
    this.domElement = domElement;
    this.onModeToggle = onModeToggle;
    this.onAssassinateTrigger = onAssassinateTrigger;
    this.cameraController = cameraController;

    // Movement state
    this.keys = {};
    this.moveVector = new THREE.Vector3(0, 0, 0);
    this.isSprinting = false;
    this.isJumping = false;
    this.isShooting = false;
    this.isAiming = false;
    this.isDropping = false;

    // Gamepad state
    this.gamepadConnected = false;
    this.lastLbState = false;
    this.lastJumpState = false;
    this.lastReloadState = false;

    this.setupKeyboard();
    this.setupMouse();
    this.setupGamepad();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // LB / Q : Switch Mode
      if (e.code === 'KeyQ') {
        if (this.onModeToggle) this.onModeToggle();
      }

      // E : Aerial Assassinate
      if (e.code === 'KeyE') {
        if (this.onAssassinateTrigger) this.onAssassinateTrigger();
      }

      // Space : Jump / Climb Up / Vault
      if (e.code === 'Space') {
        this.isJumping = true;
        if (this.onAssassinateTrigger) this.onAssassinateTrigger();
      }

      // Shift / C : Drop down from climb
      if (e.code === 'KeyC') {
        this.isDropping = true;
      }

      // I : Toggle Invert Y
      if (e.code === 'KeyI') {
        if (this.cameraController) {
          const val = this.cameraController.toggleInvertY();
          const btn = document.getElementById('btn-toggle-inverty');
          if (btn) {
            btn.textContent = `Invert Y: ${val ? 'ON' : 'OFF'}`;
            btn.classList.toggle('active', val);
          }
          const startBtn = document.getElementById('start-btn-inverty');
          if (startBtn) {
            startBtn.textContent = `Invert Y: ${val ? 'ON' : 'OFF'}`;
            startBtn.classList.toggle('active', val);
          }
          if (window.onNotification) window.onNotification(`INVERT Y: ${val ? 'ON' : 'OFF'}`);
        }
      }

      // O : Toggle Invert X
      if (e.code === 'KeyO') {
        if (this.cameraController) {
          const val = this.cameraController.toggleInvertX();
          const btn = document.getElementById('btn-toggle-invertx');
          if (btn) {
            btn.textContent = `Invert X: ${val ? 'ON' : 'OFF'}`;
            btn.classList.toggle('active', val);
          }
          const startBtn = document.getElementById('start-btn-invertx');
          if (startBtn) {
            startBtn.textContent = `Invert X: ${val ? 'ON' : 'OFF'}`;
            startBtn.classList.toggle('active', val);
          }
          if (window.onNotification) window.onNotification(`INVERT X: ${val ? 'ON' : 'OFF'}`);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') {
        this.isJumping = false;
      }
      if (e.code === 'KeyC') {
        this.isDropping = false;
      }
    });
  }

  setupMouse() {
    window.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== document.body) return;

      if (e.button === 0) { // Left click
        this.isShooting = true;
        if (this.onAssassinateTrigger) this.onAssassinateTrigger();
      } else if (e.button === 2) { // Right click
        this.isAiming = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isShooting = false;
      } else if (e.button === 2) {
        this.isAiming = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadConnected = true;
      const gp = e.gamepad;
      const el = document.getElementById('gamepad-status');
      if (el) {
        el.textContent = `🎮 Gamepad: ${gp.id.substring(0, 24)}... Connected! Press LB for Parkour`;
        el.style.color = '#22c55e';
      }
    });

    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
      const el = document.getElementById('gamepad-status');
      if (el) {
        el.textContent = '🎮 Gamepad: None detected (Plug in Xbox/PS controller anytime)';
        el.style.color = '#38bdf8';
      }
    });
  }

  update(cameraController, onReload) {
    let forward = 0;
    let strafe = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) strafe += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) strafe -= 1;

    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);

    if (this.keys['KeyR'] && onReload) {
      onReload();
    }

    // Gamepad
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];

    if (gp && gp.connected) {
      const stickX = gp.axes[0] || 0;
      const stickY = gp.axes[1] || 0;
      const deadzone = 0.15;

      if (Math.abs(stickX) > deadzone) strafe += stickX;
      if (Math.abs(stickY) > deadzone) forward -= stickY;

      const lookX = gp.axes[2] || 0;
      const lookY = gp.axes[3] || 0;
      cameraController.handleGamepadLook(lookX, lookY, 1/60);

      // LB: Mode Switch
      const lbPressed = gp.buttons[4] && gp.buttons[4].pressed;
      if (lbPressed && !this.lastLbState) {
        if (this.onModeToggle) this.onModeToggle();
      }
      this.lastLbState = lbPressed;

      // A: Jump / Climb
      const aPressed = gp.buttons[0] && gp.buttons[0].pressed;
      if (aPressed && !this.lastJumpState) {
        this.isJumping = true;
        if (this.onAssassinateTrigger) this.onAssassinateTrigger();
      } else if (!aPressed) {
        this.isJumping = false;
      }
      this.lastJumpState = aPressed;

      // RT: Shoot / Strike
      const rtPressed = gp.buttons[7] && gp.buttons[7].pressed;
      this.isShooting = this.isShooting || rtPressed;

      // LT: ADS
      const ltPressed = gp.buttons[6] && gp.buttons[6].pressed;
      this.isAiming = this.isAiming || ltPressed;

      // X: Reload
      const xPressed = gp.buttons[2] && gp.buttons[2].pressed;
      if (xPressed && !this.lastReloadState && onReload) {
        onReload();
      }
      this.lastReloadState = xPressed;

      // B: Drop from climb
      if (gp.buttons[1] && gp.buttons[1].pressed) {
        this.isDropping = true;
      }

      // L3: Sprint
      if (gp.buttons[10] && gp.buttons[10].pressed) {
        this.isSprinting = true;
      }
    }

    this.moveVector.set(strafe, 0, forward);
    if (this.moveVector.lengthSq() > 1.0) {
      this.moveVector.normalize();
    }

    cameraController.setADS(this.isAiming);
  }
}
