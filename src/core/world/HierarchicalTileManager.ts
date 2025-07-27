import { EventEmitter } from 'events';
import { 
  WorldTile, 
  TileLevel, 
  TileConnection, 
  TileData, 
  ConnectionType, 
  SettlementType,
  ResourceType,
  Agent,
  AgentStatus
} from '../../types/simulation';

export interface TileExpansionConfig {
  maxSubTiles: number;
  expansionThreshold: number; // Population/resources needed to expand
  connectionRange: number;
  agentDensity: number;
  resourceDensity: number;
}

export interface TileExpansionResult {
  success: boolean;
  subTiles: WorldTile[][];
  newConnections: TileConnection[];
  newAgents: Agent[];
  message?: string;
}

export class HierarchicalTileManager extends EventEmitter {
  private config: TileExpansionConfig;
  private expandedTiles: Map<string, WorldTile[][]> = new Map();
  private tileConnections: Map<string, TileConnection[]> = new Map();
  private agentManager: any; // Reference to agent manager

  constructor(config: TileExpansionConfig, agentManager: any) {
    super();
    this.config = config;
    this.agentManager = agentManager;
  }

  /**
   * Attempt to expand a tile into sub-tiles with more detail
   */
  public expandTile(tile: WorldTile, zoomLevel: number): TileExpansionResult {
    const tileKey = `${tile.x}_${tile.y}`;
    
    // Check if already expanded
    if (this.expandedTiles.has(tileKey)) {
      return {
        success: true,
        subTiles: this.expandedTiles.get(tileKey)!,
        newConnections: this.tileConnections.get(tileKey) || [],
        newAgents: []
      };
    }

    // Check if tile meets expansion criteria
    if (!this.canExpandTile(tile)) {
      return {
        success: false,
        subTiles: [],
        newConnections: [],
        newAgents: [],
        message: 'Tile does not meet expansion criteria'
      };
    }

    // Generate sub-tiles based on tile level
    const subTiles = this.generateSubTiles(tile, zoomLevel);
    
    // Generate connections between sub-tiles
    const connections = this.generateTileConnections(subTiles, tile);
    
    // Generate agents for the expanded tile
    const agents = this.generateTileAgents(subTiles, tile);
    
    // Store expanded data
    this.expandedTiles.set(tileKey, subTiles);
    this.tileConnections.set(tileKey, connections);
    
    // Mark tile as expanded
    tile.isExpanded = true;
    tile.subTiles = subTiles;

    this.emit('tile:expanded', { tile, subTiles, connections, agents });

    return {
      success: true,
      subTiles,
      newConnections: connections,
      newAgents: agents
    };
  }

  /**
   * Collapse an expanded tile back to its parent level
   */
  public collapseTile(tile: WorldTile): boolean {
    const tileKey = `${tile.x}_${tile.y}`;
    
    if (!this.expandedTiles.has(tileKey)) {
      return false;
    }

    // Remove expanded data
    this.expandedTiles.delete(tileKey);
    this.tileConnections.delete(tileKey);
    
    // Mark tile as collapsed
    tile.isExpanded = false;
    tile.subTiles = undefined as any;

    this.emit('tile:collapsed', { tile });

    return true;
  }

  /**
   * Get all connections for a tile
   */
  public getTileConnections(tile: WorldTile): TileConnection[] {
    const tileKey = `${tile.x}_${tile.y}`;
    return this.tileConnections.get(tileKey) || [];
  }

