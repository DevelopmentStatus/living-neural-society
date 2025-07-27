import { WorldTile, TileType, Agent, TileLevel, FireState } from '../../types/simulation';
import { DFWorldData, DFRiver, DFLake, DFRoad, DFSettlement } from './DwarfFortressWorldGenerator';

export interface DFRenderConfig {
  tileSize: number;
  fontSize: number;
  fontFamily: string;
  showAgents: boolean;
  showStructures: boolean;
  showResources: boolean;
  showRivers: boolean;
  showRoads: boolean;
  showSettlements: boolean;
  showGrid: boolean;
  showLabels: boolean;
  colorScheme: 'classic' | 'modern' | 'colorblind';
  // New layer options
  showBiomeColors: boolean;
  showSoilQuality: boolean;
  showFireEffects: boolean;
  showVegetationDensity: boolean;
  showErosion: boolean;
}

export interface DFRenderData {
  worldData: DFWorldData;
  agents: Agent[];
  zoomLevel: number;
  centerX: number;
  centerY: number;
  viewportWidth: number;
  viewportHeight: number;
}

export class DwarfFortressRenderer {
  private config: DFRenderConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private tileCache: Map<string, { char: string; color: string; bgColor: string }> = new Map();

  constructor(config: DFRenderConfig) {
    this.config = config;
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    
    // Set up canvas for crisp text rendering
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.textBaseline = 'top';
    this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
  }

  public resize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
      
