import { WorldTile, TileType, ResourceType, Structure, StructureType, Resource, TileLevel, FireState } from '../../types/simulation';

export interface WorldGenerationConfig {
  width: number;
  height: number;
  tileSize: number;
  biomeComplexity: number;
  resourceDensity: number;
  structureDensity: number;
  // RimWorld-inspired settings
  continentCount: number;
  mountainRanges: number;
  riverCount: number;
  lakeCount: number;
  politicalRegions: number;
  cityCount: number;
  roadDensity: number;
  // New RimWorld-style settings
  temperatureRange: { min: number; max: number };
  rainfallRange: { min: number; max: number };
  growingSeason: { start: number; end: number };
  threatLevel: number;
  fertilityVariation: number;
  resourceRichness: number;
}

export interface TerrainLayer {
  elevation: number;
  temperature: number;
  humidity: number;
  fertility: number;
  biome: string;
  politicalRegion?: number;
  city?: boolean;
  road?: boolean;
  river?: boolean;
  lake?: boolean;
  // RimWorld additions
  growingDays: number;
  threatLevel: number;
  resourceRichness: number;
  soilQuality: number;
  drainage: number;
  windExposure: number;
  sunlight: number;
}

export interface PoliticalRegion {
  id: number;
  name: string;
  color: string;
  territory: { x: number; y: number; width: number; height: number }[];
  capital?: { x: number; y: number };
  population: number;
  resources: ResourceType[];
  // RimWorld additions
  faction: string;
  ideology: string;
  technology: number;
  wealth: number;
  relations: { [factionId: string]: number };
}

// RimWorld-inspired biome definitions
export interface BiomeDefinition {
  name: string;
  baseTemperature: number;
  temperatureRange: number;
  baseHumidity: number;
  humidityRange: number;
  fertility: number;
  threatLevel: number;
  growingDays: number;
  resources: ResourceType[];
  color: string;
  description: string;
}

export class WorldGenerator {
  private config: WorldGenerationConfig;
  private noiseCache: Map<string, number> = new Map();
  private politicalRegions: PoliticalRegion[] = [];
  private cities: { x: number; y: number; name: string; size: number }[] = [];
  private rivers: { points: { x: number; y: number }[]; width: number }[] = [];
  private lakes: { center: { x: number; y: number }; radius: number }[] = [];
  
  // RimWorld biome definitions
  private biomes: BiomeDefinition[] = [
    {
      name: 'tropical_rainforest',
      baseTemperature: 0.9,
      temperatureRange: 0.1,
      baseHumidity: 0.9,
      humidityRange: 0.1,
      fertility: 0.8,
      threatLevel: 0.7,
      growingDays: 365,
      resources: [ResourceType.WOOD, ResourceType.FOOD, ResourceType.WATER],
      color: '#2d5016',
      description: 'Dense, humid jungle with year-round growing season'
    },
    {
      name: 'desert',
      baseTemperature: 0.8,
      temperatureRange: 0.3,
      baseHumidity: 0.1,
      humidityRange: 0.2,
      fertility: 0.2,
      threatLevel: 0.6,
      growingDays: 120,
      resources: [ResourceType.STONE, ResourceType.METAL],
      color: '#d2b48c',
      description: 'Hot, arid landscape with limited resources'
    },
    {
      name: 'temperate_forest',
      baseTemperature: 0.6,
      temperatureRange: 0.4,
      baseHumidity: 0.7,
      humidityRange: 0.3,
      fertility: 0.7,
      threatLevel: 0.4,
      growingDays: 240,
      resources: [ResourceType.WOOD, ResourceType.FOOD, ResourceType.WATER],
      color: '#4a7c59',
      description: 'Moderate climate with good growing conditions'
    },
    {
      name: 'boreal_forest',
      baseTemperature: 0.3,
      temperatureRange: 0.5,
      baseHumidity: 0.6,
      humidityRange: 0.3,
      fertility: 0.5,
      threatLevel: 0.5,
      growingDays: 180,
      resources: [ResourceType.WOOD, ResourceType.STONE],
      color: '#2f4f4f',
      description: 'Cold forest with long winters'
    },
    {
      name: 'tundra',
      baseTemperature: 0.2,
      temperatureRange: 0.3,
      baseHumidity: 0.4,
      humidityRange: 0.4,
      fertility: 0.3,
      threatLevel: 0.6,
      growingDays: 90,
      resources: [ResourceType.STONE, ResourceType.METAL],
      color: '#8fbc8f',
      description: 'Frozen landscape with minimal vegetation'
    },
    {
      name: 'mountain',
      baseTemperature: 0.4,
      temperatureRange: 0.6,
      baseHumidity: 0.5,
      humidityRange: 0.5,
      fertility: 0.2,
      threatLevel: 0.8,
      growingDays: 120,
      resources: [ResourceType.STONE, ResourceType.METAL],
      color: '#696969',
      description: 'Rugged terrain with valuable minerals'
    },
    {
      name: 'swamp',
      baseTemperature: 0.7,
      temperatureRange: 0.2,
      baseHumidity: 0.9,
      humidityRange: 0.1,
      fertility: 0.6,
      threatLevel: 0.7,
      growingDays: 300,
      resources: [ResourceType.WOOD, ResourceType.WATER],
      color: '#556b2f',
      description: 'Wet, marshy terrain with disease risks'
    },
    {
      name: 'grassland',
      baseTemperature: 0.6,
      temperatureRange: 0.4,
      baseHumidity: 0.5,
      humidityRange: 0.4,
      fertility: 0.6,
      threatLevel: 0.3,
      growingDays: 200,
      resources: [ResourceType.FOOD, ResourceType.WATER],
      color: '#90ee90',
      description: 'Open plains ideal for agriculture'
    }
  ];

