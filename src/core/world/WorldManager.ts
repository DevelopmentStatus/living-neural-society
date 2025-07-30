import { EventEmitter } from 'events';
import { SimulationState, WorldTile, ResourceType } from '../../types/simulation';
import { PoliticalRegion } from './WorldGenerator';
import { DwarfFortressWorldGenerator, DwarfFortressConfig, DFWorldData } from './DwarfFortressWorldGenerator';

export class WorldManager extends EventEmitter {
  private world: WorldTile[][] = [];
  private worldSize: { width: number; height: number };
  private tick: number = 0;
  private dfGenerator: DwarfFortressWorldGenerator;
  private politicalRegions: PoliticalRegion[] = [];
  private cities: { x: number; y: number; name: string; size: number }[] = [];
  private rivers: { points: { x: number; y: number }[]; width: number }[] = [];
  private lakes: { center: { x: number; y: number }; radius: number }[] = [];

  constructor(state: SimulationState) {
    super();
    this.worldSize = state.worldSize;
    
    // Initialize Dwarf Fortress world generator
    const config: DwarfFortressConfig = {
      width: this.worldSize.width,
      height: this.worldSize.height,
      seed: Math.floor(Math.random() * 1000000),
      // World generation parameters
      elevationScale: 0.02,
      temperatureScale: 0.03,
      rainfallScale: 0.025,
      // New parameters for improved world generation
      seaLevel: 0.45, // Creates more land than water
      continentCount: 3, // Number of major continents
      islandDensity: 0.4, // Density of smaller islands
      // Feature generation
      mountainRanges: 3,
      riverCount: 8,
      lakeCount: 5,
      forestDensity: 0.4,
      caveSystems: 4,
      // Civilization parameters
      civilizationCount: 3,
      settlementDensity: 0.6,
      roadDensity: 0.4,
      // Resource parameters
      mineralRichness: 0.3,
      soilFertility: 0.5,
      waterAvailability: 0.4,
    };
    
    this.dfGenerator = new DwarfFortressWorldGenerator(config);
  }

  public initialize(): void {
    console.log('🌍 Initializing World Manager with Dwarf Fortress generation...');
    this.generateWorld();
    console.log('✅ World Manager initialized with Dwarf Fortress world');
  }

  private generateWorld(): void {
    console.log('🏔️ Generating Dwarf Fortress-style world with Diamond-Square algorithm...');
    
    // Use Dwarf Fortress generator for sophisticated world generation
    const dfWorldData = this.dfGenerator.generate();
    
    // Convert DF data to our format
    this.world = dfWorldData.tiles;
    this.rivers = dfWorldData.rivers.map(river => ({
      points: river.points,
      width: river.width
    }));
    this.lakes = dfWorldData.lakes.map(lake => ({
      center: lake.center,
      radius: lake.radius
    }));
    
    // Convert civilizations to political regions
    this.politicalRegions = dfWorldData.civilizations.map((civ: any, index: number) => ({
      id: index,
      name: civ.name,
      color: this.getCivColor(civ.type),
      territory: civ.territory,
      population: civ.population,
      resources: [],
      capital: civ.capital,
      faction: civ.id,
      ideology: civ.culture,
      technology: civ.technology,
      wealth: civ.wealth,
      relations: civ.relations,
    }));
    
    // Convert settlements to cities
    this.cities = dfWorldData.settlements.map((settlement: any) => ({
      x: settlement.position.x,
      y: settlement.position.y,
      name: settlement.name,
      size: settlement.size,
    }));
    
    console.log(`🌍 Generated Dwarf Fortress world with Diamond-Square algorithm`);
    console.log(`   - Continents: ${dfWorldData.continents.length}`);
    console.log(`   - Islands: ${dfWorldData.islands.length}`);
    console.log(`   - Enhanced Rivers: ${dfWorldData.enhancedRivers.length}`);
    console.log(`   - Enhanced Lakes: ${dfWorldData.enhancedLakes.length}`);
    console.log(`   - Civilizations: ${this.politicalRegions.length}`);
    console.log(`   - Settlements: ${this.cities.length}`);
    console.log(`   - Sea Level: ${dfWorldData.seaLevel}`);
  }

  private getCivColor(civType: string): string {
    switch (civType) {
      case 'dwarven': return '#8B4513';
      case 'human': return '#4169E1';
      case 'elven': return '#228B22';
      case 'goblin': return '#32CD32';
      case 'orcish': return '#8B0000';
      default: return '#808080';
    }
  }

  public update(tick: number): void {
    this.tick = tick;

    // Only update resources and environmental effects every 10 ticks (once per second)
    // This reduces the processing load significantly
    if (tick % 10 === 0) {
      this.updateResourceRegeneration();
      this.updateEnvironmentalEffects();
    }

    // Emit world update event
    this.emit('world:updated', {
      tick,
      worldSize: this.worldSize,
      totalTiles: this.getTotalTiles(),
      politicalRegions: this.politicalRegions.length,
      cities: this.cities.length,
      rivers: this.rivers.length,
      lakes: this.lakes.length,
    });
  }