  /**
   * Add a connection between two tiles
   */
  public addTileConnection(
    fromTile: WorldTile, 
    toTile: WorldTile, 
    type: ConnectionType, 
    strength: number = 1.0,
    bidirectional: boolean = true
  ): void {
    const connection: TileConnection = {
      targetTile: { x: toTile.x, y: toTile.y },
      type,
      strength,
      bidirectional
    };

    const fromKey = `${fromTile.x}_${fromTile.y}`;
    const fromConnections = this.tileConnections.get(fromKey) || [];
    fromConnections.push(connection);
    this.tileConnections.set(fromKey, fromConnections);

    if (bidirectional) {
      const toKey = `${toTile.x}_${toTile.y}`;
      const toConnections = this.tileConnections.get(toKey) || [];
      toConnections.push({
        targetTile: { x: fromTile.x, y: fromTile.y },
        type,
        strength,
        bidirectional: true
      });
      this.tileConnections.set(toKey, toConnections);
    }

    this.emit('connection:added', { fromTile, toTile, connection });
  }

  /**
   * Place an agent on a specific tile
   */
  public placeAgentOnTile(agent: Agent, tile: WorldTile): boolean {
    // Remove agent from current tile
    this.removeAgentFromTile(agent);

    // Add agent to new tile
    if (!tile.agents.includes(agent.id)) {
      tile.agents.push(agent.id);
    }

    // Update agent position to tile center
    agent.position = { x: tile.x, y: tile.y };

    this.emit('agent:placed', { agent, tile });

    return true;
  }

  /**
   * Remove an agent from their current tile
   */
  public removeAgentFromTile(agent: Agent): void {
    // Find and remove agent from all tiles
    // This would need to be implemented with a reverse lookup
    // For now, we'll assume the agent manager handles this
  }

  /**
   * Get all agents on a specific tile
   */
  public getAgentsOnTile(tile: WorldTile): Agent[] {
    return tile.agents
      .map(agentId => this.agentManager.getAgent(agentId))
      .filter(agent => agent !== undefined);
  }

  /**
   * Check if a tile can be expanded
   */
  private canExpandTile(tile: WorldTile): boolean {
    // Check population threshold
    const population = tile.tileData.population || 0;
    if (population < this.config.expansionThreshold) {
      return false;
    }

    // Check if tile has significant resources
    const resourceCount = tile.resources.length + tile.tileData.resourceNodes.length;
    if (resourceCount < 3) {
      return false;
    }

    // Check if tile has structures
    if (tile.structures.length === 0 && (!tile.tileData.buildings || tile.tileData.buildings.length === 0)) {
      return false;
    }

    return true;
  }

  /**
   * Generate sub-tiles for an expanded tile
   */
  private generateSubTiles(parentTile: WorldTile, zoomLevel: number): WorldTile[][] {
    const subTileSize = this.calculateSubTileSize(parentTile.level);
    const subTileCount = Math.floor(Math.sqrt(this.config.maxSubTiles));
    
    const subTiles: WorldTile[][] = [];
    
    for (let x = 0; x < subTileCount; x++) {
      subTiles[x] = [];
      for (let y = 0; y < subTileCount; y++) {
        const subTileX = parentTile.x + (x - subTileCount / 2) * subTileSize;
        const subTileY = parentTile.y + (y - subTileCount / 2) * subTileSize;
        
        const subTile = this.generateSubTile(subTileX, subTileY, parentTile, zoomLevel);
        subTiles[x]![y] = subTile;
      }
    }
    
    return subTiles;
  }

  /**
   * Generate a single sub-tile
   */
  private generateSubTile(x: number, y: number, parentTile: WorldTile, zoomLevel: number): WorldTile {
    const subTileLevel = this.getNextTileLevel(parentTile.level);
    
    // Generate tile data based on parent tile and position
    const tileData = this.generateSubTileData(x, y, parentTile, subTileLevel);
    
    // Generate resources based on parent tile
    const resources = this.generateSubTileResources(x, y, parentTile, subTileLevel);
    
    // Generate structures based on parent tile
    const structures = this.generateSubTileStructures(x, y, parentTile, subTileLevel);
    
    return {
      x,
      y,
      type: this.determineSubTileType(x, y, parentTile),
      resources,
      elevation: this.interpolateElevation(x, y, parentTile),
      temperature: this.interpolateTemperature(x, y, parentTile),
      humidity: this.interpolateHumidity(x, y, parentTile),
      fertility: this.interpolateFertility(x, y, parentTile),
      accessibility: this.calculateAccessibility(x, y, parentTile),
      structures,
      agents: [],
      level: subTileLevel,
      parentTile: { x: parentTile.x, y: parentTile.y },
      connections: [],
      tileData,
      isExpanded: false
    };
  }

