# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an educational Three.js-based celestial simulation that demonstrates lunar phases, day/night cycles, and astronomical positioning. The simulation targets 8K resolution at 60fps and includes real astronomical calculations to sync with actual celestial positions.

## Development Commands

### Development Server
```bash
npm run dev
```
Starts Vite dev server on port 3000, automatically opens browser.

### Production Build
```bash
npm run build
```
Creates optimized production build using Terser minification with manual chunk splitting for Three.js.

### Production Preview
```bash
npm run preview
```
Previews the production build locally.

## Architecture

### Single-File Application Structure
The entire simulation lives in `main.js` (~1235 lines) with a single `CelestialSimulation` class that manages:

- **Scene Management**: Three.js scene, camera, renderer, and lighting setup
- **Celestial Objects**: Sun, Earth, Moon with scaled geometries
- **View Modes**: 
  - Space view (external observer perspective)
  - Arizona ground view (ground-level sky simulation with day/night cycle)
- **Astronomical Calculations**: Real position calculations using Julian dates
- **UI System**: DOM-based overlay controls and educational panels

### Key Class Structure (`CelestialSimulation`)

**State Management**:
- `isPaused`: Animation state
- `timeSpeed`: Simulation speed multiplier (0.0-10.0x)
- `isRealTimeSpeed`: Boolean for real-time mode (1 sec = 1 sec)
- `useRealPositions`: Toggle for astronomical calculations vs. manual control
- `showEarthView`: Toggle between space/ground views
- `simulationDate`: Current date/time being simulated

**Core Methods**:
- `createObjects()`: Instantiates Sun, Earth, Moon geometries with optimized segments
- `setupLighting()`: Configures directional sun light and ambient lighting
- `createEducationalUI()`: Builds DOM overlay panels for phase info and controls
- `updatePhysics()`: Main physics loop - handles both real astronomical positioning and manual simulation modes
- `updateRealPositions()`: Calculates and applies real celestial positions from astronomical algorithms
- `updateArizonaSky()`: Manages ground view day/night cycle, sky colors, and sun position

**Astronomical Calculation Methods**:
- `dateToJulianDate(date)`: Converts JavaScript Date to Julian Date
- `calculateSunPosition(jd)`: Low-precision sun ecliptic longitude (~1° accuracy)
- `calculateMoonPosition(jd)`: Moon position with periodic terms (~0.5° accuracy)
- `calculateMoonAltitudeAzimuth()`: Converts moon position to altitude/azimuth for ground observer

### Configuration Constants

Located at top of `main.js`:
- `SCALE`: Size ratios for Sun/Earth/Moon and orbital distances (NOT to real scale)
- `SPEEDS`: Rotation and orbital speed multipliers
- `MOON_PHASES`: Array of 8 phases with angles and descriptions
- `PERFORMANCE_CONFIG`: Renderer settings, geometry segments, antialiasing

### View Mode Details

**Space View**:
- Shows complete solar system with orbits
- Starfield background
- Mouse drag to rotate camera, mouse wheel to zoom
- Earth orbits Sun, Moon orbits Earth

**Arizona Sky View**:
- Ground-level perspective from Phoenix, AZ (34°N, 111.9°W)
- Realistic sky color transitions (day/night/golden hour)
- Layered purple mountain silhouettes on horizon
- Accurate solar path based on latitude, date, and time
- Shows actual moon position in sky using altitude/azimuth calculations

## Important Implementation Details

### Performance Optimizations
The simulation is designed for 8K @ 60fps:
- Uses `powerPreference: 'high-performance'` for GPU acceleration
- LOD-based sphere segments (Sun: 64, Earth: 64, Moon: 64)
- Logarithmic depth buffer to prevent z-fighting at large scales
- Shadow map rendering enabled but configurable
- BufferGeometry throughout for GPU efficiency

### Dual Time Systems
The simulation supports two distinct modes controlled by `useRealPositions`:

1. **Real Astronomical Mode** (`useRealPositions = true`):
   - Uses `simulationDate` to calculate actual Sun/Moon positions
   - Calls `updateRealPositions()` which invokes astronomical algorithms
   - Time advances based on `timeSpeed` or real-time if `isRealTimeSpeed = true`

2. **Manual Mode** (`useRealPositions = false`):
   - Traditional animation loop with rotation increments
   - Controlled by `SPEEDS` constants
   - Used when user manually jumps to phases

### Shadow and Lighting System
- Directional light (`sunLight`) dynamically positioned to always point from Sun to Moon
- Light target set to Moon mesh for accurate shadow casting
- Ambient light provides minimal fill light (0.2 intensity) to show dark side
- In Arizona view, ambient intensity varies with time of day

### HTML/DOM Integration
All UI is created dynamically in `createEducationalUI()` with inline styles:
- Info panel (bottom-left): Shows current phase and educational content
- View panel (bottom-right): View mode switcher and date/time display
- Phase panel (top-left): Jump to any of 8 lunar phases
- Controls panel (top-right): Speed, pause, orbit/label toggles

## Key Dependencies

- **Three.js** (v0.160.0): Core 3D rendering engine
- **Vite** (v5.0.0): Dev server and build tool

## Common Development Scenarios

### Adding New Celestial Bodies
1. Create geometry in `createObjects()` with appropriate segments from `PERFORMANCE_CONFIG`
2. Add to scene hierarchy (use `THREE.Group` for orbit pivots)
3. Update `updatePhysics()` to handle rotations/orbits
4. If adding astronomical accuracy, implement calculation method following pattern of `calculateMoonPosition()`

### Modifying Astronomical Calculations
Astronomical functions are between lines ~817-1033 in `main.js`:
- Follow existing pattern of Julian Date → ecliptic coordinates → local coordinates
- Test against real ephemeris data for accuracy
- Remember to handle angle wrapping (0-360°) and coordinate system conversions

### Adjusting Performance
- Modify `PERFORMANCE_CONFIG.sunSegments`, `earthSegments`, `moonSegments` to trade quality for speed
- Toggle `renderer.shadowMap.enabled` for significant performance gain
- Adjust `maxPixelRatio` to limit resolution scaling

### UI Modifications
- All UI elements created in `createEducationalUI()` using inline styles
- Event listeners wired in `setupControls()`
- Update element IDs in both creation and event handlers

## Code Style

- ES6 modules with `import`/`export`
- Class-based architecture (single `CelestialSimulation` class)
- Three.js objects stored as instance properties
- Extensive inline comments explaining astronomical concepts
- Constants in UPPER_CASE at file top
- Method names in camelCase with descriptive verbs

## Testing Astronomical Accuracy

To verify astronomical calculations:
1. Check current moon phase against real sky or apps like SkySafari
2. Compare sunrise/sunset times with NOAA solar calculator for Phoenix, AZ
3. Verify moon altitude/azimuth against planetarium software
4. Current accuracy targets: Sun ~1°, Moon ~0.5°

## Educational Context

This simulation is designed to:
- Demonstrate why lunar phases occur (illumination + perspective)
- Show that celestial mechanics follow simple physical laws
- Provide visual proof of spherical Earth/Moon/Sun
- Teach difference between observer perspective and absolute position
- Make astronomical time scales tangible with real-time mode
