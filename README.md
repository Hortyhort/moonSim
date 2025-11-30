# 🌙 Moon-Earth-Sun Celestial Simulation

An educational, high-performance Three.js simulation demonstrating lunar phases and how the Moon's appearance changes based on its orbital position. Perfect for teaching spherical astronomy and understanding why we see different phases of the Moon.

**✨ Now with REAL astronomical positions!** The simulation synchronizes with the actual date, time, and positions of the Sun and Moon.

**📖 [Read the Educational Guide](EDUCATIONAL_GUIDE.md)** for a complete explanation of lunar phases and how to use this simulation for learning!

**🔭 [Read About Astronomical Accuracy](ASTRONOMICAL_ACCURACY.md)** to understand how real positions are calculated!

## Educational Purpose

This simulation visually demonstrates key astronomical concepts:

- **🌗 Lunar Phases**: See how the Moon's appearance changes throughout its orbit
- **☀️ Solar Illumination**: The Sun always lights half of the Moon - we just see different portions
- **🔭 Perspective Matters**: Switch between space view and Earth view to understand observation
- **🌍 Spherical Reality**: Demonstrates how celestial mechanics work in our spherical cosmos

## Features

- **📚 Educational Overlay**: Real-time phase identification and explanations
- **🎯 Accurate Orbital Mechanics**: Moon orbits Earth, Earth orbits Sun
- **🌓 8 Lunar Phases**: Jump to any phase instantly to study its characteristics
- **👁️ Dual View Modes**: Space view and Arizona ground-level sky view
- **🌅 Day/Night Cycle**: Realistic 24-hour cycle with sunrise, sunset, and golden hour transitions
- **⏰ Real-Time Speed Option**: Watch celestial movements at actual speed (1 second = 1 second)
- **📅 Real Date/Time Sync**: Simulation shows actual positions based on current date and time
- **🌙 Accurate Lunar Phase**: Moon phase matches what you'd see in the real sky RIGHT NOW
- **☀️ Sun Movement**: Accurate solar path across Arizona sky based on latitude and time
- **⚡ Performance Optimized**: Targets 8K (7680x4320) @ 60fps
- **💡 Realistic Lighting**: Directional sun light shows authentic shadow patterns
- **🎮 Interactive Controls**: Mouse drag to rotate camera, scroll to zoom
- **📊 Real-time Stats**: FPS, resolution, draw calls, and triangle count

## Performance Optimizations

This simulation implements several techniques to achieve 8K/60fps:

1. **Geometry Optimization**: LOD-based sphere segments (Sun: 64, Earth: 48, Moon: 32)
2. **Minimal Draw Calls**: Efficient object grouping and geometry batching
3. **High-Performance Renderer**: Configured with `powerPreference: 'high-performance'`
4. **Adaptive Pixel Ratio**: Scales with device capabilities
5. **Logarithmic Depth Buffer**: Prevents z-fighting at large distances
6. **Disabled Shadows**: Trades realism for performance (can be re-enabled)
7. **BufferGeometry**: Uses modern Three.js geometry for GPU efficiency
8. **RequestAnimationFrame**: Synchronized with display refresh rate

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The simulation will open in your browser at `http://localhost:3000`

## Build

Create an optimized production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Controls

### Camera Controls
- **Mouse Drag**: Rotate camera around the solar system
- **Mouse Wheel**: Zoom in/out
- **Reset Camera**: Return to default view

### View Modes
- **Space View** (default): Observe the entire system from an external perspective
- **Arizona Sky View**: Ground-level perspective from Phoenix, Arizona
  - Shows realistic day/night cycle
  - Sun rises in east, sets in west
  - Stars visible at night
  - Beautiful sunrise/sunset transitions with golden hour colors
  - Local time display (24-hour format)

### Simulation Controls
- **Time Speed Slider**: Adjust orbital and rotation speeds (0.0x - 10.0x)
- **Real-Time Speed Checkbox**: Enable actual real-world speed
  - 1 second of simulation = 1 second of real time
  - Perfect for understanding actual celestial movement speeds
  - Earth rotation: 24 hours for full day
  - Moon orbit: 27.3 days to complete
  - Disable to use accelerated time slider
