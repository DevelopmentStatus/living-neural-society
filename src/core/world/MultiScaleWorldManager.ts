import { TileType } from '../../types/simulation';
import type { WorldTile } from '../../types/simulation';

export interface MultiScaleConfig {
  // Zoom levels for detail generation
  worldZoom: number;      // Zoom level for world map (FMG-style)
  regionZoom: number;     // Zoom level for regional detail
  townZoom: number;       // Zoom level for town generation
  cityZoom: number;       // Zoom level for city detail
  
  // Generation parameters
  worldSize: { width: number; height: number };
  tileSize: number;
  
  // FMG-style parameters
  biomeComplexity: number;
  continentCount: number;
  mountainRanges: number;
  riverCount: number;
  
  // Town generation parameters
  townDensity: number;
  maxTownSize: number;
  roadDensity: number;
}

export interface DetailLevel {
  level: 'world' | 'region' | 'town' | 'city';
  zoom: number;
  tileSize: number;
  features: string[];
}

export class MultiScaleWorldManager {
  private config: MultiScaleConfig;
  private detailLevels: DetailLevel[] = [];
  private worldCache: Map<string, any> = new Map();
  private fmgWorldData: any = null; // Store FMG world data
  
  constructor(config: MultiScaleConfig) {
    this.config = config;
    this.setupDetailLevels();
  }
  
  // Add method to set FMG world data
  public setFMGWorldData(worldData: any): void {
    this.fmgWorldData = worldData;
    this.worldCache.clear(); // Clear cache when new data is set
    console.log('🗺️ FMG world data set in MultiScaleWorldManager');
  }
  
  private setupDetailLevels(): void {
    this.detailLevels = [
      {
        level: 'world',
        zoom: this.config.worldZoom,
        tileSize: this.config.tileSize * 4,
        features: ['continents', 'major_rivers', 'mountain_ranges', 'major_cities']
      },
      {
        level: 'region',
        zoom: this.config.regionZoom,
        tileSize: this.config.tileSize * 2,
        features: ['biomes', 'rivers', 'lakes', 'roads', 'towns']
      },
      {
        level: 'town',
        zoom: this.config.townZoom,
        tileSize: this.config.tileSize,
        features: ['buildings', 'streets', 'walls', 'districts']
      },
      {
        level: 'city',
        zoom: this.config.cityZoom,
        tileSize: this.config.tileSize / 2,
        features: ['individual_buildings', 'interiors', 'npcs', 'details']
      }
    ];
  }
  
  public getWorldData(zoom: number, centerX: number, centerY: number, viewportWidth: number, viewportHeight: number): any {
    // If we have FMG world data, use it directly
    if (this.fmgWorldData) {
      return this.getFMGWorldData(zoom, centerX, centerY, viewportWidth, viewportHeight);
    }
    
    // Fallback to original generation
    const detailLevel = this.getDetailLevel(zoom);
    if (!detailLevel) return null;
    
    const cacheKey = `${detailLevel.level}_${Math.floor(centerX / 1000)}_${Math.floor(centerY / 1000)}_${zoom}`;
    
    if (this.worldCache.has(cacheKey)) {
      return this.worldCache.get(cacheKey);
    }
    
    let worldData: any;
    
    switch (detailLevel.level) {
      case 'world':
        worldData = this.generateWorldLevel(centerX, centerY, viewportWidth, viewportHeight);
        break;
      case 'region':
        worldData = this.generateRegionLevel(centerX, centerY, viewportWidth, viewportHeight);
        break;
      case 'town':
        worldData = this.generateTownLevel(centerX, centerY, viewportWidth, viewportHeight);
        break;
      case 'city':
        worldData = this.generateCityLevel(centerX, centerY, viewportWidth, viewportHeight);
        break;
    }
    
    this.worldCache.set(cacheKey, worldData);
    return worldData;
  }
  
  private getFMGWorldData(zoom: number, _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): any {
    // Return FMG world data with proper scaling based on zoom level
    const detailLevel = this.getDetailLevel(zoom);
    if (!detailLevel) return null;
    
    // For now, return the full FMG data - the renderer will handle zoom levels
    return {
      tiles: this.fmgWorldData.tiles,
      politicalRegions: this.fmgWorldData.politicalRegions,
      cities: this.fmgWorldData.cities,
      rivers: this.fmgWorldData.rivers,
      lakes: this.fmgWorldData.lakes,
      roads: [], // FMG doesn't generate roads yet, but we can add them
      buildings: [],
      npcs: [],
      details: []
    };
  }
  
