import { WorldTile, TileType, ResourceType, Resource, TileLevel, FireState } from '../../types/simulation';

export interface DwarfFortressConfig {
  width: number;
  height: number;
  seed: number;
  // World generation parameters
  elevationScale: number;
  temperatureScale: number;
  rainfallScale: number;
  // New parameters for improved world generation
  seaLevel: number; // Threshold for land vs ocean (0.0 to 1.0)
  continentCount: number; // Number of major continents to generate
  islandDensity: number; // Density of smaller islands (0.0 to 1.0)
  mountainRanges: number;
  riverCount: number;
  lakeCount: number;
  forestDensity: number;
  caveSystems: number;
  // Civilization parameters
  civilizationCount: number;
  settlementDensity: number;
  roadDensity: number;
  // Resource parameters
  mineralRichness: number;
  soilFertility: number;
  waterAvailability: number;
}

export interface DFWorldData {
  tiles: WorldTile[][];
  civilizations: DFCivilization[];
  rivers: DFRiver[];
  lakes: DFLake[];
  caves: DFCaveSystem[];
  roads: DFRoad[];
  settlements: DFSettlement[];
  biomes: DFBiome[];
  history: DFHistoricalEvent[];
  // New data structures for improved world generation
  continents: DFContinent[];
  islands: DFIsland[];
  enhancedRivers: DFEnhancedRiver[];
  enhancedLakes: DFEnhancedLake[];
  heightmap: number[][];
  seaLevel: number;
}

export interface DFCivilization {
  id: string;
  name: string;
  type: 'dwarven' | 'human' | 'elven' | 'goblin' | 'orcish';
  capital: { x: number; y: number };
  territory: { x: number; y: number; width: number; height: number }[];
  population: number;
  technology: number;
  wealth: number;
  military: number;
  culture: string;
  religion: string;
  relations: { [civId: string]: number };
}

export interface DFRiver {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  width: number;
  depth: number;
  flow: number;
  tributaries: string[];
  settlements: string[];
}

export interface DFLake {
  id: string;
  name: string;
  center: { x: number; y: number };
  radius: number;
  depth: number;
  waterType: 'fresh' | 'salt' | 'magical';
  settlements: string[];
}

export interface DFCaveSystem {
  id: string;
  name: string;
  entrances: { x: number; y: number }[];
  chambers: DFCaveChamber[];
  depth: number;
  inhabitants: string[];
  resources: ResourceType[];
}

export interface DFCaveChamber {
  id: string;
  center: { x: number; y: number };
  radius: number;
  height: number;
  type: 'cavern' | 'tunnel' | 'chamber' | 'pit';
  features: string[];
}

export interface DFRoad {
  id: string;
  name: string;
  points: { x: number; y: number }[];
  width: number;
  type: 'dirt' | 'stone' | 'paved' | 'magical';
  condition: number;
  settlements: string[];
}

export interface DFSettlement {
  id: string;
  name: string;
  type: 'hamlet' | 'village' | 'town' | 'city' | 'capital' | 'fortress' | 'monastery' | 'trading_post';
  position: { x: number; y: number };
  size: number;
  population: number;
  civilization: string;
  buildings: DFBuilding[];
  walls: boolean;
  gates: number;
  wealth: number;
  defenses: number;
}

export interface DFBuilding {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  material: string;
  condition: number;
  purpose: string;
  occupants: string[];
}

export interface DFBiome {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; height: number };
  temperature: number;
  rainfall: number;
  elevation: number;
  vegetation: string[];
  wildlife: string[];
  resources: ResourceType[];
}

export interface DFHistoricalEvent {
  id: string;
  type: string;
  year: number;
  description: string;
  location: { x: number; y: number };
  participants: string[];
  impact: number;
}

// New interfaces for improved world generation
export interface DFContinent {
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

export interface DFIsland {
  id: string;
  name: string;
  center: { x: number; y: number };
  radius: number;
  area: number;
  elevation: number;
  type: 'continental' | 'volcanic' | 'coral' | 'mountainous';
  biomes: string[];
  rivers: string[];
  settlements: string[];
}

export interface DFEnhancedRiver extends DFRiver {
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

export interface DFEnhancedLake extends DFLake {
  inflow: string[];
  outflow: string | null;
  volume: number;
  seasonalVariation: number;
  depthProfile: { x: number; y: number; depth: number }[];
  waterQuality: number;
  fishPopulation: number;
  recreationalValue: number;
}

export class DwarfFortressWorldGenerator {
  private config: DwarfFortressConfig;
  private noiseCache: Map<string, number> = new Map();
  private worldData: DFWorldData;
  private tileStateCache: Map<string, WorldTile> = new Map(); // Cache for dynamic tile states
  private worldGenerated: boolean = false; // Flag to ensure world is only generated once

  constructor(config: DwarfFortressConfig) {
    this.config = config;
    this.worldData = {
      tiles: [],
      civilizations: [],
      rivers: [],
      lakes: [],
      caves: [],
      roads: [],
      settlements: [],
      biomes: [],
      history: [],
      continents: [],
      islands: [],
      enhancedRivers: [],
      enhancedLakes: [],
      heightmap: [],
      seaLevel: config.seaLevel
    };
  }

  public generate(): DFWorldData {
    if (this.worldGenerated) {
      console.log('🔄 World already generated, returning cached data');
      return this.worldData;
    }

    console.log('🏔️ Generating new Dwarf Fortress world...');
    
    // Generate the base world structure
    this.generateBaseTerrain();
    this.generateMountainRanges();
    this.generateRivers();
    this.generateLakes();
    this.generateCaveSystems();
    this.generateBiomes();
    this.generateCivilizations();
    this.generateSettlements();
    this.generateRoads();
    this.generateHistory();
    this.finalizeWorld();
    
    // Cache all tiles for future state updates
    this.cacheAllTiles();
    
    this.worldGenerated = true;
    console.log('✅ World generation complete');
    
    return this.worldData;
  }

  /**
   * Cache all tiles for efficient state updates
   */
  private cacheAllTiles(): void {
    console.log('📦 Caching all tiles for dynamic updates...');
    if (!this.worldData.tiles) {
      console.warn('⚠️ No tiles to cache');
      return;
    }
    
    for (let y = 0; y < this.worldData.tiles.length; y++) {
      const row = this.worldData.tiles[y];
      if (!row) continue;
      
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (tile) {
          const key = `${x},${y}`;
          this.tileStateCache.set(key, { ...tile });
        }
      }
    }
    console.log(`📦 Cached ${this.tileStateCache.size} tiles`);
  }

  /**
   * Update a specific tile's state without regenerating the world
   */
  public updateTileState(x: number, y: number, updates: Partial<WorldTile>): void {
    const key = `${x},${y}`;
    const cachedTile = this.tileStateCache.get(key);
    
    if (cachedTile) {
      // Update the cached tile
      Object.assign(cachedTile, updates);
      
      // Update the world data
      if (this.worldData.tiles[y] && this.worldData.tiles[y][x]) {
        Object.assign(this.worldData.tiles[y][x], updates);
      }
      
      console.log(`🔄 Updated tile (${x}, ${y}):`, updates);
    }
  }

  /**
   * Update multiple tiles at once for batch operations
   */
  public updateTileStates(updates: Array<{ x: number; y: number; updates: Partial<WorldTile> }>): void {
    console.log(`🔄 Batch updating ${updates.length} tiles...`);
    
    for (const { x, y, updates: tileUpdates } of updates) {
      this.updateTileState(x, y, tileUpdates);
    }
  }

  /**
   * Get a tile's current state (from cache if available)
   */
  public getTileState(x: number, y: number): WorldTile | null {
    const key = `${x},${y}`;
    return this.tileStateCache.get(key) || null;
  }

  /**
   * Apply farming effects to a tile
   */
  public applyFarming(x: number, y: number): void {
    const tile = this.getTileState(x, y);
    if (tile) {
      this.updateTileState(x, y, {
        type: TileType.FARM,
        soilQuality: Math.min(1.0, tile.soilQuality + 0.1),
        vegetationDensity: Math.max(0.1, tile.vegetationDensity - 0.2),
        elevation: Math.max(0, tile.elevation - 0.05) // Slight flattening
      });
    }
  }

  /**
   * Apply building effects to a tile
   */
  public applyBuilding(x: number, y: number, buildingType: string): void {
    const tile = this.getTileState(x, y);
    if (tile) {
      this.updateTileState(x, y, {
        type: TileType.URBAN,
        elevation: Math.max(0, tile.elevation - 0.1), // Flatten for building
        soilQuality: Math.max(0.1, tile.soilQuality - 0.3), // Compact soil
        accessibility: Math.min(1.0, tile.accessibility + 0.5) // Better access
      });
    }
  }

  /**
   * Apply erosion effects to a tile
   */
  public applyErosion(x: number, y: number, intensity: number = 0.1): void {
    const tile = this.getTileState(x, y);
    if (tile) {
      this.updateTileState(x, y, {
        elevation: Math.max(0, tile.elevation - intensity),
        soilQuality: Math.max(0, tile.soilQuality - intensity * 0.5),
        erosion: Math.min(1.0, tile.erosion + intensity)
      });
    }
  }

