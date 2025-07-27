# Dwarf Fortress World Generation System

## Overview

This document describes the enhanced world generation system for the Dwarf Fortress-inspired simulation, featuring the Diamond-Square algorithm for realistic terrain generation, sophisticated river and lake systems, and dynamic continent/island formation.

## Phase 1: The Primal Landmass - Continents, Islands, and Oceans

### Diamond-Square Algorithm Implementation

The foundation of the world generation system is the **Diamond-Square algorithm** (also known as the midpoint displacement algorithm), which creates realistic fractal terrain with natural-looking coastlines.

#### How It Works

1. **Initial Setup**: The algorithm starts with a 2D grid representing the world map, with the four corner points assigned random initial elevation values.

2. **Diamond Step**: The center point of the grid is calculated by averaging the four corner values and adding a small, random amount. This creates a diamond shape with the initial corners and the new center point.

3. **Square Step**: The elevation of the center points of the four edges is calculated by averaging the nearest existing points and adding random values.

4. **Recursion**: This diamond-and-square process is repeated recursively on smaller sub-quadrants, with the magnitude of random values reduced at each iteration.

5. **Heightmap Creation**: The recursive process continues until the entire grid is filled with elevation points, creating a fractal heightmap.

6. **Sea Level Application**: A crucial threshold defines the "sea level" - any point below this becomes ocean, while points above become land, creating the fundamental shapes of continents and islands.

#### Key Features

- **Fractal Terrain**: Natural-looking coastlines and elevation changes
- **Configurable Sea Level**: Adjustable threshold for land/water distribution
- **Continent Identification**: Automatic detection and classification of landmasses
- **Island Generation**: Dynamic creation of various island types (continental, volcanic, coral, mountainous)

### Configuration Parameters

```typescript
interface DwarfFortressConfig {
  // World generation parameters
  seaLevel: number;        // Threshold for land vs ocean (0.0 to 1.0)
  continentCount: number;  // Number of major continents to generate
  islandDensity: number;   // Density of smaller islands (0.0 to 1.0)
  elevationScale: number;  // Scale factor for elevation generation
  temperatureScale: number; // Scale factor for temperature generation
  rainfallScale: number;   // Scale factor for rainfall generation
}
```

## Phase 2: The Flow of Life - Enhanced River and Lake Systems

### River Generation

The enhanced river system simulates realistic hydrology with the following features:

#### River Sources
- **High Elevation Detection**: Rivers start from local elevation maxima (mountains, hills)
- **Natural Distribution**: Rivers are distributed across the landscape based on elevation patterns
- **Source Validation**: Only suitable high-elevation areas become river sources

#### Pathfinding and Flow
- **Downhill Flow**: Rivers follow the path of steepest descent using A* pathfinding
- **Terrain Carving**: Rivers modify the terrain as they flow, creating valleys and channels
- **Erosion Simulation**: River valleys are carved into the landscape with realistic erosion effects

#### Enhanced River Features
- **Tributaries**: Smaller rivers that join larger ones, creating realistic river networks
- **River Basins**: Watershed areas that feed into each river system
- **Flow Rates**: Dynamic flow rates based on river size and tributary contributions
- **Seasonal Variation**: Rivers can have seasonal flow variations
- **Navigability**: Large rivers are marked as navigable for transportation

### Lake Generation

The enhanced lake system creates realistic water bodies with the following features:

#### Lake Basin Detection
- **Depression Identification**: Lakes form in natural depressions in the terrain
- **Basin Analysis**: Automatic calculation of lake basins and their characteristics
- **Depth Profiling**: Realistic depth profiles that vary from center to edges

#### Lake Features
- **Inflow/Outflow**: Rivers can flow into and out of lakes
- **Water Types**: Fresh, salt, and magical lakes based on climate and location
- **Volume Calculation**: Accurate lake volumes based on depth profiles
- **Water Quality**: Lakes have varying water quality and fish populations
- **Recreational Value**: Lakes can have different recreational and economic values