  private getDetailLevel(zoom: number): DetailLevel | null {
    for (let i = this.detailLevels.length - 1; i >= 0; i--) {
      const level = this.detailLevels[i];
      if (level && zoom >= level.zoom) {
        return level;
      }
    }
    return this.detailLevels.length > 0 ? this.detailLevels[0] ?? null : null;
  }
  
  private generateWorldLevel(centerX: number, centerY: number, viewportWidth: number, viewportHeight: number): any {
    // FMG-style world generation (continents, major features)
    const tiles: WorldTile[][] = [];
    const politicalRegions: any[] = [];
    const majorCities: any[] = [];
    const majorRivers: any[] = [];
    
    // Generate large-scale terrain using FMG algorithms
    const worldWidth = Math.ceil(viewportWidth / this.config.tileSize);
    const worldHeight = Math.ceil(viewportHeight / this.config.tileSize);
    
    for (let x = 0; x < worldWidth; x++) {
      tiles[x] = [];
      for (let y = 0; y < worldHeight; y++) {
        const worldX = centerX + (x - worldWidth / 2) * this.config.tileSize * 4;
        const worldY = centerY + (y - worldHeight / 2) * this.config.tileSize * 4;
        
        const tile = this.generateWorldTile(worldX, worldY);
        tiles[x]![y] = tile;
      }
    }
    
    // Generate major political regions
    this.generatePoliticalRegions(politicalRegions, centerX, centerY, viewportWidth, viewportHeight);
    
    // Generate major cities
    this.generateMajorCities(majorCities, centerX, centerY, viewportWidth, viewportHeight);
    
    // Generate major rivers
    this.generateMajorRivers(majorRivers, centerX, centerY, viewportWidth, viewportHeight);
    
    return {
      tiles,
      politicalRegions,
      cities: majorCities,
      rivers: majorRivers,
      lakes: [],
      roads: [],
      agents: [],
      structures: []
    };
  }
  
  private generateRegionLevel(centerX: number, centerY: number, viewportWidth: number, viewportHeight: number): any {
    // More detailed regional generation
    const tiles: WorldTile[][] = [];
    const towns: any[] = [];
    const roads: any[] = [];
    const rivers: any[] = [];
    
    const worldWidth = Math.ceil(viewportWidth / (this.config.tileSize * 2));
    const worldHeight = Math.ceil(viewportHeight / (this.config.tileSize * 2));
    
    for (let x = 0; x < worldWidth; x++) {
      tiles[x] = [];
      for (let y = 0; y < worldHeight; y++) {
        const worldX = centerX + (x - worldWidth / 2) * this.config.tileSize * 2;
        const worldY = centerY + (y - worldHeight / 2) * this.config.tileSize * 2;
        
        const tile = this.generateRegionTile(worldX, worldY);
        tiles[x]![y] = tile;
      }
    }
    
    // Generate towns
    this.generateTowns(towns, centerX, centerY, viewportWidth, viewportHeight);
    
    // Generate regional roads
    this.generateRegionalRoads(roads, centerX, centerY, viewportWidth, viewportHeight);
    
    // Generate detailed rivers
    this.generateDetailedRivers(rivers, centerX, centerY, viewportWidth, viewportHeight);
    
    return {
      tiles,
      politicalRegions: [],
      cities: towns,
      rivers,
      lakes: [],
      roads,
      agents: [],
      structures: []
    };
  }
  
  private generateTownLevel(centerX: number, centerY: number, viewportWidth: number, viewportHeight: number): any {
    // TownGeneratorOS-style town generation
    const tiles: WorldTile[][] = [];
    const buildings: any[] = [];
    const streets: any[] = [];
    const walls: any[] = [];
    
    // Check if we're over a town location
    const townData = this.getTownAtLocation(centerX, centerY);
    if (townData) {
      // Generate town layout using TownGeneratorOS concepts
      const townLayout = this.generateTownLayout(townData);
      
      // Convert town layout to tiles
      this.convertTownToTiles(townLayout, tiles, buildings, streets, walls);
    } else {
      // Generate rural/empty area
      this.generateRuralArea(tiles, centerX, centerY, viewportWidth, viewportHeight);
    }
    
    return {
      tiles,
      politicalRegions: [],
      cities: [],
      rivers: [],
      lakes: [],
      roads: streets,
      agents: [],
      structures: buildings
    };
  }
  