  constructor(config: WorldGenerationConfig) {
    this.config = {
      ...config,
      continentCount: config.continentCount || 3,
      mountainRanges: config.mountainRanges || 5,
      riverCount: config.riverCount || 15,
      lakeCount: config.lakeCount || 8,
      politicalRegions: config.politicalRegions || 8,
      cityCount: config.cityCount || 20,
      roadDensity: config.roadDensity || 0.3,
      temperatureRange: config.temperatureRange || { min: 0.1, max: 0.9 },
      rainfallRange: config.rainfallRange || { min: 0.2, max: 0.9 },
      growingSeason: config.growingSeason || { start: 60, end: 300 },
      threatLevel: config.threatLevel || 0.5,
      fertilityVariation: config.fertilityVariation || 0.3,
      resourceRichness: config.resourceRichness || 0.7,
    };
  }

  public generateWorld(): WorldTile[][] {
    console.log('Starting RimWorld-style world generation...');
    
    // Generate terrain layers with RimWorld-style complexity
    const terrainLayers = this.generateTerrainLayers();
    
    // Generate political regions with factions
    this.generatePoliticalRegions(terrainLayers);
    
    // Generate cities and settlements
    this.generateCities(terrainLayers);
    
    // Generate rivers and water systems
    this.generateRivers(terrainLayers);
    
    // Generate lakes
    this.generateLakes(terrainLayers);
    
    // Generate roads and infrastructure
    this.generateRoads(terrainLayers);
    
    // Convert terrain layers to world tiles
    const world = this.convertTerrainToTiles(terrainLayers);
    
    // Add detailed features and resources
    this.addDetailedFeatures(world);
    
    console.log('RimWorld-style world generation complete!');
    console.log(`Generated ${this.politicalRegions.length} political regions`);
    console.log(`Generated ${this.cities.length} cities`);
    console.log(`Generated ${this.rivers.length} rivers`);
    console.log(`Generated ${this.lakes.length} lakes`);
    
    return world;
  }

  private generateTerrainLayers(): TerrainLayer[][] {
    const layers: TerrainLayer[][] = [];
    
    for (let x = 0; x < this.config.width; x += this.config.tileSize) {
      layers[x] = [];
      for (let y = 0; y < this.config.height; y += this.config.tileSize) {
        if (layers[x]) {
          layers[x]![y] = this.generateTerrainLayer(x, y);
        }
      }
    }
    
    return layers;
  }

  private generateTerrainLayer(x: number, y: number): TerrainLayer {
    // Multiple noise layers for complex terrain (inspired by Azgaar's approach)
    const baseElevation = this.getMultiOctaveNoise(x * 0.005, y * 0.005, 1, 6);
    const detailElevation = this.getMultiOctaveNoise(x * 0.02, y * 0.02, 2, 4);
    const mountainNoise = this.getMultiOctaveNoise(x * 0.01, y * 0.01, 3, 3);
    
    // Combine elevation layers with mountain influence
    const elevation = Math.max(0, Math.min(1, 
      baseElevation * 0.6 + 
      detailElevation * 0.3 + 
      mountainNoise * 0.1
    ));
    
    // Temperature based on latitude, elevation, and seasonal variation
    const latitude = y / this.config.height;
    const baseTemp = 1 - latitude; // Hotter at equator
    const elevationTemp = 1 - elevation * 0.7; // Colder at higher elevations
    const seasonalTemp = this.getSeasonalVariation(x, y);
    const temperature = Math.max(0, Math.min(1, 
      baseTemp * 0.5 + 
      elevationTemp * 0.3 + 
      seasonalTemp * 0.2
    ));
    
    // Humidity based on temperature, elevation, and proximity to water
    const baseHumidity = this.getMultiOctaveNoise(x * 0.015, y * 0.015, 4, 4);
    const tempHumidity = 1 - Math.abs(temperature - 0.6) * 1.5; // More humidity in moderate temps
    const elevationHumidity = 1 - elevation * 0.5; // Less humidity at high elevations
    const humidity = Math.max(0, Math.min(1, 
      baseHumidity * 0.4 + 
      tempHumidity * 0.4 + 
      elevationHumidity * 0.2
    ));
    
    // Fertility based on multiple factors (RimWorld-style)
    const soilFertility = this.getMultiOctaveNoise(x * 0.025, y * 0.025, 5, 3);
    const drainage = this.getMultiOctaveNoise(x * 0.03, y * 0.03, 6, 2);
    const fertility = Math.max(0, Math.min(1, 
      (1 - elevation) * 0.3 + 
      humidity * 0.3 + 
      soilFertility * 0.2 +
      (1 - drainage) * 0.2
    ));
    
    // RimWorld-specific calculations
    const growingDays = this.calculateGrowingDays(temperature, elevation);
    const threatLevel = this.calculateThreatLevel(elevation, humidity, temperature);
    const resourceRichness = this.calculateResourceRichness(elevation, fertility);
    const soilQuality = this.calculateSoilQuality(fertility, drainage);
    const windExposure = this.calculateWindExposure(x, y, elevation);
    const sunlight = this.calculateSunlight(latitude, elevation);
    
    // Determine biome using RimWorld-style logic
    const biome = this.determineBiome(elevation, temperature, humidity, fertility);
    
    return {
      elevation,
      temperature,
      humidity,
      fertility,
      biome,
      growingDays,
      threatLevel,
      resourceRichness,
      soilQuality,
      drainage,
      windExposure,
      sunlight,
    };
  }

