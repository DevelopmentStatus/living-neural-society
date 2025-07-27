import { WorldTile, TileType } from '../../types/simulation';
import { MultiScaleWorldManager, MultiScaleConfig } from './MultiScaleWorldManager';

export interface RenderOptions {
  showPoliticalRegions: boolean;
  showCities: boolean;
  showRivers: boolean;
  showLakes: boolean;
  showRoads: boolean;
  showBuildings: boolean;
  showNPCs: boolean;
  showDetails: boolean;
  showUI: boolean;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export class EnhancedWorldRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private multiScaleManager: MultiScaleWorldManager;
  private camera: Camera;
  private options: RenderOptions;
  private isDragging: boolean = false;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private worldBounds: { minX: number; minY: number; maxX: number; maxY: number } = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  
  constructor(canvas: HTMLCanvasElement, config: MultiScaleConfig, worldData?: any) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.multiScaleManager = new MultiScaleWorldManager(config);
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.options = {
      showPoliticalRegions: true,
      showCities: true,
      showRivers: true,
      showLakes: true,
      showRoads: true,
      showBuildings: true,
      showNPCs: true,
      showDetails: true,
      showUI: true
    };
    
    // Set FMG world data if provided
    if (worldData) {
      this.setFMGWorldData(worldData);
    }
    