  private generateCityLevel(centerX: number, centerY: number, viewportWidth: number, viewportHeight: number): any {
    // Most detailed level - individual buildings, NPCs, etc.
    const tiles: WorldTile[][] = [];
    const buildings: any[] = [];
    const npcs: any[] = [];
    const details: any[] = [];
    
    // Generate individual building details
    this.generateBuildingDetails(buildings, centerX, centerY, viewportWidth, viewportHeight);
    
    // Generate NPCs and interactions
    this.generateNPCs(npcs, centerX, centerY, viewportWidth, viewportHeight);
    
    // Generate environmental details
    this.generateEnvironmentalDetails(details, centerX, centerY, viewportWidth, viewportHeight);
    
    return {
      tiles,
      politicalRegions: [],
      cities: [],
      rivers: [],
      lakes: [],
      roads: [],
      agents: npcs,
      structures: buildings
    };
  }
  
  // Helper methods for different generation levels
  private generateWorldTile(x: number, y: number): WorldTile {
    // FMG-style world tile generation
    const elevation = this.getMultiOctaveNoise(x * 0.001, y * 0.001, 1, 6);
    const temperature = this.getMultiOctaveNoise(x * 0.002, y * 0.002, 2, 4);
    const humidity = this.getMultiOctaveNoise(x * 0.003, y * 0.003, 3, 3);
    
    const biome = this.determineBiome(elevation, temperature, humidity);
    const tileType = this.mapBiomeToTileType(biome);
    
    return {
      x,
      y,
      type: tileType,
      resources: this.generateWorldResources(biome),
      elevation,
      temperature,
      humidity,
      fertility: 0.5,
      accessibility: 1 - elevation,
      structures: [],
      agents: []
    };
  }
  
  private generateRegionTile(x: number, y: number): WorldTile {
    // More detailed regional tile generation
    const elevation = this.getMultiOctaveNoise(x * 0.01, y * 0.01, 1, 4);
    const temperature = this.getMultiOctaveNoise(x * 0.02, y * 0.02, 2, 3);
    const humidity = this.getMultiOctaveNoise(x * 0.03, y * 0.03, 3, 2);
    
    const biome = this.determineDetailedBiome(elevation, temperature, humidity);
    const tileType = this.mapBiomeToTileType(biome);
    
    return {
      x,
      y,
      type: tileType,
      resources: this.generateRegionalResources(biome),
      elevation,
      temperature,
      humidity,
      fertility: this.calculateFertility(elevation, humidity),
      accessibility: this.calculateAccessibility(elevation),
      structures: [],
      agents: []
    };
  }
  
  private generateTownLayout(townData: any): any {
    // TownGeneratorOS-style town generation
    const layout: any = {
      size: townData.size,
      seed: townData.seed,
      roads: [],
      buildings: [],
      walls: null,
      districts: []
    };

    // Generate road network
    layout.roads = this.generateRoadNetwork(townData.size, townData.seed);

    // Generate districts
    layout.districts = this.generateDistricts(townData.size, townData.seed);
    // Generate buildings
    layout.buildings = this.generateBuildings(layout.districts, townData.seed);
    
    // Generate walls if needed
    if (townData.hasWalls) {
      layout.walls = this.generateWalls(townData.size, townData.seed);
    }
    
    return layout;
  }
  
  private generateRoadNetwork(size: number, seed: number): any[] {
    // TownGeneratorOS-style road generation
    const roads = [];
    const mainStreet = this.generateMainStreet(size, seed);
    roads.push(mainStreet);
    
    // Generate secondary streets
    const secondaryStreets = this.generateSecondaryStreets(mainStreet, size, seed);
    roads.push(...secondaryStreets);
    
    return roads;
  }
  
  private generateDistricts(size: number, seed: number): any[] {
    // Generate different districts (market, residential, etc.)
    const districts = [];
    
    // Market district
    districts.push({
      type: 'market',
      geometry: this.generateMarketGeometry(size, seed),
      buildings: []
    });
    
    // Residential districts
    const residentialCount = Math.floor(size / 100);
    for (let i = 0; i < residentialCount; i++) {
      districts.push({
        type: 'residential',
        geometry: this.generateResidentialGeometry(size, seed + i),
        buildings: []
      });
    }
    
    return districts;
  }
  
  private generateBuildings(districts: any[], seed: number): any[] {
    const buildings = [];
    
    for (const district of districts) {
      const districtBuildings = this.generateDistrictBuildings(district, seed);
      buildings.push(...districtBuildings);
    }
    
    return buildings;
  }
  
