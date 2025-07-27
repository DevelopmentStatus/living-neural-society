import { EventEmitter } from 'events';
import { SimulationState, WorldTile, ResourceType } from '../../types/simulation';
import { PoliticalRegion } from './WorldGenerator';
import { FMGWorldGenerator } from './FMGWorldGenerator';

export class WorldManager extends EventEmitter {
  private world: WorldTile[][] = [];
  private worldSize: { width: number; height: number };
  private tick: number = 0;
  private fmgGenerator: FMGWorldGenerator;
  private politicalRegions: PoliticalRegion[] = [];
  private cities: { x: number; y: number; name: string; size: number }[] = [];
  private rivers: { points: { x: number; y: number }[]; width: number }[] = [];
  private lakes: { center: { x: number; y: number }; radius: number }[] = [];

  constructor(state: SimulationState) {
    super();
    this.worldSize = state.worldSize;
    
    // Initialize FMG world generator for sophisticated generation
    this.fmgGenerator = new FMGWorldGenerator(
      this.worldSize.width,
      this.worldSize.height,
      10000, // cell count
      Math.floor(Math.random() * 1000000) // random seed
    );
    
  }

  public initialize(): void {
    console.log('🌍 Initializing World Manager with FMG generation...');
    this.generateWorld();
    console.log('✅ World Manager initialized with FMG world');
  }

  private generateWorld(): void {
    console.log('🏔️ Generating FMG-style world with sophisticated terrain, rivers, and biomes...');
    
    // Use FMG generator for sophisticated world generation
    const fmgWorldData = this.fmgGenerator.generate();
    
    // Convert FMG data to our format
    this.world = fmgWorldData.tiles;
    this.rivers = fmgWorldData.rivers;
    this.lakes = fmgWorldData.lakes;
    
    // Convert political regions
    this.politicalRegions = fmgWorldData.politicalRegions.map((region: any, index: number) => ({
      id: index,
      name: region.name,
      color: region.color,
      territory: region.territory,
      population: region.population,
      resources: region.resources,
      capital: region.capital || null,
      faction: region.faction || `faction_${index}`,
      ideology: region.ideology || 'neutral',
      technology: region.technology || 1,
      wealth: region.wealth || 1000,
      relations: region.relations || {},
    }));
    
    // Convert cities
    this.cities = fmgWorldData.cities.map((city: any) => ({
      x: city.x,
      y: city.y,
      name: city.name,
      size: city.size,
    }));
    
    console.log(`🌍 Generated FMG world with ${this.politicalRegions.length} political regions`);
    console.log(`🏙️ Generated ${this.cities.length} cities`);
    console.log(`🌊 Generated ${this.rivers.length} rivers`);
    console.log(`🏞️ Generated ${this.lakes.length} lakes`);
  }

  public update(tick: number): void {
    this.tick = tick;

    // Update resource regeneration
    this.updateResourceRegeneration();

    // Update environmental effects
    this.updateEnvironmentalEffects();

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
    for (let x = 0; x < this.worldSize.width; x += 10) {
      for (let y = 0; y < this.worldSize.height; y += 10) {
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
    // Simple environmental changes
    for (let x = 0; x < this.worldSize.width; x += 10) {
      for (let y = 0; y < this.worldSize.height; y += 10) {
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