- **Sync to Real Date/Time Checkbox**: Use actual astronomical positions (default: ON)
  - Calculates Sun and Moon positions based on current date
  - Shows today's lunar phase
  - Advances through calendar when time is sped up
  - Disable to manually control positions
- **Pause/Resume**: Freeze/unfreeze the simulation
- **Show Orbits**: Toggle visibility of orbital paths
- **Show Labels**: Toggle celestial body labels

### Phase Jumper
- **Jump to Phase Buttons**: Instantly move to any of the 8 major lunar phases:
  - New Moon
  - Waxing Crescent
  - First Quarter
  - Waxing Gibbous
  - Full Moon
  - Waning Gibbous
  - Last Quarter
  - Waning Crescent

## Astronomical Accuracy

The simulation uses real astronomical algorithms to calculate positions:

- **Julian Date conversion** for time standardization
- **Low-precision Sun position formulas** (accurate to ~1 degree)
- **Moon position with periodic terms** (accurate to ~0.5 degrees)
- **Lunar phase calculation** based on Sun-Moon angular separation
- **Earth rotation** synchronized to UTC time

See [ASTRONOMICAL_ACCURACY.md](ASTRONOMICAL_ACCURACY.md) for detailed technical information.

### What You Can Verify

1. **Check tonight's Moon phase** - it matches the simulation!
2. **Compare sunrise/sunset times** - matches Arizona's actual times
3. **Watch the Moon change** over days - follows real lunar cycle
4. **Predict Full Moons** - accurate to within 1 day

## Technical Details

### Scale

The simulation uses scaled distances and sizes for better visualization:

- Sun Radius: 15 units
- Earth Radius: 4 units
- Moon Radius: 1 unit
- Earth Orbit: 150 units from Sun
- Moon Orbit: 15 units from Earth

### Orbital Speeds

Speeds are scaled for visual effect:

- Earth's orbit around Sun: ~365 days (scaled)
- Moon's orbit around Earth: ~27.3 days (scaled)
- Earth's rotation: 1 day
- Moon's rotation: Tidally locked to orbit

## Browser Requirements

For optimal 8K performance:

- Modern GPU (NVIDIA RTX 3000+ or AMD equivalent)
- Latest Chrome, Firefox, or Edge
- Hardware acceleration enabled
- 8K display or high-resolution monitor

## Performance Monitoring

The simulation displays real-time performance metrics:

- **FPS**: Frames per second (target: 60fps)
- **Resolution**: Actual canvas resolution in pixels
- **Draw Calls**: Number of GPU draw calls per frame (lower is better)
- **Triangles**: Total triangle count being rendered

## Educational Concepts Demonstrated

### Why Do We See Phases?
1. **The Moon doesn't emit light** - it only reflects sunlight
2. **The Sun always illuminates half the Moon** - just like it always lights half of Earth
3. **Our view changes as the Moon orbits** - we see different portions of the lit half
4. **The cycle takes ~29.5 days** - known as a synodic month

### Debunking Flat Earth Misconceptions

This simulation clearly demonstrates:

- **Spherical celestial bodies**: All objects are spheres, visible from all angles
- **Consistent lighting**: The Sun provides directional light that creates realistic phases
- **Orbital mechanics**: Bodies orbit in elliptical paths due to gravity
- **No conspiracy needed**: Simple geometry and physics explain what we observe

### Use Cases

- **Astronomy Education**: Teach lunar phases and day/night cycles in classrooms
- **Science Communication**: Explain celestial mechanics to general audiences
- **Self-Learning**: Understand why the Moon looks different each night
- **Critical Thinking**: Visualize how spherical astronomy actually works
- **Time Perception**: Experience the actual speed of celestial movements with real-time mode
- **Sky Watching**: Predict when the Moon will be visible in Arizona's sky

## Future Enhancements

- [ ] Realistic surface textures (NASA imagery)
- [ ] Eclipse simulation (solar and lunar)
- [ ] Libration effects (Moon's wobble)
- [ ] Time/date display with real lunar calendar
- [ ] Additional planets for full solar system
- [ ] Measurement tools (distances, angles)
- [ ] VR support for immersive learning
- [ ] Export time-lapse animations

## License

MIT