  private getSeasonalVariation(x: number, y: number): number {
    // Simulate seasonal temperature variation
    const seasonalNoise = this.getMultiOctaveNoise(x * 0.01, y * 0.01, 7, 2);
    return 0.5 + (seasonalNoise - 0.5) * 0.3;
  }

  private calculateGrowingDays(temperature: number, elevation: number): number {
    // RimWorld-style growing season calculation
    const baseDays = 365;
    const tempFactor = temperature * 0.8 + 0.2; // Temperature affects growing season
    const elevationFactor = 1 - elevation * 0.6; // Higher elevation = shorter growing season
    
    return Math.floor(baseDays * tempFactor * elevationFactor);
  }

  private calculateThreatLevel(elevation: number, humidity: number, temperature: number): number {
    // RimWorld-style threat calculation
    let threat = 0.3; // Base threat
    
    // Mountains are more dangerous
    if (elevation > 0.7) threat += 0.3;
    
    // Extreme environments are more dangerous
    if (temperature < 0.2 || temperature > 0.8) threat += 0.2;
    if (humidity > 0.8) threat += 0.1; // Disease risk
    
    // Random variation
    threat += (Math.random() - 0.5) * 0.2;
    
    return Math.max(0, Math.min(1, threat));
  }

  private calculateResourceRichness(elevation: number, fertility: number): number {
    // RimWorld-style resource richness
    let richness = 0.5; // Base richness
    
    // Mountains have more minerals
    if (elevation > 0.6) richness += 0.3;
    
    // Fertile areas have more biological resources
    if (fertility > 0.6) richness += 0.2;
    
    // Random variation
    richness += (Math.random() - 0.5) * 0.3;
    
    return Math.max(0, Math.min(1, richness));
  }

  private calculateSoilQuality(fertility: number, drainage: number): number {
    // RimWorld-style soil quality
    return Math.max(0, Math.min(1, 
      fertility * 0.6 + 
      (1 - drainage) * 0.4
    ));
  }

  private calculateWindExposure(x: number, y: number, elevation: number): number {
    // Simulate wind exposure based on elevation and position
    const windNoise = this.getMultiOctaveNoise(x * 0.02, y * 0.02, 8, 2);
    return Math.max(0, Math.min(1, 
      elevation * 0.5 + 
      windNoise * 0.5
    ));
  }

  private calculateSunlight(latitude: number, elevation: number): number {
    // Simulate sunlight based on latitude and elevation
    const latFactor = 1 - Math.abs(latitude - 0.5) * 0.5; // More sunlight at equator
    const elevFactor = 1 - elevation * 0.3; // Less sunlight at high elevations
    
    return Math.max(0, Math.min(1, 
      latFactor * 0.7 + 
      elevFactor * 0.3
    ));
  }

  private determineBiome(elevation: number, temperature: number, humidity: number, fertility: number): string {
    // RimWorld-style biome determination with more sophisticated logic
    
    // Mountain biomes
    if (elevation > 0.8) {
      return 'mountain';
    }
    
    // Temperature and humidity based biomes
    if (temperature > 0.8 && humidity < 0.3) {
      return 'desert';
    }
    
    if (temperature < 0.3) {
      return humidity > 0.5 ? 'boreal_forest' : 'tundra';
    }
    
    if (humidity > 0.8) {
      return temperature > 0.7 ? 'tropical_rainforest' : 'swamp';
    }
    
    if (temperature > 0.7 && humidity > 0.6) {
      return 'tropical_rainforest';
    }
    
    if (temperature < 0.5 && humidity > 0.6) {
      return 'boreal_forest';
    }
    
    if (fertility > 0.6 && elevation < 0.4) {
      return 'grassland';
    }
    
    if (humidity > 0.6 && elevation < 0.6) {
      return 'temperate_forest';
    }
    
    // Default to grassland
    return 'grassland';
  }

