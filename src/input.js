import * as THREE from 'three';

export class InputManager {
  constructor(domElement, onModeToggle, onAssassinateTrigger) {
    this.domElement = domElement;
    this.onModeToggle = onModeToggle;
    this.onAssassinateTrigger = onAssassinateTrigger;

    // Movement state
    this.keys = {};
    this.moveVector = new THREE.Vector3(0, 0, 0);
    this.isSprinting = false;
    this.isJumping = false;
    this.isShooting = false;
    this.isAiming = false;

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

      // E or Space : Aerial Assassinate
      if (e.code === 'KeyE') {
        if (this.onAssassinateTrigger) this.onAssassinateTrigger();
      }

      if (e.code === 'Space') {
        this.isJumping = true;
        if (this.onAssassinateTrigger) this.onAssassinateTrigger();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') {
        this.isJumping = false;
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
    // 1. Keyboard & Mouse Vector
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

    // Toggle Invert Y with 'I'
    if (this.keys['KeyI'] && !this.lastIState) {
      cameraController.invertY = !cameraController.invertY;
      if (window.onNotification) {
        window.onNotification(`INVERT Y: ${cameraController.invertY ? 'ON' : 'OFF'}`);
      }
    }
    this.lastIState = !!this.keys['KeyI'];

    // 2. Gamepad Polling
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];

    if (gp && gp.connected) {
      // Left Stick (Movement)
      const stickX = gp.axes[0] || 0;
      const stickY = gp.axes[1] || 0;
      const deadzone = 0.15;

      if (Math.abs(stickX) > deadzone) strafe += stickX;
      if (Math.abs(stickY) > deadzone) forward -= stickY;

      // Right Stick (Look)
      const lookX = gp.axes[2] || 0;
      const lookY = gp.axes[3] || 0;
      cameraController.handleGamepadLook(lookX, lookY, 1/60);

      // Buttons
      // Button 4: LB (Left Bumper) -> Mode Switch!
      const lbPressed = gp.buttons[4] && gp.buttons[4].pressed;
      if (lbPressed && !this.lastLbState) {
        if (this.onModeToggle) this.onModeToggle();
      }
      this.lastLbState = lbPressed;

      // Button 0: A (Xbox) / Cross (PS) -> Jump / Mantle
      const aPressed = gp.buttons[0] && gp.buttons[0].pressed;
      if (aPressed && !this.lastJumpState) {
        this.isJumping = true;
        if (this.onAssassinateTrigger) this.onAssassinateTrigger();
      } else if (!aPressed) {
        this.isJumping = false;
      }
      this.lastJumpState = aPressed;

      // Button 7: RT (Right Trigger) -> Shoot / Strike
      const rtPressed = gp.buttons[7] && gp.buttons[7].pressed;
      this.isShooting = this.isShooting || rtPressed;

      // Button 6: LT (Left Trigger) -> ADS
      const ltPressed = gp.buttons[6] && gp.buttons[6].pressed;
      this.isAiming = this.isAiming || ltPressed;

      // Button 2: X (Xbox) -> Reload
      const xPressed = gp.buttons[2] && gp.buttons[2].pressed;
      if (xPressed && !this.lastReloadState && onReload) {
        onReload();
      }
      this.lastReloadState = xPressed;

      // Left Stick Click (L3 / Button 10) -> Sprint
      if (gp.buttons[10] && gp.buttons[10].pressed) {
        this.isSprinting = true;
      }
    }

    // Set Three.Vector3 moveVector
    this.moveVector.set(strafe, 0, forward);
    if (this.moveVector.lengthSq() > 1.0) {
      this.moveVector.normalize();
    }

    cameraController.setADS(this.isAiming);
  }
}