  /**
   * Apply age effects to a tile (long-term changes)
   */
  public applyAgeEffects(x: number, y: number, ageInYears: number): void {
    const tile = this.getTileState(x, y);
    if (tile) {
      const ageFactor = Math.min(1.0, ageInYears / 100); // Normalize to 0-1
      
      this.updateTileState(x, y, {
        soilQuality: Math.max(0, tile.soilQuality - ageFactor * 0.1),
        vegetationDensity: Math.min(1.0, tile.vegetationDensity + ageFactor * 0.05),
        erosion: Math.min(1.0, tile.erosion + ageFactor * 0.02)
      });
    }
  }

  /**
   * Start a fire at a specific location
   */
  public startFire(x: number, y: number): void {
    const tile = this.getTileState(x, y);
    if (tile && tile.type !== TileType.WATER) {
      this.updateTileState(x, y, {
        fireState: FireState.BURNING,
        vegetationDensity: Math.max(0, tile.vegetationDensity - 0.3),
        soilQuality: Math.max(0, tile.soilQuality - 0.1)
      });
    }
  }

  /**
   * Extinguish fire at a specific location
   */
  public extinguishFire(x: number, y: number): void {
    const tile = this.getTileState(x, y);
    if (tile) {
      this.updateTileState(x, y, {
        fireState: FireState.NONE
      });
    }
  }

  /**
   * Get all tiles in a region for batch operations
   */
  public getTilesInRegion(startX: number, startY: number, width: number, height: number): WorldTile[] {
    const tiles: WorldTile[] = [];
    
    for (let y = startY; y < startY + height; y++) {
      for (let x = startX; x < startX + width; x++) {
        const tile = this.getTileState(x, y);
        if (tile) {
          tiles.push(tile);
        }
      }
    }
    
    return tiles;
  }

  /**
   * Get world statistics for monitoring
   */
  public getWorldStatistics(): {
    totalTiles: number;
    cachedTiles: number;
    tileTypes: Record<TileType, number>;
    averageSoilQuality: number;
    averageVegetationDensity: number;
    burningTiles: number;
  } {
    const stats = {
      totalTiles: 0,
      cachedTiles: this.tileStateCache.size,
      tileTypes: {} as Record<TileType, number>,
      averageSoilQuality: 0,
      averageVegetationDensity: 0,
      burningTiles: 0
    };

    let totalSoilQuality = 0;
    let totalVegetationDensity = 0;

    for (const tile of this.tileStateCache.values()) {
      stats.totalTiles++;
      
      // Count tile types
      stats.tileTypes[tile.type] = (stats.tileTypes[tile.type] || 0) + 1;
      
      // Accumulate averages
      totalSoilQuality += tile.soilQuality;
      totalVegetationDensity += tile.vegetationDensity;
      
      // Count burning tiles
      if (tile.fireState === FireState.BURNING) {
        stats.burningTiles++;
      }
    }

    if (stats.totalTiles > 0) {
      stats.averageSoilQuality = totalSoilQuality / stats.totalTiles;
      stats.averageVegetationDensity = totalVegetationDensity / stats.totalTiles;
    }

    return stats;
  }

  private generateBaseTerrain(): void {
    console.log('🌍 Generating base terrain using Diamond-Square algorithm...');
    
    // Generate heightmap using diamond-square algorithm
    this.worldData.heightmap = this.generateDiamondSquareHeightmap();
    this.worldData.seaLevel = this.config.seaLevel || 0.5;
    
    // Identify continents and islands
    this.worldData.continents = this.identifyContinents(this.worldData.heightmap);
    this.worldData.islands = this.identifyIslands(this.worldData.heightmap);
    
    console.log(`🌍 Generated ${this.worldData.continents.length} continents and ${this.worldData.islands.length} islands`);
    
    // Create tiles from heightmap
    this.worldData.tiles = [];
    
    for (let y = 0; y < this.config.height; y++) {
      this.worldData.tiles[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        const elevation = this.worldData.heightmap[y]![x]!;
        const temperature = this.getTemperature(x, y);
        const rainfall = this.getRainfall(x, y);
        
        // Determine if this is land or water based on sea level
        const isLand = elevation >= this.worldData.seaLevel;
        const biome = isLand ? this.determineBiome(elevation, temperature, rainfall) : 'ocean';
        
        const tile: WorldTile = {
          x,
          y,
          type: isLand ? this.biomeToTileType(biome) : TileType.WATER,
          resources: this.generateResources(x, y, biome),
          elevation,
          temperature,
          humidity: rainfall,
          fertility: this.calculateFertility(elevation, rainfall, temperature),
          accessibility: this.calculateAccessibility(elevation, temperature),
          structures: [],
          agents: [],
          // Enhanced environmental properties
          soilQuality: this.calculateSoilQuality(elevation, rainfall, temperature),
          fireState: FireState.NONE,
          pollution: 0,
          erosion: this.calculateErosion(elevation, rainfall),
          moisture: rainfall,
          vegetationDensity: this.calculateVegetationDensity(biome, rainfall, temperature),
          mineralContent: this.calculateMineralContent(elevation, biome),
          level: TileLevel.GROUND,
          connections: [],
          tileData: {
            biome: biome,
            climate: this.determineClimate(temperature, rainfall),
            terrain: this.determineTerrain(elevation),
            resourceNodes: [],
            resourceClusters: [],
            roads: [],
            bridges: [],
            walls: [],
            vegetation: [],
            wildlife: [],
            weather: {
              temperature,
              humidity: rainfall,
              windSpeed: 0,
              windDirection: 0,
              precipitation: 0,
              visibility: 1,
              conditions: []
            },
            culture: '',
            religion: '',
            language: '',
            tradeRoutes: [],
            markets: [],
            industries: [],
            ownership: '',
            governance: '',
            laws: [],
            history: [],
            ruins: [],
            artifacts: []
          },
          isExpanded: false
        };
        
        this.worldData.tiles[y]![x] = tile;
      }
    }
    
    // Add continent and island information to tiles
    this.assignTilesToContinents();
    this.assignTilesToIslands();
  }

  private assignTilesToContinents(): void {
    for (const continent of this.worldData.continents) {
      for (let y = continent.bounds.y; y < continent.bounds.y + continent.bounds.height; y++) {
        for (let x = continent.bounds.x; x < continent.bounds.x + continent.bounds.width; x++) {
          if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
            const tile = this.worldData.tiles[y]?.[x];
            if (tile && tile.elevation >= this.worldData.seaLevel) {
              tile.tileData.ownership = continent.id;
              tile.tileData.culture = continent.name;
            }
          }
        }
      }
    }
  }

