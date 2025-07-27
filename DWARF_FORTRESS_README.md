# 🏔️ Dwarf Fortress-Style World Generation System

This document describes the completely rewritten world generation and rendering system that creates dense, detailed worlds inspired by Dwarf Fortress.

## Overview

The new system replaces the previous FMGWorldGenerator with a comprehensive Dwarf Fortress-style world generation engine that creates:

- **Dense ASCII Worlds**: Every tile is represented with meaningful ASCII characters
- **Complex Terrain**: Mountains, rivers, lakes, forests, and diverse biomes
- **Civilizations**: Multiple competing civilizations with different types (dwarven, human, elven, etc.)
- **Settlements**: Cities, towns, villages, fortresses, and trading posts
- **Infrastructure**: Roads connecting settlements, cave systems, and natural features
- **Rich History**: Historical events and world lore generation

## Architecture

### Core Components

1. **DwarfFortressWorldGenerator** (`src/core/world/DwarfFortressWorldGenerator.ts`)
   - Generates complete world data including terrain, civilizations, and features
   - Uses procedural generation with noise functions for realistic terrain
   - Creates interconnected systems (rivers flow downhill, roads connect settlements)

2. **DwarfFortressRenderer** (`src/core/world/DwarfFortressRenderer.ts`)
   - Renders the world in dense ASCII format with proper colors
   - Supports multiple zoom levels and camera controls
   - Efficient tile caching and viewport culling

3. **SimulationView** (`src/components/SimulationView.tsx`)
   - Complete rewrite of the main simulation interface
   - Dwarf Fortress-style configuration panel
   - Real-time rendering with camera controls

## World Generation Features

### Terrain Generation
- **Elevation Maps**: Multi-octave noise for realistic mountain ranges and valleys
- **Climate Zones**: Temperature and rainfall based on latitude and elevation
- **Biome Determination**: Forests, grasslands, deserts, tundra, and alpine regions
- **Water Systems**: Rivers that flow downhill and lakes in low-lying areas

### Civilization System
- **Multiple Types**: Dwarven, Human, Elven, Goblin, and Orcish civilizations
- **Territory Management**: Each civilization claims territory and builds settlements
- **Technology Levels**: Different civilizations have varying technological advancement
- **Relations**: Inter-civilization relationships and conflicts

### Settlement Generation
- **Settlement Types**: Capitals, cities, towns, villages, hamlets, fortresses, monasteries, trading posts
- **Strategic Placement**: Settlements placed based on resources, terrain, and accessibility
- **Population Dynamics**: Realistic population sizes based on settlement type and location
- **Infrastructure**: Roads automatically connect settlements

### Resource System
- **Mineral Deposits**: Stone, metal, and precious materials
- **Agricultural Resources**: Fertile soil and water availability
- **Strategic Resources**: Important locations for trade and conflict

## ASCII Rendering System

### Tile Representation
Each tile is represented with a specific ASCII character and color:

```
. - Grass (green)
♣ - Forest (dark green)
^ - Mountain (gray)
~ - Water (blue)
· - Desert (tan)
# - Urban (gray)
≈ - Farm (light green)
= - Road (brown)
n - Hills (olive)
† - Ruins (gray)
◊ - Capital (gold)
$ - Trade Hub (gold)
⌂ - Building (gray)
☩ - Temple (gold)
@ - Agent (green)
```

### Color System
- **Terrain Colors**: Based on biome type and elevation
- **Temperature Effects**: Blue tint for cold areas, orange for hot
- **Elevation Effects**: Darker colors for high elevations
- **Dynamic Lighting**: Simulated based on position and time

### Rendering Features
- **Viewport Culling**: Only renders visible tiles for performance
- **Tile Caching**: Caches tile appearance for efficiency
- **Multi-layer Rendering**: Terrain, features, and entities rendered separately
- **Smooth Camera**: Pan and zoom with mouse controls

## Configuration Options

### World Settings
- **Size**: Configurable world width and height (100-400 tiles)
- **Seed**: Random seed for reproducible generation
- **Scale Factors**: Control terrain detail and feature density

### Terrain Generation
- **Mountain Ranges**: Number and intensity of mountain systems
- **River Count**: Number of major rivers to generate
- **Lake Count**: Number of lakes and water bodies
- **Cave Systems**: Underground cave networks

### Civilization Settings
- **Civilization Count**: Number of competing civilizations
- **Settlement Density**: How densely populated the world is
- **Road Density**: How connected settlements are

### Resource Settings
- **Mineral Richness**: Abundance of stone and metal deposits
- **Soil Fertility**: Agricultural potential of the land
- **Water Availability**: Access to water resources

## Usage

### Starting a New World
1. Open the application
2. Configure world settings in the Dwarf Fortress Configuration Panel
3. Click "Start Dwarf Fortress Simulation"
4. Explore the generated world using mouse controls

### Camera Controls
- **Pan**: Click and drag to move the camera
- **Zoom**: Scroll wheel to zoom in/out
- **Recenter**: Click the "Recenter" button to return to world center
- **Minimap**: Click on the minimap to jump to locations

### View Options
- **Grid**: Toggle grid overlay
- **Resources**: Show/hide resource indicators
- **Structures**: Show/hide buildings and structures
- **Agents**: Show/hide individual agents
- **Rivers**: Show/hide river systems
- **Roads**: Show/hide road networks
- **Settlements**: Show/hide settlement markers
- **Labels**: Show/hide location names

## Technical Details

### Performance Optimizations
- **Tile Caching**: Cached tile appearance calculations
- **Viewport Culling**: Only render visible tiles
- **Efficient Rendering**: Canvas-based rendering with minimal redraws
- **Memory Management**: Proper cleanup of world data

### Data Structures
- **WorldTile**: Individual tile with terrain, resources, and features
- **DFCivilization**: Civilization data with territory and relationships
- **DFSettlement**: Settlement information and buildings
- **DFRiver/DFLake**: Water system data
- **DFRoad**: Road network connections

### Extensibility
The system is designed to be easily extensible:
- New terrain types can be added to the biome system
- Additional civilization types can be implemented
- New settlement types and buildings can be created
- Custom rendering styles can be added

## Future Enhancements

### Planned Features
- **Weather Systems**: Dynamic weather patterns and seasons
- **Trade Networks**: Complex economic systems between settlements
- **Military Systems**: Armies, battles, and conquest mechanics
- **Cultural Evolution**: Languages, religions, and cultural development
- **Technology Trees**: Civilization advancement and research
- **Natural Disasters**: Volcanoes, earthquakes, and other events

### Performance Improvements
- **WebGL Rendering**: Hardware-accelerated rendering for larger worlds
- **Multi-threading**: Parallel world generation for faster startup
- **LOD System**: Level-of-detail rendering for different zoom levels
- **Compression**: Efficient storage of large world data

## Troubleshooting

### Common Issues
1. **Slow Generation**: Large worlds (>300x300) may take time to generate
2. **Memory Usage**: Very large worlds may require significant memory
3. **Rendering Issues**: Ensure your browser supports Canvas 2D rendering

### Performance Tips
- Use smaller world sizes for faster generation
- Disable unnecessary view options (labels, grid)
- Close other browser tabs to free up memory
- Use the minimap for long-distance navigation

## Conclusion

The new Dwarf Fortress-style world generation system provides a rich, detailed foundation for complex simulations. The dense ASCII representation and comprehensive world generation create an immersive experience that captures the depth and complexity of Dwarf Fortress while maintaining good performance and usability.

The system is designed to be both powerful and accessible, allowing users to create and explore detailed worlds with minimal configuration while providing advanced options for customization. 