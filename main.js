import * as THREE from 'three';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const SCALE = {
  // Scale factors for visualization (not to real scale)
  SUN_RADIUS: 15,
  EARTH_RADIUS: 4,
  MOON_RADIUS: 1,
  EARTH_ORBIT: 150,
  MOON_ORBIT: 15
};

const SPEEDS = {
  // Rotation and orbital speeds (Earth days)
  EARTH_ORBIT: 0.002,      // 365 days -> scaled
  EARTH_ROTATION: 0.1,     // 1 day
  MOON_ORBIT: 0.02,        // 27.3 days -> scaled
  MOON_ROTATION: 0.02,     // Tidally locked
  // Real-time speed: 1 second = 1 second
  REAL_TIME_EARTH_ROTATION: (1 / 86400) * (Math.PI * 2), // Full rotation in 24 hours
  REAL_TIME_EARTH_ORBIT: (1 / (365.25 * 86400)) * (Math.PI * 2),
  REAL_TIME_MOON_ORBIT: (1 / (27.3 * 86400)) * (Math.PI * 2)
};

const MOON_PHASES = [
  { name: 'New Moon', angle: 0, description: 'Moon between Earth and Sun - dark side faces Earth' },
  { name: 'Waxing Crescent', angle: 45, description: 'Small sliver of illumination visible' },
  { name: 'First Quarter', angle: 90, description: 'Half of Moon illuminated (right side)' },
  { name: 'Waxing Gibbous', angle: 135, description: 'More than half illuminated' },
  { name: 'Full Moon', angle: 180, description: 'Moon opposite Sun - fully illuminated face toward Earth' },
  { name: 'Waning Gibbous', angle: 225, description: 'More than half illuminated (decreasing)' },
  { name: 'Last Quarter', angle: 270, description: 'Half of Moon illuminated (left side)' },
  { name: 'Waning Crescent', angle: 315, description: 'Small sliver before new moon' }
];

// ============================================================================
// PERFORMANCE OPTIMIZATION SETTINGS
// ============================================================================

const PERFORMANCE_CONFIG = {
  antialias: true,
  powerPreference: 'high-performance',
  precision: 'highp',
  logarithmicDepthBuffer: true,
  // Target 8K resolution (7680 x 4320)
  maxPixelRatio: window.devicePixelRatio || 2,
  // Geometry detail levels
  sunSegments: 64,
  earthSegments: 64,  // Increased for better lighting
  moonSegments: 64,   // Increased for realistic shadow detail
  orbitSegments: 128
};

// ============================================================================
// SCENE SETUP
// ============================================================================