    this.setupEventListeners();
  }
  
  // Add method to set FMG world data
  public setFMGWorldData(worldData: any): void {
    this.multiScaleManager.setFMGWorldData(worldData);
    console.log('🗺️ FMG world data set in EnhancedWorldRenderer');
  }
  
  private setupEventListeners(): void {
    // Mouse panning
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        this.camera.x -= deltaX / this.camera.zoom;
        this.camera.y -= deltaY / this.camera.zoom;
        
        this.clampCameraToBounds();
        this.lastMousePos = { x: e.clientX, y: e.clientY };
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    
    // Mouse wheel zooming
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      this.zoomAt(mouseX, mouseY, zoomFactor);
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      const panSpeed = 50 / this.camera.zoom;
      
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.camera.y -= panSpeed;
          break;
        case 's':
        case 'arrowdown':
          this.camera.y += panSpeed;
          break;
        case 'a':
        case 'arrowleft':
          this.camera.x -= panSpeed;
          break;
        case 'd':
        case 'arrowright':
          this.camera.x += panSpeed;
          break;
        case '+':
        case '=':
          this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 1.1);
          break;
        case '-':
          this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 0.9);
          break;
        case '0':
          this.resetCamera();
          break;
      }
      
      this.clampCameraToBounds();
    });
  }
  
  private zoomAt(screenX: number, screenY: number, factor: number): void {
    const oldZoom = this.camera.zoom;
    this.camera.zoom *= factor;
    this.camera.zoom = Math.max(0.1, Math.min(10, this.camera.zoom));
    
    // Adjust camera position to zoom towards mouse
    const zoomRatio = this.camera.zoom / oldZoom;
    this.camera.x = screenX - (screenX - this.camera.x) * zoomRatio;
    this.camera.y = screenY - (screenY - this.camera.y) * zoomRatio;
  }
  
  private clampCameraToBounds(): void {
    const viewportWidth = this.canvas.width / this.camera.zoom;
    const viewportHeight = this.canvas.height / this.camera.zoom;
    
    this.camera.x = Math.max(this.worldBounds.minX, Math.min(this.worldBounds.maxX - viewportWidth, this.camera.x));
    this.camera.y = Math.max(this.worldBounds.minY, Math.min(this.worldBounds.maxY - viewportHeight, this.camera.y));
  }
  
  private resetCamera(): void {
    this.camera.x = (this.worldBounds.maxX - this.worldBounds.minX) / 2;
    this.camera.y = (this.worldBounds.maxY - this.worldBounds.minY) / 2;
    this.camera.zoom = 1;
  }
  
  public getCamera(): Camera {
    return { ...this.camera };
  }
  
  public setCamera(x: number, y: number, zoom: number): void {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.zoom = Math.max(0.1, Math.min(10, zoom));
    this.clampCameraToBounds();
  }
  
  public setRenderOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  public render(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Get visible area
    const visibleArea = this.getVisibleArea();
    
    // Get world data for current zoom level
    const worldData = this.multiScaleManager.getWorldData(
      this.camera.zoom,
      this.camera.x,
      this.camera.y,
      this.canvas.width / this.camera.zoom,
      this.canvas.height / this.camera.zoom
    );
    
    if (!worldData) {
      console.log('❌ No world data received from MultiScaleManager');
      return;
    }
    
    // Debug: Log what we're rendering
    if (worldData.tiles) {
      console.log(`🗺️ Rendering ${worldData.tiles.length}x${worldData.tiles[0]?.length || 0} tiles`);
      console.log(`🏛️ Political regions: ${worldData.politicalRegions?.length || 0}`);
      console.log(`🌊 Rivers: ${worldData.rivers?.length || 0}`);
      console.log(`🏙️ Cities: ${worldData.cities?.length || 0}`);
    }
    
    // Apply camera transform
    this.ctx.save();
    this.ctx.translate(-this.camera.x * this.camera.zoom, -this.camera.y * this.camera.zoom);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    
    // Render based on zoom level
    if (this.camera.zoom < 0.5) {
      this.renderWorldLevel(worldData, visibleArea);
    } else if (this.camera.zoom < 2) {
      this.renderRegionLevel(worldData, visibleArea);
    } else if (this.camera.zoom < 5) {
      this.renderTownLevel(worldData, visibleArea);
    } else {
      this.renderCityLevel(worldData, visibleArea);
    }
    
    this.ctx.restore();
    
    // Render UI overlay
    if (this.options.showUI) {
      this.renderUI();
    }
  }
  
  private getVisibleArea(): { minX: number; minY: number; maxX: number; maxY: number } {
    const viewportWidth = this.canvas.width / this.camera.zoom;
    const viewportHeight = this.canvas.height / this.camera.zoom;
    
    return {
      minX: this.camera.x,
      minY: this.camera.y,
      maxX: this.camera.x + viewportWidth,
      maxY: this.camera.y + viewportHeight
    };
  }
  
  private renderWorldLevel(worldData: any, visibleArea: any): void {
    // Render world-level features (continents, major rivers, etc.)
    this.renderTiles(worldData.tiles, visibleArea);
    
    if (this.options.showPoliticalRegions) {
      this.renderPoliticalRegions(worldData.politicalRegions, visibleArea);
    }
    
    if (this.options.showRivers) {
      this.renderRivers(worldData.rivers, visibleArea);
    }
    
    if (this.options.showCities) {
      this.renderCities(worldData.cities, visibleArea);
    }
  }
  
  private renderRegionLevel(worldData: any, visibleArea: any): void {
    // Render regional features (towns, roads, detailed terrain)
    this.renderTiles(worldData.tiles, visibleArea);
    
    if (this.options.showRoads) {
      this.renderRoads(worldData.roads, visibleArea);
    }
    
    if (this.options.showRivers) {
      this.renderRivers(worldData.rivers, visibleArea);
    }
    
    if (this.options.showCities) {
      this.renderCities(worldData.cities, visibleArea);
    }
  }
  
  private renderTownLevel(worldData: any, visibleArea: any): void {
    // Render town-level features (buildings, streets, walls)
    this.renderTiles(worldData.tiles, visibleArea);
    
    if (this.options.showRoads) {
      this.renderRoads(worldData.roads, visibleArea);
    }
    
    if (this.options.showBuildings) {
      this.renderBuildings(worldData.structures, visibleArea);
    }
  }
  
  private renderCityLevel(worldData: any, visibleArea: any): void {
    // Render city-level features (individual buildings, NPCs, details)
    this.renderTiles(worldData.tiles, visibleArea);
    
    if (this.options.showBuildings) {
      this.renderBuildings(worldData.structures, visibleArea);
    }
    
    if (this.options.showNPCs) {
      this.renderNPCs(worldData.agents, visibleArea);
    }
    
    if (this.options.showDetails) {
      this.renderDetails(worldData.structures, visibleArea);
    }
  }
  
  private renderTiles(tiles: WorldTile[][], visibleArea: any): void {
    if (!tiles || tiles.length === 0) {
      console.log('❌ No tiles to render');
      return;
    }
    
    const tileSize = 10; // Fixed tile size for now
    
    for (let x = 0; x < tiles.length; x++) {
      const row = tiles[x];
      if (!row) continue;
      for (let y = 0; y < row.length; y++) {
        const tile = row[y];
        if (!tile) continue;
        
        // Check if tile is in visible area
        const tileX = x * tileSize;
        const tileY = y * tileSize;
        
        if (tileX >= visibleArea.minX && tileX <= visibleArea.maxX &&
            tileY >= visibleArea.minY && tileY <= visibleArea.maxY) {
          this.renderTile(tile);
        }
      }
    }
  }
  
  private renderTile(tile: WorldTile): void {
    const tileSize = 10;
    const x = tile.x * tileSize;
    const y = tile.y * tileSize;
    
    const color = this.getTileColor(tile);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, tileSize, tileSize);
    
    // Add elevation shading
    if (tile.elevation !== undefined) {
      const shade = Math.max(0, Math.min(1, tile.elevation));
      this.ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * (1 - shade)})`;
      this.ctx.fillRect(x, y, tileSize, tileSize);
    }
  }
  
  private getTileColor(tile: WorldTile): string {
    switch (tile.type) {
      case TileType.MOUNTAIN:
        return '#8B7355';
      case TileType.FOREST:
        return '#228B22';
      case TileType.DESERT:
        return '#F4A460';
      case TileType.WATER:
        return '#4169E1';
      case TileType.GRASS:
        return '#90EE90';
      case TileType.ROAD:
        return '#696969';
      default:
        return '#90EE90';
    }
  }
  
  private renderPoliticalRegions(regions: any[], visibleArea: any): void {
    if (!regions) return;
    
    for (const region of regions) {
      if (this.isInVisibleArea(region, visibleArea)) {
        this.renderPoliticalRegion(region);
      }
    }
  }
  
  private renderPoliticalRegion(region: any): void {
    // Render political region boundaries
    this.ctx.strokeStyle = region.color || '#FF0000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(region.x, region.y, region.width, region.height);
    
    // Render region name
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(region.name, region.x + 5, region.y + 15);
  }
  
  private renderRivers(rivers: any[], visibleArea: any): void {
    if (!rivers) return;
    
    this.ctx.strokeStyle = '#4169E1';
    this.ctx.lineWidth = 2;
    
    for (const river of rivers) {
      if (this.isRiverInVisibleArea(river, visibleArea)) {
        this.renderRiver(river);
      }
    }
  }
  
  private renderRiver(river: any): void {
    if (!river.points || river.points.length < 2) return;
    
    this.ctx.beginPath();
    this.ctx.moveTo(river.points[0]?.x || 0, river.points[0]?.y || 0);
    
    for (let i = 1; i < river.points.length; i++) {
      this.ctx.lineTo(river.points[i]?.x || 0, river.points[i]?.y || 0);
    }
    
    this.ctx.stroke();
  }
  
  private renderRoads(roads: any[], visibleArea: any): void {
    if (!roads) return;
    
    this.ctx.strokeStyle = '#696969';
    this.ctx.lineWidth = 1;
    
    for (const road of roads) {
      if (this.isRoadInVisibleArea(road, visibleArea)) {
        this.renderRoad(road);
      }
    }
  }
  
  private renderRoad(road: any): void {
    if (!road.points || road.points.length < 2) return;
    
    this.ctx.beginPath();
    this.ctx.moveTo(road.points[0]?.x || 0, road.points[0]?.y || 0);
    
    for (let i = 1; i < road.points.length; i++) {
      this.ctx.lineTo(road.points[i]?.x || 0, road.points[i]?.y || 0);
    }
    
    this.ctx.stroke();
  }
  
  private renderCities(cities: any[], visibleArea: any): void {
    if (!cities) return;
    
    for (const city of cities) {
      if (this.isInVisibleArea(city, visibleArea)) {
        this.renderCity(city);
      }
    }
  }
  
  private renderCity(city: any): void {
    const size = city.size || 5;
    
    // Draw city marker
    this.ctx.fillStyle = '#FF0000';
    this.ctx.beginPath();
    this.ctx.arc(city.x, city.y, size, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw city name
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '10px Arial';
    this.ctx.fillText(city.name, city.x + size + 2, city.y);
  }
  
  private renderBuildings(buildings: any[], visibleArea: any): void {
    if (!buildings) return;
    
    for (const building of buildings) {
      if (this.isInVisibleArea(building, visibleArea)) {
        this.renderBuilding(building);
      }
    }
  }
  
  private renderBuilding(building: any): void {
    const x = building.position.x;
    const y = building.position.y;
    const width = building.size?.width || 5;
    const height = building.size?.height || 5;
    
    // Draw building
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(x, y, width, height);
    
    // Draw building outline
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
  }
  
  private renderNPCs(npcs: any[], visibleArea: any): void {
    if (!npcs) return;
    
    for (const npc of npcs) {
      if (this.isInVisibleArea(npc, visibleArea)) {
        this.renderNPC(npc);
      }
    }
  }
  
  private renderNPC(npc: any): void {
    const x = npc.position.x;
    const y = npc.position.y;
    
    // Draw NPC
    this.ctx.fillStyle = '#FF69B4';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
    this.ctx.fill();
  }
  
  private renderDetails(details: any[], visibleArea: any): void {
    if (!details) return;
    
    for (const detail of details) {
      if (this.isInVisibleArea(detail, visibleArea)) {
        this.renderDetail(detail);
      }
    }
  }
  
  private renderDetail(detail: any): void {
    // Render environmental details
    this.ctx.fillStyle = '#228B22';
    this.ctx.beginPath();
    this.ctx.arc(detail.x, detail.y, 1, 0, 2 * Math.PI);
    this.ctx.fill();
  }
  
  private renderUI(): void {
    // Render camera info
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 80);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})`, 15, 25);
    this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}x`, 15, 40);
    this.ctx.fillText(`Controls: WASD/Arrows to pan`, 15, 55);
    this.ctx.fillText(`Mouse wheel to zoom, 0 to reset`, 15, 70);
  }
  
  // Helper methods for visibility checks
  private isInVisibleArea(entity: any, visibleArea: any): boolean {
    return entity.x >= visibleArea.minX && entity.x <= visibleArea.maxX &&
           entity.y >= visibleArea.minY && entity.y <= visibleArea.maxY;
  }
  
  private isRiverInVisibleArea(river: any, visibleArea: any): boolean {
    if (!river.points) return false;
    
    for (const point of river.points) {
      if (point.x >= visibleArea.minX && point.x <= visibleArea.maxX &&
          point.y >= visibleArea.minY && point.y <= visibleArea.maxY) {
        return true;
      }
    }
    return false;
  }
  
  private isRoadInVisibleArea(road: any, visibleArea: any): boolean {
    if (!road.points) return false;
    
    for (const point of road.points) {
      if (point.x >= visibleArea.minX && point.x <= visibleArea.maxX &&
          point.y >= visibleArea.minY && point.y <= visibleArea.maxY) {
        return true;
      }
    }
    return false;
  }
} 