  /**
   * Generate connections between sub-tiles
   */
  private generateTileConnections(subTiles: WorldTile[][], parentTile: WorldTile): TileConnection[] {
    const connections: TileConnection[] = [];
    
    for (let x = 0; x < subTiles.length; x++) {
      for (let y = 0; y < subTiles[x]!.length; y++) {
        const tile = subTiles[x]![y]!;
        
        // Connect to adjacent tiles
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < subTiles.length && ny >= 0 && ny < subTiles[x]!.length) {
              const neighborTile = subTiles[nx]![ny]!;
              
              // Determine connection type based on tile types
              const connectionType = this.determineConnectionType(tile, neighborTile);
              
              if (connectionType) {
                connections.push({
                  targetTile: { x: neighborTile.x, y: neighborTile.y },
                  type: connectionType,
                  strength: this.calculateConnectionStrength(tile, neighborTile),
                  bidirectional: true
                });
              }
            }
          }
        }
      }
    }
    
    return connections;
  }

  /**
   * Generate agents for an expanded tile
   */
  private generateTileAgents(subTiles: WorldTile[][], parentTile: WorldTile): Agent[] {
    const agents: Agent[] = [];
    const population = parentTile.tileData.population || 0;
    const agentCount = Math.floor(population * this.config.agentDensity);
    
    for (let i = 0; i < agentCount; i++) {
      // Find a suitable sub-tile for this agent
      const suitableTile = this.findSuitableTileForAgent(subTiles);
      
      if (suitableTile) {
        const agent = this.agentManager.createAgent({
          x: suitableTile.x + (Math.random() - 0.5) * 10,
          y: suitableTile.y + (Math.random() - 0.5) * 10
        });
        
        // Place agent on the tile
        this.placeAgentOnTile(agent, suitableTile);
        agents.push(agent);
      }
    }
    
    return agents;
  }

  // Helper methods
  private calculateSubTileSize(level: TileLevel): number {
    switch (level) {
      case TileLevel.WORLD: return 1000;
      case TileLevel.REGION: return 100;
      case TileLevel.LOCAL: return 10;
      case TileLevel.DETAIL: return 1;
      default: return 100;
    }
  }

  private getNextTileLevel(currentLevel: TileLevel): TileLevel {
    switch (currentLevel) {
      case TileLevel.WORLD: return TileLevel.REGION;
      case TileLevel.REGION: return TileLevel.LOCAL;
      case TileLevel.LOCAL: return TileLevel.DETAIL;
      case TileLevel.DETAIL: return TileLevel.MICRO;
      default: return TileLevel.LOCAL;
    }
  }

  private generateSubTileData(x: number, y: number, parentTile: WorldTile, level: TileLevel): TileData {
    // This would generate detailed tile data based on parent tile
    // For now, return a basic structure
    return {
      biome: parentTile.tileData.biome,
      climate: parentTile.tileData.climate,
      terrain: parentTile.tileData.terrain,
      resourceNodes: [],
      resourceClusters: [],
      roads: [],
      bridges: [],
      walls: [],
      vegetation: [],
      wildlife: [],
      weather: {
        temperature: parentTile.temperature,
        humidity: parentTile.humidity,
        windSpeed: 0,
        windDirection: 0,
        precipitation: 0,
        visibility: 1,
        conditions: []
      },
      culture: parentTile.tileData.culture,
      religion: parentTile.tileData.religion,
      language: parentTile.tileData.language,
      tradeRoutes: [],
      markets: [],
      industries: [],
      ownership: parentTile.tileData.ownership,
      governance: parentTile.tileData.governance,
      laws: [],
      history: [],
      ruins: [],
      artifacts: []
    };
  }

  private generateSubTileResources(x: number, y: number, parentTile: WorldTile, level: TileLevel): any[] {
    // Generate resources based on parent tile resources
    const resources: any[] = [];
    
    // Copy some resources from parent tile
    parentTile.resources.forEach(resource => {
      if (Math.random() < 0.3) { // 30% chance to inherit resource
        resources.push({
          ...resource,
          amount: resource.amount * 0.1 // Reduce amount for sub-tile
        });
      }
    });
    
    return resources;
  }

  private generateSubTileStructures(x: number, y: number, parentTile: WorldTile, level: TileLevel): any[] {
    // Generate structures based on parent tile
    const structures: any[] = [];
    
    // Copy some structures from parent tile
    parentTile.structures.forEach(structure => {
      if (Math.random() < 0.2) { // 20% chance to inherit structure
        structures.push({
          ...structure,
          position: { x: x + Math.random() * 10, y: y + Math.random() * 10 }
        });
      }
    });
    
    return structures;
  }

  private determineSubTileType(x: number, y: number, parentTile: WorldTile): any {
    // Determine tile type based on parent tile and position
    return parentTile.type;
  }

  private interpolateElevation(x: number, y: number, parentTile: WorldTile): number {
    // Interpolate elevation from parent tile
    return parentTile.elevation + (Math.random() - 0.5) * 0.1;
  }

  private interpolateTemperature(x: number, y: number, parentTile: WorldTile): number {
    return parentTile.temperature + (Math.random() - 0.5) * 0.05;
  }

  private interpolateHumidity(x: number, y: number, parentTile: WorldTile): number {
    return parentTile.humidity + (Math.random() - 0.5) * 0.05;
  }

  private interpolateFertility(x: number, y: number, parentTile: WorldTile): number {
    return parentTile.fertility + (Math.random() - 0.5) * 0.1;
  }

  private calculateAccessibility(x: number, y: number, parentTile: WorldTile): number {
    return parentTile.accessibility + (Math.random() - 0.5) * 0.1;
  }

  private determineConnectionType(tile1: WorldTile, tile2: WorldTile): ConnectionType | null {
    // Determine connection type based on tile types and data
    if (tile1.type === 'water' && tile2.type === 'water') {
      return ConnectionType.RIVER;
    }
    
    if (tile1.tileData.roads.length > 0 || tile2.tileData.roads.length > 0) {
      return ConnectionType.ROAD;
    }
    
    return ConnectionType.BORDER;
  }

  private calculateConnectionStrength(tile1: WorldTile, tile2: WorldTile): number {
    // Calculate connection strength based on tile similarity and features
    let strength = 0.5;
    
    // Same tile type increases strength
    if (tile1.type === tile2.type) strength += 0.2;
    
    // Similar elevation increases strength
    const elevationDiff = Math.abs(tile1.elevation - tile2.elevation);
    strength += (1 - elevationDiff) * 0.1;
    
    // Roads increase strength
    if (tile1.tileData.roads.length > 0 || tile2.tileData.roads.length > 0) {
      strength += 0.3;
    }
    
    return Math.min(1.0, strength);
  }

  private findSuitableTileForAgent(subTiles: WorldTile[][]): WorldTile | null {
    // Find a tile suitable for agent placement
    const suitableTiles: WorldTile[] = [];
    
    for (const row of subTiles) {
      for (const tile of row) {
        if (tile && tile.accessibility > 0.5 && tile.elevation < 0.8) {
          suitableTiles.push(tile);
        }
      }
    }
    
    if (suitableTiles.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * suitableTiles.length);
    return suitableTiles[randomIndex] || null;
  }
} 