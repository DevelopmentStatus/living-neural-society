import { WorldTile, TileType, Agent, TileLevel, FireState } from '../../types/simulation';
import { DFWorldData, DFRiver, DFLake, DFRoad, DFSettlement } from './DwarfFortressWorldGenerator';

export interface PerformanceRenderConfig {
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
  // Performance options
  enableGreedyMeshing: boolean; // Always enabled for better performance
  enableOctrees: boolean;
  maxVisibleTiles: number;
  resourceVisibilityThreshold: number; // Zoom level below which resources are hidden
  // New layer options
  showBiomeColors: boolean;
  showSoilQuality: boolean;
  showFireEffects: boolean;
  showVegetationDensity: boolean;
  showErosion: boolean;
}

export interface PerformanceRenderData {
  worldData: DFWorldData;
  agents: Agent[];
  zoomLevel: number;
  centerX: number;
  centerY: number;
  viewportWidth: number;
  viewportHeight: number;
}

// Octree node for spatial partitioning
interface OctreeNode {
  x: number;
  y: number;
  width: number;
  height: number;
  children: OctreeNode[];
  tiles: WorldTile[];
  isLeaf: boolean;
}

// Greedy mesh region
interface MeshRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  tileType: TileType;
  color: string;
  bgColor: string;
}

export class PerformanceRenderer {
  private config: PerformanceRenderConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private tileCache: Map<string, { char: string; color: string; bgColor: string }> = new Map();
  private octree: OctreeNode | null = null;
  private meshCache: Map<string, MeshRegion[]> = new Map();