  private generatePoliticalRegions(terrainLayers: TerrainLayer[][]): void {
    this.politicalRegions = [];
    
    // RimWorld-style faction generation
    const factions = [
      { name: 'Tribal', ideology: 'Primitive', technology: 0.2, wealth: 0.3 },
      { name: 'Outlander', ideology: 'Neutral', technology: 0.6, wealth: 0.5 },
      { name: 'Pirate', ideology: 'Hostile', technology: 0.4, wealth: 0.4 },
      { name: 'Empire', ideology: 'Authoritarian', technology: 0.9, wealth: 0.8 },
      { name: 'Nomad', ideology: 'Nomadic', technology: 0.3, wealth: 0.2 },
    ];
    
    // Generate region seeds based on fertile areas
    const seeds: { x: number; y: number; fertility: number }[] = [];
    for (let x = 0; x < this.config.width; x += this.config.tileSize * 5) {
      for (let y = 0; y < this.config.height; y += this.config.tileSize * 5) {
        const layer = terrainLayers[x]?.[y];
        if (layer && layer.fertility > 0.4 && layer.elevation < 0.7) {
          seeds.push({ x, y, fertility: layer.fertility });
        }
      }
    }
    
    // Sort by fertility and take the best locations
    seeds.sort((a, b) => b.fertility - a.fertility);
    const regionSeeds = seeds.slice(0, this.config.politicalRegions);
    
    // Generate regions using Voronoi-like expansion
    for (let i = 0; i < regionSeeds.length; i++) {
      const seed = regionSeeds[i];
      if (seed) {
        const faction = factions[i % factions.length];
        if (faction) {
          const region = this.createPoliticalRegion(i, seed, terrainLayers, faction);
          this.politicalRegions.push(region);
        }
      }
    }
    
    // Assign terrain to regions
    this.assignTerrainToRegions(terrainLayers);
  }

  private createPoliticalRegion(
    id: number, 
    seed: { x: number; y: number; fertility: number }, 
    terrainLayers: TerrainLayer[][],
    faction: { name: string; ideology: string; technology: number; wealth: number }
  ): PoliticalRegion {
    const names = [
      'Empire of', 'Kingdom of', 'Principality of', 'Republic of', 'Duchy of',
      'Federation of', 'Alliance of', 'Confederation of', 'Union of', 'Commonwealth of',
      'Tribe of', 'Clan of', 'Band of', 'Gang of', 'Syndicate of'
    ];
    const regions = [
      'Avaloria', 'Eldoria', 'Mystara', 'Thalassia', 'Verdania',
      'Crystalia', 'Emberia', 'Frostia', 'Lumina', 'Shadowia',
      'Ironclad', 'Stormhold', 'Ravencrest', 'Wolfheart', 'Bearclaw'
    ];
    
    const name = `${names[id % names.length] ?? 'Kingdom of'} ${regions[id % regions.length] ?? 'Unknown'}`;
    const colors = [
      '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
      '#00BCD4', '#FF5722', '#795548', '#607D8B', '#E91E63',
      '#8BC34A', '#FFC107', '#9E9E9E', '#673AB7', '#3F51B5'
    ];
    
    // Initialize relations with other factions
    const relations: { [factionId: string]: number } = {};
    for (let i = 0; i < this.config.politicalRegions; i++) {
      if (i !== id) {
        relations[i] = Math.random() * 0.6 - 0.3; // -0.3 to 0.3
      }
    }
    
    return {
      id,
      name,
      color: colors[id % colors.length] ?? '#4CAF50',
      territory: [{ x: seed.x, y: seed.y, width: 1, height: 1 }],
      population: Math.floor(seed.fertility * 1000) + 500,
      resources: this.determineRegionResources(seed, terrainLayers),
      faction: faction.name,
      ideology: faction.ideology,
      technology: faction.technology,
      wealth: faction.wealth,
      relations,
    };
  }

  private determineRegionResources(seed: { x: number; y: number; fertility: number }, terrainLayers: TerrainLayer[][]): ResourceType[] {
    const resources: ResourceType[] = [];
    
    // Check surrounding area for resources (RimWorld-style)
    for (let dx = -8; dx <= 8; dx++) {
      for (let dy = -8; dy <= 8; dy++) {
        const x = seed.x + dx * this.config.tileSize;
        const y = seed.y + dy * this.config.tileSize;
        const layer = terrainLayers[x]?.[y];
        
        if (layer) {
          const biome = this.biomes.find(b => b.name === layer.biome);
          if (biome) {
            biome.resources.forEach(resource => {
              if (!resources.includes(resource)) {
                resources.push(resource);
              }
            });
          }
          
          // Add special resources based on terrain features
          if (layer.elevation > 0.7 && !resources.includes(ResourceType.METAL)) {
            resources.push(ResourceType.METAL);
          }
          if (layer.humidity > 0.8 && !resources.includes(ResourceType.WATER)) {
            resources.push(ResourceType.WATER);
          }
        }
      }
    }
    
    return resources.length > 0 ? resources : [ResourceType.FOOD];
  }

  private assignTerrainToRegions(terrainLayers: TerrainLayer[][]): void {
    for (let x = 0; x < this.config.width; x += this.config.tileSize) {
      for (let y = 0; y < this.config.height; y += this.config.tileSize) {
        const layer = terrainLayers[x]?.[y];
        if (layer) {
          // Find closest region
          let closestRegion = 0;
          let minDistance = Infinity;
          
          for (const region of this.politicalRegions) {
            for (const territory of region.territory) {
              const distance = Math.sqrt(
                Math.pow(x - territory.x, 2) + Math.pow(y - territory.y, 2)
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestRegion = region.id;
              }
            }
          }
          
          layer.politicalRegion = closestRegion;
        }
      }
    }
  }

