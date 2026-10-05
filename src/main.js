import * as THREE from 'three';
import { sounds } from './audio.js';
import { World } from './world.js';
import { Player } from './player.js';
import { DualCameraController } from './camera.js';
import { WeaponSystem } from './weapons.js';
import { EnemyManager } from './enemies.js';
import { AerialAssassinationSystem } from './assassination.js';
import { InputManager } from './input.js';
import { UIManager } from './ui.js';

class GameApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.blocker = document.getElementById('blocker');

    this.initScene();
    this.initSystems();
    this.initEvents();

    this.lastTime = performance.now();
    this.raycaster = new THREE.Raycaster();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initScene() {
    this.scene = new THREE.Scene();
    // Tuscan Golden Hour Sunset Sky & Atmospheric Mist
    this.scene.background = new THREE.Color(0xd97736); 
    this.scene.fog = new THREE.FogExp2(0xd97736, 0.007);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 350);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Tuscan Renaissance Golden Hour Lighting
    const ambientLight = new THREE.AmbientLight(0xfef3c7, 1.4); // Warm amber ambient
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x78350f, 1.2); // Blue sky vs warm earth bounce
    this.scene.add(hemiLight);

    // Low Golden Sun
    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    sunLight.position.set(65, 45, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -70;
    sunLight.shadow.camera.right = 70;
    sunLight.shadow.camera.top = 70;
    sunLight.shadow.camera.bottom = -70;
    this.scene.add(sunLight);

    // Warm street lanterns in piazza
    const lantern1 = new THREE.PointLight(0xf59e0b, 2.5, 30);
    lantern1.position.set(0, 3.5, 5);
    this.scene.add(lantern1);

    const lantern2 = new THREE.PointLight(0xf59e0b, 2.5, 30);
    lantern2.position.set(0, 3.5, -12);
    this.scene.add(lantern2);
  }

  initSystems() {
    this.world = new World(this.scene);
    this.player = new Player(this.scene);
    this.cameraController = new DualCameraController(this.camera, this.renderer.domElement);
    this.weapons = new WeaponSystem(this.scene, this.camera);
    this.enemies = new EnemyManager(this.scene);
    this.assassination = new AerialAssassinationSystem(this.scene, this.camera);
    this.ui = new UIManager();

    // Spawn player in the Piazza facing the Campanile bell tower
    this.player.position.set(0, 0.5, 12);

    // Input handlers
    this.input = new InputManager(
      document.body,
      () => this.toggleMode(),
      () => this.triggerAssassinate(),
      this.cameraController
    );
  }

  toggleMode() {
    const newMode = this.cameraController.toggleMode();
    const isTPS = newMode === 'TPS';
    
    sounds.playModeSwitch(isTPS);
    if (isTPS) {
      setTimeout(() => sounds.playBladeDraw(), 120);
    }

    this.ui.setMode(newMode);
  }

  triggerAssassinate() {
    if (this.assassination.activeTarget && !this.assassination.isAssassinating) {
      this.assassination.startAssassination(this.player.position, this.assassination.activeTarget);
    }
  }

  initEvents() {
    const startPlay = () => {
      document.body.requestPointerLock();
      sounds.init();
      this.blocker.style.display = 'none';
    };

    this.blocker.addEventListener('click', startPlay);

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        this.blocker.style.display = 'none';
      } else {
        this.blocker.style.display = 'flex';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === document.body) {
        this.cameraController.handleMouseMove(e.movementX, e.movementY);
      }
    });

    // Invert Settings Buttons
    const btnInvertY = document.getElementById('btn-toggle-inverty');
    if (btnInvertY) {
      btnInvertY.addEventListener('click', (e) => {
        e.stopPropagation();
        const active = this.cameraController.toggleInvertY();
        btnInvertY.textContent = `Invert Y: ${active ? 'ON' : 'OFF'}`;
        btnInvertY.classList.toggle('active', active);
        this.ui.addNotification(`INVERT Y: ${active ? 'ON' : 'OFF'}`);
      });
    }

    const btnInvertX = document.getElementById('btn-toggle-invertx');
    if (btnInvertX) {
      btnInvertX.addEventListener('click', (e) => {
        e.stopPropagation();
        const active = this.cameraController.toggleInvertX();
        btnInvertX.textContent = `Invert X: ${active ? 'ON' : 'OFF'}`;
        btnInvertX.classList.toggle('active', active);
        this.ui.addNotification(`INVERT X: ${active ? 'ON' : 'OFF'}`);
      });
    }

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.08);
    this.lastTime = now;
    const elapsedTime = now / 1000;

    // 1. Process Input
    this.input.update(this.cameraController, () => this.weapons.reload());

    if (this.input.isJumping) {
      this.player.jump();
    }

    // 2. Aerial Assassination State
    if (this.assassination.isAssassinating) {
      this.assassination.updateExecution(delta, this.player, this.enemies);
    } else {
      // 3. Player Movement & Parkour
      this.player.update(
        delta,
        this.input.moveVector,
        this.input.isSprinting,
        this.cameraController.yaw,
        this.cameraController.modeBlend,
        this.world.colliders
      );
    }

    // 4. Update Camera Rig
    const camData = this.cameraController.update(this.player.position, delta, this.world.colliders);

    // 5. Update Weapons & Combat
    this.weapons.update(delta, this.cameraController, {
      isMoving: this.player.isMoving,
      isSprinting: this.player.isSprinting,
      isGrounded: this.player.isGrounded,
      moveTime: this.player.moveTime
    });

    if (this.input.isShooting && this.cameraController.modeBlend < 0.3) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const enemyHitTargets = this.enemies.enemies.map(e => ({ mesh: e.mesh, data: e, manager: this.enemies }));
      this.weapons.shoot(elapsedTime, this.raycaster, enemyHitTargets, this.world.colliders);
    }

    // 6. Update Bots / Enemies
    this.enemies.update(delta);

    // 7. Check Aerial Assassination Target Acquisition
    const isTPS = this.cameraController.modeBlend > 0.5;
    this.assassination.updateTargeting(
      this.player.position,
      this.player.isGrounded,
      isTPS,
      camData.lookDirection,
      this.enemies
    );

    // 8. Update UI & HUD
    this.ui.update(
      this.player,
      this.cameraController,
      this.weapons,
      this.assassination,
      this.enemies.getLivingEnemies().length
    );

    // 9. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