      // Re-setup context after resize
      if (this.ctx) {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.textBaseline = 'top';
        this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
      }
    }
  }

  public render(data: DFRenderData): void {
    if (!this.ctx || !this.canvas) {
      console.warn('Canvas not set for rendering');
      return;
    }

    // Clear canvas with dark background
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Reset font to base size
    this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;

    // Calculate visible area
    const visibleTiles = this.getVisibleTiles(data);
    
    // Render tiles
    this.renderTiles(visibleTiles, data);
    
    // Render features
    if (this.config.showRivers) {
      this.renderRivers(data);
    }
    
    if (this.config.showRoads) {
      this.renderRoads(data);
    }
    
    if (this.config.showSettlements) {
      this.renderSettlements(data);
    }
    
    if (this.config.showStructures) {
      this.renderStructures(visibleTiles, data);
    }
    
    if (this.config.showResources) {
      this.renderResources(visibleTiles, data);
    }
    
    if (this.config.showAgents) {
      this.renderAgents(data.agents, data);
    }
    
    if (this.config.showGrid) {
      this.renderGrid(data);
    }
    
    if (this.config.showLabels) {
      this.renderLabels(data);
    }
  }

  private getVisibleTiles(data: DFRenderData): WorldTile[] {
    const tiles: WorldTile[] = [];
    const worldData = data.worldData;
    
    if (!worldData.tiles || worldData.tiles.length === 0) return tiles;
    
    const tileSize = this.config.tileSize;
    
    // Calculate visible area in world coordinates
    const worldViewportWidth = data.viewportWidth / data.zoomLevel;
    const worldViewportHeight = data.viewportHeight / data.zoomLevel;
    
    // Calculate visible area in tile coordinates
    const startX = Math.floor((data.centerX - worldViewportWidth / 2) / tileSize);
    const endX = Math.ceil((data.centerX + worldViewportWidth / 2) / tileSize);
    const startY = Math.floor((data.centerY - worldViewportHeight / 2) / tileSize);
    const endY = Math.ceil((data.centerY + worldViewportHeight / 2) / tileSize);
    
    for (let y = Math.max(0, startY); y <= Math.min(worldData.tiles.length - 1, endY); y++) {
      const row = worldData.tiles[y];
      if (!row) continue;
      
      for (let x = Math.max(0, startX); x <= Math.min(row.length - 1, endX); x++) {
        const tile = row[x];
        if (tile) {
          tiles.push(tile);
        }
      }
    }
    
    return tiles;
  }

  private renderTiles(tiles: WorldTile[], data: DFRenderData): void {
    for (const tile of tiles) {
      const scaledTileSize = this.config.tileSize * data.zoomLevel;
      const screenX = (tile.x - data.centerX) * this.config.tileSize * data.zoomLevel + data.viewportWidth / 2;
      const screenY = (tile.y - data.centerY) * this.config.tileSize * data.zoomLevel + data.viewportHeight / 2;
      
      const tileInfo = this.getTileInfo(tile);
      
      // Draw background based on configuration
      if (this.config.showBiomeColors && tileInfo.bgColor) {
        this.ctx!.fillStyle = tileInfo.bgColor;
        this.ctx!.fillRect(screenX, screenY, scaledTileSize, scaledTileSize);
      }
      
      // Draw soil quality overlay
      if (this.config.showSoilQuality) {
        const soilColor = this.getSoilQualityColor(tile.soilQuality);
        this.ctx!.fillStyle = soilColor;
        this.ctx!.globalAlpha = 0.3;
        this.ctx!.fillRect(screenX, screenY, scaledTileSize, scaledTileSize);
        this.ctx!.globalAlpha = 1.0;
      }
      
      // Draw vegetation density overlay
      if (this.config.showVegetationDensity) {
        const vegColor = this.getVegetationDensityColor(tile.vegetationDensity);
        this.ctx!.fillStyle = vegColor;
        this.ctx!.globalAlpha = 0.2;
        this.ctx!.fillRect(screenX, screenY, scaledTileSize, scaledTileSize);
        this.ctx!.globalAlpha = 1.0;
      }
      
      // Draw erosion overlay
      if (this.config.showErosion) {
        const erosionColor = this.getErosionColor(tile.erosion);
        this.ctx!.fillStyle = erosionColor;
        this.ctx!.globalAlpha = 0.25;
        this.ctx!.fillRect(screenX, screenY, scaledTileSize, scaledTileSize);
        this.ctx!.globalAlpha = 1.0;
      }
      
      // Draw character
      this.ctx!.fillStyle = tileInfo.color;
      this.ctx!.textAlign = 'center';
      this.ctx!.font = `${this.config.fontSize * data.zoomLevel}px ${this.config.fontFamily}`;
      this.ctx!.fillText(
        tileInfo.char,
        screenX + scaledTileSize / 2,
        screenY + scaledTileSize / 2 - (this.config.fontSize * data.zoomLevel) / 2
      );
    }
  }

  private getTileInfo(tile: WorldTile): { char: string; color: string; bgColor: string } {
    const cacheKey = `${tile.type}_${tile.elevation}_${tile.temperature}_${tile.humidity}_${tile.fireState}_${tile.soilQuality}_${tile.vegetationDensity}`;
    
    if (this.tileCache.has(cacheKey)) {
      return this.tileCache.get(cacheKey)!;
    }
    
    let char = '.';
    let color = '#666666';
    let bgColor = '';
    
    // Get base biome background color
    bgColor = this.getBiomeBackgroundColor(tile);
    
    // Determine character and color based on tile type and properties
    switch (tile.type) {
      case TileType.GRASS:
        if (tile.elevation > 0.7) {
          char = '^';
          color = '#8B4513';
        } else if (tile.elevation > 0.5) {
          char = 'n';
          color = '#556B2F';
        } else {
          char = '.';
          color = '#228B22';
        }
        break;
        
      case TileType.FOREST:
        char = '♣';
        color = '#006400';
        break;
        
      case TileType.MOUNTAIN:
        char = '^';
        color = '#696969';
        break;
        
      case TileType.WATER:
        char = '~';
        color = '#4169E1';
        break;
        
      case TileType.DESERT:
        char = '·';
        color = '#F4A460';
        break;
        
      case TileType.URBAN:
        char = '#';
        color = '#808080';
        break;
        
      case TileType.FARM:
        char = '≈';
        color = '#90EE90';
        break;
        
      case TileType.ROAD:
        char = '=';
        color = '#8B4513';
        break;
        
      case TileType.HILL:
        char = 'n';
        color = '#556B2F';
        break;
        
      case TileType.SWAMP:
        char = '~';
        color = '#228B22';
        break;
        
      case TileType.TUNDRA:
        char = '.';
        color = '#F0F8FF';
        break;
        
      case TileType.ALPINE:
        char = '^';
        color = '#FFFFFF';
        break;
        
      case TileType.VOLCANO:
        char = '▲';
        color = '#8B0000';
        break;
        
      case TileType.RUINS:
        char = '†';
        color = '#696969';
        break;
        
      case TileType.CAPITAL:
        char = '◊';
        color = '#FFD700';
        break;
        
      case TileType.TRADE_HUB:
        char = '$';
        color = '#FFD700';
        break;
        
      case TileType.FORTRESS:
        char = '⌂';
        color = '#8B4513';
        break;
        
      case TileType.RELIGIOUS_SITE:
        char = '☩';
        color = '#FFD700';
        break;
        
      case TileType.NATURAL_WONDER:
        char = '★';
        color = '#FFD700';
        break;
        
      case TileType.LANDMARK:
        char = '◆';
        color = '#FFD700';
        break;
        
      default:
        char = '.';
        color = '#666666';
    }
    
    // Apply fire effects
    if (tile.fireState !== FireState.NONE) {
      const fireEffect = this.getFireEffect(tile.fireState);
      char = fireEffect.char;
      color = fireEffect.color;
      bgColor = fireEffect.bgColor || bgColor;
    }
    
    // Apply soil quality effects
    if (tile.soilQuality > 0.8) {
      color = this.addTint(color, '#90EE90', 0.2); // Green tint for fertile soil
    } else if (tile.soilQuality < 0.3) {
      color = this.addTint(color, '#8B4513', 0.3); // Brown tint for poor soil
    }
    
    // Apply vegetation density effects
    if (tile.vegetationDensity > 0.7) {
      color = this.addTint(color, '#228B22', 0.2); // Dark green tint for dense vegetation
    }
    
    // Apply elevation effects
    if (tile.elevation > 0.8) {
      color = this.darkenColor(color, 0.3);
    } else if (tile.elevation < 0.2) {
      color = this.lightenColor(color, 0.2);
    }
    
    // Apply temperature effects
    if (tile.temperature < 0.3) {
      color = this.addTint(color, '#87CEEB', 0.3); // Blue tint for cold
    } else if (tile.temperature > 0.7) {
      color = this.addTint(color, '#FFA500', 0.2); // Orange tint for hot
    }
    
    const tileInfo = { char, color, bgColor };
    this.tileCache.set(cacheKey, tileInfo);
    return tileInfo;
  }

  private renderRivers(data: DFRenderData): void {
    for (const river of data.worldData.rivers) {
      this.ctx!.strokeStyle = '#4169E1';
      this.ctx!.lineWidth = river.width * data.zoomLevel;
      this.ctx!.lineCap = 'round';
      
      this.ctx!.beginPath();
      for (let i = 0; i < river.points.length; i++) {
        const point = river.points[i];
        if (point) {
          const scaledTileSize = this.config.tileSize * data.zoomLevel;
          const screenX = (point.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
          const screenY = (point.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
          
          if (i === 0) {
            this.ctx!.moveTo(screenX, screenY);
          } else {
            this.ctx!.lineTo(screenX, screenY);
          }
        }
      }
      this.ctx!.stroke();
    }
  }

  private renderRoads(data: DFRenderData): void {
    for (const road of data.worldData.roads) {
      this.ctx!.strokeStyle = '#8B4513';
      this.ctx!.lineWidth = road.width * data.zoomLevel;
      this.ctx!.lineCap = 'round';
      
      this.ctx!.beginPath();
      for (let i = 0; i < road.points.length; i++) {
        const point = road.points[i];
        if (point) {
          const scaledTileSize = this.config.tileSize * data.zoomLevel;
          const screenX = (point.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
          const screenY = (point.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
          
          if (i === 0) {
            this.ctx!.moveTo(screenX, screenY);
          } else {
            this.ctx!.lineTo(screenX, screenY);
          }
        }
      }
      this.ctx!.stroke();
    }
  }

  private renderSettlements(data: DFRenderData): void {
    for (const settlement of data.worldData.settlements) {
      const scaledTileSize = this.config.tileSize * data.zoomLevel;
      const screenX = (settlement.position.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
      const screenY = (settlement.position.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
      
      let char = '#';
      let color = '#808080';
      
      switch (settlement.type) {
        case 'capital':
          char = '◊';
          color = '#FFD700';
          break;
        case 'city':
          char = '#';
          color = '#C0C0C0';
          break;
        case 'town':
          char = '⌂';
          color = '#A0A0A0';
          break;
        case 'village':
          char = '⌂';
          color = '#808080';
          break;
        case 'hamlet':
          char = '⌂';
          color = '#606060';
          break;
        case 'fortress':
          char = '⌂';
          color = '#8B4513';
          break;
        case 'monastery':
          char = '☩';
          color = '#FFD700';
          break;
        case 'trading_post':
          char = '$';
          color = '#FFD700';
          break;
      }
      
      this.ctx!.fillStyle = color;
      this.ctx!.textAlign = 'center';
      this.ctx!.font = `${this.config.fontSize * data.zoomLevel}px ${this.config.fontFamily}`;
      this.ctx!.fillText(
        char,
        screenX + scaledTileSize / 2,
        screenY + scaledTileSize / 2 - (this.config.fontSize * data.zoomLevel) / 2
      );
    }
  }

  private renderStructures(tiles: WorldTile[], data: DFRenderData): void {
    for (const tile of tiles) {
      if (tile.structures.length > 0) {
        const scaledTileSize = this.config.tileSize * data.zoomLevel;
        const screenX = (tile.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
        const screenY = (tile.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
        
        const structure = tile.structures[0]; // Show first structure
        if (structure) {
          const char = this.getStructureChar(structure.type);
          const color = this.getStructureColor(structure.type);
          
          this.ctx!.fillStyle = color;
          this.ctx!.textAlign = 'center';
          this.ctx!.font = `${this.config.fontSize * data.zoomLevel}px ${this.config.fontFamily}`;
          this.ctx!.fillText(
            char,
            screenX + scaledTileSize / 2,
            screenY + scaledTileSize / 2 - (this.config.fontSize * data.zoomLevel) / 2
          );
        }
      }
    }
  }

  private renderResources(tiles: WorldTile[], data: DFRenderData): void {
    for (const tile of tiles) {
      if (tile.resources.length > 0) {
        const scaledTileSize = this.config.tileSize * data.zoomLevel;
        const screenX = (tile.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
        const screenY = (tile.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
        
        const resource = tile.resources[0]; // Show first resource
        if (resource) {
          const char = this.getResourceChar(resource.type);
          const color = this.getResourceColor(resource.type);
          
          this.ctx!.fillStyle = color;
          this.ctx!.textAlign = 'center';
          this.ctx!.font = `${this.config.fontSize * data.zoomLevel}px ${this.config.fontFamily}`;
          this.ctx!.fillText(
            char,
            screenX + scaledTileSize / 2,
            screenY + scaledTileSize / 2 - (this.config.fontSize * data.zoomLevel) / 2
          );
        }
      }
    }
  }

  private renderAgents(agents: Agent[], data: DFRenderData): void {
    for (const agent of agents) {
      const scaledTileSize = this.config.tileSize * data.zoomLevel;
      const screenX = (agent.position.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
      const screenY = (agent.position.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
      
      const char = this.getAgentChar(agent);
      const color = this.getAgentColor(agent);
      
      this.ctx!.fillStyle = color;
      this.ctx!.textAlign = 'center';
      this.ctx!.font = `${this.config.fontSize * data.zoomLevel}px ${this.config.fontFamily}`;
      this.ctx!.fillText(
        char,
        screenX + scaledTileSize / 2,
        screenY + scaledTileSize / 2 - (this.config.fontSize * data.zoomLevel) / 2
      );
    }
  }

  private renderGrid(data: DFRenderData): void {
    this.ctx!.strokeStyle = '#333333';
    this.ctx!.lineWidth = 1;
    
    const scaledTileSize = this.config.tileSize * data.zoomLevel;
    const startX = Math.floor((data.centerX - data.viewportWidth / 2) / scaledTileSize);
    const endX = Math.floor((data.centerX + data.viewportWidth / 2) / scaledTileSize);
    const startY = Math.floor((data.centerY - data.viewportHeight / 2) / scaledTileSize);
    const endY = Math.floor((data.centerY + data.viewportHeight / 2) / scaledTileSize);
    
    // Vertical lines
    for (let x = startX; x <= endX; x++) {
      const screenX = (x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
      this.ctx!.beginPath();
      this.ctx!.moveTo(screenX, 0);
      this.ctx!.lineTo(screenX, data.viewportHeight);
      this.ctx!.stroke();
    }
    
    // Horizontal lines
    for (let y = startY; y <= endY; y++) {
      const screenY = (y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
      this.ctx!.beginPath();
      this.ctx!.moveTo(0, screenY);
      this.ctx!.lineTo(data.viewportWidth, screenY);
      this.ctx!.stroke();
    }
  }

  private renderLabels(data: DFRenderData): void {
    this.ctx!.fillStyle = '#FFFFFF';
    this.ctx!.font = `${12 * data.zoomLevel}px monospace`;
    this.ctx!.textAlign = 'left';
    
    // Render settlement names
    for (const settlement of data.worldData.settlements) {
      const scaledTileSize = this.config.tileSize * data.zoomLevel;
      const screenX = (settlement.position.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
      const screenY = (settlement.position.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
      
      if (screenX >= 0 && screenX < data.viewportWidth && screenY >= 0 && screenY < data.viewportHeight) {
        this.ctx!.fillText(settlement.name, screenX + scaledTileSize, screenY);
      }
    }
    
    // Render river names
    for (const river of data.worldData.rivers) {
      if (river.points.length > 0) {
        const point = river.points[Math.floor(river.points.length / 2)];
        if (point) {
          const scaledTileSize = this.config.tileSize * data.zoomLevel;
          const screenX = (point.x * scaledTileSize - data.centerX * scaledTileSize + data.viewportWidth / 2);
          const screenY = (point.y * scaledTileSize - data.centerY * scaledTileSize + data.viewportHeight / 2);
          
          if (screenX >= 0 && screenX < data.viewportWidth && screenY >= 0 && screenY < data.viewportHeight) {
            this.ctx!.fillStyle = '#4169E1';
            this.ctx!.fillText(river.name, screenX, screenY - 15 * data.zoomLevel);
          }
        }
      }
    }
  }

  // Helper methods for characters and colors
  private getStructureChar(type: string): string {
    switch (type) {
      case 'house': return '⌂';
      case 'farm': return '≈';
      case 'factory': return '⚙';
      case 'school': return '☎';
      case 'hospital': return '✚';
      case 'government': return '◊';
      case 'market': return '$';
      case 'temple': return '☩';
      default: return '⌂';
    }
  }

  private getStructureColor(type: string): string {
    switch (type) {
      case 'house': return '#C0C0C0';
      case 'farm': return '#90EE90';
      case 'factory': return '#808080';
      case 'school': return '#4169E1';
      case 'hospital': return '#FF0000';
      case 'government': return '#FFD700';
      case 'market': return '#FFD700';
      case 'temple': return '#FFD700';
      default: return '#C0C0C0';
    }
  }

  private getResourceChar(type: string): string {
    switch (type) {
      case 'food': return '☘';
      case 'water': return '~';
      case 'wood': return '♣';
      case 'stone': return '■';
      case 'metal': return '◆';
      case 'energy': return '⚡';
      case 'knowledge': return '☎';
      default: return '☘';
    }
  }

  private getResourceColor(type: string): string {
    switch (type) {
      case 'food': return '#90EE90';
      case 'water': return '#4169E1';
      case 'wood': return '#006400';
      case 'stone': return '#696969';
      case 'metal': return '#C0C0C0';
      case 'energy': return '#FFD700';
      case 'knowledge': return '#FF69B4';
      default: return '#90EE90';
    }
  }

  private getAgentChar(agent: Agent): string {
    switch (agent.status) {
      case 'alive': return '@';
      case 'dead': return '†';
      case 'unconscious': return 'x';
      case 'sleeping': return 'z';
      case 'working': return 'w';
      case 'exploring': return 'e';
      case 'fighting': return 'f';
      case 'fleeing': return 'r';
      default: return '@';
    }
  }

  private getAgentColor(agent: Agent): string {
    switch (agent.status) {
      case 'alive': return '#00FF00';
      case 'dead': return '#FF0000';
      case 'unconscious': return '#FFA500';
      case 'sleeping': return '#4169E1';
      case 'working': return '#FFD700';
      case 'exploring': return '#00FFFF';
      case 'fighting': return '#FF0000';
      case 'fleeing': return '#FFA500';
      default: return '#00FF00';
    }
  }

  // Color utility methods
  private darkenColor(color: string, factor: number): string {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const newR = Math.floor(r * (1 - factor));
    const newG = Math.floor(g * (1 - factor));
    const newB = Math.floor(b * (1 - factor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  private lightenColor(color: string, factor: number): string {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const newR = Math.floor(r + (255 - r) * factor);
    const newG = Math.floor(g + (255 - g) * factor);
    const newB = Math.floor(b + (255 - b) * factor);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  private addTint(color: string, tintColor: string, factor: number): string {
    const r1 = parseInt(color.slice(1, 3), 16);
    const g1 = parseInt(color.slice(3, 5), 16);
    const b1 = parseInt(color.slice(5, 7), 16);
    
    const r2 = parseInt(tintColor.slice(1, 3), 16);
    const g2 = parseInt(tintColor.slice(3, 5), 16);
    const b2 = parseInt(tintColor.slice(5, 7), 16);
    
    const newR = Math.floor(r1 * (1 - factor) + r2 * factor);
    const newG = Math.floor(g1 * (1 - factor) + g2 * factor);
    const newB = Math.floor(b1 * (1 - factor) + b2 * factor);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  private getBiomeBackgroundColor(tile: WorldTile): string {
    // Base biome colors
    switch (tile.type) {
      case TileType.GRASS:
        if (tile.elevation > 0.7) return '#8B7355'; // Brown for high grass
        if (tile.elevation > 0.5) return '#9ACD32'; // Yellow-green for medium grass
        return '#90EE90'; // Light green for low grass
        
      case TileType.FOREST:
        return '#228B22'; // Forest green
        
      case TileType.MOUNTAIN:
        return '#696969'; // Dark gray
        
      case TileType.WATER:
        return '#4169E1'; // Royal blue
        
      case TileType.DESERT:
        return '#F4A460'; // Sandy brown
        
      case TileType.URBAN:
        return '#808080'; // Gray
        
      case TileType.FARM:
        return '#90EE90'; // Light green
        
      case TileType.ROAD:
        return '#8B4513'; // Saddle brown
        
      case TileType.HILL:
        return '#556B2F'; // Dark olive green
        
      case TileType.SWAMP:
        return '#228B22'; // Forest green
        
      case TileType.TUNDRA:
        return '#F0F8FF'; // Alice blue
        
      case TileType.ALPINE:
        return '#FFFFFF'; // White
        
      case TileType.VOLCANO:
        return '#8B0000'; // Dark red
        
      case TileType.RUINS:
        return '#696969'; // Dark gray
        
      case TileType.CAPITAL:
        return '#FFD700'; // Gold
        
      case TileType.TRADE_HUB:
        return '#FFD700'; // Gold
        
      case TileType.FORTRESS:
        return '#8B4513'; // Saddle brown
        
      case TileType.RELIGIOUS_SITE:
        return '#FFD700'; // Gold
        
      case TileType.NATURAL_WONDER:
        return '#FFD700'; // Gold
        
      case TileType.LANDMARK:
        return '#FFD700'; // Gold
        
      default:
        return '#666666'; // Default gray
    }
  }

  private getFireEffect(fireState: FireState): { char: string; color: string; bgColor?: string } {
    switch (fireState) {
      case FireState.SMOLDERING:
        return { char: '~', color: '#8B4513', bgColor: '#2F1B14' };
      case FireState.BURNING:
        return { char: '🔥', color: '#FF4500', bgColor: '#8B0000' };
      case FireState.INTENSE:
        return { char: '🔥', color: '#FF0000', bgColor: '#4B0000' };
      case FireState.BURNT:
        return { char: '■', color: '#2F1B14', bgColor: '#1A0F0A' };
      case FireState.RECOVERING:
        return { char: '🌱', color: '#228B22', bgColor: '#2F4F2F' };
      default:
        return { char: '.', color: '#666666' };
    }
  }

  private getSoilQualityColor(quality: number): string {
    if (quality > 0.8) return '#90EE90'; // Light green for high quality
    if (quality > 0.6) return '#9ACD32'; // Yellow-green for good quality
    if (quality > 0.4) return '#F4A460'; // Sandy brown for medium quality
    if (quality > 0.2) return '#8B4513'; // Saddle brown for poor quality
    return '#654321'; // Dark brown for very poor quality
  }

  private getVegetationDensityColor(density: number): string {
    if (density > 0.8) return '#006400'; // Dark green for dense vegetation
    if (density > 0.6) return '#228B22'; // Forest green for moderate density
    if (density > 0.4) return '#90EE90'; // Light green for sparse vegetation
    if (density > 0.2) return '#F4A460'; // Sandy brown for very sparse
    return '#8B7355'; // Brown for barren
  }

  private getErosionColor(erosion: number): string {
    if (erosion > 0.8) return '#8B4513'; // Saddle brown for high erosion
    if (erosion > 0.6) return '#A0522D'; // Sienna for moderate erosion
    if (erosion > 0.4) return '#CD853F'; // Peru for some erosion
    if (erosion > 0.2) return '#DEB887'; // Burlywood for light erosion
    return '#F5DEB3'; // Wheat for minimal erosion
  }
} 