  private updateResourceRegeneration(): void {
    // Process only a subset of tiles each update to spread the load
    const updateStep = 50; // Process every 50th tile instead of every 10th
    const startX = (this.tick / 10) % updateStep; // Rotate through different starting positions
    
    for (let x = startX; x < this.worldSize.width; x += updateStep) {
      for (let y = 0; y < this.worldSize.height; y += updateStep) {
        const tile = this.world[x]?.[y];
        if (!tile) continue;

        for (const resource of tile.resources) {
          // Regenerate resources
          if (resource.amount < resource.maxAmount) {
            resource.amount = Math.min(
              resource.maxAmount,
              resource.amount + resource.regenerationRate
            );
          }
        }
      }
    }
  }

  private updateEnvironmentalEffects(): void {
    // Process only a subset of tiles each update to spread the load
    const updateStep = 50; // Process every 50th tile instead of every 10th
    const startX = (this.tick / 10) % updateStep; // Rotate through different starting positions
    
    for (let x = startX; x < this.worldSize.width; x += updateStep) {
      for (let y = 0; y < this.worldSize.height; y += updateStep) {
        const tile = this.world[x]?.[y];
        if (!tile) continue;

        // Slight temperature and humidity variations
        tile.temperature += (Math.random() - 0.5) * 0.01;
        tile.humidity += (Math.random() - 0.5) * 0.01;

        // Clamp values
        tile.temperature = Math.max(0, Math.min(1, tile.temperature));
        tile.humidity = Math.max(0, Math.min(1, tile.humidity));
      }
    }
  }

  public getTile(x: number, y: number): WorldTile | null {
    const tileX = Math.floor(x / 10) * 10;
    const tileY = Math.floor(y / 10) * 10;
    return this.world[tileX]?.[tileY] || null;
  }

  public getTilesInArea(centerX: number, centerY: number, radius: number): WorldTile[] {
    const tiles: WorldTile[] = [];
    const startX = Math.max(0, Math.floor((centerX - radius) / 10) * 10);
    const endX = Math.min(this.worldSize.width, Math.ceil((centerX + radius) / 10) * 10);
    const startY = Math.max(0, Math.floor((centerY - radius) / 10) * 10);
    const endY = Math.min(this.worldSize.height, Math.ceil((centerY + radius) / 10) * 10);

    for (let x = startX; x < endX; x += 10) {
      for (let y = startY; y < endY; y += 10) {
        const tile = this.world[x]?.[y];
        if (tile) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance <= radius) {
            tiles.push(tile);
          }
        }
      }
    }

    return tiles;
  }

  public harvestResource(x: number, y: number, resourceType: ResourceType, amount: number): number {
    const tile = this.getTile(x, y);
    if (!tile) return 0;

    const resource = tile.resources.find(r => r.type === resourceType);
    if (!resource) return 0;

    const harvested = Math.min(amount, resource.amount);
    resource.amount -= harvested;
    resource.lastHarvested = this.tick;

    return harvested;
  }

  public getTotalTiles(): number {
    return Math.floor(this.worldSize.width / 10) * Math.floor(this.worldSize.height / 10);
  }

  public getWorldTiles(): WorldTile[][] {
    return this.world;
  }

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

  public getStructures(): any[] {
    // Flatten all structures from all tiles
    const structures: any[] = [];
    for (let x = 0; x < this.worldSize.width; x += 10) {
      for (let y = 0; y < this.worldSize.height; y += 10) {
        const tile = this.world[x]?.[y];
        if (tile && tile.structures) {
          structures.push(...tile.structures);
        }
      }
    }
    return structures;
  }

  public getStatistics(): any {
    const tiles = this.getAllTiles();
    const resourceCounts: Record<ResourceType, number> = {
      [ResourceType.FOOD]: 0,
      [ResourceType.WATER]: 0,
      [ResourceType.WOOD]: 0,
      [ResourceType.STONE]: 0,
      [ResourceType.METAL]: 0,
      [ResourceType.ENERGY]: 0,
      [ResourceType.KNOWLEDGE]: 0,
    };

    let totalElevation = 0;
    let totalTemperature = 0;
    let totalHumidity = 0;
    let totalFertility = 0;

    for (const tile of tiles) {
      totalElevation += tile.elevation;
      totalTemperature += tile.temperature;
      totalHumidity += tile.humidity;
      totalFertility += tile.fertility;

      for (const resource of tile.resources) {
        resourceCounts[resource.type] += resource.amount;
      }
    }

    const tileCount = tiles.length;

    return {
      totalTiles: tileCount,
      resourceDistribution: resourceCounts,
      structureCount: tiles.reduce((sum, tile) => sum + tile.structures.length, 0),
      averageTemperature: tileCount > 0 ? totalTemperature / tileCount : 0,
      averageHumidity: tileCount > 0 ? totalHumidity / tileCount : 0,
      averageFertility: tileCount > 0 ? totalFertility / tileCount : 0,
      politicalRegions: this.politicalRegions.length,
      cities: this.cities.length,
      rivers: this.rivers.length,
      lakes: this.lakes.length,
    };
  }

  private getAllTiles(): WorldTile[] {
    const tiles: WorldTile[] = [];
    for (let x = 0; x < this.worldSize.width; x += 10) {
      for (let y = 0; y < this.worldSize.height; y += 10) {
        const tile = this.world[x]?.[y];
        if (tile) {
          tiles.push(tile);
        }
      }
    }
    return tiles;
  }
} 