  private generateCities(terrainLayers: TerrainLayer[][]): void {
    this.cities = [];
    
    // Generate capitals for each region
    for (const region of this.politicalRegions) {
      const capital = this.findBestCityLocation(region, terrainLayers);
      if (capital) {
        this.cities.push({
          x: capital.x,
          y: capital.y,
          name: `${region.name} Capital`,
          size: 3
        });
        region.capital = capital;
      }
    }
    
    // Generate additional cities
    const remainingCities = this.config.cityCount - this.cities.length;
    for (let i = 0; i < remainingCities; i++) {
      const city = this.findRandomCityLocation(terrainLayers);
      if (city) {
        this.cities.push({
          x: city.x,
          y: city.y,
          name: `City ${i + 1}`,
          size: 1 + Math.floor(Math.random() * 2)
        });
      }
    }
    
    // Mark cities on terrain
    for (const city of this.cities) {
      const layer = terrainLayers[city.x]?.[city.y];
      if (layer) {
        layer.city = true;
      }
    }
  }

  private findBestCityLocation(region: PoliticalRegion, terrainLayers: TerrainLayer[][]): { x: number; y: number } | null {
    let bestLocation: { x: number; y: number } | null = null;
    let bestScore = -1;
    
    for (let x = 0; x < this.config.width; x += this.config.tileSize) {
      for (let y = 0; y < this.config.height; y += this.config.tileSize) {
        const layer = terrainLayers[x]?.[y];
        if (layer && layer.politicalRegion === region.id) {
          const score = this.calculateCityScore(x, y, layer, terrainLayers);
          if (score > bestScore) {
            bestScore = score;
            bestLocation = { x, y };
          }
        }
      }
    }
    
    return bestLocation;
  }