  private assignTilesToIslands(): void {
    for (const island of this.worldData.islands) {
      const radius = island.radius;
      const centerX = island.center.x;
      const centerY = island.center.y;
      
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            if (distance <= radius) {
              const tile = this.worldData.tiles[y]?.[x];
              if (tile && tile.elevation >= this.worldData.seaLevel) {
                tile.tileData.ownership = island.id;
                tile.tileData.culture = island.name;
              }
            }
          }
        }
      }
    }
  }

  private getElevation(x: number, y: number): number {
    // Use heightmap if available, otherwise fall back to noise generation
    if (this.worldData.heightmap.length > 0 && 
        y >= 0 && y < this.worldData.heightmap.length && 
        x >= 0 && x < this.worldData.heightmap[y]!.length) {
      return this.worldData.heightmap[y]![x]!;
    }
    
    // Fallback to original noise-based generation
    const key = `elevation_${x}_${y}`;
    if (this.noiseCache.has(key)) {
      return this.noiseCache.get(key)!;
    }
    
    const scale = this.config.elevationScale;
    const value = this.multiOctaveNoise(x * scale, y * scale, this.config.seed, 4);
    this.noiseCache.set(key, value);
    return value;
  }

  private getTemperature(x: number, y: number): number {
    const key = `temperature_${x}_${y}`;
    if (this.noiseCache.has(key)) {
      return this.noiseCache.get(key)!;
    }
    
    const scale = this.config.temperatureScale;
    const baseTemp = this.multiOctaveNoise(x * scale, y * scale, this.config.seed + 1, 3);
    const latitudeEffect = Math.abs(y - this.config.height / 2) / (this.config.height / 2);
    const value = Math.max(0, Math.min(1, baseTemp - latitudeEffect * 0.3));
    this.noiseCache.set(key, value);
    return value;
  }

  private getRainfall(x: number, y: number): number {
    const key = `rainfall_${x}_${y}`;
    if (this.noiseCache.has(key)) {
      return this.noiseCache.get(key)!;
    }
    
    const scale = this.config.rainfallScale;
    const value = this.multiOctaveNoise(x * scale, y * scale, this.config.seed + 2, 3);
    this.noiseCache.set(key, value);
    return value;
  }

  private determineBiome(elevation: number, temperature: number, rainfall: number): string {
    if (elevation > 0.8) {
      if (temperature < 0.3) return 'alpine_tundra';
      return 'alpine_meadow';
    }
    
    if (elevation > 0.6) {
      if (rainfall > 0.7) return 'temperate_forest';
      return 'temperate_grassland';
    }
    
    if (elevation > 0.4) {
      if (rainfall > 0.8) return 'temperate_rainforest';
      if (rainfall > 0.5) return 'temperate_forest';
      return 'temperate_grassland';
    }
    
    if (elevation > 0.2) {
      if (temperature > 0.7) {
        if (rainfall > 0.6) return 'tropical_rainforest';
        return 'tropical_savanna';
      }
      if (rainfall > 0.7) return 'temperate_rainforest';
      return 'temperate_grassland';
    }
    
    if (temperature > 0.8) {
      if (rainfall < 0.3) return 'desert';
      return 'tropical_savanna';
    }
    
    if (rainfall < 0.2) return 'desert';
    if (rainfall > 0.8) return 'swamp';
    
    return 'grassland';
  }

  private biomeToTileType(biome: string): TileType {
    switch (biome) {
      case 'alpine_tundra': return TileType.TUNDRA;
      case 'alpine_meadow': return TileType.ALPINE;
      case 'temperate_forest': return TileType.FOREST;
      case 'temperate_grassland': return TileType.GRASS;
      case 'temperate_rainforest': return TileType.FOREST;
      case 'tropical_rainforest': return TileType.FOREST;
      case 'tropical_savanna': return TileType.GRASS;
      case 'desert': return TileType.DESERT;
      case 'swamp': return TileType.SWAMP;
      default: return TileType.GRASS;
    }
  }

  private generateResources(_x: number, _y: number, biome: string): Resource[] {
    const resources: Resource[] = [];
    
    // Base resources based on biome
    switch (biome) {
      case 'temperate_forest':
      case 'tropical_rainforest':
      case 'temperate_rainforest':
        if (Math.random() < 0.3) {
          resources.push({
            type: ResourceType.WOOD,
            amount: 100 + Math.random() * 200,
            maxAmount: 300,
            regenerationRate: 1 + Math.random() * 2,
            lastHarvested: 0
          });
        }
        break;
      case 'grassland':
      case 'temperate_grassland':
        if (Math.random() < 0.4) {
          resources.push({
            type: ResourceType.FOOD,
            amount: 50 + Math.random() * 100,
            maxAmount: 150,
            regenerationRate: 2 + Math.random() * 3,
            lastHarvested: 0
          });
        }
        break;
    }
    
    // Mineral resources
    if (Math.random() < this.config.mineralRichness * 0.1) {
      const mineralTypes = [ResourceType.STONE, ResourceType.METAL];
      const mineralType = mineralTypes[Math.floor(Math.random() * mineralTypes.length)];
      resources.push({
        type: mineralType!,
        amount: 200 + Math.random() * 300,
        maxAmount: 500,
        regenerationRate: 0.1 + Math.random() * 0.5,
        lastHarvested: 0
      });
    }
    
    // Water resources
    if (Math.random() < this.config.waterAvailability * 0.2) {
      resources.push({
        type: ResourceType.WATER,
        amount: 1000 + Math.random() * 2000,
        maxAmount: 3000,
        regenerationRate: 5 + Math.random() * 10,
        lastHarvested: 0
      });
    }
    
    return resources;
  }

  private calculateFertility(elevation: number, rainfall: number, temperature: number): number {
    let fertility = 0.5;
    
    // Elevation effect
    if (elevation > 0.8) fertility -= 0.3;
    else if (elevation < 0.3) fertility += 0.2;
    
    // Rainfall effect
    if (rainfall > 0.7) fertility += 0.3;
    else if (rainfall < 0.2) fertility -= 0.4;
    
    // Temperature effect
    if (temperature > 0.7 && temperature < 0.9) fertility += 0.2;
    else if (temperature < 0.2) fertility -= 0.3;
    
    return Math.max(0, Math.min(1, fertility));
  }

  private calculateAccessibility(elevation: number, temperature: number): number {
    let accessibility = 1.0;
    
    // Elevation effect
    if (elevation > 0.7) accessibility -= 0.4;
    else if (elevation > 0.5) accessibility -= 0.2;
    
    // Temperature effect
    if (temperature < 0.2) accessibility -= 0.3;
    else if (temperature > 0.8) accessibility -= 0.2;
    
    return Math.max(0, Math.min(1, accessibility));
  }

  private determineClimate(temperature: number, _rainfall: number): string {
    if (temperature < 0.3) return 'polar';
    if (temperature < 0.6) return 'temperate';
    return 'tropical';
  }

  private determineTerrain(elevation: number): string {
    if (elevation > 0.8) return 'mountain';
    if (elevation > 0.6) return 'hill';
    if (elevation > 0.4) return 'rolling';
    if (elevation > 0.2) return 'flat';
    return 'lowland';
  }

  private calculateSoilQuality(elevation: number, rainfall: number, temperature: number): number {
    // Soil quality is best in moderate conditions
    const elevationFactor = 1 - Math.abs(elevation - 0.3); // Best around 0.3 elevation
    const rainfallFactor = 1 - Math.abs(rainfall - 0.6); // Best around 0.6 rainfall
    const temperatureFactor = 1 - Math.abs(temperature - 0.5); // Best around 0.5 temperature
    
    return Math.max(0, Math.min(1, (elevationFactor + rainfallFactor + temperatureFactor) / 3));
  }

  private calculateErosion(elevation: number, rainfall: number): number {
    // Higher elevation and rainfall increase erosion
    const elevationFactor = elevation * 0.4;
    const rainfallFactor = rainfall * 0.3;
    return Math.min(1, elevationFactor + rainfallFactor);
  }

  private calculateVegetationDensity(biome: string, rainfall: number, temperature: number): number {
    // Base density from biome type
    let baseDensity = 0.3;
    switch (biome) {
      case 'tropical_rainforest':
      case 'temperate_rainforest':
        baseDensity = 0.9;
        break;
      case 'temperate_forest':
        baseDensity = 0.7;
        break;
      case 'tropical_savanna':
        baseDensity = 0.5;
        break;
      case 'temperate_grassland':
        baseDensity = 0.4;
        break;
      case 'desert':
        baseDensity = 0.1;
        break;
      case 'alpine_tundra':
        baseDensity = 0.2;
        break;
    }
    
    // Adjust based on rainfall and temperature
    const rainfallFactor = rainfall * 0.3;
    const temperatureFactor = temperature * 0.2;
    
    return Math.min(1, baseDensity + rainfallFactor + temperatureFactor);
  }

  private calculateMineralContent(elevation: number, biome: string): number {
    // Higher elevation generally means more minerals
    let baseContent = elevation * 0.4;
    
    // Certain biomes have higher mineral content
    switch (biome) {
      case 'mountain':
        baseContent += 0.3;
        break;
      case 'volcano':
        baseContent += 0.5;
        break;
      case 'desert':
        baseContent += 0.2;
        break;
    }
    
    return Math.min(1, baseContent);
  }

  private generateMountainRanges(): void {
    console.log('⛰️ Generating mountain ranges...');
    
    for (let i = 0; i < this.config.mountainRanges; i++) {
      const startX = Math.random() * this.config.width;
      const startY = Math.random() * this.config.height;
      const length = 50 + Math.random() * 100;
      const direction = Math.random() * Math.PI * 2;
      
      this.createMountainRange(startX, startY, length, direction);
    }
  }

  private createMountainRange(startX: number, startY: number, length: number, direction: number): void {
    const segments = Math.floor(length / 10);
    
    for (let i = 0; i < segments; i++) {
      const x = startX + Math.cos(direction) * i * 10;
      const y = startY + Math.sin(direction) * i * 10;
      
      if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
        const radius = 5 + Math.random() * 10;
        this.createMountainPeak(Math.floor(x), Math.floor(y), radius);
      }
    }
  }

  private createMountainPeak(centerX: number, centerY: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const tile = this.worldData.tiles[y]?.[x];
            if (!tile) continue;
            const elevation = tile.elevation;
            const mountainElevation = Math.max(elevation, 0.7 + (1 - distance / radius) * 0.3);
            tile.elevation = mountainElevation;
            if (mountainElevation > 0.9) {
              tile.type = TileType.MOUNTAIN;
            } else if (mountainElevation > 0.7) {
              tile.type = TileType.HILL;
            }
          }
        }
      }
    }
  }

  private generateRivers(): void {
    console.log('🌊 Generating enhanced river systems...');
    
    // Clear existing rivers
    this.worldData.rivers = [];
    this.worldData.enhancedRivers = [];
    
    // Find potential river sources (high elevation areas)
    const riverSources = this.findRiverSources();
    console.log(`🌊 Found ${riverSources.length} potential river sources`);
    
    // Generate rivers from each source
    for (const source of riverSources) {
      const river = this.createEnhancedRiver(source);
      if (river) {
        this.worldData.enhancedRivers.push(river);
        // Also add to legacy rivers array for compatibility
        this.worldData.rivers.push({
          id: river.id,
          name: river.name,
          points: river.points,
          width: river.width,
          depth: river.depth,
          flow: river.flow,
          tributaries: river.tributaries,
          settlements: river.settlements
        });
      }
    }
    
    // Generate tributaries
    this.generateTributaries();
    
    // Carve river valleys into the terrain
    this.carveRiverValleys();
    
    console.log(`🌊 Generated ${this.worldData.enhancedRivers.length} river systems`);
  }

  private findRiverSources(): { x: number; y: number; elevation: number }[] {
    const sources: { x: number; y: number; elevation: number }[] = [];
    const seaLevel = this.worldData.seaLevel;
    
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const elevation = this.worldData.heightmap[y]![x]!;
        if (elevation >= seaLevel && elevation > 0.7) { // High elevation areas
          // Check if this is a local maximum
          const neighbors = this.getNeighbors(x, y);
          let isLocalMax = true;
          
          for (const neighbor of neighbors) {
            const neighborElevation = this.worldData.heightmap[neighbor.y]?.[neighbor.x];
            if (neighborElevation && neighborElevation >= elevation) {
              isLocalMax = false;
              break;
            }
          }
          
          if (isLocalMax && Math.random() < 0.3) { // 30% chance for each local maximum
            sources.push({ x, y, elevation });
          }
        }
      }
    }
    
    // Sort by elevation (highest first) and limit to river count
    sources.sort((a, b) => b.elevation - a.elevation);
    return sources.slice(0, this.config.riverCount);
  }

  private createEnhancedRiver(source: { x: number; y: number; elevation: number }): DFEnhancedRiver | null {
    const river: DFEnhancedRiver = {
      id: `river_${this.worldData.enhancedRivers.length}`,
      name: this.generateRiverName(),
      points: [{ x: source.x, y: source.y }],
      width: 1 + Math.random() * 2,
      depth: 2 + Math.random() * 4,
      flow: 0.5 + Math.random() * 0.5,
      tributaries: [],
      settlements: [],
      source: { x: source.x, y: source.y },
      mouth: { x: source.x, y: source.y },
      length: 0,
      basin: { x: source.x, y: source.y, width: 1, height: 1 },
      flowRate: 10 + Math.random() * 20,
      seasonalVariation: 0.1 + Math.random() * 0.3,
      navigable: false,
      crossings: []
    };
    
    // Flow the river downhill using A* pathfinding
    const path = this.findRiverPath(source.x, source.y);
    if (path.length < 5) return null; // River too short
    
    river.points = path;
    river.mouth = path[path.length - 1]!;
    river.length = this.calculateRiverLength(path);
    river.basin = this.calculateRiverBasin(path);
    river.navigable = river.length > 20 && river.flowRate > 15;
    
    // Carve the river into the terrain
    this.carveRiverIntoTerrain(path, river.width, river.depth);
    
    return river;
  }

  private findRiverPath(startX: number, startY: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();
    const seaLevel = this.worldData.seaLevel;
    
    let currentX = startX;
    let currentY = startY;
    const maxSteps = 200;
    
    for (let step = 0; step < maxSteps; step++) {
      visited.add(`${currentX},${currentY}`);
      
      // Find the lowest neighbor
      const neighbors = this.getNeighbors(currentX, currentY);
      let lowestNeighbor = null;
      let lowestElevation = Infinity;
      
      for (const neighbor of neighbors) {
        const elevation = this.worldData.heightmap[neighbor.y]?.[neighbor.x];
        if (elevation !== undefined && elevation < lowestElevation && !visited.has(`${neighbor.x},${neighbor.y}`)) {
          lowestElevation = elevation;
          lowestNeighbor = neighbor;
        }
      }
      
      if (!lowestNeighbor) break;
      
      currentX = lowestNeighbor.x;
      currentY = lowestNeighbor.y;
      path.push({ x: currentX, y: currentY });
      
      // Stop if we reach the sea or edge
      if (lowestElevation <= seaLevel || 
          currentX <= 0 || currentX >= this.config.width - 1 || 
          currentY <= 0 || currentY >= this.config.height - 1) {
        break;
      }
    }
    
    return path;
  }

  private calculateRiverLength(points: { x: number; y: number }[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i]!.x - points[i - 1]!.x;
      const dy = points[i]!.y - points[i - 1]!.y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  private calculateRiverBasin(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
    let minX = points[0]!.x, maxX = points[0]!.x;
    let minY = points[0]!.y, maxY = points[0]!.y;
    
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    // Expand basin to include surrounding area
    const expansion = 5;
    return {
      x: Math.max(0, minX - expansion),
      y: Math.max(0, minY - expansion),
      width: Math.min(this.config.width - 1, maxX + expansion) - Math.max(0, minX - expansion),
      height: Math.min(this.config.height - 1, maxY + expansion) - Math.max(0, minY - expansion)
    };
  }

  private carveRiverIntoTerrain(points: { x: number; y: number }[], width: number, depth: number): void {
    for (const point of points) {
      const x = point.x;
      const y = point.y;
      
      // Carve the main river channel
      this.carveRiverTile(x, y, width, depth);
      
      // Carve surrounding area for river valley
      const valleyRadius = Math.ceil(width * 2);
      for (let dy = -valleyRadius; dy <= valleyRadius; dy++) {
        for (let dx = -valleyRadius; dx <= valleyRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= valleyRadius) {
              const factor = 1 - (distance / valleyRadius) * 0.3;
              this.worldData.heightmap[ny]![nx] = Math.max(
                this.worldData.seaLevel - 0.1,
                this.worldData.heightmap[ny]![nx]! * factor
              );
            }
          }
        }
      }
    }
  }

  private carveRiverTile(x: number, y: number, width: number, depth: number): void {
    const tile = this.worldData.tiles[y]?.[x];
    if (!tile) return;
    
    // Lower elevation for river channel
    tile.elevation = Math.max(this.worldData.seaLevel - 0.2, tile.elevation - depth * 0.1);
    tile.type = TileType.WATER;
    
    // Update heightmap
    this.worldData.heightmap[y]![x] = tile.elevation;
  }

  private generateTributaries(): void {
    // Find potential tributary sources (smaller streams joining main rivers)
    for (const river of this.worldData.enhancedRivers) {
      const tributaryCount = Math.floor(Math.random() * 3) + 1; // 1-3 tributaries per river
      
      for (let i = 0; i < tributaryCount; i++) {
        const tributary = this.createTributary(river);
        if (tributary) {
          this.worldData.enhancedRivers.push(tributary);
          river.tributaries.push(tributary.id);
        }
      }
    }
  }

  private createTributary(mainRiver: DFEnhancedRiver): DFEnhancedRiver | null {
    // Find a point along the main river to join
    const joinIndex = Math.floor(mainRiver.points.length * 0.3) + Math.floor(Math.random() * mainRiver.points.length * 0.4);
    const joinPoint = mainRiver.points[joinIndex];
    if (!joinPoint) return null;
    
    // Find a nearby high point for tributary source
    const source = this.findTributarySource(joinPoint.x, joinPoint.y);
    if (!source) return null;
    
    const tributary: DFEnhancedRiver = {
      id: `tributary_${this.worldData.enhancedRivers.length}`,
      name: this.generateRiverName(),
      points: [{ x: source.x, y: source.y }],
      width: mainRiver.width * 0.6,
      depth: mainRiver.depth * 0.7,
      flow: mainRiver.flow * 0.5,
      tributaries: [],
      settlements: [],
      source: { x: source.x, y: source.y },
      mouth: joinPoint,
      length: 0,
      basin: { x: source.x, y: source.y, width: 1, height: 1 },
      flowRate: mainRiver.flowRate * 0.4,
      seasonalVariation: mainRiver.seasonalVariation * 1.2,
      navigable: false,
      crossings: []
    };
    
    // Find path to join point
    const path = this.findRiverPathToPoint(source.x, source.y, joinPoint.x, joinPoint.y);
    if (path.length < 3) return null;
    
    tributary.points = path;
    tributary.length = this.calculateRiverLength(path);
    tributary.basin = this.calculateRiverBasin(path);
    
    // Carve tributary into terrain
    this.carveRiverIntoTerrain(path, tributary.width, tributary.depth);
    
    return tributary;
  }

  private findTributarySource(nearX: number, nearY: number): { x: number; y: number; elevation: number } | null {
    const searchRadius = 20;
    const candidates: { x: number; y: number; elevation: number }[] = [];
    
    for (let y = nearY - searchRadius; y <= nearY + searchRadius; y++) {
      for (let x = nearX - searchRadius; x <= nearX + searchRadius; x++) {
        if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
          const elevation = this.worldData.heightmap[y]![x]!;
          if (elevation >= this.worldData.seaLevel && elevation > 0.6) {
            const distance = Math.sqrt((x - nearX) ** 2 + (y - nearY) ** 2);
            if (distance <= searchRadius) {
              candidates.push({ x, y, elevation });
            }
          }
        }
      }
    }
    
    if (candidates.length === 0) return null;
    
    // Sort by elevation and distance, pick a good candidate
    candidates.sort((a, b) => {
      const distanceA = Math.sqrt((a.x - nearX) ** 2 + (a.y - nearY) ** 2);
      const distanceB = Math.sqrt((b.x - nearX) ** 2 + (b.y - nearY) ** 2);
      return (b.elevation - a.elevation) + (distanceA - distanceB) * 0.1;
    });
    
    return candidates[0] || null;
  }

  private findRiverPathToPoint(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const visited = new Set<string>();
    const seaLevel = this.worldData.seaLevel;
    
    let currentX = startX;
    let currentY = startY;
    const maxSteps = 100;
    
    for (let step = 0; step < maxSteps; step++) {
      visited.add(`${currentX},${currentY}`);
      
      // Check if we're close to the target
      const distanceToTarget = Math.sqrt((currentX - endX) ** 2 + (currentY - endY) ** 2);
      if (distanceToTarget < 3) {
        path.push({ x: endX, y: endY });
        break;
      }
      
      // Find the best neighbor (lowest elevation but moving toward target)
      const neighbors = this.getNeighbors(currentX, currentY);
      let bestNeighbor = null;
      let bestScore = Infinity;
      
      for (const neighbor of neighbors) {
        const elevation = this.worldData.heightmap[neighbor.y]?.[neighbor.x];
        if (elevation === undefined || visited.has(`${neighbor.x},${neighbor.y}`)) continue;
        
        const distanceToTargetFromNeighbor = Math.sqrt((neighbor.x - endX) ** 2 + (neighbor.y - endY) ** 2);
        const score = elevation * 2 + distanceToTargetFromNeighbor * 0.5;
        
        if (score < bestScore) {
          bestScore = score;
          bestNeighbor = neighbor;
        }
      }
      
      if (!bestNeighbor) break;
      
      currentX = bestNeighbor.x;
      currentY = bestNeighbor.y;
      path.push({ x: currentX, y: currentY });
      
      // Stop if we reach the sea
      const elevation = this.worldData.heightmap[currentY]?.[currentX];
      if (elevation !== undefined && elevation <= seaLevel) break;
    }
    
    return path;
  }

  private carveRiverValleys(): void {
    // Apply erosion effects to river valleys
    for (const river of this.worldData.enhancedRivers) {
      for (const point of river.points) {
        const x = point.x;
        const y = point.y;
        
        // Apply erosion to surrounding tiles
        const erosionRadius = 3;
        for (let dy = -erosionRadius; dy <= erosionRadius; dy++) {
          for (let dx = -erosionRadius; dx <= erosionRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= erosionRadius) {
                const tile = this.worldData.tiles[ny]?.[nx];
                if (tile) {
                  const erosionFactor = (1 - distance / erosionRadius) * 0.1;
                  tile.erosion = Math.min(1, tile.erosion + erosionFactor);
                  tile.elevation = Math.max(this.worldData.seaLevel - 0.1, tile.elevation - erosionFactor * 0.05);
                }
              }
            }
          }
        }
      }
    }
  }

  private generateLakes(): void {
    console.log('🏞️ Generating enhanced lake systems...');
    
    // Clear existing lakes
    this.worldData.lakes = [];
    this.worldData.enhancedLakes = [];
    
    // Find potential lake basins (depressions in the terrain)
    const lakeBasins = this.findLakeBasins();
    console.log(`🏞️ Found ${lakeBasins.length} potential lake basins`);
    
    // Generate lakes from each basin
    for (const basin of lakeBasins) {
      const lake = this.createEnhancedLake(basin);
      if (lake) {
        this.worldData.enhancedLakes.push(lake);
        // Also add to legacy lakes array for compatibility
        this.worldData.lakes.push({
          id: lake.id,
          name: lake.name,
          center: lake.center,
          radius: lake.radius,
          depth: lake.depth,
          waterType: lake.waterType,
          settlements: lake.settlements
        });
      }
    }
    
    // Generate lake connections (inflow/outflow)
    this.generateLakeConnections();
    
    // Fill lake basins with water
    this.fillLakeBasins();
    
    console.log(`🏞️ Generated ${this.worldData.enhancedLakes.length} lake systems`);
  }

  private findLakeBasins(): { x: number; y: number; radius: number; depth: number }[] {
    const basins: { x: number; y: number; radius: number; depth: number }[] = [];
    const seaLevel = this.worldData.seaLevel;
    
    for (let y = 2; y < this.config.height - 2; y++) {
      for (let x = 2; x < this.config.width - 2; x++) {
        const centerElevation = this.worldData.heightmap[y]![x]!;
        
        // Check if this is a local minimum (depression)
        if (centerElevation >= seaLevel && centerElevation < 0.6) {
          const neighbors = this.getNeighbors(x, y);
          let isLocalMin = true;
          let minNeighborElevation = Infinity;
          
          for (const neighbor of neighbors) {
            const neighborElevation = this.worldData.heightmap[neighbor.y]?.[neighbor.x];
            if (neighborElevation !== undefined) {
              if (neighborElevation <= centerElevation) {
                isLocalMin = false;
                break;
              }
              minNeighborElevation = Math.min(minNeighborElevation, neighborElevation);
            }
          }
          
          if (isLocalMin && minNeighborElevation > centerElevation + 0.1) {
            // Calculate basin depth and radius
            const depth = minNeighborElevation - centerElevation;
            const radius = this.calculateBasinRadius(x, y, centerElevation);
            
            if (depth > 0.05 && radius > 2 && Math.random() < 0.4) {
              basins.push({ x, y, radius, depth });
            }
          }
        }
      }
    }
    
    // Sort by depth and limit to lake count
    basins.sort((a, b) => b.depth - a.depth);
    return basins.slice(0, this.config.lakeCount);
  }

  private calculateBasinRadius(centerX: number, centerY: number, centerElevation: number): number {
    let radius = 0;
    const maxRadius = 10;
    
    for (let r = 1; r <= maxRadius; r++) {
      let allLower = true;
      
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= r) {
              const elevation = this.worldData.heightmap[y]![x]!;
              if (elevation <= centerElevation) {
                allLower = false;
                break;
              }
            }
          }
        }
        if (!allLower) break;
      }
      
      if (allLower) {
        radius = r;
      } else {
        break;
      }
    }
    
    return radius;
  }

  private createEnhancedLake(basin: { x: number; y: number; radius: number; depth: number }): DFEnhancedLake | null {
    const lake: DFEnhancedLake = {
      id: `lake_${this.worldData.enhancedLakes.length}`,
      name: this.generateLakeName(),
      center: { x: basin.x, y: basin.y },
      radius: basin.radius,
      depth: basin.depth * 10, // Convert to depth units
      waterType: Math.random() < 0.1 ? 'magical' : 'fresh',
      settlements: [],
      inflow: [],
      outflow: null,
      volume: 0,
      seasonalVariation: 0.1 + Math.random() * 0.2,
      depthProfile: [],
      waterQuality: 0.7 + Math.random() * 0.3,
      fishPopulation: Math.random(),
      recreationalValue: Math.random()
    };
    
    // Calculate lake volume and depth profile
    this.calculateLakeVolume(lake);
    this.generateDepthProfile(lake);
    
    // Determine water type based on location and climate
    this.determineLakeWaterType(lake);
    
    return lake;
  }

  private calculateLakeVolume(lake: DFEnhancedLake): void {
    let volume = 0;
    const centerX = lake.center.x;
    const centerY = lake.center.y;
    const radius = lake.radius;
    
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance <= radius) {
            const elevation = this.worldData.heightmap[y]![x]!;
            const depth = Math.max(0, lake.depth - (distance / radius) * lake.depth);
            volume += depth;
          }
        }
      }
    }
    
    lake.volume = volume;
  }

  private generateDepthProfile(lake: DFEnhancedLake): void {
    const centerX = lake.center.x;
    const centerY = lake.center.y;
    const radius = lake.radius;
    
    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance <= radius) {
            const depth = Math.max(0, lake.depth - (distance / radius) * lake.depth);
            lake.depthProfile.push({ x, y, depth });
          }
        }
      }
    }
  }

  private determineLakeWaterType(lake: DFEnhancedLake): void {
    const centerX = lake.center.x;
    const centerY = lake.center.y;
    const temperature = this.getTemperature(centerX, centerY);
    const rainfall = this.getRainfall(centerX, centerY);
    
    // Determine water type based on climate and location
    if (temperature > 0.8 && rainfall < 0.3) {
      lake.waterType = 'salt'; // Salt lake in hot, dry climate
    } else if (Math.random() < 0.05) {
      lake.waterType = 'magical'; // Rare magical lakes
    } else {
      lake.waterType = 'fresh';
    }
  }

  private generateLakeConnections(): void {
    // Find rivers that flow into lakes
    for (const lake of this.worldData.enhancedLakes) {
      for (const river of this.worldData.enhancedRivers) {
        // Check if river flows into this lake
        const mouth = river.mouth;
        const distance = Math.sqrt((mouth.x - lake.center.x) ** 2 + (mouth.y - lake.center.y) ** 2);
        
        if (distance <= lake.radius + 2) {
          lake.inflow.push(river.id);
        }
      }
      
      // Find potential outflow (rivers flowing out of lakes)
      if (lake.inflow.length > 0 && Math.random() < 0.7) {
        const outflowRiver = this.createLakeOutflow(lake);
        if (outflowRiver) {
          lake.outflow = outflowRiver.id;
          this.worldData.enhancedRivers.push(outflowRiver);
        }
      }
    }
  }

  private createLakeOutflow(lake: DFEnhancedLake): DFEnhancedRiver | null {
    // Find a suitable exit point on the lake edge
    const centerX = lake.center.x;
    const centerY = lake.center.y;
    const radius = lake.radius;
    
    // Look for the lowest point on the lake edge
    let lowestPoint = { x: centerX, y: centerY };
    let lowestElevation = Infinity;
    
    for (let angle = 0; angle < 360; angle += 10) {
      const rad = (angle * Math.PI) / 180;
      const x = Math.round(centerX + Math.cos(rad) * radius);
      const y = Math.round(centerY + Math.sin(rad) * radius);
      
      if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
        const elevation = this.worldData.heightmap[y]![x]!;
        if (elevation < lowestElevation) {
          lowestElevation = elevation;
          lowestPoint = { x, y };
        }
      }
    }
    
    if (lowestElevation >= this.worldData.seaLevel) return null;
    
    // Create outflow river
    const outflowRiver: DFEnhancedRiver = {
      id: `outflow_${this.worldData.enhancedRivers.length}`,
      name: `${lake.name} Outflow`,
      points: [lowestPoint],
      width: 1 + Math.random() * 2,
      depth: 2 + Math.random() * 3,
      flow: 0.3 + Math.random() * 0.4,
      tributaries: [],
      settlements: [],
      source: lowestPoint,
      mouth: lowestPoint,
      length: 0,
      basin: { x: lowestPoint.x, y: lowestPoint.y, width: 1, height: 1 },
      flowRate: 5 + Math.random() * 10,
      seasonalVariation: lake.seasonalVariation,
      navigable: false,
      crossings: []
    };
    
    // Find path to sea or another body of water
    const path = this.findRiverPath(lowestPoint.x, lowestPoint.y);
    if (path.length > 3) {
      outflowRiver.points = path;
      outflowRiver.mouth = path[path.length - 1]!;
      outflowRiver.length = this.calculateRiverLength(path);
      outflowRiver.basin = this.calculateRiverBasin(path);
      
      // Carve outflow into terrain
      this.carveRiverIntoTerrain(path, outflowRiver.width, outflowRiver.depth);
      
      return outflowRiver;
    }
    
    return null;
  }

  private fillLakeBasins(): void {
    for (const lake of this.worldData.enhancedLakes) {
      const centerX = lake.center.x;
      const centerY = lake.center.y;
      const radius = lake.radius;
      
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            if (distance <= radius) {
              const tile = this.worldData.tiles[y]?.[x];
              if (tile) {
                // Fill with water
                tile.type = TileType.WATER;
                tile.elevation = Math.max(this.worldData.seaLevel - 0.3, tile.elevation);
                this.worldData.heightmap[y]![x] = tile.elevation;
                
                // Add lake-specific properties
                tile.tileData.ownership = lake.id;
                tile.tileData.culture = lake.name;
              }
            }
          }
        }
      }
    }
  }

  private generateCaveSystems(): void {
    console.log('🕳️ Generating cave systems...');
    
    for (let i = 0; i < this.config.caveSystems; i++) {
      const cave = this.createCaveSystem();
      if (cave) {
        this.worldData.caves.push(cave);
      }
    }
  }

  private createCaveSystem(): DFCaveSystem | null {
    // Find a mountain or hill to place the cave entrance
    let entranceX = 0, entranceY = 0, found = false;
    
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * this.config.width);
      const y = Math.floor(Math.random() * this.config.height);
      const tile = this.worldData.tiles[y]?.[x];
      
      if (tile && tile.elevation > 0.6 && tile.type !== TileType.WATER) {
        entranceX = x;
        entranceY = y;
        found = true;
        break;
      }
    }
    
    if (!found) return null;
    
    const cave: DFCaveSystem = {
      id: `cave_${this.worldData.caves.length}`,
      name: this.generateCaveName(),
      entrances: [{ x: entranceX, y: entranceY }],
      chambers: [],
      depth: 10 + Math.random() * 20,
      inhabitants: [],
      resources: [ResourceType.STONE, ResourceType.METAL]
    };
    
    // Add some cave chambers
    const chamberCount = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chamberCount; i++) {
      const chamber: DFCaveChamber = {
        id: `chamber_${i}`,
        center: {
          x: entranceX + (Math.random() - 0.5) * 20,
          y: entranceY + (Math.random() - 0.5) * 20
        },
        radius: 2 + Math.random() * 4,
        height: 3 + Math.random() * 5,
        type: ['cavern', 'tunnel', 'chamber'][Math.floor(Math.random() * 3)] as any,
        features: []
      };
      cave.chambers.push(chamber);
    }
    
    return cave;
  }

  private generateBiomes(): void {
    console.log('🌿 Generating biomes...');
    
    // Create biome regions based on climate zones
    const biomeTypes = [
      'temperate_forest', 'tropical_rainforest', 'desert', 'tundra',
      'grassland', 'swamp', 'alpine_meadow', 'temperate_rainforest'
    ];
    
    for (let i = 0; i < 8; i++) {
      const biomeType = biomeTypes[i % biomeTypes.length];
      if (!biomeType) continue;
      
      const biome: DFBiome = {
        id: `biome_${i}`,
        name: this.generateBiomeName(biomeType),
        type: biomeType,
        bounds: {
          x: Math.floor(Math.random() * this.config.width * 0.8),
          y: Math.floor(Math.random() * this.config.height * 0.8),
          width: 50 + Math.random() * 100,
          height: 50 + Math.random() * 100
        },
        temperature: Math.random(),
        rainfall: Math.random(),
        elevation: Math.random(),
        vegetation: [],
        wildlife: [],
        resources: [ResourceType.FOOD, ResourceType.WOOD]
      };
      
      this.worldData.biomes.push(biome);
    }
  }

  private generateCivilizations(): void {
    console.log('🏛️ Generating civilizations...');
    
    const civTypes = ['dwarven', 'human', 'elven', 'goblin', 'orcish'];
    
    for (let i = 0; i < this.config.civilizationCount; i++) {
      const civType = civTypes[i % civTypes.length];
      if (!civType) continue;
      
      const civ: DFCivilization = {
        id: `civ_${i}`,
        name: this.generateCivilizationName(civType),
        type: civType as any,
        capital: { x: 0, y: 0 },
        territory: [],
        population: 1000 + Math.random() * 10000,
        technology: Math.random(),
        wealth: Math.random(),
        military: Math.random(),
        culture: this.generateCultureName(),
        religion: this.generateReligionName(),
        relations: {}
      };
      
      // Find a suitable capital location
      const capital = this.findCapitalLocation(civ.type);
      if (capital) {
        civ.capital = capital;
        civ.territory.push({
          x: capital.x - 20,
          y: capital.y - 20,
          width: 40,
          height: 40
        });
      }
      
      this.worldData.civilizations.push(civ);
    }
  }

  private generateSettlements(): void {
    console.log('🏘️ Generating settlements...');
    
    for (const civ of this.worldData.civilizations) {
      const settlementCount = 3 + Math.floor(Math.random() * 7);
      
      for (let i = 0; i < settlementCount; i++) {
        const settlement = this.createSettlement(civ);
        if (settlement) {
          this.worldData.settlements.push(settlement);
        }
      }
    }
  }

  private generateRoads(): void {
    console.log('🛣️ Road generation disabled - roads will be created by agents based on needs');
    // Roads are now generated dynamically by agents through the RoadManager
    // No pre-generated roads are created during world generation
  }

  private generateHistory(): void {
    console.log('📜 Generating world history...');
    
    const eventTypes = ['battle', 'discovery', 'construction', 'disaster', 'celebration'];
    const eventCount = 10 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < eventCount; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      if (!eventType) continue;
      
      const event: DFHistoricalEvent = {
        id: `event_${i}`,
        type: eventType,
        year: Math.floor(Math.random() * 1000),
        description: this.generateEventDescription(),
        location: {
          x: Math.floor(Math.random() * this.config.width),
          y: Math.floor(Math.random() * this.config.height)
        },
        participants: [],
        impact: Math.random()
      };
      
      this.worldData.history.push(event);
    }
  }

  private finalizeWorld(): void {
    console.log('🔧 Finalizing world...');
    
    // Sort history by year
    this.worldData.history.sort((a, b) => a.year - b.year);
    
    // Update continent and island data with final information
    this.updateContinentData();
    this.updateIslandData();
    
    // Add some final details to tiles
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const tile = this.worldData.tiles[y]?.[x];
        if (!tile) continue;
        
        // Add some random features
        if (Math.random() < 0.01) {
          tile.tileData.ruins.push({
            id: `ruin_${x}_${y}`,
            type: 'building',
            position: { x, y },
            size: { width: 1, height: 1 },
            condition: Math.random(),
            age: Math.floor(Math.random() * 1000),
            artifacts: [],
            dangers: []
          });
        }
        
        // Add river crossing information
        this.addRiverCrossings(x, y, tile);
      }
    }
    
    // Calculate final statistics
    this.calculateWorldStatistics();
  }

  private updateContinentData(): void {
    for (const continent of this.worldData.continents) {
      // Update biome information
      const biomes = new Set<string>();
      const rivers: string[] = [];
      const lakes: string[] = [];
      
      for (let y = continent.bounds.y; y < continent.bounds.y + continent.bounds.height; y++) {
        for (let x = continent.bounds.x; x < continent.bounds.x + continent.bounds.width; x++) {
          if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
            const tile = this.worldData.tiles[y]?.[x];
            if (tile && tile.elevation >= this.worldData.seaLevel) {
              biomes.add(tile.tileData.biome);
            }
          }
        }
      }
      
      // Find rivers and lakes in this continent
      for (const river of this.worldData.enhancedRivers) {
        if (this.isRiverInContinent(river, continent)) {
          rivers.push(river.id);
        }
      }
      
      for (const lake of this.worldData.enhancedLakes) {
        if (this.isLakeInContinent(lake, continent)) {
          lakes.push(lake.id);
        }
      }
      
      continent.biomes = Array.from(biomes);
      continent.rivers = rivers;
      continent.lakes = lakes;
    }
  }

  private updateIslandData(): void {
    for (const island of this.worldData.islands) {
      // Update biome information
      const biomes = new Set<string>();
      const rivers: string[] = [];
      
      const radius = island.radius;
      const centerX = island.center.x;
      const centerY = island.center.y;
      
      for (let y = centerY - radius; y <= centerY + radius; y++) {
        for (let x = centerX - radius; x <= centerX + radius; x++) {
          if (x >= 0 && x < this.config.width && y >= 0 && y < this.config.height) {
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            if (distance <= radius) {
              const tile = this.worldData.tiles[y]?.[x];
              if (tile && tile.elevation >= this.worldData.seaLevel) {
                biomes.add(tile.tileData.biome);
              }
            }
          }
        }
      }
      
      // Find rivers on this island
      for (const river of this.worldData.enhancedRivers) {
        if (this.isRiverOnIsland(river, island)) {
          rivers.push(river.id);
        }
      }
      
      island.biomes = Array.from(biomes);
      island.rivers = rivers;
    }
  }

  private isRiverInContinent(river: DFEnhancedRiver, continent: DFContinent): boolean {
    for (const point of river.points) {
      if (point.x >= continent.bounds.x && 
          point.x < continent.bounds.x + continent.bounds.width &&
          point.y >= continent.bounds.y && 
          point.y < continent.bounds.y + continent.bounds.height) {
        return true;
      }
    }
    return false;
  }

  private isLakeInContinent(lake: DFEnhancedLake, continent: DFContinent): boolean {
    return lake.center.x >= continent.bounds.x && 
           lake.center.x < continent.bounds.x + continent.bounds.width &&
           lake.center.y >= continent.bounds.y && 
           lake.center.y < continent.bounds.y + continent.bounds.height;
  }

  private isRiverOnIsland(river: DFEnhancedRiver, island: DFIsland): boolean {
    for (const point of river.points) {
      const distance = Math.sqrt((point.x - island.center.x) ** 2 + (point.y - island.center.y) ** 2);
      if (distance <= island.radius) {
        return true;
      }
    }
    return false;
  }

  private addRiverCrossings(x: number, y: number, tile: WorldTile): void {
    // Check if this tile is near a river crossing
    for (const river of this.worldData.enhancedRivers) {
      for (const point of river.points) {
        const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
        if (distance <= 2) {
          river.crossings.push({ x, y });
          break;
        }
      }
    }
  }

  private calculateWorldStatistics(): void {
    let landTiles = 0;
    let waterTiles = 0;
    let totalElevation = 0;
    let totalTemperature = 0;
    let totalRainfall = 0;
    
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const tile = this.worldData.tiles[y]?.[x];
        if (!tile) continue;
        
        if (tile.elevation >= this.worldData.seaLevel) {
          landTiles++;
        } else {
          waterTiles++;
        }
        
        totalElevation += tile.elevation;
        totalTemperature += tile.temperature;
        totalRainfall += tile.humidity;
      }
    }
    
    const totalTiles = landTiles + waterTiles;
    console.log(`📊 World Statistics:`);
    console.log(`   - Land coverage: ${((landTiles / totalTiles) * 100).toFixed(1)}%`);
    console.log(`   - Water coverage: ${((waterTiles / totalTiles) * 100).toFixed(1)}%`);
    console.log(`   - Average elevation: ${(totalElevation / totalTiles).toFixed(3)}`);
    console.log(`   - Average temperature: ${(totalTemperature / totalTiles).toFixed(3)}`);
    console.log(`   - Average rainfall: ${(totalRainfall / totalTiles).toFixed(3)}`);
  }

  // Helper methods
  private multiOctaveNoise(x: number, y: number, seed: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    
    for (let i = 0; i < octaves; i++) {
      value += this.simpleNoise(x * frequency, y * frequency, seed + i) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value;
  }

  private simpleNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  // Diamond-Square Algorithm Implementation
  private generateDiamondSquareHeightmap(): number[][] {
    console.log('🏔️ Generating heightmap using Diamond-Square algorithm...');
    
    const size = Math.max(this.config.width, this.config.height);
    const gridSize = Math.pow(2, Math.ceil(Math.log2(size))) + 1;
    
    // Initialize heightmap with zeros
    const heightmap: number[][] = [];
    for (let y = 0; y < gridSize; y++) {
      heightmap[y] = [];
      for (let x = 0; x < gridSize; x++) {
        heightmap[y]![x] = 0;
      }
    }
    
    // Set initial corner values
    const cornerValue = (min: number, max: number) => min + Math.random() * (max - min);
    heightmap[0]![0] = cornerValue(0.2, 0.8);
    heightmap[0]![gridSize - 1] = cornerValue(0.2, 0.8);
    heightmap[gridSize - 1]![0] = cornerValue(0.2, 0.8);
    heightmap[gridSize - 1]![gridSize - 1] = cornerValue(0.2, 0.8);
    
    let step = gridSize - 1;
    let roughness = 0.5;
    
    while (step > 1) {
      const halfStep = Math.floor(step / 2);
      
      // Diamond step
      for (let y = halfStep; y < gridSize; y += step) {
        for (let x = halfStep; x < gridSize; x += step) {
          const avg = (
            heightmap[y - halfStep]![x - halfStep]! +
            heightmap[y - halfStep]![x + halfStep]! +
            heightmap[y + halfStep]![x - halfStep]! +
            heightmap[y + halfStep]![x + halfStep]!
          ) / 4;
          
          heightmap[y]![x] = avg + (Math.random() - 0.5) * roughness;
        }
      }
      
      // Square step
      for (let y = 0; y < gridSize; y += halfStep) {
        for (let x = (y + halfStep) % step; x < gridSize; x += step) {
          let count = 0;
          let sum = 0;
          
          // Check all four neighbors
          if (y >= halfStep) {
            sum += heightmap[y - halfStep]![x]!;
            count++;
          }
          if (y + halfStep < gridSize) {
            sum += heightmap[y + halfStep]![x]!;
            count++;
          }
          if (x >= halfStep) {
            sum += heightmap[y]![x - halfStep]!;
            count++;
          }
          if (x + halfStep < gridSize) {
            sum += heightmap[y]![x + halfStep]!;
            count++;
          }
          
          if (count > 0) {
            heightmap[y]![x] = (sum / count) + (Math.random() - 0.5) * roughness;
          }
        }
      }
      
      step = halfStep;
      roughness *= 0.5;
    }
    
    // Normalize and apply sea level
    this.normalizeHeightmap(heightmap);
    this.applySeaLevel(heightmap);
    
    // Crop to world size
    const croppedHeightmap: number[][] = [];
    for (let y = 0; y < this.config.height; y++) {
      croppedHeightmap[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        const sourceY = Math.floor((y / this.config.height) * (gridSize - 1));
        const sourceX = Math.floor((x / this.config.width) * (gridSize - 1));
        croppedHeightmap[y]![x] = heightmap[sourceY]![sourceX]!;
      }
    }
    
    return croppedHeightmap;
  }

  private normalizeHeightmap(heightmap: number[][]): void {
    let min = Infinity;
    let max = -Infinity;
    
    // Find min and max values
    for (let y = 0; y < heightmap.length; y++) {
      for (let x = 0; x < heightmap[y]!.length; x++) {
        const value = heightmap[y]![x]!;
        if (value < min) min = value;
        if (value > max) max = value;
      }
    }
    
    // Normalize to 0-1 range
    const range = max - min;
    for (let y = 0; y < heightmap.length; y++) {
      for (let x = 0; x < heightmap[y]!.length; x++) {
        heightmap[y]![x] = (heightmap[y]![x]! - min) / range;
      }
    }
  }

  private applySeaLevel(heightmap: number[][]): void {
    const seaLevel = this.config.seaLevel || 0.5;
    
    for (let y = 0; y < heightmap.length; y++) {
      for (let x = 0; x < heightmap[y]!.length; x++) {
        if (heightmap[y]![x]! < seaLevel) {
          // Smooth transition near sea level
          const distance = (seaLevel - heightmap[y]![x]!) / seaLevel;
          heightmap[y]![x] = Math.max(0, heightmap[y]![x]! - distance * 0.3);
        }
      }
    }
  }

  private identifyContinents(heightmap: number[][]): DFContinent[] {
    console.log('🌍 Identifying continents...');
    
    const visited: boolean[][] = [];
    for (let y = 0; y < this.config.height; y++) {
      visited[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        visited[y]![x] = false;
      }
    }
    
    const continents: DFContinent[] = [];
    const seaLevel = this.config.seaLevel || 0.5;
    
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (!visited[y]![x] && heightmap[y]![x]! >= seaLevel) {
          const continent = this.floodFillContinent(x, y, heightmap, visited, seaLevel);
          if (continent.area > 100) { // Minimum continent size
            continents.push(continent);
          }
        }
      }
    }
    
    // Sort continents by area (largest first)
    continents.sort((a, b) => b.area - a.area);
    
    // Limit to the specified number of continents
    const maxContinents = this.config.continentCount || 3;
    return continents.slice(0, maxContinents);
  }

  private floodFillContinent(startX: number, startY: number, heightmap: number[][], visited: boolean[][], seaLevel: number): DFContinent {
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const continentTiles: { x: number; y: number }[] = [];
    
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let totalElevation = 0;
    let totalTemperature = 0;
    let totalRainfall = 0;
    
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      
      if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height || 
          visited[y]![x] || heightmap[y]![x]! < seaLevel) {
        continue;
      }
      
      visited[y]![x] = true;
      continentTiles.push({ x, y });
      
      // Update bounds
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Accumulate data for averages
      totalElevation += heightmap[y]![x]!;
      totalTemperature += this.getTemperature(x, y);
      totalRainfall += this.getRainfall(x, y);
      
      // Add neighbors to queue
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }
    
    const area = continentTiles.length;
    const avgElevation = totalElevation / area;
    const avgTemperature = totalTemperature / area;
    const avgRainfall = totalRainfall / area;
    
    // Find elevation range
    let minElevation = Infinity, maxElevation = -Infinity;
    for (const tile of continentTiles) {
      const elevation = heightmap[tile.y]![tile.x]!;
      if (elevation < minElevation) minElevation = elevation;
      if (elevation > maxElevation) maxElevation = elevation;
    }
    
    const continent: DFContinent = {
      id: `continent_${this.worldData.continents.length}`,
      name: this.generateContinentName(),
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      area,
      elevation: {
        min: minElevation,
        max: maxElevation,
        average: avgElevation
      },
      climate: {
        temperature: avgTemperature,
        rainfall: avgRainfall
      },
      biomes: [],
      rivers: [],
      lakes: [],
      settlements: [],
      civilizations: []
    };
    
    return continent;
  }

  private identifyIslands(heightmap: number[][]): DFIsland[] {
    console.log('🏝️ Identifying islands...');
    
    const visited: boolean[][] = [];
    for (let y = 0; y < this.config.height; y++) {
      visited[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        visited[y]![x] = false;
      }
    }
    
    const islands: DFIsland[] = [];
    const seaLevel = this.config.seaLevel || 0.5;
    const islandDensity = this.config.islandDensity || 0.3;
    
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        if (!visited[y]![x] && heightmap[y]![x]! >= seaLevel) {
          const island = this.floodFillIsland(x, y, heightmap, visited, seaLevel);
          if (island.area > 10 && island.area < 100 && Math.random() < islandDensity) {
            islands.push(island);
          }
        }
      }
    }
    
    return islands;
  }

  private floodFillIsland(startX: number, startY: number, heightmap: number[][], visited: boolean[][], seaLevel: number): DFIsland {
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    const islandTiles: { x: number; y: number }[] = [];
    
    let centerX = 0, centerY = 0;
    let totalElevation = 0;
    
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      
      if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height || 
          visited[y]![x] || heightmap[y]![x]! < seaLevel) {
        continue;
      }
      
      visited[y]![x] = true;
      islandTiles.push({ x, y });
      
      centerX += x;
      centerY += y;
      totalElevation += heightmap[y]![x]!;
      
      // Add neighbors to queue
      queue.push({ x: x + 1, y });
      queue.push({ x: x - 1, y });
      queue.push({ x, y: y + 1 });
      queue.push({ x, y: y - 1 });
    }
    
    const area = islandTiles.length;
    centerX = Math.floor(centerX / area);
    centerY = Math.floor(centerY / area);
    const avgElevation = totalElevation / area;
    
    // Calculate radius
    let maxDistance = 0;
    for (const tile of islandTiles) {
      const distance = Math.sqrt((tile.x - centerX) ** 2 + (tile.y - centerY) ** 2);
      if (distance > maxDistance) maxDistance = distance;
    }
    
    // Determine island type based on elevation and size
    let type: 'continental' | 'volcanic' | 'coral' | 'mountainous';
    if (avgElevation > 0.7) {
      type = 'mountainous';
    } else if (avgElevation > 0.5) {
      type = 'volcanic';
    } else if (avgElevation < 0.3) {
      type = 'coral';
    } else {
      type = 'continental';
    }
    
    const island: DFIsland = {
      id: `island_${this.worldData.islands.length}`,
      name: this.generateIslandName(type),
      center: { x: centerX, y: centerY },
      radius: maxDistance,
      area,
      elevation: avgElevation,
      type,
      biomes: [],
      rivers: [],
      settlements: []
    };
    
    return island;
  }

  private getNeighbors(x: number, y: number): { x: number; y: number }[] {
    const neighbors = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
    return neighbors;
  }

  private findCapitalLocation(civType: string): { x: number; y: number } | null {
    // Find suitable location based on civilization type
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * this.config.width);
      const y = Math.floor(Math.random() * this.config.height);
      const tile = this.worldData.tiles[y]?.[x];
      if (!tile) continue;
      
      let suitable = false;
      switch (civType) {
        case 'dwarven':
          suitable = tile.elevation > 0.6;
          break;
        case 'human':
          suitable = tile.elevation > 0.3 && tile.elevation < 0.7;
          break;
        case 'elven':
          suitable = tile.type === TileType.FOREST;
          break;
        case 'goblin':
          suitable = tile.elevation < 0.4;
          break;
        case 'orcish':
          suitable = tile.elevation > 0.5;
          break;
      }
      
      if (suitable && tile.type !== TileType.WATER) {
        return { x, y };
      }
    }
    return null;
  }

  private createSettlement(civ: DFCivilization): DFSettlement | null {
    // Find location within civilization territory
    const territory = civ.territory[0];
    if (!territory) return null;
    
    const x = territory.x + Math.random() * territory.width;
    const y = territory.y + Math.random() * territory.height;
    
    if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) return null;
    
    const settlement: DFSettlement = {
      id: `settlement_${this.worldData.settlements.length}`,
      name: this.generateSettlementName(civ.type),
      type: ['hamlet', 'village', 'town', 'city'][Math.floor(Math.random() * 4)] as any,
      position: { x: Math.floor(x), y: Math.floor(y) },
      size: 1 + Math.random() * 5,
      population: 100 + Math.random() * 1000,
      civilization: civ.id,
      buildings: [],
      walls: Math.random() < 0.3,
      gates: Math.floor(Math.random() * 4),
      wealth: Math.random(),
      defenses: Math.random()
    };
    
    return settlement;
  }

  private createRoad(settlement1: DFSettlement, settlement2: DFSettlement): DFRoad | null {
    const road: DFRoad = {
      id: `road_${this.worldData.roads.length}`,
      name: `${settlement1.name} Road`,
      points: [
        settlement1.position,
        settlement2.position
      ],
      width: 1 + Math.random() * 2,
      type: ['dirt', 'stone', 'paved'][Math.floor(Math.random() * 3)] as any,
      condition: 0.5 + Math.random() * 0.5,
      settlements: [settlement1.id, settlement2.id]
    };
    
    return road;
  }

  // Name generation methods
  private generateRiverName(): string {
    const prefixes = ['Black', 'White', 'Red', 'Blue', 'Green', 'Swift', 'Deep', 'Clear'];
    const suffixes = ['River', 'Stream', 'Creek', 'Brook', 'Water'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  private generateLakeName(): string {
    const prefixes = ['Crystal', 'Mirror', 'Deep', 'Clear', 'Misty', 'Silver'];
    const suffixes = ['Lake', 'Pond', 'Pool', 'Waters'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  private generateCaveName(): string {
    const prefixes = ['Dark', 'Deep', 'Ancient', 'Mysterious', 'Hidden'];
    const suffixes = ['Cavern', 'Cave', 'Grotto', 'Chamber'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  private generateBiomeName(type: string): string {
    const adjectives = ['Ancient', 'Mysterious', 'Vast', 'Hidden', 'Sacred'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${type.replace('_', ' ')}`;
  }

  private generateCivilizationName(type: string): string {
    const prefixes = ['Great', 'Ancient', 'Noble', 'Mighty', 'Wise'];
    const suffixes = ['Kingdom', 'Empire', 'Realm', 'Domain', 'Nation'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${type.charAt(0).toUpperCase() + type.slice(1)} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  }

  private generateCultureName(): string {
    const cultures = ['Traditional', 'Progressive', 'Mystical', 'Practical', 'Artistic'];
    const culture = cultures[Math.floor(Math.random() * cultures.length)];
    return culture || 'Traditional';
  }

  private generateReligionName(): string {
    const religions = ['Nature Worship', 'Ancestor Worship', 'Sun Worship', 'Moon Worship', 'Elemental Worship'];
    const religion = religions[Math.floor(Math.random() * religions.length)];
    return religion || 'Nature Worship';
  }

  private generateSettlementName(_civType: string): string {
    const prefixes = ['New', 'Old', 'Great', 'Little', 'Upper', 'Lower'];
    const suffixes = ['town', 'burg', 'ville', 'port', 'ford', 'bridge'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix || 'New'} ${suffix || 'town'}`;
  }

  private generateEventDescription(): string {
    const events = [
      'A great battle was fought here',
      'A mysterious artifact was discovered',
      'A magnificent structure was built',
      'A terrible disaster struck',
      'A grand celebration was held'
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    return event || 'A mysterious event occurred here';
  }

  private generateContinentName(): string {
    const prefixes = ['Great', 'Ancient', 'Mysterious', 'Vast', 'Hidden', 'Sacred'];
    const suffixes = ['Land', 'Continent', 'Realm', 'Domain', 'Territory', 'Region'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix || 'Great'} ${suffix || 'Land'}`;
  }

  private generateIslandName(type: string): string {
    const typePrefixes: { [key: string]: string[] } = {
      'continental': ['Green', 'Fertile', 'Peaceful', 'Abundant'],
      'volcanic': ['Fire', 'Smoking', 'Burning', 'Molten'],
      'coral': ['Crystal', 'Azure', 'Turquoise', 'Pearl'],
      'mountainous': ['Rocky', 'Steep', 'Craggy', 'Alpine']
    };
    
    const prefixes = typePrefixes[type] || ['Mysterious', 'Hidden', 'Ancient'];
    const suffixes = ['Isle', 'Island', 'Atoll', 'Reef', 'Cay'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix || 'Mysterious'} ${suffix || 'Isle'}`;
  }
} 