  // Utility methods
  private getMultiOctaveNoise(x: number, y: number, seed: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += this.simpleNoise(x * frequency, y * frequency, seed + i) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }
  
  private simpleNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 123.456) * 43758.5453;
    return (n - Math.floor(n));
  }
  
  private determineBiome(elevation: number, temperature: number, humidity: number): string {
    if (elevation > 0.8) return 'mountain';
    if (temperature < 0.3) return 'tundra';
    if (temperature > 0.8 && humidity < 0.3) return 'desert';
    if (humidity > 0.8) return 'wetland';
    if (temperature > 0.6 && humidity > 0.6) return 'forest';
    return 'grassland';
  }
  
  private determineDetailedBiome(elevation: number, temperature: number, humidity: number): string {
    // More detailed biome determination
    if (elevation > 0.9) return 'alpine';
    if (elevation > 0.7) return 'mountain';
    if (temperature < 0.2) return 'arctic';
    if (temperature < 0.4) return 'tundra';
    if (temperature > 0.9 && humidity < 0.2) return 'desert';
    if (temperature > 0.8 && humidity < 0.4) return 'savanna';
    if (humidity > 0.9) return 'swamp';
    if (temperature > 0.7 && humidity > 0.7) return 'tropical_forest';
    if (temperature > 0.5 && humidity > 0.6) return 'temperate_forest';
    if (humidity > 0.5) return 'grassland';
    return 'plains';
  }
  
  private mapBiomeToTileType(biome: string): TileType {
    switch (biome) {
      case 'mountain':
      case 'alpine':
        return TileType.MOUNTAIN;
      case 'forest':
      case 'tropical_forest':
      case 'temperate_forest':
        return TileType.FOREST;
      case 'desert':
      case 'savanna':
        return TileType.DESERT;
      case 'wetland':
      case 'swamp':
        return TileType.WATER;
      case 'grassland':
      case 'plains':
        return TileType.GRASS;
      default:
        return TileType.GRASS;
    }
  }
  
  // Placeholder methods for town generation
  private getTownAtLocation(_x: number, _y: number): any | null {
    // Check if there's a town at this location
    // This would be based on your world generation
    return null;
  }
  
  private generatePoliticalRegions(_regions: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate political regions
  }
  
  private generateMajorCities(_cities: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate major cities
  }
  
  private generateMajorRivers(_rivers: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate major rivers
  }
  
  private generateTowns(_towns: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate towns
  }
  
  private generateRegionalRoads(_roads: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate regional roads
  }
  
  private generateDetailedRivers(_rivers: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate detailed rivers
  }
  
  private generateRuralArea(_tiles: WorldTile[][], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate rural area
  }
  
  private generateBuildingDetails(_buildings: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate building details
  }
  
  private generateNPCs(_npcs: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate NPCs
  }
  
  private generateEnvironmentalDetails(_details: any[], _centerX: number, _centerY: number, _viewportWidth: number, _viewportHeight: number): void {
    // Generate environmental details
  }
  
  private generateWorldResources(_biome: string): any[] {
    // Generate world-level resources
    return [];
  }
  
  private generateRegionalResources(_biome: string): any[] {
    // Generate regional resources
    return [];
  }
  
  private calculateFertility(elevation: number, humidity: number): number {
    return Math.max(0, Math.min(1, (1 - elevation) * 0.7 + humidity * 0.3));
  }
  
  private calculateAccessibility(elevation: number): number {
    return Math.max(0, Math.min(1, 1 - elevation));
  }
  
  private convertTownToTiles(_townLayout: any, _tiles: WorldTile[][], _buildings: any[], _streets: any[], _walls: any[]): void {
    // Convert town layout to tiles
  }
  
  private generateMainStreet(_size: number, _seed: number): any {
    // Generate main street
    return { type: 'main', points: [] };
  }
  
  private generateSecondaryStreets(_mainStreet: any, _size: number, _seed: number): any[] {
    // Generate secondary streets
    return [];
  }
  
  private generateMarketGeometry(_size: number, _seed: number): any[] {
    // Generate market geometry
    return [];
  }
  
  private generateResidentialGeometry(_size: number, _seed: number): any[] {
    // Generate residential geometry
    return [];
  }
  
  private generateDistrictBuildings(_district: any, _seed: number): any[] {
    // Generate buildings for a district
    return [];
  }
  
  private generateWalls(_size: number, _seed: number): any {
    // Generate walls
    return null;
  }
} 