  private calculateCityScore(x: number, y: number, layer: TerrainLayer, terrainLayers: TerrainLayer[][]): number {
    let score = 0;
    
    // Prefer fertile, accessible areas
    score += layer.fertility * 3;
    score += (1 - layer.elevation) * 2;
    score += layer.humidity * 1.5;
    
    // Bonus for being near water
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const nearbyLayer = terrainLayers[x + dx * this.config.tileSize]?.[y + dy * this.config.tileSize];
        if (nearbyLayer && nearbyLayer.biome === 'coastal') {
          score += 2;
        }
      }
    }
    
    return score;
  }

  private findRandomCityLocation(terrainLayers: TerrainLayer[][]): { x: number; y: number } | null {
    const attempts = 100;
    
    for (let i = 0; i < attempts; i++) {
      const x = Math.floor(Math.random() * this.config.width / this.config.tileSize) * this.config.tileSize;
      const y = Math.floor(Math.random() * this.config.height / this.config.tileSize) * this.config.tileSize;
      const layer = terrainLayers[x]?.[y];
      
      if (layer && layer.fertility > 0.4 && layer.elevation < 0.5 && !layer.city) {
        return { x, y };
      }
    }
    
    return null;
  }

  private generateRivers(terrainLayers: TerrainLayer[][]): void {
    this.rivers = [];
    
    for (let i = 0; i < this.config.riverCount; i++) {
      const river = this.generateSingleRiver(terrainLayers);
      if (river) {
        this.rivers.push(river);
      }
    }
    
    // Mark rivers on terrain
    for (const river of this.rivers) {
      for (const point of river.points) {
        const layer = terrainLayers[point.x]?.[point.y];
        if (layer) {
          layer.river = true;
        }
      }
    }
  }

  private generateSingleRiver(terrainLayers: TerrainLayer[][]): { points: { x: number; y: number }[]; width: number } | null {
    // Find a high elevation starting point
    let startX = 0, startY = 0, maxElevation = 0;
    
    for (let x = 0; x < this.config.width; x += this.config.tileSize) {
      for (let y = 0; y < this.config.height; y += this.config.tileSize) {
        const layer = terrainLayers[x]?.[y];
        if (layer && layer.elevation > maxElevation) {
          maxElevation = layer.elevation;
          startX = x;
          startY = y;
        }
      }
    }
    
    if (maxElevation < 0.6) return null;
    
    const points: { x: number; y: number }[] = [];
    let x = startX, y = startY;
    const maxLength = 100;
    
    for (let i = 0; i < maxLength; i++) {
      points.push({ x, y });
      
      // Find the steepest downhill direction
      let bestDx = 0, bestDy = 0, steepest = 0;
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          
          const nextX = x + dx * this.config.tileSize;
          const nextY = y + dy * this.config.tileSize;
          const nextLayer = terrainLayers[nextX]?.[nextY];
          
          if (nextLayer) {
            const currentLayer = terrainLayers[x]?.[y];
            if (currentLayer) {
              const slope = currentLayer.elevation - nextLayer.elevation;
              if (slope > steepest) {
                steepest = slope;
                bestDx = dx;
                bestDy = dy;
              }
            }
          }
        }
      }
      
      if (steepest < 0.01) break; // River ends when it can't flow downhill
      
      x += bestDx * this.config.tileSize;
      y += bestDy * this.config.tileSize;
      
      // Stop if we reach the edge or water
      if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) break;
      
      const layer = terrainLayers[x]?.[y];
      if (layer && layer.elevation < 0.1) break; // Reached sea level
    }
    
    return points.length > 5 ? { points, width: 1 + Math.random() * 2 } : null;
  }

  private generateLakes(terrainLayers: TerrainLayer[][]): void {
    this.lakes = [];
    
    for (let i = 0; i < this.config.lakeCount; i++) {
      const lake = this.generateSingleLake(terrainLayers);
      if (lake) {
        this.lakes.push(lake);
      }
    }
    
    // Mark lakes on terrain
    for (const lake of this.lakes) {
      for (let dx = -lake.radius; dx <= lake.radius; dx++) {
        for (let dy = -lake.radius; dy <= lake.radius; dy++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= lake.radius) {
            const x = lake.center.x + dx * this.config.tileSize;
            const y = lake.center.y + dy * this.config.tileSize;
            const layer = terrainLayers[x]?.[y];
            if (layer) {
              layer.lake = true;
            }
          }
        }
      }
    }
  }

  private generateSingleLake(terrainLayers: TerrainLayer[][]): { center: { x: number; y: number }; radius: number } | null {
    const attempts = 50;
    
    for (let i = 0; i < attempts; i++) {
      const x = Math.floor(Math.random() * this.config.width / this.config.tileSize) * this.config.tileSize;
      const y = Math.floor(Math.random() * this.config.height / this.config.tileSize) * this.config.tileSize;
      const layer = terrainLayers[x]?.[y];
      
      if (layer && layer.elevation < 0.4 && layer.humidity > 0.5 && !layer.lake) {
        const radius = 3 + Math.floor(Math.random() * 5);
        return { center: { x, y }, radius };
      }
    }
    
    return null;
  }

  private generateRoads(terrainLayers: TerrainLayer[][]): void {
    // Connect cities with roads
    for (let i = 0; i < this.cities.length; i++) {
      for (let j = i + 1; j < this.cities.length; j++) {
        const city1 = this.cities[i];
        const city2 = this.cities[j];
        if (city1 && city2 && Math.random() < this.config.roadDensity) {
          this.createRoad(city1, city2, terrainLayers);
        }
      }
    }
  }

  private createRoad(city1: { x: number; y: number }, city2: { x: number; y: number }, terrainLayers: TerrainLayer[][]): void {
    // Simple straight-line road for now
    const dx = city2.x - city1.x;
    const dy = city2.y - city1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(distance / this.config.tileSize);
    
    for (let i = 0; i <= steps; i++) {
      const x = city1.x + (dx * i) / steps;
      const y = city1.y + (dy * i) / steps;
      const tileX = Math.floor(x / this.config.tileSize) * this.config.tileSize;
      const tileY = Math.floor(y / this.config.tileSize) * this.config.tileSize;
      
      const layer = terrainLayers[tileX]?.[tileY];
      if (layer && layer.elevation < 0.7) {
        layer.road = true;
      }
    }
  }

  private convertTerrainToTiles(terrainLayers: TerrainLayer[][]): WorldTile[][] {
    const world: WorldTile[][] = [];
    
    for (let x = 0; x < this.config.width; x += this.config.tileSize) {
      world[x] = [];
      for (let y = 0; y < this.config.height; y += this.config.tileSize) {
        const layer = terrainLayers[x]?.[y];
        if (layer && world[x]) {
          world[x]![y] = this.convertLayerToTile(x, y, layer);
        }
      }
    }
    
    return world;
  }

  private convertLayerToTile(x: number, y: number, layer: TerrainLayer): WorldTile {
    const tileType = this.convertBiomeToTileType(layer.biome, layer);
    const resources = this.generateResourcesForTile(layer);
    
    return {
      x,
      y,
      type: tileType,
      resources,
      elevation: layer.elevation,
      temperature: layer.temperature,
      humidity: layer.humidity,
      fertility: layer.fertility,
      accessibility: Math.max(0, 1 - layer.elevation),
      structures: layer.city ? this.generateCityStructure(x, y, layer) : [],
      agents: [],
      soilQuality: layer.soilQuality,
      fireState: FireState.NONE,
      pollution: 0,
      erosion: 0,
      moisture: layer.humidity,
      vegetationDensity: layer.biome === 'forest' ? 0.8 : layer.fertility * 0.5,
      mineralContent: layer.biome === 'mountain' ? 0.9 : layer.elevation * 0.3,
      level: TileLevel.GROUND,
      connections: [],
      tileData: {
        biome: layer.biome,
        climate: this.determineClimate(layer.temperature, layer.humidity),
        terrain: this.determineTerrain(layer.elevation),
        resourceNodes: [],
        resourceClusters: [],
        roads: [],
        bridges: [],
        walls: [],
        vegetation: [],
        wildlife: [],
        weather: {
          temperature: layer.temperature,
          humidity: layer.humidity,
          windSpeed: 0,
          windDirection: 0,
          precipitation: 0,
          visibility: 1,
          conditions: []
        },
        culture: 'unknown',
        religion: 'unknown',
        language: 'unknown',
        tradeRoutes: [],
        markets: [],
        industries: [],
        ownership: 'unclaimed',
        governance: 'none',
        laws: [],
        history: [],
        ruins: [],
        artifacts: []
      },
      isExpanded: false
    };
  }

  private convertBiomeToTileType(biome: string, _layer: TerrainLayer): TileType {
    switch (biome) {
      case 'mountain': return TileType.MOUNTAIN;
      case 'alpine_forest':
      case 'forest': return TileType.FOREST;
      case 'desert': return TileType.DESERT;
      case 'coastal':
      case 'swamp':
      case 'wetland': return TileType.WATER;
      case 'fertile_plains': return TileType.FARM;
      case 'grassland':
      case 'alpine_meadow':
      case 'tundra':
      case 'arctic': return TileType.GRASS;
      default: return TileType.GRASS;
    }
  }

  private generateResourcesForTile(layer: TerrainLayer): Resource[] {
    const resources: Resource[] = [];
    
    // Base resources based on biome
    switch (layer.biome) {
      case 'forest':
      case 'alpine_forest':
        resources.push({
          type: ResourceType.WOOD,
          amount: Math.random() * 300 + 200,
          maxAmount: 800,
          regenerationRate: 0.05 + layer.humidity * 0.1,
          lastHarvested: 0,
        });
        break;
      case 'mountain':
        resources.push({
          type: ResourceType.STONE,
          amount: Math.random() * 500 + 300,
          maxAmount: 1500,
          regenerationRate: 0.01,
          lastHarvested: 0,
        });
        if (Math.random() > 0.8) {
          resources.push({
            type: ResourceType.METAL,
            amount: Math.random() * 100 + 50,
            maxAmount: 400,
            regenerationRate: 0.005,
            lastHarvested: 0,
          });
        }
        break;
      case 'coastal':
      case 'swamp':
      case 'wetland':
        resources.push({
          type: ResourceType.WATER,
          amount: Math.random() * 800 + 500,
          maxAmount: 2000,
          regenerationRate: 0.3,
          lastHarvested: 0,
        });
        break;
    }
    
    // Food resources based on fertility
    if (layer.fertility > 0.3) {
      resources.push({
        type: ResourceType.FOOD,
        amount: Math.random() * 50 + layer.fertility * 100,
        maxAmount: 200,
        regenerationRate: 0.1 + layer.fertility * 0.2,
        lastHarvested: 0,
      });
    }
    
    // Water resources for rivers and lakes
    if (layer.river || layer.lake) {
      resources.push({
        type: ResourceType.WATER,
        amount: Math.random() * 1000 + 500,
        maxAmount: 2500,
        regenerationRate: 0.4,
        lastHarvested: 0,
      });
    }
    
    return resources;
  }

  private generateCityStructure(x: number, y: number, _layer: TerrainLayer): Structure[] {
    const city = this.cities.find(c => c.x === x && c.y === y);
    if (!city) return [];
    
    const structures: Structure[] = [];
    
    // Generate multiple structures for cities
    const structureCount = city.size;
    for (let i = 0; i < structureCount; i++) {
      const structureTypes = [
        StructureType.HOUSE,
        StructureType.MARKET,
        StructureType.SCHOOL,
        StructureType.GOVERNMENT,
      ];
      
      const type = structureTypes[Math.floor(Math.random() * structureTypes.length)];
      if (type) {
        const size = 10 + Math.random() * 20;
        
        structures.push({
          id: `structure_${city.name}_${i}_${Date.now()}`,
          type,
          position: { x: x + i * 5, y: y + i * 5 },
          size: { width: size, height: size },
          health: 1.0,
          maxHealth: 1.0,
          occupants: [],
          functions: this.generateStructureFunctions(type),
        });
      }
    }
    
    return structures;
  }

  private generateStructureFunctions(type: StructureType): any[] {
    const functions = [];
    
    switch (type) {
      case StructureType.HOUSE:
        functions.push({
          type: 'living',
          efficiency: 0.8,
          capacity: 5,
          currentUsage: 0,
        });
        break;
      case StructureType.MARKET:
        functions.push({
          type: 'social',
          efficiency: 0.9,
          capacity: 20,
          currentUsage: 0,
        });
        break;
      case StructureType.SCHOOL:
        functions.push({
          type: 'social',
          efficiency: 0.8,
          capacity: 15,
          currentUsage: 0,
        });
        break;
      case StructureType.GOVERNMENT:
        functions.push({
          type: 'social',
          efficiency: 0.9,
          capacity: 10,
          currentUsage: 0,
        });
        break;
    }
    
    return functions;
  }

  private addDetailedFeatures(world: WorldTile[][]): void {
    // Add resource clusters
    this.addResourceClusters(world);
    
    // Add natural features
    this.addNaturalFeatures(world);
  }

  private addResourceClusters(world: WorldTile[][]): void {
    // Add resource-rich areas
    this.addResourceCluster(world, ResourceType.METAL, 3);
    this.addResourceCluster(world, ResourceType.STONE, 5);
    this.addResourceCluster(world, ResourceType.WOOD, 8);
  }

  private addResourceCluster(world: WorldTile[][], resourceType: ResourceType, count: number): void {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.config.width;
      const y = Math.random() * this.config.height;
      const radius = 10 + Math.random() * 20;
      
      this.createResourceCluster(world, x, y, radius, resourceType);
    }
  }

  private createResourceCluster(world: WorldTile[][], centerX: number, centerY: number, radius: number, resourceType: ResourceType): void {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          const tileX = Math.floor(x / this.config.tileSize) * this.config.tileSize;
          const tileY = Math.floor(y / this.config.tileSize) * this.config.tileSize;
          
          if (this.isValidPosition(tileX, tileY)) {
            const tile = world[tileX]?.[tileY];
            if (tile) {
              const factor = 1 - (distance / radius);
              const amount = Math.random() * 200 + 100;
              
              tile.resources.push({
                type: resourceType,
                amount: amount * factor,
                maxAmount: amount * 2,
                regenerationRate: 0.05 * factor,
                lastHarvested: 0,
              });
            }
          }
        }
      }
    }
  }

  private addNaturalFeatures(world: WorldTile[][]): void {
    // Add mountain ranges
    this.generateMountainRanges(world);
    
    // Add forest patches
    this.generateForestPatches(world);
  }

  private generateMountainRanges(world: WorldTile[][]): void {
    const rangeCount = this.config.mountainRanges;
    
    for (let i = 0; i < rangeCount; i++) {
      const startX = Math.random() * this.config.width;
      const startY = Math.random() * this.config.height;
      const length = 100 + Math.random() * 200;
      const height = 0.7 + Math.random() * 0.3;
      
      this.createMountainRange(world, startX, startY, length, height);
    }
  }

  private createMountainRange(world: WorldTile[][], startX: number, startY: number, length: number, height: number): void {
    let x = startX;
    let y = startY;
    const angle = Math.random() * Math.PI * 2;
    
    for (let i = 0; i < length; i++) {
      const tileX = Math.floor(x / this.config.tileSize) * this.config.tileSize;
      const tileY = Math.floor(y / this.config.tileSize) * this.config.tileSize;
      
      if (this.isValidPosition(tileX, tileY)) {
        const tile = world[tileX]?.[tileY];
        if (tile) {
          tile.type = TileType.MOUNTAIN;
          tile.elevation = height;
          
          // Add mountain resources
          tile.resources.push({
            type: ResourceType.STONE,
            amount: Math.random() * 400 + 300,
            maxAmount: 1200,
            regenerationRate: 0.01,
            lastHarvested: 0,
          });
        }
      }
      
      x += Math.cos(angle) * 3;
      y += Math.sin(angle) * 3;
    }
  }

  private generateForestPatches(world: WorldTile[][]): void {
    const patchCount = 10 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < patchCount; i++) {
      const centerX = Math.random() * this.config.width;
      const centerY = Math.random() * this.config.height;
      const radius = 15 + Math.random() * 25;
      
      this.createForestPatch(world, centerX, centerY, radius);
    }
  }

  private createForestPatch(world: WorldTile[][], centerX: number, centerY: number, radius: number): void {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          const tileX = Math.floor(x / this.config.tileSize) * this.config.tileSize;
          const tileY = Math.floor(y / this.config.tileSize) * this.config.tileSize;
          
          if (this.isValidPosition(tileX, tileY)) {
            const tile = world[tileX]?.[tileY];
            if (tile && tile.type === TileType.GRASS) {
              tile.type = TileType.FOREST;
              tile.humidity = Math.min(tile.humidity + 0.2, 1.0);
              
              // Add forest resources
              tile.resources.push({
                type: ResourceType.WOOD,
                amount: Math.random() * 250 + 150,
                maxAmount: 600,
                regenerationRate: 0.08,
                lastHarvested: 0,
              });
            }
          }
        }
      }
    }
  }

  private getMultiOctaveNoise(x: number, y: number, seed: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
      value += this.getNoise(x * frequency, y * frequency, seed + i) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value / maxValue;
  }

  private getNoise(x: number, y: number, seed: number): number {
    const key = `${x}_${y}_${seed}`;
    if (this.noiseCache.has(key)) {
      return this.noiseCache.get(key)!;
    }
    
    const value = this.simpleNoise(x, y, seed);
    this.noiseCache.set(key, value);
    return value;
  }

  private simpleNoise(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 123.456) * 43758.5453;
    return (n - Math.floor(n));
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.config.width && y >= 0 && y < this.config.height;
  }

  // Getter methods for accessing generated data
  public getPoliticalRegions(): PoliticalRegion[] {
    return this.politicalRegions;
  }

  public getCities(): { x: number; y: number; name: string; size: number }[] {
    return this.cities;
  }

  public getRivers(): { points: { x: number; y: number }[]; width: number }[] {
    return this.rivers;
  }

  public getLakes(): { center: { x: number; y: number }; radius: number }[] {
    return this.lakes;
  }

  private determineClimate(temperature: number, humidity: number): string {
    if (temperature > 0.7) {
      if (humidity > 0.7) return 'tropical';
      if (humidity > 0.4) return 'subtropical';
      return 'desert';
    } else if (temperature > 0.3) {
      if (humidity > 0.7) return 'temperate_wet';
      if (humidity > 0.4) return 'temperate';
      return 'temperate_dry';
    } else {
      if (humidity > 0.7) return 'cold_wet';
      if (humidity > 0.4) return 'cold';
      return 'arctic';
    }
  }

  private determineTerrain(elevation: number): string {
    if (elevation > 0.8) return 'mountain';
    if (elevation > 0.6) return 'hill';
    if (elevation > 0.3) return 'plain';
    if (elevation > 0.1) return 'lowland';
    return 'water';
  }
} 