class CelestialSimulation {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.isPaused = false;
    this.timeSpeed = 1.0;
    this.isRealTimeSpeed = false;
    this.useRealPositions = true; // Start with real astronomical positions
    this.showOrbits = true;
    this.showLabels = true;
    this.currentPhaseIndex = 0;
    this.showEarthView = false;
    this.arizonaLatitude = 34.0489; // Phoenix, Arizona
    this.arizonaLongitude = -111.9; // Phoenix, Arizona
    this.localTime = 0; // Local time in hours (0-24)
    this.simulationDate = new Date(); // Current date/time
    this.realStartDate = new Date(); // Reference for real-time sync
    
    
    this.init();
    this.createObjects();
    this.setupLighting();
    this.createEducationalUI();
    this.setupControls();
    this.initializeRealPositions();
    this.animate();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Add starfield
    this.createStarfield();
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 100, 300);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer - Optimized for 8K/60fps
    this.renderer = new THREE.WebGLRenderer({
      antialias: PERFORMANCE_CONFIG.antialias,
      powerPreference: PERFORMANCE_CONFIG.powerPreference,
      precision: PERFORMANCE_CONFIG.precision,
      logarithmicDepthBuffer: PERFORMANCE_CONFIG.logarithmicDepthBuffer
    });
    
    this.renderer.setPixelRatio(Math.min(PERFORMANCE_CONFIG.maxPixelRatio, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Enable shadows for realistic lunar phases
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.container.appendChild(this.renderer.domElement);
    
    // Clock for delta time
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      // Random positions in a sphere
      const radius = 2000 + Math.random() * 3000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Varying star sizes
      sizes[i] = Math.random() * 3 + 1;
      
      // Slight color variation (white to blue-white)
      const colorVariation = 0.9 + Math.random() * 0.1;
      colors[i * 3] = colorVariation;
      colors[i * 3 + 1] = colorVariation;
      colors[i * 3 + 2] = 1.0;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
      vertexColors: true,
      size: 2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9
    });
    
    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.stars);
  }

  createObjects() {
    // Sun
    const sunGeometry = new THREE.SphereGeometry(
      SCALE.SUN_RADIUS,
      PERFORMANCE_CONFIG.sunSegments,
      PERFORMANCE_CONFIG.sunSegments
    );
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 1
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sun);
    
    // Sun glow
    const glowGeometry = new THREE.SphereGeometry(SCALE.SUN_RADIUS * 1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3
    });
    this.sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.sun.add(this.sunGlow);
    
    // Earth system (pivot point for orbit)
    this.earthSystem = new THREE.Group();
    this.scene.add(this.earthSystem);
    
    // Earth
    const earthGeometry = new THREE.SphereGeometry(
      SCALE.EARTH_RADIUS,
      PERFORMANCE_CONFIG.earthSegments,
      PERFORMANCE_CONFIG.earthSegments
    );
    const earthMaterial = new THREE.MeshPhongMaterial({
      color: 0x2233ff,
      emissive: 0x112244,
      shininess: 25,
      specular: 0x333333
    });
    this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
    this.earth.position.x = SCALE.EARTH_ORBIT;
    this.earth.castShadow = false;
    this.earth.receiveShadow = false;
    this.earthSystem.add(this.earth);
    
    // Moon system (pivot for moon orbit around Earth)
    this.moonSystem = new THREE.Group();
    this.moonSystem.position.copy(this.earth.position);
    this.earthSystem.add(this.moonSystem);
    
    // Moon
    const moonGeometry = new THREE.SphereGeometry(
      SCALE.MOON_RADIUS,
      PERFORMANCE_CONFIG.moonSegments,
      PERFORMANCE_CONFIG.moonSegments
    );
    // Moon with realistic material for shadow visualization
    const moonMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      emissive: 0x000000,
      shininess: 1,
      specular: 0x222222
    });
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    this.moon.position.x = SCALE.MOON_ORBIT;
    this.moon.castShadow = false;
    this.moon.receiveShadow = true;  // Moon receives shadows from Sun
    this.moonSystem.add(this.moon);
    
    // Create orbit lines
    this.createOrbitLines();
    
    // Create labels
    this.createLabels();
    
    // Create ground plane for Arizona view
    this.createGroundPlane();
  }

  createOrbitLines() {
    this.orbitLines = new THREE.Group();
    
    // Earth orbit around Sun
    const earthOrbitGeometry = new THREE.BufferGeometry();
    const earthOrbitPoints = [];
    for (let i = 0; i <= PERFORMANCE_CONFIG.orbitSegments; i++) {
      const angle = (i / PERFORMANCE_CONFIG.orbitSegments) * Math.PI * 2;
      earthOrbitPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * SCALE.EARTH_ORBIT,
          0,
          Math.sin(angle) * SCALE.EARTH_ORBIT
        )
      );
    }
    earthOrbitGeometry.setFromPoints(earthOrbitPoints);
    const earthOrbitLine = new THREE.Line(
      earthOrbitGeometry,
      new THREE.LineBasicMaterial({ color: 0x4444ff, opacity: 0.3, transparent: true })
    );
    this.orbitLines.add(earthOrbitLine);
    
    // Moon orbit around Earth
    const moonOrbitGeometry = new THREE.BufferGeometry();
    const moonOrbitPoints = [];
    for (let i = 0; i <= PERFORMANCE_CONFIG.orbitSegments; i++) {
      const angle = (i / PERFORMANCE_CONFIG.orbitSegments) * Math.PI * 2;
      moonOrbitPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * SCALE.MOON_ORBIT,
          0,
          Math.sin(angle) * SCALE.MOON_ORBIT
        )
      );
    }
    moonOrbitGeometry.setFromPoints(moonOrbitPoints);
    this.moonOrbitLine = new THREE.Line(
      moonOrbitGeometry,
      new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.3, transparent: true })
    );
    this.moonOrbitLine.position.copy(this.earth.position);
    this.earthSystem.add(this.moonOrbitLine);
    
    this.scene.add(this.orbitLines);
  }

  createLabels() {
    // Labels handled by HTML overlay UI
    this.labels = new THREE.Group();
    this.scene.add(this.labels);
  }

  createGroundPlane() {
    // Create a ground plane for Earth surface view (Arizona desert)
    const groundGeometry = new THREE.CircleGeometry(5000, 64);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a0f08,  // Dark brown for desert at night
      side: THREE.DoubleSide
    });
    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2; // Horizontal
    this.groundPlane.visible = false; // Hidden by default
    this.scene.add(this.groundPlane);
    
    // Create layered mountain ranges with purple shades
    this.mountainLayers = [];
    
    // Mountain layer configurations: distance, height, purple shade
    const mountainConfigs = [
      { distance: 4500, height: 400, color: 0x2a1b3d, opacity: 0.9 },  // Darkest purple (closest)
      { distance: 4000, height: 350, color: 0x3d2952, opacity: 0.85 }, // Dark purple
      { distance: 3500, height: 300, color: 0x4f3768, opacity: 0.8 },  // Medium purple
      { distance: 3000, height: 250, color: 0x61457e, opacity: 0.75 }, // Light purple
      { distance: 2500, height: 200, color: 0x735394, opacity: 0.7 }   // Lightest purple (farthest)
    ];
    
    mountainConfigs.forEach((config, index) => {
      // Create irregular mountain silhouette using custom geometry
      const segments = 64;
      const points = [];
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const radius = config.distance;
        
        // Create irregular mountain peaks using sine waves
        const peakVariation = Math.sin(angle * 3 + index) * 0.3 + 
                             Math.sin(angle * 7 + index * 2) * 0.2 + 
                             Math.sin(angle * 13 + index * 3) * 0.15;
        const heightVariation = config.height * (0.5 + peakVariation);
        
        // Bottom point (at ground level)
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ));
        
        // Top point (mountain peak)
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          heightVariation,
          Math.sin(angle) * radius
        ));
      }
      
      // Create geometry from points
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      const indices = [];
      
      for (let i = 0; i < segments; i++) {
        const baseIndex = i * 2;
        const nextBaseIndex = ((i + 1) % segments) * 2;
        
        // Add vertices
        vertices.push(
          points[baseIndex].x, points[baseIndex].y, points[baseIndex].z,
          points[baseIndex + 1].x, points[baseIndex + 1].y, points[baseIndex + 1].z
        );
        
        // Create triangles for this segment
        const v0 = baseIndex;
        const v1 = baseIndex + 1;
        const v2 = nextBaseIndex;
        const v3 = nextBaseIndex + 1;
        
        // Two triangles per segment
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      
      const material = new THREE.MeshBasicMaterial({
        color: config.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: config.opacity,
        depthWrite: true  // Enable depth writing so mountains occlude objects behind them
      });
      
      const mountainLayer = new THREE.Mesh(geometry, material);
      mountainLayer.visible = false;
      this.mountainLayers.push(mountainLayer);
      this.scene.add(mountainLayer);
    });
  }

  createEducationalUI() {
    // Create educational overlay
    const infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    infoPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 20px;
      border-radius: 8px;
      max-width: 400px;
      font-family: Arial, sans-serif;
      z-index: 1000;
    `;
    infoPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; color: #4af; font-size: 18px;">🌙 Lunar Phase Education</h3>
        <button id="toggle-info-panel" style="background: #555; color: #fff; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; font-size: 12px;">Hide</button>
      </div>
      <div id="info-panel-content">
        <div id="phase-info">
          <p style="margin: 5px 0;"><strong>Current Phase:</strong> <span id="current-phase">New Moon</span></p>
          <p style="margin: 5px 0; font-size: 13px; line-height: 1.5;"><span id="phase-description">Moon between Earth and Sun</span></p>
        </div>
        <hr style="border: none; border-top: 1px solid #444; margin: 15px 0;">
        <div style="font-size: 12px; line-height: 1.6; color: #ccc;">
          <p style="margin: 8px 0;"><strong>Key Concept:</strong> The Moon doesn't emit light. We only see the part illuminated by the Sun.</p>
          <p style="margin: 8px 0;">☀️ The Sun always lights half of the Moon</p>
          <p style="margin: 8px 0;">🌍 We see different amounts depending on the Moon's position in its orbit</p>
          <p style="margin: 8px 0;">⏱️ Full cycle: ~29.5 days (synodic month)</p>
        </div>
      </div>
    `;
    document.body.appendChild(infoPanel);

    // Add view selector
    const viewPanel = document.createElement('div');
    viewPanel.id = 'view-panel';
    viewPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 15px;
      border-radius: 8px;
      z-index: 1000;
    `;
    viewPanel.innerHTML = `
      <button id="view-space" style="margin: 5px; padding: 10px 15px; background: #4af; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Space View</button>
      <button id="view-earth" style="margin: 5px; padding: 10px 15px; background: #333; color: #fff; border: 1px solid #555; border-radius: 5px; cursor: pointer;">Arizona Sky View</button>
      <div id="earth-view-info" style="display: none; margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px; font-size: 12px;">
        <p style="margin: 5px 0;">📍 Phoenix, Arizona (34°N, 111.9°W)</p>
        <p style="margin: 5px 0;">📅 <span id="current-date">Loading...</span></p>
        <p style="margin: 5px 0;">🕐 Local Time: <span id="local-time">12:00</span></p>
        <p style="margin: 5px 0;"><span id="day-night-indicator">☀️ Day</span></p>
        <p style="margin: 5px 0; font-size: 11px; color: #aaa;">✅ Real astronomical positions</p>
      </div>
    `;
    document.body.appendChild(viewPanel);

    // Phase selector
    const phasePanel = document.createElement('div');
    phasePanel.id = 'phase-panel';
    phasePanel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 15px;
      border-radius: 8px;
      z-index: 1000;
      max-width: 250px;
    `;
    phasePanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h4 style="margin: 0; color: #4af;">Jump to Phase</h4>
        <button id="toggle-phase-panel" style="background: #555; color: #fff; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; font-size: 12px;">Hide</button>
      </div>
      <div id="phase-panel-content">
        <p style="margin: 5px 0 10px 0; font-size: 11px; color: #aaa;">(Disables real position sync)</p>
        ${MOON_PHASES.map((phase, i) => 
          `<button class="phase-btn" data-index="${i}" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #333; color: #fff; border: 1px solid #555; border-radius: 3px; cursor: pointer; text-align: left;">${phase.name}</button>`
        ).join('')}
      </div>
    `;
    document.body.appendChild(phasePanel);
    
    // Toggle phase panel visibility
    document.getElementById('toggle-phase-panel').addEventListener('click', () => {
      const content = document.getElementById('phase-panel-content');
      const toggleBtn = document.getElementById('toggle-phase-panel');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggleBtn.textContent = 'Hide';
      } else {
        content.style.display = 'none';
        toggleBtn.textContent = 'Show';
      }
    });
    
    // Toggle info panel visibility
    document.getElementById('toggle-info-panel').addEventListener('click', () => {
      const content = document.getElementById('info-panel-content');
      const toggleBtn = document.getElementById('toggle-info-panel');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggleBtn.textContent = 'Hide';
      } else {
        content.style.display = 'none';
        toggleBtn.textContent = 'Show';
      }
    });
  }

  setupLighting() {
    // Primary sun light - directional for realistic shadows
    this.sunLight = new THREE.DirectionalLight(0xffffff, 3);
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = true;
    
    // Shadow map settings for quality
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    
    this.scene.add(this.sunLight);
    
    // Minimal ambient light to show the dark side slightly
    this.ambientLight = new THREE.AmbientLight(0x111111, 0.2);
    this.scene.add(this.ambientLight);
    
    // Create a visible sun sphere for Arizona view
    const visibleSunGeometry = new THREE.SphereGeometry(20, 32, 32);
    const visibleSunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 1
    });
    this.visibleSun = new THREE.Mesh(visibleSunGeometry, visibleSunMaterial);
    this.visibleSun.visible = false;
    this.scene.add(this.visibleSun);
  }

  setupControls() {
    // Mouse controls for camera rotation
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.cameraRotation = { x: 0, y: 0 };
    this.cameraDistance = 300;
    
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      
      this.cameraRotation.y += deltaX * 0.005;
      this.cameraRotation.x += deltaY * 0.005;
      
      // Clamp vertical rotation
      this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));
      
      this.updateCameraPosition();
      
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    this.renderer.domElement.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    // Zoom with mouse wheel
    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.1;
      this.cameraDistance = Math.max(50, Math.min(1000, this.cameraDistance));
      this.updateCameraPosition();
    });
    
    // UI Controls
    document.getElementById('time-speed').addEventListener('input', (e) => {
      if (!this.isRealTimeSpeed) {
        this.timeSpeed = parseFloat(e.target.value) / 10;
        document.getElementById('speed-value').textContent = this.timeSpeed.toFixed(1);
      }
    });
    
    document.getElementById('real-time-speed').addEventListener('change', (e) => {
      this.isRealTimeSpeed = e.target.checked;
      if (this.isRealTimeSpeed) {
        document.getElementById('speed-value').textContent = 'Real-Time';
        document.getElementById('time-speed').disabled = true;
        document.getElementById('time-speed').style.opacity = '0.5';
        // Reset to current time when enabling real-time
        this.realStartDate = new Date();
        this.simulationDate = new Date();
      } else {
        this.timeSpeed = parseFloat(document.getElementById('time-speed').value) / 10;
        document.getElementById('speed-value').textContent = this.timeSpeed.toFixed(1);
        document.getElementById('time-speed').disabled = false;
        document.getElementById('time-speed').style.opacity = '1';
      }
    });
    
    document.getElementById('real-positions').addEventListener('change', (e) => {
      this.useRealPositions = e.target.checked;
      if (this.useRealPositions) {
        // Reset to current date/time
        this.simulationDate = new Date();
        this.realStartDate = new Date();
        this.updateRealPositions();
      }
    });
    
    document.getElementById('show-orbits').addEventListener('change', (e) => {
      this.showOrbits = e.target.checked;
      this.orbitLines.visible = this.showOrbits;
      this.moonOrbitLine.visible = this.showOrbits;
    });
    
    document.getElementById('show-labels').addEventListener('change', (e) => {
      this.showLabels = e.target.checked;
      this.labels.visible = this.showLabels;
    });
    
    document.getElementById('reset-camera').addEventListener('click', () => {
      this.cameraRotation = { x: 0, y: 0 };
      this.cameraDistance = 300;
      this.updateCameraPosition();
    });
    
    document.getElementById('toggle-pause').addEventListener('click', (e) => {
      this.isPaused = !this.isPaused;
      e.target.textContent = this.isPaused ? 'Resume' : 'Pause';
    });

    // View switching
    document.getElementById('view-space').addEventListener('click', (e) => {
      this.showEarthView = false;
      document.getElementById('view-space').style.background = '#4af';
      document.getElementById('view-space').style.color = '#000';
      document.getElementById('view-earth').style.background = '#333';
      document.getElementById('view-earth').style.color = '#fff';
      document.getElementById('earth-view-info').style.display = 'none';
      this.stars.visible = true;
      this.sun.visible = true;
      this.sunGlow.visible = true;
      this.earth.visible = true;
      this.orbitLines.visible = this.showOrbits;
      this.groundPlane.visible = false;
      this.mountainLayers.forEach(layer => layer.visible = false);
      this.scene.background = new THREE.Color(0x000000);
      this.updateCameraView();
    });

    document.getElementById('view-earth').addEventListener('click', (e) => {
      this.showEarthView = true;
      document.getElementById('view-earth').style.background = '#4af';
      document.getElementById('view-earth').style.color = '#000';
      document.getElementById('view-space').style.background = '#333';
      document.getElementById('view-space').style.color = '#fff';
      document.getElementById('earth-view-info').style.display = 'block';
      this.updateCameraView();
    });

    // Phase selection
    document.querySelectorAll('.phase-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        // Disable real positions when manually jumping phases
        this.useRealPositions = false;
        document.getElementById('real-positions').checked = false;
        this.jumpToPhase(index);
      });
    });
    
    // Spacebar to toggle pause
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        this.isPaused = !this.isPaused;
        document.getElementById('toggle-pause').textContent = this.isPaused ? 'Resume' : 'Pause';
      }
    });
  }

  updateCameraPosition() {
    const x = this.cameraDistance * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
    const y = this.cameraDistance * Math.sin(this.cameraRotation.x);
    const z = this.cameraDistance * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
    
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  initializeRealPositions() {
    // Set initial positions based on current date/time
    this.updateRealPositions();
  }

  updateRealPositions() {
    if (!this.useRealPositions) return;
    
    // Calculate Julian Date
    const jd = this.dateToJulianDate(this.simulationDate);
    
    // Calculate Sun position (simplified)
    const sunPos = this.calculateSunPosition(jd);
    
    // Calculate Moon position
    const moonPos = this.calculateMoonPosition(jd);
    
    // Set Earth rotation based on current time
    const hours = this.simulationDate.getUTCHours() + this.simulationDate.getUTCMinutes() / 60;
    const earthRotation = (hours / 24) * Math.PI * 2;
    this.earth.rotation.y = earthRotation;
    
    // Set Earth position in orbit (day of year)
    const dayOfYear = this.getDayOfYear(this.simulationDate);
    const earthOrbitAngle = (dayOfYear / 365.25) * Math.PI * 2;
    this.earthSystem.rotation.y = earthOrbitAngle;
    
    // Set Moon position in orbit
    this.moonSystem.rotation.y = moonPos.angle;
    this.moon.rotation.y = moonPos.angle; // Tidally locked
    
    // Update moon orbit line
    this.moonOrbitLine.position.copy(this.earth.position);
    
    // Calculate local time
    const longitudeOffset = this.arizonaLongitude / 15;
    this.localTime = (hours + longitudeOffset) % 24;
    if (this.localTime < 0) this.localTime += 24;
  }

  updatePhysics() {
    if (this.isPaused) return;
    
    this.deltaTime = this.clock.getDelta();
    
    if (this.useRealPositions) {
      // Update simulation date based on speed
      if (this.isRealTimeSpeed) {
        // Real-time: advance date by actual elapsed time
        const now = new Date();
        const elapsedMs = now.getTime() - this.realStartDate.getTime();
        this.simulationDate = new Date(this.realStartDate.getTime() + elapsedMs);
      } else {
        // Accelerated time: advance date faster
        const msPerSecond = 1000;
        const timeMultiplier = this.timeSpeed * 3600; // Convert speed to hours per second
        this.simulationDate = new Date(this.simulationDate.getTime() + this.deltaTime * msPerSecond * timeMultiplier);
      }
      
      // Update positions based on real astronomical calculations
      this.updateRealPositions();
      
      // Rotate sun for visual effect
      this.sun.rotation.y += 0.01 * this.timeSpeed;
    } else {
      // Manual mode - use old physics
      let speed, earthRotSpeed, earthOrbitSpeed, moonOrbitSpeed;
      
      if (this.isRealTimeSpeed) {
        earthRotSpeed = SPEEDS.REAL_TIME_EARTH_ROTATION * this.deltaTime * 60;
        earthOrbitSpeed = SPEEDS.REAL_TIME_EARTH_ORBIT * this.deltaTime * 60;
        moonOrbitSpeed = SPEEDS.REAL_TIME_MOON_ORBIT * this.deltaTime * 60;
        speed = this.deltaTime * 60;
      } else {
        speed = this.timeSpeed;
        earthRotSpeed = SPEEDS.EARTH_ROTATION * speed;
        earthOrbitSpeed = SPEEDS.EARTH_ORBIT * speed;
        moonOrbitSpeed = SPEEDS.MOON_ORBIT * speed;
      }
      
      this.sun.rotation.y += 0.01 * speed;
      this.earthSystem.rotation.y += earthOrbitSpeed;
      this.earth.rotation.y += earthRotSpeed;
      this.moonSystem.rotation.y += moonOrbitSpeed;
      this.moon.rotation.y += moonOrbitSpeed;
      this.moonOrbitLine.position.copy(this.earth.position);
      
      const earthAngle = this.earth.rotation.y;
      const longitudeOffset = this.arizonaLongitude / 15;
      this.localTime = ((earthAngle / (Math.PI * 2)) * 24 + 12 - longitudeOffset) % 24;
      if (this.localTime < 0) this.localTime += 24;
    }

    // Update directional light to always point from Sun
    const moonWorldPos = new THREE.Vector3();
    this.moon.getWorldPosition(moonWorldPos);
    const sunToMoon = moonWorldPos.clone().normalize();
    this.sunLight.position.copy(sunToMoon.clone().multiplyScalar(-100));
    this.sunLight.target = this.moon;
    
    // Update current phase based on moon position
    this.updateCurrentPhase();
  }

  // Astronomical calculation helpers
  dateToJulianDate(date) {
    // Convert JavaScript Date to Julian Date
    const time = date.getTime();
    const jd = (time / 86400000) + 2440587.5;
    return jd;
  }

  getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  calculateSunPosition(jd) {
    // Simplified sun position calculation
    // Based on low-precision formulas
    const n = jd - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360; // Mean longitude
    const g = (357.528 + 0.9856003 * n) % 360; // Mean anomaly
    const gRad = g * Math.PI / 180;
    
    // Ecliptic longitude
    const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
    
    return {
      longitude: lambda,
      distance: 1.0 // AU, simplified
    };
  }

  calculateMoonPosition(jd) {
    // Simplified moon position calculation with latitude
    const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000
    
    // Moon's mean longitude
    const L = (218.316 + 481267.881 * T) % 360;
    
    // Mean elongation of the Moon
    const D = (297.850 + 445267.112 * T) % 360;
    
    // Sun's mean anomaly
    const M = (357.529 + 35999.050 * T) % 360;
    
    // Moon's mean anomaly
    const Mprime = (134.963 + 477198.868 * T) % 360;
    
    // Moon's argument of latitude
    const F = (93.272 + 483202.018 * T) % 360;
    
    // Convert to radians
    const DRad = D * Math.PI / 180;
    const MRad = M * Math.PI / 180;
    const MprimeRad = Mprime * Math.PI / 180;
    const FRad = F * Math.PI / 180;
    
    // Calculate longitude with main periodic terms
    let longitude = L;
    longitude += 6.289 * Math.sin(MprimeRad);
    longitude += 1.274 * Math.sin(2 * DRad - MprimeRad);
    longitude += 0.658 * Math.sin(2 * DRad);
    longitude += 0.214 * Math.sin(2 * MprimeRad);
    longitude += -0.186 * Math.sin(MRad);
    
    longitude = longitude % 360;
    if (longitude < 0) longitude += 360;
    
    // Calculate latitude (distance from ecliptic plane)
    let latitude = 0;
    latitude += 5.128 * Math.sin(FRad);
    latitude += 0.280 * Math.sin(MprimeRad + FRad);
    latitude += 0.277 * Math.sin(MprimeRad - FRad);
    latitude += 0.173 * Math.sin(2 * DRad - FRad);
    
    // Calculate angle relative to Earth-Sun line
    const sunPos = this.calculateSunPosition(jd);
    let moonPhaseAngle = longitude - sunPos.longitude;
    if (moonPhaseAngle < 0) moonPhaseAngle += 360;
    
    return {
      longitude: longitude,
      latitude: latitude,
      angle: (moonPhaseAngle * Math.PI / 180),
      phaseAngle: moonPhaseAngle
    };
  }


  updateCurrentPhase() {
    let normalizedAngle;
    
    if (this.useRealPositions && this.simulationDate) {
      // Use real astronomical calculation
      const jd = this.dateToJulianDate(this.simulationDate);
      const moonPos = this.calculateMoonPosition(jd);
      normalizedAngle = moonPos.phaseAngle;
    } else {
      // Use simulation rotation
      const moonAngle = (this.moonSystem.rotation.y * 180 / Math.PI) % 360;
      normalizedAngle = ((moonAngle % 360) + 360) % 360;
    }
    
    // Find closest phase
    let closestIndex = 0;
    let minDiff = 360;
    MOON_PHASES.forEach((phase, index) => {
      let diff = Math.abs(normalizedAngle - phase.angle);
      if (diff > 180) diff = 360 - diff;
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });
    
    if (closestIndex !== this.currentPhaseIndex) {
      this.currentPhaseIndex = closestIndex;
      document.getElementById('current-phase').textContent = MOON_PHASES[closestIndex].name;
      document.getElementById('phase-description').textContent = MOON_PHASES[closestIndex].description;
    }
  }

  jumpToPhase(phaseIndex) {
    const phase = MOON_PHASES[phaseIndex];
    const targetAngle = phase.angle * Math.PI / 180;
    this.moonSystem.rotation.y = targetAngle;
    this.currentPhaseIndex = phaseIndex;
    document.getElementById('current-phase').textContent = phase.name;
    document.getElementById('phase-description').textContent = phase.description;
  }

  updateCameraView() {
    if (this.showEarthView) {
      // Arizona sky view with day/night cycle
      // Hide space objects
      this.sun.visible = false;
      this.sunGlow.visible = false;
      this.earth.visible = false;
      this.orbitLines.visible = false;
      
      // Show ground plane, mountain layers, and moon for Earth view
      this.groundPlane.visible = true;
      this.mountainLayers.forEach(layer => layer.visible = true);
      this.moon.visible = true; // Moon should be visible in Arizona view
      
      // Will be updated per frame in animate()
      this.updateArizonaSky();
      
      // Position ground plane and mountains at a fixed location (once)
      // They represent the fixed landscape from the observer's perspective
      if (!this.arizonaLandscapeInitialized) {
        this.groundPlane.position.set(0, 0, 0);
        this.groundPlane.rotation.x = -Math.PI / 2; // Keep horizontal
        this.groundPlane.rotation.y = 0; // No rotation around Y axis
        this.groundPlane.rotation.z = 0; // No rotation around Z axis
        this.mountainLayers.forEach(layer => {
          layer.position.set(0, 0, 0);
          layer.rotation.set(0, 0, 0); // Ensure no rotation
        });
        this.arizonaLandscapeInitialized = true;
      }
    } else {
      // Reset to space view - show all objects
      this.stars.visible = true;
      this.sun.visible = true;
      this.sunGlow.visible = true;
      this.earth.visible = true;
      this.orbitLines.visible = this.showOrbits;
      this.groundPlane.visible = false;
      this.mountainLayers.forEach(layer => layer.visible = false);
      this.scene.background = new THREE.Color(0x000000);
      
      // Reset moon to original scale and position for space view
      this.moon.scale.set(1, 1, 1);
      this.moon.position.x = SCALE.MOON_ORBIT;
      this.moon.position.y = 0;
      this.moon.position.z = 0;
      
      this.updateCameraPosition();
      this.arizonaLandscapeInitialized = false; // Reset for next time
    }
  }

  calculateMoonAltitudeAzimuth() {
    // Calculate moon's position in the sky for Arizona observer
    const jd = this.dateToJulianDate(this.simulationDate);
    const moonPos = this.calculateMoonPosition(jd);
    
    // Get moon's ecliptic longitude and latitude
    const lambda = moonPos.longitude * Math.PI / 180;  // Ecliptic longitude
    const beta = moonPos.latitude * Math.PI / 180;     // Ecliptic latitude
    
    // Calculate moon's right ascension (RA) and declination (Dec)
    // Proper conversion from ecliptic to equatorial coordinates
    const obliquity = 23.439 * Math.PI / 180; // Obliquity of the ecliptic
    
    // Right ascension - accounting for latitude
    const ra = Math.atan2(
      Math.sin(lambda) * Math.cos(obliquity) - Math.tan(beta) * Math.sin(obliquity),
      Math.cos(lambda)
    );
    
    // Declination - accounting for latitude
    const dec = Math.asin(
      Math.sin(beta) * Math.cos(obliquity) + Math.cos(beta) * Math.sin(obliquity) * Math.sin(lambda)
    );
    
    // Calculate Local Sidereal Time (LST)
    // Simplified formula
    const T = (jd - 2451545.0) / 36525;
    const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T) % 360;
    const lst = (gmst + this.arizonaLongitude) * Math.PI / 180;
    
    // Calculate hour angle
    const hourAngle = lst - ra;
    
    // Observer's latitude in radians
    const latRad = this.arizonaLatitude * Math.PI / 180;
    
    // Calculate altitude (elevation above horizon)
    const sinAlt = Math.sin(latRad) * Math.sin(dec) + 
                   Math.cos(latRad) * Math.cos(dec) * Math.cos(hourAngle);
    const altitude = Math.asin(sinAlt);
    
    // Calculate azimuth (compass direction) using same approach as sun
    // This matches the working sun azimuth calculation
    const cosAz = (Math.sin(dec) - Math.sin(altitude) * Math.sin(latRad)) / 
                  (Math.cos(altitude) * Math.cos(latRad));
    const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
    let azimuth = Math.acos(clampedCosAz);
    
    // Adjust azimuth based on hour angle (same as sun)
    // Before noon/transit: object is in the east (azimuth < 180°)
    // After noon/transit: object is in the west (azimuth > 180°)
    if (hourAngle > 0) {
      azimuth = 2 * Math.PI - azimuth;
    }
    
    return {
      altitude: altitude,
      azimuth: azimuth,
      isAboveHorizon: altitude > 0
    };
  }

  updateArizonaSky() {
    // Calculate if it's day or night based on local time
    const isDaytime = this.localTime >= 6 && this.localTime < 18;
    
    // Update UI with real date/time
    const hours = Math.floor(this.localTime);
    const minutes = Math.floor((this.localTime % 1) * 60);
    document.getElementById('local-time').textContent = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    // Update date display
    const dateStr = this.simulationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    document.getElementById('current-date').textContent = dateStr;
    
    document.getElementById('day-night-indicator').textContent = 
      isDaytime ? '☀️ Day' : '🌙 Night';
    
    // Interpolate sky color based on time
    let skyColor, ambientIntensity;
    
    if (isDaytime) {
      // Daytime sky - Arizona blue
      const noonIntensity = Math.cos((this.localTime - 12) * Math.PI / 12);
      skyColor = new THREE.Color(
        0.4 + noonIntensity * 0.2,
        0.6 + noonIntensity * 0.2,
        0.9 + noonIntensity * 0.1
      );
      ambientIntensity = 0.8 + noonIntensity * 0.2;
      this.stars.visible = false;
      this.visibleSun.visible = true;
    } else {
      // Nighttime sky
      skyColor = new THREE.Color(0x000511);
      ambientIntensity = 0.15;
      this.stars.visible = true;
      this.visibleSun.visible = false;
    }
    
    // Transition at sunrise/sunset (golden hour)
    if ((this.localTime >= 5 && this.localTime < 7) || 
        (this.localTime >= 17 && this.localTime < 19)) {
      const transitionPhase = this.localTime < 12 ? 
        (this.localTime - 5) / 2 : 
        (19 - this.localTime) / 2;
      
      const nightColor = new THREE.Color(0x000511);
      const dayColor = new THREE.Color(0.5, 0.7, 0.9);
      const sunsetColor = new THREE.Color(0.8, 0.4, 0.2);
      
      // Blend through sunset colors
      if (transitionPhase < 0.5) {
        skyColor = nightColor.clone().lerp(sunsetColor, transitionPhase * 2);
        ambientIntensity = 0.15 + transitionPhase * 0.5;
        this.stars.visible = true;
        this.visibleSun.visible = true;
      } else {
        skyColor = sunsetColor.clone().lerp(dayColor, (transitionPhase - 0.5) * 2);
        ambientIntensity = 0.4 + (transitionPhase - 0.5) * 0.8;
        this.stars.visible = transitionPhase < 0.7;
        this.visibleSun.visible = true;
      }
    }
    
    this.scene.background = skyColor;
    this.ambientLight.intensity = ambientIntensity;
    
    // Position visible sun in sky based on time
    if (this.visibleSun.visible) {
      const earthWorldPos = new THREE.Vector3();
      this.earth.getWorldPosition(earthWorldPos);
      
      // Get day of year for solar declination calculation
      const dayOfYear = this.getDayOfYear(this.simulationDate);
      
      // Calculate solar declination (angle of sun relative to equator)
      // Varies from -23.5° (winter solstice) to +23.5° (summer solstice)
      const declination = -23.5 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) * Math.PI / 180;
      
      // Hour angle: negative in morning (east), 0 at noon, positive in afternoon (west)
      // 15° per hour (360° / 24 hours)
      const hourAngle = (this.localTime - 12) * 15 * Math.PI / 180;
      
      // Observer's latitude in radians
      const latRad = this.arizonaLatitude * Math.PI / 180;
      
      // Calculate solar altitude (elevation above horizon)
      // Using the solar altitude formula
      const sinAltitude = Math.sin(latRad) * Math.sin(declination) + 
                         Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
      const altitude = Math.asin(sinAltitude);
      
      // Calculate solar azimuth (compass direction)
      // Using the solar azimuth formula
      const cosAzimuth = (Math.sin(declination) - Math.sin(altitude) * Math.sin(latRad)) / 
                         (Math.cos(altitude) * Math.cos(latRad));
      
      // Clamp to prevent numerical errors
      const clampedCosAzimuth = Math.max(-1, Math.min(1, cosAzimuth));
      let azimuth = Math.acos(clampedCosAzimuth);
      
      // Adjust azimuth based on time of day
      // Before noon (morning): sun is in the east (azimuth < 180°)
      // After noon (afternoon): sun is in the west (azimuth > 180°)
      if (hourAngle > 0) {
        azimuth = 2 * Math.PI - azimuth; // Afternoon: reflect to west side
      }
      
      // Convert to Cartesian coordinates
      // Azimuth: 0° = North, 90° = East, 180° = South, 270° = West
      // Camera looks south, so rotate coordinate system by 90° to align correctly
      const sunDistance = 3000;
      
      // Convert altitude and azimuth to 3D position
      // Astronomical: 0°=North, 90°=East, 180°=South, 270°=West
      // Three.js: +X=East, -X=West, +Z=South, -Z=North
      // Formula: X = r*cos(alt)*sin(az), Z = r*cos(alt)*cos(az-180°)
      const sunX = sunDistance * Math.cos(altitude) * Math.sin(azimuth);
      const sunY = sunDistance * Math.sin(altitude);
      const sunZ = sunDistance * Math.cos(altitude) * Math.cos(azimuth - Math.PI);
      
      // Position sun relative to fixed landscape origin
      this.visibleSun.position.set(sunX, sunY, sunZ);
    }
  }


  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update physics
    this.updatePhysics();
    
    // Update camera if in Earth view mode (Arizona sky)
    if (this.showEarthView) {
      // Update sky conditions
      this.updateArizonaSky();
      
      // Ultra-simple approach: Moon follows same path as sun, just offset by its phase
      // This guarantees correct east-to-west movement
      
      const moonDistance = 6000;
      
      // Get moon phase to determine offset from sun
      const jd = this.dateToJulianDate(this.simulationDate);
      const moonPos = this.calculateMoonPosition(jd);
      const phaseAngleDeg = moonPos.phaseAngle; // 0-360 degrees
      
      // Moon is offset from sun by its phase angle
      // Full moon (180°) = opposite sun (12 hours offset)
      // New moon (0°) = near sun (0 hours offset)
      const hoursOffset = (phaseAngleDeg / 360) * 24;
      const moonLocalTime = (this.localTime + hoursOffset) % 24;
      
      // Calculate moon position exactly like sun, but at offset time
      const dayOfYear = this.getDayOfYear(this.simulationDate);
      const declination = -23.5 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10)) * Math.PI / 180;
      const moonHourAngle = (moonLocalTime - 12) * 15 * Math.PI / 180;
      const latRad = this.arizonaLatitude * Math.PI / 180;
      
      const sinAltitude = Math.sin(latRad) * Math.sin(declination) + 
                         Math.cos(latRad) * Math.cos(declination) * Math.cos(moonHourAngle);
      const altitude = Math.asin(sinAltitude);
      
      const cosAzimuth = (Math.sin(declination) - Math.sin(altitude) * Math.sin(latRad)) / 
                         (Math.cos(altitude) * Math.cos(latRad));
      const clampedCosAzimuth = Math.max(-1, Math.min(1, cosAzimuth));
      let azimuth = Math.acos(clampedCosAzimuth);
      
      if (moonHourAngle > 0) {
        azimuth = 2 * Math.PI - azimuth;
      }
      
      // Same coordinate conversion as sun
      const moonX = moonDistance * Math.cos(altitude) * Math.sin(azimuth);
      const moonY = moonDistance * Math.sin(altitude);
      const moonZ = moonDistance * Math.cos(altitude) * Math.cos(azimuth - Math.PI);
      
      this.moon.position.set(moonX, moonY, moonZ);
      this.moon.visible = altitude > 0;
      
      // Scale moon to match sun's apparent size in the sky (same angular size)
      // Sun is radius 20 at distance 3000, Moon should be scaled proportionally at distance 6000
      const sunAngularSize = 20 / 3000;  // Sun's angular size
      const moonScaleForSameSize = (moonDistance * sunAngularSize) / SCALE.MOON_RADIUS;
      this.moon.scale.set(moonScaleForSameSize, moonScaleForSameSize, moonScaleForSameSize);
      
      // Apply correct moon phase rotation
      // The phase angle determines how much of the moon is illuminated
      const phaseAngle = moonPos.phaseAngle * Math.PI / 180;
      this.moon.rotation.y = phaseAngle;
      
      // Position camera at fixed ground level (observer's position on landscape)
      this.camera.position.set(0, 2, 0); // Slightly above ground at origin
      
      // Look at a fixed direction (south, slightly upward) so horizon stays still
      // This simulates standing on Earth and looking at the sky
      // User sees celestial objects move across the sky, but the horizon/mountains stay fixed
      this.camera.lookAt(new THREE.Vector3(0, 50, 100)); // Looking south and slightly up
      
      // Adjust field of view for more realistic sky viewing
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();
    } else {
      // Reset FOV for space view
      this.camera.fov = 45;
      this.camera.updateProjectionMatrix();
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CelestialSimulation();
  });
} else {
  new CelestialSimulation();
}
