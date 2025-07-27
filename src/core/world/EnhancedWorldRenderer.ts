import { WorldTile, TileConnection, ConnectionType, Agent, TileType } from '../../types/simulation';

export interface RenderConfig {
  tileSize: number;
  zoomLevel: number;
  showAgents: boolean;
  showConnections: boolean;
  showResources: boolean;
  showStructures: boolean;
  agentSize: number;
  connectionWidth: number;
  resourceSize: number;
  structureSize: number;
}

export interface RenderData {
  tiles: WorldTile[][];
  agents: Agent[];
  connections: TileConnection[];
  rivers?: any[];
  lakes?: any[];
  roads?: any[];
  zoomLevel: number;
  centerX: number;
  centerY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export class EnhancedWorldRenderer {
  private config: RenderConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(config: RenderConfig) {
    this.config = config;
  }

  /**
   * Set the canvas for rendering
   */
  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
  }

  /**
   * Render the world with hierarchical tiles
   */
  public render(data: RenderData): void {
    if (!this.ctx || !this.canvas) {
      console.warn('Canvas not set for rendering');
      return;
    }

    // Clear canvas and add background
    this.ctx.fillStyle = '#1a1a2e'; // Dark blue background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate visible tiles
    const visibleTiles = this.getVisibleTiles(data);
    
    // Debug info only in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log('🎨 Rendering:', {
        totalTiles: data.tiles?.flat().filter(t => t).length || 0,
        visibleTiles: visibleTiles.length,
        canvasSize: { width: this.canvas.width, height: this.canvas.height },
        viewport: { width: data.viewportWidth, height: data.viewportHeight },
        camera: { x: data.centerX, y: data.centerY, zoom: data.zoomLevel }
      });
    }

    // Render tiles
    this.renderTiles(visibleTiles, data);

    // Render connections
    if (this.config.showConnections) {
      this.renderConnections(visibleTiles, data);
    }

    // Render structures
    if (this.config.showStructures) {
      this.renderStructures(visibleTiles, data);
    }

    // Render resources
    if (this.config.showResources) {
      this.renderResources(visibleTiles, data);
    }

    // Render agents
    if (this.config.showAgents) {
      this.renderAgents(data.agents, data);
    }

    // Render rivers
    this.renderRivers(data);

    // Render roads
    this.renderRoads(data);

    // Render tile borders and labels
    this.renderTileBorders(visibleTiles, data);
  }

  /**
   * Get tiles visible in the current viewport
   */
  private getVisibleTiles(data: RenderData): WorldTile[] {
    const visibleTiles: WorldTile[] = [];
    const tileSize = this.config.tileSize * Math.max(1, data.zoomLevel);

    // Debug info only in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log('🔍 getVisibleTiles debug:', {
        totalRows: data.tiles?.length || 0,
        tilesPerRow: data.tiles?.[0]?.length || 0,
        tileSize: tileSize,
        configTileSize: this.config.tileSize,
        zoomLevel: data.zoomLevel,
        centerX: data.centerX,
        centerY: data.centerY,
        viewportWidth: data.viewportWidth,
        viewportHeight: data.viewportHeight,
        sampleTile: data.tiles?.[0]?.[0] ? {
          x: data.tiles[0][0].x,
          y: data.tiles[0][0].y,
          type: data.tiles[0][0].type
        } : null,
        totalTiles: data.tiles?.flat().filter(t => t).length || 0
      });
    }

    for (const row of data.tiles) {
      for (const tile of row) {
        if (tile) {
          const screenX = (tile.x - data.centerX) * this.config.tileSize * data.zoomLevel + data.viewportWidth / 2;
          const screenY = (tile.y - data.centerY) * this.config.tileSize * data.zoomLevel + data.viewportHeight / 2;
          const screenTileSize = this.config.tileSize * data.zoomLevel;

          // Check if tile is visible
          if (screenX + screenTileSize > 0 && screenX < data.viewportWidth &&
              screenY + screenTileSize > 0 && screenY < data.viewportHeight) {
            visibleTiles.push(tile);
          }
        }
      }
    }

    // Debug info only in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log('🔍 Visible tiles found:', visibleTiles.length);
    }

    return visibleTiles;
  }

  /**
   * Render tiles using ASCII characters like Dwarf Fortress
   */
  private renderTiles(tiles: WorldTile[], data: RenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * Math.max(1, data.zoomLevel);
    
    // Debug info only in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log('🎨 Rendering tiles:', {
        tileCount: tiles.length,
        tileSize: tileSize,
        configTileSize: this.config.tileSize,
        zoomLevel: data.zoomLevel,
        sampleTile: tiles[0] ? { x: tiles[0].x, y: tiles[0].y, type: tiles[0].type } : null
      });
    }

    // Set up font for ASCII rendering
    this.ctx.font = `${data.zoomLevel}px 'Courier New', monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let renderedCount = 0;
    for (const tile of tiles) {
      const screenX = (tile.x - data.centerX) * this.config.tileSize * data.zoomLevel + data.viewportWidth / 2;
      const screenY = (tile.y - data.centerY) * this.config.tileSize * data.zoomLevel + data.viewportHeight / 2;

      // Get ASCII character and color for this tile
      const { char, color } = this.getTileAscii(tile);
      
      // Draw ASCII character
      this.ctx.fillStyle = color;
      this.ctx.fillText(char, screenX, screenY);
      renderedCount++;

      // Render expansion indicator if tile is expanded
      if (tile.isExpanded) {
        this.renderExpansionIndicator(screenX, screenY, tileSize);
      }
    }

    // Debug info only in development
    if (process.env['NODE_ENV'] === 'development') {
      console.log('🎨 Actually rendered tiles:', renderedCount);
    }
  }

  /**
   * Render connections between tiles
   */
  private renderConnections(tiles: WorldTile[], data: RenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * Math.pow(2, data.zoomLevel);

    for (const tile of tiles) {
      for (const connection of tile.connections) {
        const targetTile = this.findTileByPosition(connection.targetTile.x, connection.targetTile.y, data.tiles);
        if (!targetTile) continue;

        const startX = (tile.x - data.centerX) * tileSize + data.viewportWidth / 2 + tileSize / 2;
        const startY = (tile.y - data.centerY) * tileSize + data.viewportHeight / 2 + tileSize / 2;
        const endX = (targetTile.x - data.centerX) * tileSize + data.viewportWidth / 2 + tileSize / 2;
        const endY = (targetTile.y - data.centerY) * tileSize + data.viewportHeight / 2 + tileSize / 2;

        // Set connection style based on type
        this.ctx.strokeStyle = this.getConnectionColor(connection.type);
        this.ctx.lineWidth = this.config.connectionWidth * connection.strength;
        this.ctx.setLineDash(this.getConnectionDash(connection.type));

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        this.ctx.setLineDash([]); // Reset dash pattern
      }
    }
  }

  /**
   * Render structures on tiles
   */
  private renderStructures(tiles: WorldTile[], data: RenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * Math.pow(2, data.zoomLevel);
    const structureSize = this.config.structureSize * Math.pow(2, data.zoomLevel);

    for (const tile of tiles) {
      const baseX = (tile.x - data.centerX) * tileSize + data.viewportWidth / 2;
      const baseY = (tile.y - data.centerY) * tileSize + data.viewportHeight / 2;

      // Render tile structures
      for (const structure of tile.structures) {
        const structureX = baseX + (structure.position.x - tile.x) * tileSize;
        const structureY = baseY + (structure.position.y - tile.y) * tileSize;

        this.ctx.fillStyle = this.getStructureColor(structure.type);
        this.ctx.fillRect(structureX, structureY, structureSize, structureSize);

        // Add structure border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(structureX, structureY, structureSize, structureSize);
      }

      // Render tile data buildings
      if (tile.tileData.buildings) {
        for (const building of tile.tileData.buildings) {
          const buildingX = baseX + (building.position.x - tile.x) * tileSize;
          const buildingY = baseY + (building.position.y - tile.y) * tileSize;

          this.ctx.fillStyle = this.getBuildingColor(building.type);
          this.ctx.fillRect(buildingX, buildingY, structureSize, structureSize);

          // Add building border
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(buildingX, buildingY, structureSize, structureSize);
        }
      }
    }
  }

  /**
   * Render resources on tiles
   */
  private renderResources(tiles: WorldTile[], data: RenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * Math.pow(2, data.zoomLevel);
    const resourceSize = this.config.resourceSize * Math.pow(2, data.zoomLevel);

    for (const tile of tiles) {
      const baseX = (tile.x - data.centerX) * tileSize + data.viewportWidth / 2;
      const baseY = (tile.y - data.centerY) * tileSize + data.viewportHeight / 2;

      // Render tile resources
      for (const resource of tile.resources) {
        const resourceX = baseX + Math.random() * (tileSize - resourceSize);
        const resourceY = baseY + Math.random() * (tileSize - resourceSize);

        this.ctx.fillStyle = this.getResourceColor(resource.type);
        this.ctx.beginPath();
        this.ctx.arc(resourceX + resourceSize / 2, resourceY + resourceSize / 2, resourceSize / 2, 0, 2 * Math.PI);
        this.ctx.fill();

        // Add resource border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }

      // Render tile data resource nodes
      for (const node of tile.tileData.resourceNodes) {
        const nodeX = baseX + (node.position.x - tile.x) * tileSize;
        const nodeY = baseY + (node.position.y - tile.y) * tileSize;

        this.ctx.fillStyle = this.getResourceColor(node.type);
        this.ctx.beginPath();
        this.ctx.arc(nodeX + resourceSize / 2, nodeY + resourceSize / 2, resourceSize / 2, 0, 2 * Math.PI);
        this.ctx.fill();

        // Add node border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }

  /**
   * Render agents
   */
  private renderAgents(agents: Agent[], data: RenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * Math.pow(2, data.zoomLevel);
    const agentSize = this.config.agentSize * Math.pow(2, data.zoomLevel);

    // Set up font for agent rendering
    this.ctx.font = `${agentSize * 0.8}px 'Courier New', monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (const agent of agents) {
      const screenX = (agent.position.x - data.centerX) * tileSize + data.viewportWidth / 2;
      const screenY = (agent.position.y - data.centerY) * tileSize + data.viewportHeight / 2;

      // Check if agent is visible
      if (screenX + agentSize > 0 && screenX < data.viewportWidth &&
          screenY + agentSize > 0 && screenY < data.viewportHeight) {

        // Get agent ASCII character and color
        const { char, color } = this.getAgentAscii(agent);
        
        // Draw agent as ASCII character
        this.ctx.fillStyle = color;
        this.ctx.fillText(char, screenX + agentSize / 2, screenY + agentSize / 2);

        // Add agent name if zoomed in enough
        if (data.zoomLevel > 1) {
          this.ctx.fillStyle = '#000';
          this.ctx.font = `${12 * Math.pow(2, data.zoomLevel)}px Arial`;
          this.ctx.textAlign = 'center';
          this.ctx.fillText(agent.name, screenX + agentSize / 2, screenY - 5);
        }
      }
    }
  }

  /**
   * Render tile borders and labels (disabled in ASCII mode)
   */
  private renderTileBorders(tiles: WorldTile[], data: RenderData): void {
    // Tile borders and labels are not needed in ASCII mode
    // This function is kept for potential future use
  }

  /**
   * Render expansion indicator for expanded tiles
   */
  private renderExpansionIndicator(x: number, y: number, size: number): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    this.ctx.fillRect(x, y, size, size);

    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, size, size);
  }

  // Helper methods for ASCII rendering like Dwarf Fortress
  private getTileAscii(tile: WorldTile): { char: string; color: string } {
    // Check for special features first
    if (tile.tileData.isRuins) {
      return { char: '†', color: '#696969' }; // Ruins
    }
    if (tile.tileData.isCapital) {
      return { char: '◊', color: '#FFD700' }; // Capital city
    }
    if (tile.tileData.isTradeHub) {
      return { char: '$', color: '#FFD700' }; // Trade hub
    }
    if (tile.tileData.isFort) {
      return { char: '█', color: '#8B4513' }; // Fortress
    }
    if (tile.tileData.isReligiousSite) {
      return { char: '†', color: '#9370DB' }; // Religious site
    }
    if (tile.tileData.isNaturalWonder) {
      return { char: '★', color: '#FFD700' }; // Natural wonder
    }
    if (tile.tileData.isLandmark) {
      return { char: '◆', color: '#FFD700' }; // Landmark
    }
    
    // Base terrain types with elevation variations
    const elevation = tile.elevation || 0;
    
    switch (tile.type) {
      case TileType.GRASS: 
        if (elevation > 0.7) return { char: 'n', color: '#8B7355' }; // Hills
        return { char: '.', color: '#90EE90' }; // Light green grass
      case TileType.FOREST: 
        if (elevation > 0.8) return { char: '♠', color: '#2F4F2F' }; // Dense forest
        return { char: '♣', color: '#228B22' }; // Sparse forest
      case TileType.MOUNTAIN: 
        if (elevation > 0.9) return { char: '▲', color: '#8B0000' }; // Volcano
        return { char: '^', color: '#8B4513' }; // Mountain peak
      case TileType.WATER: 
        if (elevation < 0.2) return { char: '≈', color: '#000080' }; // Deep water
        return { char: '~', color: '#4169E1' }; // Shallow water
      case TileType.DESERT: 
        return { char: '·', color: '#F4A460' }; // Desert sand
      case TileType.URBAN: 
        return { char: '#', color: '#696969' }; // Urban building
      case TileType.FARM: 
        return { char: '≈', color: '#32CD32' }; // Farm field
      case TileType.ROAD: 
        return { char: '=', color: '#A0522D' }; // Road
      case TileType.HILL: 
        return { char: 'n', color: '#8B7355' }; // Hills
      case TileType.SWAMP: 
        return { char: '~', color: '#556B2F' }; // Swamp
      case TileType.TUNDRA: 
        return { char: '.', color: '#8FBC8F' }; // Tundra
      case TileType.ALPINE: 
        return { char: '^', color: '#696969' }; // Alpine
      case TileType.VOLCANO: 
        return { char: '▲', color: '#8B0000' }; // Volcano
      case TileType.RUINS: 
        return { char: '†', color: '#696969' }; // Ruins
      case TileType.CAPITAL: 
        return { char: '◊', color: '#FFD700' }; // Capital
      case TileType.TRADE_HUB: 
        return { char: '$', color: '#FFD700' }; // Trade hub
      case TileType.FORTRESS: 
        return { char: '█', color: '#8B4513' }; // Fortress
      case TileType.RELIGIOUS_SITE: 
        return { char: '†', color: '#9370DB' }; // Religious site
      case TileType.NATURAL_WONDER: 
        return { char: '★', color: '#FFD700' }; // Natural wonder
      case TileType.LANDMARK: 
        return { char: '◆', color: '#FFD700' }; // Landmark
      default: 
        return { char: '?', color: '#C0C0C0' }; // Unknown
    }
  }

  private getConnectionColor(type: ConnectionType): string {
    switch (type) {
      case ConnectionType.ROAD: return '#8B4513';
      case ConnectionType.RIVER: return '#4169E1';
      case ConnectionType.TRADE_ROUTE: return '#FFD700';
      case ConnectionType.BORDER: return '#FF0000';
      case ConnectionType.TELEPORT: return '#9932CC';
      case ConnectionType.UNDERGROUND: return '#654321';
      case ConnectionType.AIR_ROUTE: return '#87CEEB';
      case ConnectionType.SEA_ROUTE: return '#000080';
      default: return '#000000';
    }
  }

  private getConnectionDash(type: ConnectionType): number[] {
    switch (type) {
      case ConnectionType.BORDER: return [5, 5];
      case ConnectionType.TELEPORT: return [10, 5];
      case ConnectionType.UNDERGROUND: return [3, 3];
      default: return [];
    }
  }

  private getStructureColor(type: string): string {
    switch (type) {
      case 'house': return '#CD853F';
      case 'farm': return '#8FBC8F';
      case 'factory': return '#708090';
      case 'school': return '#FFB6C1';
      case 'hospital': return '#FFE4E1';
      case 'government': return '#F0E68C';
      case 'market': return '#DDA0DD';
      case 'temple': return '#DEB887';
      default: return '#C0C0C0';
    }
  }

  private getBuildingColor(type: string): string {
    return this.getStructureColor(type);
  }

  private getResourceColor(type: string): string {
    switch (type) {
      case 'food': return '#FF6347';
      case 'water': return '#00CED1';
      case 'wood': return '#8B4513';
      case 'stone': return '#696969';
      case 'metal': return '#C0C0C0';
      case 'energy': return '#FFFF00';
      case 'knowledge': return '#9370DB';
      default: return '#FF69B4';
    }
  }

  private getAgentAscii(agent: Agent): { char: string; color: string } {
    switch (agent.status) {
      case 'alive': return { char: '@', color: '#00FF00' }; // Living person
      case 'dead': return { char: '†', color: '#FF0000' }; // Dead person
      case 'unconscious': return { char: 'x', color: '#FFA500' }; // Unconscious
      case 'sleeping': return { char: 'z', color: '#4169E1' }; // Sleeping
      case 'working': return { char: 'w', color: '#FFD700' }; // Working
      case 'socializing': return { char: '&', color: '#FF69B4' }; // Socializing
      case 'exploring': return { char: 'e', color: '#32CD32' }; // Exploring
      case 'fighting': return { char: '!', color: '#DC143C' }; // Fighting
      case 'fleeing': return { char: 'f', color: '#FF4500' }; // Fleeing
      default: return { char: '?', color: '#C0C0C0' }; // Unknown status
    }
  }

  private getAgentColor(status: string): string {
    switch (status) {
      case 'alive': return '#00FF00';
      case 'dead': return '#FF0000';
      case 'unconscious': return '#FFA500';
      case 'sleeping': return '#4169E1';
      case 'working': return '#FFD700';
      case 'socializing': return '#FF69B4';
      case 'exploring': return '#32CD32';
      case 'fighting': return '#DC143C';
      case 'fleeing': return '#FF4500';
      default: return '#C0C0C0';
    }
  }

  private findTileByPosition(x: number, y: number, tiles: WorldTile[][]): WorldTile | null {
    for (const row of tiles) {
      for (const tile of row) {
        if (tile && tile.x === x && tile.y === y) {
          return tile;
        }
      }
    }
    return null;
  }

  /**
   * Render rivers on the map
   */
  private renderRivers(data: RenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * Math.pow(2, data.zoomLevel);
    
    // Set up font for river rendering
    this.ctx.font = `${tileSize * 0.6}px 'Courier New', monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Render rivers from world data
    if (data.rivers) {
      for (const river of data.rivers) {
        if (river.points && river.points.length > 0) {
          const riverChar = river.type === 'major' ? '≈' : '~';
          const riverColor = river.type === 'major' ? '#0000FF' : '#4169E1';
          
          this.ctx.fillStyle = riverColor;
          
          for (const point of river.points) {
            const screenX = (point.x - data.centerX) * tileSize + data.viewportWidth / 2;
            const screenY = (point.y - data.centerY) * tileSize + data.viewportHeight / 2;
            
            // Check if river point is visible
            if (screenX + tileSize > 0 && screenX < data.viewportWidth &&
                screenY + tileSize > 0 && screenY < data.viewportHeight) {
              this.ctx.fillText(riverChar, screenX, screenY);
            }
          }
        }
      }
    }
  }

  /**
   * Render roads on the map
   */
  private renderRoads(data: RenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * Math.pow(2, data.zoomLevel);
    
    // Set up font for road rendering
    this.ctx.font = `${tileSize * 0.5}px 'Courier New', monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Render roads from world data
    if (data.roads) {
      for (const road of data.roads) {
        if (road.start && road.end) {
          const roadChar = road.type === 'major' ? '=' : '-';
          const roadColor = road.type === 'major' ? '#A0522D' : '#8B7355';
          
          this.ctx.fillStyle = roadColor;
          
          // Calculate road points along the path
          const points = this.calculateRoadPoints(road.start, road.end);
          
          for (const point of points) {
            const screenX = (point.x - data.centerX) * tileSize + data.viewportWidth / 2;
            const screenY = (point.y - data.centerY) * tileSize + data.viewportHeight / 2;
            
            // Check if road point is visible
            if (screenX + tileSize > 0 && screenX < data.viewportWidth &&
                screenY + tileSize > 0 && screenY < data.viewportHeight) {
              this.ctx.fillText(roadChar, screenX, screenY);
            }
          }
        }
      }
    }
  }

  /**
   * Calculate points along a road path
   */
  private calculateRoadPoints(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const points = [];
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const steps = Math.max(1, Math.floor(distance / 10));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      });
    }
    
    return points;
  }
} 