  constructor(config: PerformanceRenderConfig) {
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

  public render(data: PerformanceRenderData): void {
    if (!this.ctx || !this.canvas) {
      console.warn('Canvas not set for rendering');
      return;
    }

    // Clear canvas with dark background
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Reset font to base size
    this.ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;

    // Build octree if enabled and not already built
    if (this.config.enableOctrees && !this.octree) {
      this.buildOctree(data.worldData.tiles);
    }

    // Get visible tiles using octree or traditional method
    let visibleTiles = this.getVisibleTiles(data);
    
    // Debug logging for zoom issues
    console.log('🔍 Render Debug:', {
      zoomLevel: data.zoomLevel,
      visibleTiles: visibleTiles.length,
      useGreedyMeshing: true, // Always enabled
      centerX: data.centerX,
      centerY: data.centerY,
      viewportWidth: data.viewportWidth,
      viewportHeight: data.viewportHeight
    });
    
    // Always use greedy meshing for better performance
    console.log('🔍 Using greedy meshing for', visibleTiles.length, 'visible tiles');
    this.renderGreedyMesh(visibleTiles, data);
    

    
    // Fallback: If no tiles were rendered, try rendering all tiles
    if (visibleTiles.length === 0) {
      console.log('🔍 No visible tiles found, rendering fallback area');
      const fallbackTiles = this.getFallbackTiles(data);
      if (fallbackTiles.length > 0) {
        console.log('🔍 Rendering fallback tiles:', fallbackTiles.length);
        this.renderTiles(fallbackTiles, data);
      }
    }
    
    // Render features (only if zoomed in enough)
    if (data.zoomLevel > this.config.resourceVisibilityThreshold) {
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

  private buildOctree(tiles: WorldTile[][]): void {
    if (!tiles.length || !tiles[0]?.length) return;

    const width = tiles[0].length;
    const height = tiles.length;
    
    // Flatten tiles array
    const flatTiles: WorldTile[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (tiles[y]?.[x]) {
          flatTiles.push(tiles[y]![x]!);
        }
      }
    }

    this.octree = this.createOctreeNode(0, 0, width, height, flatTiles, 0);
  }

  private createOctreeNode(x: number, y: number, width: number, height: number, tiles: WorldTile[], depth: number): OctreeNode {
    const node: OctreeNode = {
      x,
      y,
      width,
      height,
      children: [],
      tiles: [],
      isLeaf: false
    };

    // Stop subdivision if node is small enough or max depth reached
    if (width <= 8 || height <= 8 || depth >= 6) {
      node.isLeaf = true;
      node.tiles = tiles.filter(tile => 
        tile.x >= x && tile.x < x + width && 
        tile.y >= y && tile.y < y + height
      );
      return node;
    }

    // Subdivide into 4 quadrants
    const midX = x + Math.floor(width / 2);
    const midY = y + Math.floor(height / 2);
    const halfWidth = Math.ceil(width / 2);
    const halfHeight = Math.ceil(height / 2);

    const quadrants = [
      { x, y, width: halfWidth, height: halfHeight }, // Top-left
      { x: midX, y, width: halfWidth, height: halfHeight }, // Top-right
      { x, y: midY, width: halfWidth, height: halfHeight }, // Bottom-left
      { x: midX, y: midY, width: halfWidth, height: halfHeight } // Bottom-right
    ];

    for (const quad of quadrants) {
      const quadTiles = tiles.filter(tile => 
        tile.x >= quad.x && tile.x < quad.x + quad.width && 
        tile.y >= quad.y && tile.y < quad.y + quad.height
      );
      
      if (quadTiles.length > 0) {
        node.children.push(this.createOctreeNode(quad.x, quad.y, quad.width, quad.height, quadTiles, depth + 1));
      }
    }

    return node;
  }

  private getVisibleTiles(data: PerformanceRenderData): WorldTile[] {
    if (!data.worldData.tiles.length) {
      console.log('🔍 Warning: No world data tiles found');
      return [];
    }

    let tiles: WorldTile[] = [];
    const tileSize = this.config.tileSize;
    
    // Calculate visible area in world coordinates with padding to reduce holes
    const worldViewportWidth = data.viewportWidth / data.zoomLevel;
    const worldViewportHeight = data.viewportHeight / data.zoomLevel;
    
    // Add padding to ensure we get complete regions and reduce holes
    const padding = Math.max(16, 32 / data.zoomLevel); // More padding at higher zoom levels
    
    // Convert world viewport to tile coordinates
    const tileViewportWidth = worldViewportWidth / tileSize;
    const tileViewportHeight = worldViewportHeight / tileSize;
    
    // Calculate visible area in tile coordinates with padding
    const startX = Math.max(0, Math.floor(data.centerX - tileViewportWidth / 2 - padding));
    const endX = Math.min(data.worldData.tiles[0]?.length || 0, Math.ceil(data.centerX + tileViewportWidth / 2 + padding));
    const startY = Math.max(0, Math.floor(data.centerY - tileViewportHeight / 2 - padding));
    const endY = Math.min(data.worldData.tiles.length, Math.ceil(data.centerY + tileViewportHeight / 2 + padding));

    // Use octree if available
    if (this.config.enableOctrees && this.octree) {
      this.queryOctree(this.octree, startX, endX, startY, endY, tiles);
    } else {
      // Traditional method - ensure we get all tiles in the area
      for (let y = Math.max(0, startY); y < Math.min(data.worldData.tiles.length, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(data.worldData.tiles[y]?.length || 0, endX); x++) {
          const tile = data.worldData.tiles[y]?.[x];
          if (tile) {
            tiles.push(tile);
          }
        }
      }
    }

    // Limit visible tiles for performance, but use a higher limit to reduce holes
    const maxTiles = Math.max(this.config.maxVisibleTiles, 10000); // Increased limit
    if (tiles.length > maxTiles) {
      console.log('🔍 Limiting tiles from', tiles.length, 'to', maxTiles);
      return tiles.slice(0, maxTiles);
    }

    return tiles;
  }

  private getFallbackTiles(data: PerformanceRenderData): WorldTile[] {
    // Fallback method to get tiles when visible area calculation fails
    const tiles: WorldTile[] = [];
    
    // Get a larger area around the camera center
    const fallbackSize = 100; // Larger area
    const startX = Math.max(0, Math.floor(data.centerX - fallbackSize));
    const endX = Math.min(data.worldData.tiles?.[0]?.length || 0, Math.ceil(data.centerX + fallbackSize));
    const startY = Math.max(0, Math.floor(data.centerY - fallbackSize));
    const endY = Math.min(data.worldData.tiles?.length || 0, Math.ceil(data.centerY + fallbackSize));
    
    console.log('🔍 Fallback area:', { startX, endX, startY, endY });
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = data.worldData.tiles[y]?.[x];
        if (tile) {
          tiles.push(tile);
        }
      }
    }
    
    return tiles;
  }

