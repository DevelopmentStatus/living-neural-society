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
  // Enhanced viewport culling options
  viewportBufferSize: number; // Buffer size in tiles around viewport
  adaptiveBufferScaling: boolean; // Scale buffer based on zoom level
  maxBufferMultiplier: number; // Maximum buffer size multiplier
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

// Enhanced viewport culling interface
interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  bufferMinX: number;
  bufferMaxX: number;
  bufferMinY: number;
  bufferMaxY: number;
  screenWidth: number;
  screenHeight: number;
  worldToScreenScale: number;
}

export class PerformanceRenderer {
  private config: PerformanceRenderConfig;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private tileCache: Map<string, { char: string; color: string; bgColor: string }> = new Map();
  private octree: OctreeNode | null = null;
  private meshCache: Map<string, MeshRegion[]> = new Map();
  private lastViewportBounds: ViewportBounds | null = null;
  private viewportCache: Map<string, WorldTile[]> = new Map();

  constructor(config: PerformanceRenderConfig) {
    this.config = {
      ...config,
      viewportBufferSize: config.viewportBufferSize || 0, // Default to no buffer
      adaptiveBufferScaling: config.adaptiveBufferScaling !== false,
      maxBufferMultiplier: config.maxBufferMultiplier || 1.0 // Default to no multiplier
    };
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

  public cleanup(): void {
    // Clear caches
    this.tileCache.clear();
    this.meshCache.clear();
    this.viewportCache.clear();
    this.lastViewportBounds = null;
    
    console.log('✅ PerformanceRenderer cleaned up');
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

    // Simple viewport calculation
    const viewportBounds = this.calculateViewportBounds(data);
    
    // Get visible tiles with minimal processing
    const visibleTiles = this.getVisibleTilesWithSmartCulling(data, viewportBounds);
    
    // Use greedy meshing when enabled
    if (this.config.enableGreedyMeshing) {
      this.renderGreedyMesh(visibleTiles, data);
    } else {
      // Simple tile rendering - no complex optimizations
      this.renderTiles(visibleTiles, data);
    }
    
    // Only render additional features if zoomed in and not too many tiles
    if (data.zoomLevel > 0.5 && visibleTiles.length < 5000) {
      if (this.config.showRivers) {
        this.renderRivers(data);
      }
      
      if (this.config.showRoads) {
        this.renderRoads(data);
      }
      
      if (this.config.showSettlements) {
        this.renderSettlements(data);
      }
      
      if (this.config.showAgents && data.agents.length < 500) {
        this.renderAgents(data.agents, data);
      }
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
    
    // Clear viewport cache when world data changes
    this.clearViewportCache();
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
    // Legacy method - now uses the new smart culling system
    const viewportBounds = this.calculateViewportBounds(data);
    return this.getVisibleTilesWithSmartCulling(data, viewportBounds);
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

    const tileSize = this.config.tileSize * data.zoomLevel;
    
    // Create actual greedy mesh regions
    const meshRegions = this.createGreedyMesh(tiles, tileSize, data.zoomLevel);
    
    // Check if we have too many small regions (indicating holes)
    const avgRegionSize = tiles.length / Math.max(meshRegions.length, 1);
    const hasTooManyHoles = avgRegionSize < 2 || meshRegions.length > tiles.length * 0.8;
    
    // Only log greedy meshing info when there are issues or significant changes
    if (hasTooManyHoles || Math.random() < 0.05) { // 5% chance to log normally
      console.log(`🔍 Greedy meshing: ${tiles.length} tiles → ${meshRegions.length} regions (avg: ${avgRegionSize.toFixed(1)})`);
    }
    
    if (hasTooManyHoles) {
      console.log('🔍 Too many holes detected, falling back to individual tile rendering');
      // Fall back to individual tile rendering
      this.renderTiles(tiles, data);
      return;
    }
    
    // Batch render regions by type for better performance
    const regionBatches = new Map<string, MeshRegion[]>();
    
    for (const region of meshRegions) {
      const batchKey = `${region.tileType}_${region.color}_${region.bgColor}`;
      
      if (!regionBatches.has(batchKey)) {
        regionBatches.set(batchKey, []);
      }
      regionBatches.get(batchKey)!.push(region);
    }
    
    // Render each batch
    for (const [batchKey, batchRegions] of regionBatches) {
      const firstRegion = batchRegions[0];
      if (!firstRegion) continue; // Skip empty batches
      
      // Set styles once for the batch
      this.ctx.fillStyle = firstRegion.bgColor;
      this.ctx.font = `${Math.max(8, Math.min(tileSize * 0.8, 16))}px ${this.config.fontFamily}`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = firstRegion.color;
      
      const char = this.getTileChar(firstRegion.tileType);
      
      // Render all regions in this batch
      for (const region of batchRegions) {
        // Camera position is in tile coordinates, not pixel coordinates
        // Calculate screen position centered on camera tile
        const screenX = (region.x - data.centerX) * tileSize + data.viewportWidth / 2;
        const screenY = (region.y - data.centerY) * tileSize + data.viewportHeight / 2;
        const regionWidth = region.width * tileSize;
        const regionHeight = region.height * tileSize;
        
        // Skip if off-screen
        if (screenX < -regionWidth * 2 || screenX > data.viewportWidth + regionWidth * 2 ||
            screenY < -regionHeight * 2 || screenY > data.viewportHeight + regionHeight * 2) {
          continue;
        }
        
        // Draw the entire region as a single rectangle for background
        this.ctx.fillStyle = region.bgColor;
        this.ctx.fillRect(screenX, screenY, regionWidth, regionHeight);
        
        // Only draw ASCII characters when zoomed in (zoom >= 1.0)
        // This improves performance when viewing the full world
        if (data.zoomLevel >= 1.0) {
          // Draw characters for each tile in the region
          this.ctx.fillStyle = region.color;
          
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
  }
  
  private findLargestRectangle(startTile: WorldTile, tileMap: Map<string, WorldTile>, processed: Set<string>): { x: number; y: number; width: number; height: number } {
    const targetType = startTile.type;
    let maxWidth = 1;
    let maxHeight = 1;
    
    // Find maximum width
    for (let w = 1; w <= 4; w++) { // Further reduced limit for better performance
      const key = `${startTile.x + w - 1},${startTile.y}`;
      const tile = tileMap.get(key);
      if (!tile || tile.type !== targetType || processed.has(key)) {
        break;
      }
      maxWidth = w;
    }
    
    // Find maximum height for this width
    for (let h = 1; h <= 4; h++) { // Further reduced limit for better performance
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

  private createGreedyMesh(tiles: WorldTile[], tileSize: number, zoomLevel: number = 1): MeshRegion[] {
    if (tiles.length === 0) return [];
    
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
      const region = this.expandRegion(tile, tileMap, visited, tileInfo, zoomLevel);
      regions.push(region);
    }
    
    return regions;
  }

  private expandRegion(startTile: WorldTile, tileMap: Map<string, WorldTile>, visited: Set<string>, tileInfo: { char: string; color: string; bgColor: string }, zoomLevel: number): MeshRegion {
    const region: MeshRegion = {
      x: startTile.x,
      y: startTile.y,
      width: 1,
      height: 1,
      tileType: startTile.type,
      color: tileInfo.color,
      bgColor: tileInfo.bgColor
    };

    // Mark the starting tile as visited
    visited.add(`${startTile.x},${startTile.y}`);

    // Adaptive maximum region size based on zoom level
    // When zoomed out, we can create larger regions for better performance
    // When zoomed in, we need smaller regions for detail
    const maxRegionSize = Math.max(4, Math.min(16, Math.floor(2 / Math.max(0.1, zoomLevel))));

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

    return region;
  }

  private renderTiles(tiles: WorldTile[], data: PerformanceRenderData): void {
    if (!this.ctx) return;

    const tileSize = this.config.tileSize * data.zoomLevel;
    
    // Simple, fast rendering without complex batching
    for (const tile of tiles) {
      const tileInfo = this.getTileInfo(tile);
      
      // Camera position is in tile coordinates, not pixel coordinates
      // Calculate screen position centered on camera tile
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
      
      // Only draw ASCII characters when zoomed in (zoom >= 1.0)
      // This improves performance when viewing the full world
      if (data.zoomLevel >= 1.0) {
        // Draw character
        this.ctx.fillStyle = tileInfo.color;
        this.ctx.font = `${Math.max(8, Math.min(tileSize * 0.8, 16))}px ${this.config.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tileInfo.char, screenX + tileSize / 2, screenY + tileSize / 2);
      }
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

  /**
   * Calculate viewport bounds with exact camera visibility (no buffer)
   */
  private calculateViewportBounds(data: PerformanceRenderData): ViewportBounds {
    const tileSize = this.config.tileSize;
    const worldToScreenScale = data.zoomLevel;
    
    // Calculate world viewport dimensions from screen dimensions
    // Screen dimensions are in pixels, convert to world coordinates
    const worldViewportWidth = data.viewportWidth / data.zoomLevel;
    const worldViewportHeight = data.viewportHeight / data.zoomLevel;
    
    // Calculate viewport bounds in world coordinates
    const minX = data.centerX - worldViewportWidth / 2;
    const maxX = data.centerX + worldViewportWidth / 2;
    const minY = data.centerY - worldViewportHeight / 2;
    const maxY = data.centerY + worldViewportHeight / 2;
    
    // Add buffer for smooth scrolling (optional)
    const bufferSize = this.config.viewportBufferSize;
    const worldBufferSize = bufferSize * tileSize;
    
    // Calculate buffer bounds
    const bufferMinX = Math.max(0, minX - worldBufferSize);
    const bufferMaxX = maxX + worldBufferSize;
    const bufferMinY = Math.max(0, minY - worldBufferSize);
    const bufferMaxY = maxY + worldBufferSize;
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      bufferMinX,
      bufferMaxX,
      bufferMinY,
      bufferMaxY,
      screenWidth: data.viewportWidth,
      screenHeight: data.viewportHeight,
      worldToScreenScale
    };
  }

  /**
   * Get visible tiles using exact camera viewport (no buffer)
   */
  private getVisibleTilesWithSmartCulling(data: PerformanceRenderData, viewportBounds: ViewportBounds): WorldTile[] {
    if (!data.worldData.tiles.length) {
      return [];
    }

    const tiles: WorldTile[] = [];
    const tileSize = this.config.tileSize;
    
    // Get all tiles in the viewable area with buffer
    const allViewableTiles = this.getAllTilesInViewableArea(data, viewportBounds);
    
    // Occlude tiles that aren't actually visible on screen
    const visibleTiles = this.occludeOffScreenTiles(allViewableTiles, data, viewportBounds);
    
    return visibleTiles;
  }

  /**
   * Get all tiles in the viewable canvas area with buffer
   */
  private getAllTilesInViewableArea(data: PerformanceRenderData, viewportBounds: ViewportBounds): WorldTile[] {
    const tiles: WorldTile[] = [];
    const tileSize = this.config.tileSize;
    
    // Calculate buffer size (extra tiles around the viewport for smooth scrolling)
    const bufferSize = this.config.viewportBufferSize || 16;
    const bufferTiles = Math.ceil(bufferSize / tileSize);
    
    // Camera position is in tile coordinates, not pixel coordinates
    // Calculate viewable area in tile coordinates based on camera position
    const viewportTilesWidth = Math.ceil(data.viewportWidth / (tileSize * data.zoomLevel));
    const viewportTilesHeight = Math.ceil(data.viewportHeight / (tileSize * data.zoomLevel));
    
    // Calculate tile bounds centered on camera position (in tile coordinates)
    const startX = Math.max(0, Math.floor(data.centerX - viewportTilesWidth / 2) - bufferTiles);
    const endX = Math.min(data.worldData.tiles[0]?.length || 0, Math.ceil(data.centerX + viewportTilesWidth / 2) + bufferTiles);
    const startY = Math.max(0, Math.floor(data.centerY - viewportTilesHeight / 2) - bufferTiles);
    const endY = Math.min(data.worldData.tiles.length, Math.ceil(data.centerY + viewportTilesHeight / 2) + bufferTiles);

    // Calculate total tiles in viewable area for monitoring
    const totalViewableTiles = (endX - startX) * (endY - startY);
    
    // Log performance info occasionally
    if (Math.random() < 0.01) { // 1% chance to log
      console.log(`🔍 Camera-based viewable area: ${totalViewableTiles} tiles (${startX},${startY}) to (${endX},${endY})`);
      console.log(`📷 Camera tile: (${data.centerX.toFixed(1)}, ${data.centerY.toFixed(1)}) zoom: ${data.zoomLevel.toFixed(2)}`);
      console.log(`📍 Viewport tiles: ${viewportTilesWidth}x${viewportTilesHeight}`);
    }

    // Get all tiles in the buffered viewport area
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

  /**
   * Occlude tiles that aren't actually visible on the screen
   */
  private occludeOffScreenTiles(tiles: WorldTile[], data: PerformanceRenderData, viewportBounds: ViewportBounds): WorldTile[] {
    const visibleTiles: WorldTile[] = [];
    const tileSize = this.config.tileSize;
    
    for (const tile of tiles) {
      // Camera position is in tile coordinates, not pixel coordinates
      // Calculate screen position centered on camera tile
      const screenX = (tile.x - data.centerX) * tileSize * data.zoomLevel + data.viewportWidth / 2;
      const screenY = (tile.y - data.centerY) * tileSize * data.zoomLevel + data.viewportHeight / 2;
      const screenTileSize = tileSize * data.zoomLevel;
      
      // Check if tile is visible on screen
      if (this.isTileVisibleOnScreen(screenX, screenY, screenTileSize, data.viewportWidth, data.viewportHeight)) {
        visibleTiles.push(tile);
      }
    }

    // Log occlusion results occasionally
    if (Math.random() < 0.01) { // 1% chance to log
      const occludedCount = tiles.length - visibleTiles.length;
      const occlusionRate = ((occludedCount / tiles.length) * 100).toFixed(1);
      console.log(`👁️ Occlusion: ${visibleTiles.length}/${tiles.length} tiles visible (${occlusionRate}% occluded)`);
      console.log(`📷 Screen area: ${data.viewportWidth}x${data.viewportHeight} at zoom ${data.zoomLevel.toFixed(2)}`);
    }

    return visibleTiles;
  }

  /**
   * Check if a tile is actually visible on the screen
   */
  private isTileVisibleOnScreen(screenX: number, screenY: number, screenTileSize: number, viewportWidth: number, viewportHeight: number): boolean {
    // Skip tiles that are too small to be visible
    if (screenTileSize < 0.1) {
      return false;
    }
    
    // Skip tiles that are completely off-screen
    if (screenX + screenTileSize < 0 || screenX > viewportWidth ||
        screenY + screenTileSize < 0 || screenY > viewportHeight) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate cache key for viewport data
   */
  private getViewportCacheKey(viewportBounds: ViewportBounds, zoomLevel: number): string {
    // Round values to reduce cache fragmentation
    const roundedBounds = {
      minX: Math.floor(viewportBounds.minX / 10) * 10,
      maxX: Math.ceil(viewportBounds.maxX / 10) * 10,
      minY: Math.floor(viewportBounds.minY / 10) * 10,
      maxY: Math.ceil(viewportBounds.maxY / 10) * 10,
      zoom: Math.round(zoomLevel * 100) / 100
    };
    
    return `${roundedBounds.minX}_${roundedBounds.maxX}_${roundedBounds.minY}_${roundedBounds.maxY}_${roundedBounds.zoom}`;
  }

  /**
   * Check if two viewport bounds are similar enough to use cached data
   */
  private isViewportSimilar(current: ViewportBounds, previous: ViewportBounds): boolean {
    const tolerance = 50; // pixels
    const zoomTolerance = 0.1;
    
    return Math.abs(current.minX - previous.minX) < tolerance &&
           Math.abs(current.maxX - previous.maxX) < tolerance &&
           Math.abs(current.minY - previous.minY) < tolerance &&
           Math.abs(current.maxY - previous.maxY) < tolerance &&
           Math.abs(current.worldToScreenScale - previous.worldToScreenScale) < zoomTolerance;
  }

  /**
   * Clear viewport cache when world data changes
   */
  private clearViewportCache(): void {
    this.viewportCache.clear();
    this.lastViewportBounds = null;
  }
} 