### Configuration Parameters

```typescript
// River and Lake Configuration
riverCount: number;        // Number of major rivers to generate
lakeCount: number;         // Number of lakes to generate
waterAvailability: number; // Overall water availability in the world
```

## Data Structures

### Enhanced World Data

```typescript
interface DFWorldData {
  tiles: WorldTile[][];
  heightmap: number[][];           // Raw elevation data
  seaLevel: number;                // Current sea level
  continents: DFContinent[];       // Major landmasses
  islands: DFIsland[];             // Smaller landmasses
  enhancedRivers: DFEnhancedRiver[]; // Advanced river data
  enhancedLakes: DFEnhancedLake[];   // Advanced lake data
  // ... other data
}
```

### Continent Data

```typescript
interface DFContinent {
  id: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  area: number;
  elevation: {
    min: number;
    max: number;
    average: number;
  };
  climate: {
    temperature: number;
    rainfall: number;
  };
  biomes: string[];
  rivers: string[];
  lakes: string[];
  settlements: string[];
  civilizations: string[];
}
```

### Enhanced River Data

```typescript
interface DFEnhancedRiver extends DFRiver {
  source: { x: number; y: number };
  mouth: { x: number; y: number };
  length: number;
  basin: { x: number; y: number; width: number; height: number };
  tributaries: string[];
  flowRate: number;
  seasonalVariation: number;
  navigable: boolean;
  crossings: { x: number; y: number }[];
}
```

### Enhanced Lake Data

```typescript
interface DFEnhancedLake extends DFLake {
  inflow: string[];
  outflow: string | null;
  volume: number;
  seasonalVariation: number;
  depthProfile: { x: number; y: number; depth: number }[];
  waterQuality: number;
  fishPopulation: number;
  recreationalValue: number;
}
```

## Usage

### Basic World Generation

```typescript
import { DwarfFortressWorldGenerator, DwarfFortressConfig } from './DwarfFortressWorldGenerator';

const config: DwarfFortressConfig = {
  width: 1000,
  height: 1000,
  seed: 12345,
  seaLevel: 0.45,
  continentCount: 3,
  islandDensity: 0.4,
  riverCount: 8,
  lakeCount: 5,
  // ... other parameters
};

const generator = new DwarfFortressWorldGenerator(config);
const worldData = generator.generate();
```

### Accessing World Data

```typescript
// Access continents
console.log(`Generated ${worldData.continents.length} continents`);
worldData.continents.forEach(continent => {
  console.log(`${continent.name}: ${continent.area} tiles`);
});

// Access rivers
console.log(`Generated ${worldData.enhancedRivers.length} river systems`);
worldData.enhancedRivers.forEach(river => {
  console.log(`${river.name}: ${river.length.toFixed(1)} units long`);
});

// Access lakes
console.log(`Generated ${worldData.enhancedLakes.length} lakes`);
worldData.enhancedLakes.forEach(lake => {
  console.log(`${lake.name}: ${lake.volume.toFixed(1)} volume`);
});
```

## Performance Considerations

- **Heightmap Caching**: The diamond-square algorithm caches heightmap data for performance
- **Flood Fill Optimization**: Continent and island identification uses optimized flood fill algorithms
- **Pathfinding Efficiency**: River pathfinding uses efficient A* algorithms with early termination
- **Memory Management**: Large worlds are processed in chunks to manage memory usage

## Future Enhancements

- **Plate Tectonics**: Simulate continental drift and mountain formation
- **Climate Simulation**: Dynamic weather patterns and climate zones
- **Erosion Modeling**: More sophisticated erosion and sedimentation
- **Biome Evolution**: Dynamic biome changes over time
- **Underground Systems**: Cave networks and underground rivers

## Testing

Run the test file to verify the world generation system:

```bash
node test_world_generation.js
```

This will generate a test world and display statistics about the generated continents, rivers, and lakes. 