  private queryOctree(node: OctreeNode, startX: number, endX: number, startY: number, endY: number, result: WorldTile[]): void {
    // Check if node intersects with query area
    if (node.x >= endX || node.x + node.width <= startX || 
        node.y >= endY || node.y + node.height <= startY) {
      return;
    }

    if (node.isLeaf) {
      // Add tiles from leaf node
      for (const tile of node.tiles) {
        if (tile.x >= startX && tile.x < endX && tile.y >= startY && tile.y < endY) {
          result.push(tile);
        }
      }
    } else {
      // Recursively query children
      for (const child of node.children) {
        this.queryOctree(child, startX, endX, startY, endY, result);
      }
    }
  }

  private renderGreedyMesh(tiles: WorldTile[], data: PerformanceRenderData): void {
    if (!this.ctx) return;

    console.log('🔍 Greedy meshing', tiles.length, 'tiles');
    
    const tileSize = this.config.tileSize * data.zoomLevel;
    
    // Create actual greedy mesh regions
    const meshRegions = this.createGreedyMesh(tiles, tileSize);
    
    console.log('🔍 Created', meshRegions.length, 'mesh regions from', tiles.length, 'tiles');
    
    // Check if we have too many small regions (indicating holes)
    const avgRegionSize = tiles.length / meshRegions.length;
    const hasTooManyHoles = avgRegionSize < 2 || meshRegions.length > tiles.length * 0.8;
    
    if (hasTooManyHoles) {
      console.log('🔍 Too many holes detected, falling back to individual tile rendering');
      this.renderTiles(tiles, data);
      return;
    }
    
    // Render each mesh region
    for (const region of meshRegions) {
      // Calculate screen position for the region
      const screenX = (region.x - data.centerX) * this.config.tileSize * data.zoomLevel + data.viewportWidth / 2;
      const screenY = (region.y - data.centerY) * this.config.tileSize * data.zoomLevel + data.viewportHeight / 2;
      const regionWidth = region.width * tileSize;
      const regionHeight = region.height * tileSize;
      
      // Skip if off-screen
      if (screenX < -regionWidth || screenX > data.viewportWidth + regionWidth ||
          screenY < -regionHeight || screenY > data.viewportHeight + regionHeight) {
        continue;
      }
      
      // Draw the entire region as a single rectangle for background
      this.ctx.fillStyle = region.bgColor;
      this.ctx.fillRect(screenX, screenY, regionWidth, regionHeight);
      
      // Draw characters for each tile in the region
      if (data.zoomLevel >= 0.1) {
        this.ctx.fillStyle = region.color;
        this.ctx.font = `${Math.max(6, Math.min(tileSize * 0.6, 14))}px ${this.config.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const char = this.getTileChar(region.tileType);
        
        // Debug: Log character info for urban areas
        if (region.tileType === TileType.URBAN || region.tileType === TileType.CAPITAL || region.tileType === TileType.TRADE_HUB) {
          console.log('🔍 Rendering region:', region.tileType, 'char:', char, 'color:', region.color, 'bgColor:', region.bgColor, 'size:', region.width, 'x', region.height, 'zoom:', data.zoomLevel);
        }
        
        // Draw character for each tile position in the region
        for (let y = 0; y < region.height; y++) {
          for (let x = 0; x < region.width; x++) {
            const tileScreenX = screenX + (x * tileSize);
            const tileScreenY = screenY + (y * tileSize);
            this.ctx.fillText(char, tileScreenX + tileSize / 2, tileScreenY + tileSize / 2);
          }
        }
      }
    }
  }
  
  private findLargestRectangle(startTile: WorldTile, tileMap: Map<string, WorldTile>, processed: Set<string>): { x: number; y: number; width: number; height: number } {
    const targetType = startTile.type;
    let maxWidth = 1;
    let maxHeight = 1;
    
    // Find maximum width
    for (let w = 1; w <= 8; w++) { // Reduced limit for better performance
      const key = `${startTile.x + w - 1},${startTile.y}`;
      const tile = tileMap.get(key);
      if (!tile || tile.type !== targetType || processed.has(key)) {
        break;
      }
      maxWidth = w;
    }
    
    // Find maximum height for this width
    for (let h = 1; h <= 8; h++) { // Reduced limit for better performance
      let canExpand = true;
      for (let x = 0; x < maxWidth; x++) {
        const key = `${startTile.x + x},${startTile.y + h - 1}`;
        const tile = tileMap.get(key);
        if (!tile || tile.type !== targetType || processed.has(key)) {
          canExpand = false;
          break;
        }
      }
      if (!canExpand) break;
      maxHeight = h;
    }
    
    // Mark all tiles in this region as processed
    for (let y = 0; y < maxHeight; y++) {
      for (let x = 0; x < maxWidth; x++) {
        processed.add(`${startTile.x + x},${startTile.y + y}`);
      }
    }
    
    return {
      x: startTile.x,
      y: startTile.y,
      width: maxWidth,
      height: maxHeight
    };
  }

  private createGreedyMesh(tiles: WorldTile[], tileSize: number): MeshRegion[] {
    const regions: MeshRegion[] = [];
    const visited = new Set<string>();
    
    // Create a map for faster tile lookup
    const tileMap = new Map<string, WorldTile>();
    for (const tile of tiles) {
      tileMap.set(`${tile.x},${tile.y}`, tile);
    }
    
    // Sort tiles by position for more predictable meshing
    const sortedTiles = tiles.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    
    for (const tile of sortedTiles) {
      const key = `${tile.x},${tile.y}`;
      if (visited.has(key)) continue;
      
      const tileInfo = this.getTileInfo(tile);
      const region = this.expandRegion(tile, tileMap, visited, tileInfo);
      regions.push(region);
    }
    
    return regions;
  }

  private expandRegion(startTile: WorldTile, tileMap: Map<string, WorldTile>, visited: Set<string>, tileInfo: { char: string; color: string; bgColor: string }): MeshRegion {
    const region: MeshRegion = {
      x: startTile.x,
      y: startTile.y,
      width: 1,
      height: 1,
      tileType: startTile.type,
      color: tileInfo.color,
      bgColor: tileInfo.bgColor
    };

    // Increased maximum region size for better performance and fewer holes
    const maxRegionSize = 16;

    // Expand horizontally first
    let canExpandRight = true;
    while (canExpandRight && region.width < maxRegionSize) {
      const nextX = region.x + region.width;
      const key = `${nextX},${region.y}`;
      
      if (visited.has(key)) {
        canExpandRight = false;
        break;
      }
      
      const nextTile = tileMap.get(key);
      if (!nextTile || nextTile.type !== startTile.type) {
        canExpandRight = false;
        break;
      }
      
      region.width++;
      visited.add(key);
    }

    // Expand vertically - find the maximum height that works for all columns
    let maxHeight = 1;
    let canExpandDown = true;
    
    while (canExpandDown && maxHeight < maxRegionSize) {
      // Check if we can expand down for all columns in the current width
      for (let x = region.x; x < region.x + region.width; x++) {
        const nextY = region.y + maxHeight;
        const key = `${x},${nextY}`;
        
        if (visited.has(key)) {
          canExpandDown = false;
          break;
        }
        
        const nextTile = tileMap.get(key);
        if (!nextTile || nextTile.type !== startTile.type) {
          canExpandDown = false;
          break;
        }
      }
      
      if (canExpandDown) {
        // Mark all tiles in this new row as visited
        for (let x = region.x; x < region.x + region.width; x++) {
          const key = `${x},${region.y + maxHeight}`;
          visited.add(key);
        }
        maxHeight++;
      }
    }
    
    region.height = maxHeight;

    // Validate that all tiles in the region actually exist and are of the correct type
    let validRegion = true;
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const key = `${x},${y}`;
        const tile = tileMap.get(key);
        if (!tile || tile.type !== startTile.type) {
          validRegion = false;
          break;
        }
      }
      if (!validRegion) break;
    }

    // If region is invalid, fall back to single tile
    if (!validRegion) {
      region.width = 1;
      region.height = 1;
    }

    return region;
  }

  private renderTiles(tiles: WorldTile[], data: PerformanceRenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * data.zoomLevel;
    
    for (const tile of tiles) {
      const tileInfo = this.getTileInfo(tile);
      
      // Calculate screen position
      const screenX = (tile.x - data.centerX) * tileSize + data.viewportWidth / 2;
      const screenY = (tile.y - data.centerY) * tileSize + data.viewportHeight / 2;
      
      // Skip if off-screen
      if (screenX < -tileSize || screenX > data.viewportWidth + tileSize ||
          screenY < -tileSize || screenY > data.viewportHeight + tileSize) {
        continue;
      }
      
      // Draw background
      this.ctx.fillStyle = tileInfo.bgColor;
      this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
      
      // Set larger font size for better visibility
      const fontSize = Math.max(8, Math.min(tileSize * 0.8, 16));
      this.ctx.font = `${fontSize}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Draw character centered in tile
      this.ctx.fillStyle = tileInfo.color;
      this.ctx.fillText(tileInfo.char, screenX + tileSize / 2, screenY + tileSize / 2);
    }
  }

  private getTileInfo(tile: WorldTile): { char: string; color: string; bgColor: string } {
    const cacheKey = `${tile.type}_${tile.elevation}_${tile.temperature}_${tile.humidity}`;
    
    if (this.tileCache.has(cacheKey)) {
      return this.tileCache.get(cacheKey)!;
    }

    const tileInfo = this.calculateTileInfo(tile);
    this.tileCache.set(cacheKey, tileInfo);
    return tileInfo;
  }

  private calculateTileInfo(tile: WorldTile): { char: string; color: string; bgColor: string } {
    // Base tile information
    let char = this.getTileChar(tile.type);
    let color = this.getTileColor(tile.type);
    let bgColor = this.getTileBackgroundColor(tile);

    // Apply environmental effects
    if (this.config.showFireEffects && tile.fireState !== FireState.NONE) {
      const fireEffect = this.getFireEffect(tile.fireState);
      char = fireEffect.char;
      color = fireEffect.color;
      if (fireEffect.bgColor) {
        bgColor = fireEffect.bgColor;
      }
    }

    return { char, color, bgColor };
  }

  private getTileChar(type: TileType): string {
    switch (type) {
      case TileType.GRASS: return '•';
      case TileType.FOREST: return '♠';
      case TileType.MOUNTAIN: return '▲';
      case TileType.HILL: return '◊';
      case TileType.WATER: return '≈';
      case TileType.DESERT: return '~';
      case TileType.SWAMP: return '≈';
      case TileType.TUNDRA: return '·';
      case TileType.ALPINE: return '▲';
      case TileType.VOLCANO: return '♦';
      case TileType.RUINS: return '†';
      case TileType.CAPITAL: return '◊';
      case TileType.TRADE_HUB: return '$';
      case TileType.FORTRESS: return '◘';
      case TileType.RELIGIOUS_SITE: return '†';
      case TileType.NATURAL_WONDER: return '★';
      case TileType.LANDMARK: return '♦';
      case TileType.URBAN: return '#';
      case TileType.FARM: return '~';
      case TileType.ROAD: return '=';
      default: return '·';
    }
  }

  private getTileColor(type: TileType): string {
    switch (type) {
      case TileType.GRASS: return '#90EE90'; // Light green
      case TileType.FOREST: return '#228B22'; // Forest green
      case TileType.MOUNTAIN: return '#2F2F2F'; // Very dark gray (rock color)
      case TileType.HILL: return '#404040'; // Dark gray (rocky hills)
      case TileType.WATER: return '#4169E1'; // Blue
      case TileType.DESERT: return '#F4A460'; // Sandy brown
      case TileType.SWAMP: return '#556B2F'; // Dark olive
      case TileType.TUNDRA: return '#F0F8FF'; // Alice blue
      case TileType.ALPINE: return '#E6E6FA'; // Lavender (snow/ice color)
      case TileType.VOLCANO: return '#FF4500'; // Orange red
      case TileType.RUINS: return '#696969'; // Dim gray
      case TileType.CAPITAL: return '#FFD700'; // Gold
      case TileType.TRADE_HUB: return '#FF69B4'; // Hot pink
      case TileType.FORTRESS: return '#708090'; // Slate gray
      case TileType.RELIGIOUS_SITE: return '#9370DB'; // Medium purple
      case TileType.NATURAL_WONDER: return '#00CED1'; // Dark turquoise
      case TileType.LANDMARK: return '#FF6347'; // Tomato
      case TileType.URBAN: return '#FFFFFF'; // White for better visibility
      case TileType.FARM: return '#32CD32'; // Lime green
      case TileType.ROAD: return '#A0522D'; // Sienna
      default: return '#FFFFFF'; // White
    }
  }

  private getTileBackgroundColor(tile: WorldTile): string {
    if (this.config.showBiomeColors) {
      return this.getBiomeBackgroundColor(tile);
    }
    return '#000000';
  }

  private getBiomeBackgroundColor(tile: WorldTile): string {
    // Simplified biome background colors based on tile type
    switch (tile.type) {
      case TileType.WATER:
        return '#000080'; // Dark blue background for water
      case TileType.FOREST:
        return '#006400'; // Dark green background for forest
      case TileType.GRASS:
        return '#228B22'; // Forest green background for grass
      case TileType.MOUNTAIN:
        return '#5B5B5B'; // Almost black background for mountains (rock)
      case TileType.HILL:
        return '#1A1A1A'; // Very dark gray background for hills
      case TileType.DESERT:
        return '#CD853F'; // Peru background for desert
      case TileType.SWAMP:
        return '#2F4F2F'; // Dark green background for swamp
      case TileType.TUNDRA:
        return '#F5F5DC'; // Beige background for tundra
      case TileType.ALPINE:
        return '#E6E6FA'; // Lavender background for alpine (snow/ice)
      case TileType.VOLCANO:
        return '#8B0000'; // Dark red background for volcano
      case TileType.RUINS:
        return '#2F2F2F'; // Dark gray background for ruins
      case TileType.CAPITAL:
        return '#B8860B'; // Dark goldenrod background for capital
      case TileType.TRADE_HUB:
        return '#8B008B'; // Dark magenta background for trade hub
      case TileType.FORTRESS:
        return '#4A4A4A'; // Dark gray background for fortress
      case TileType.RELIGIOUS_SITE:
        return '#4B0082'; // Indigo background for religious site
      case TileType.NATURAL_WONDER:
        return '#008B8B'; // Dark cyan background for natural wonder
      case TileType.LANDMARK:
        return '#8B0000'; // Dark red background for landmark
      case TileType.URBAN:
        return '#696969'; // Dim gray background for urban
      case TileType.FARM:
        return '#228B22'; // Forest green background for farm
      case TileType.ROAD:
        return '#8B4513'; // Saddle brown background for road
      default:
        return '#000000'; // Black background for unknown types
    }
  }

  private getFireEffect(fireState: FireState): { char: string; color: string; bgColor?: string } {
    switch (fireState) {
      case FireState.SMOLDERING:
        return { char: '~', color: '#FFA500', bgColor: '#8B0000' };
      case FireState.BURNING:
        return { char: '^', color: '#FF4500', bgColor: '#8B0000' };
      case FireState.INTENSE:
        return { char: '▲', color: '#FF0000', bgColor: '#4B0000' };
      case FireState.BURNT:
        return { char: '·', color: '#696969', bgColor: '#2F2F2F' };
      case FireState.RECOVERING:
        return { char: '•', color: '#90EE90', bgColor: '#2F4F2F' };
      default:
        return { char: '·', color: '#FFFFFF' };
    }
  }

  // Simplified rendering methods for performance
  private renderRivers(data: PerformanceRenderData): void {
    // Simplified river rendering
  }

  private renderRoads(data: PerformanceRenderData): void {
    // Simplified road rendering
  }

  private renderSettlements(data: PerformanceRenderData): void {
    // Simplified settlement rendering
  }

  private renderStructures(tiles: WorldTile[], data: PerformanceRenderData): void {
    // Simplified structure rendering
  }

  private renderResources(tiles: WorldTile[], data: PerformanceRenderData): void {
    // Simplified resource rendering
  }

  private renderAgents(agents: Agent[], data: PerformanceRenderData): void {
    // Simplified agent rendering
  }

  private renderGrid(data: PerformanceRenderData): void {
    // Simplified grid rendering
  }

  private renderLabels(data: PerformanceRenderData): void {
    // Simplified label rendering
  }
} 