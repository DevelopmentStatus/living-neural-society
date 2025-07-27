import { WorldTile, ResourceType, Structure } from '../../types/simulation';

export interface RenderOptions {
  showGrid: boolean;
  showResources: boolean;
  showStructures: boolean;
  showAgents: boolean;
  showFactions: boolean;
  showTerrain: boolean;
  showPoliticalRegions: boolean;
  showCities: boolean;
  showRivers: boolean;
  showLakes: boolean;
  showRoads: boolean;
}

export interface WorldData {
  tiles: WorldTile[][];
  politicalRegions: any[];
  cities: { x: number; y: number; name: string; size: number }[];
  rivers: { points: { x: number; y: number }[]; width: number }[];
  lakes: { center: { x: number; y: number }; radius: number }[];
  agents: any[];
  structures: Structure[];
}

export class WorldRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: RenderOptions;
  private worldData: WorldData | null = null;
  private camera = { x: 0, y: 0, zoom: 1 };
  private isDragging = false;
  private lastMousePos = { x: 0, y: 0 };
  private worldBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

  // RimWorld-style biome colors
  private biomeColors: { [key: string]: string } = {
    'tropical_rainforest': '#2d5016',
    'desert': '#d2b48c',
    'temperate_forest': '#4a7c59',
    'boreal_forest': '#2f4f4f',
    'tundra': '#8fbc8f',
    'mountain': '#696969',
    'swamp': '#556b2f',
    'grassland': '#90ee90',
    'coastal': '#4682b4',
    'arctic': '#f0f8ff',
    'alpine_forest': '#6b8e23',
    'alpine_meadow': '#98fb98',
    'wetland': '#228b22',
    'fertile_plains': '#32cd32',
    'forest': '#228b22',
    'water': '#4682b4',
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.options = {
      showGrid: true,
      showResources: true,
      showStructures: true,
      showAgents: true,
      showFactions: true,
      showTerrain: true,
      showPoliticalRegions: true,
      showCities: true,
      showRivers: true,
      showLakes: true,
      showRoads: true,
    };

    console.log('🎮 Initializing WorldRenderer with camera controls...');
    this.setupEventListeners();
    console.log('✅ WorldRenderer camera controls initialized');
  }

  private setupEventListeners(): void {
    console.log('🔧 Setting up camera event listeners...');
    
    // Mouse events for panning
    this.canvas.addEventListener('mousedown', (e) => {
      console.log('🖱️ Mouse down detected:', e.button);
      if (e.button === 0) { // Left mouse button
        this.isDragging = true;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
        console.log('🎯 Started dragging');
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMousePos.x;
        const deltaY = e.clientY - this.lastMousePos.y;
        
        // Convert screen delta to world delta
        const worldDeltaX = deltaX / this.camera.zoom;
        const worldDeltaY = deltaY / this.camera.zoom;
        
        this.camera.x -= worldDeltaX;
        this.camera.y -= worldDeltaY;
        
        // Clamp camera to world bounds
        this.clampCameraToBounds();
        
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        console.log('🔄 Camera moved to:', this.camera.x, this.camera.y);
      } else {
        this.canvas.style.cursor = 'grab';
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
        console.log('🛑 Stopped dragging');
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
      console.log('🚪 Mouse left canvas');
    });

    // Wheel event for zooming
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      console.log('🔍 Wheel event detected:', e.deltaY);
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, this.camera.zoom * zoomFactor));
      
      if (newZoom !== this.camera.zoom) {
        // Get mouse position relative to canvas
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert mouse position to world coordinates before zoom
        const worldX = (mouseX - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        const worldY = (mouseY - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
        
        // Update zoom
        this.camera.zoom = newZoom;
        
        // Convert back to screen coordinates and adjust camera
        const newScreenX = (worldX - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
        const newScreenY = (worldY - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
        
        this.camera.x += (mouseX - newScreenX) / this.camera.zoom;
        this.camera.y += (mouseY - newScreenY) / this.camera.zoom;
        
        // Clamp camera to world bounds
        this.clampCameraToBounds();
        console.log('🔍 Zoom changed to:', this.camera.zoom);
      }
    });

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Keyboard controls for additional navigation
    document.addEventListener('keydown', (e) => {
      const panSpeed = 50 / this.camera.zoom;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          this.camera.y -= panSpeed;
          console.log('⬆️ Moved up');
          break;
        case 'ArrowDown':
        case 's':
          this.camera.y += panSpeed;
          console.log('⬇️ Moved down');
          break;
        case 'ArrowLeft':
        case 'a':
          this.camera.x -= panSpeed;
          console.log('⬅️ Moved left');
          break;
        case 'ArrowRight':
        case 'd':
          this.camera.x += panSpeed;
          console.log('➡️ Moved right');
          break;
        case '+':
        case '=':
          this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 1.1);
          console.log('➕ Zoomed in');
          break;
        case '-':
          this.zoomAt(this.canvas.width / 2, this.canvas.height / 2, 0.9);
          console.log('➖ Zoomed out');
          break;
        case '0':
          this.resetCamera();
          console.log('🔄 Reset camera');
          break;
      }
      
      this.clampCameraToBounds();
    });

    console.log('✅ Event listeners setup complete');
  }

  private clampCameraToBounds(): void {
    const viewportWidth = this.canvas.width / this.camera.zoom;
    const viewportHeight = this.canvas.height / this.camera.zoom;
    
    // Clamp X
    this.camera.x = Math.max(
      this.worldBounds.minX - viewportWidth / 2,
      Math.min(this.worldBounds.maxX - viewportWidth / 2, this.camera.x)
    );
    
    // Clamp Y
    this.camera.y = Math.max(
      this.worldBounds.minY - viewportHeight / 2,
      Math.min(this.worldBounds.maxY - viewportHeight / 2, this.camera.y)
    );
  }

  private zoomAt(x: number, y: number, factor: number): void {
    const newZoom = Math.max(0.1, Math.min(5, this.camera.zoom * factor));
    
    if (newZoom !== this.camera.zoom) {
      const worldX = (x - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
      const worldY = (y - this.canvas.height / 2) / this.camera.zoom + this.camera.y;
      
      this.camera.zoom = newZoom;
      
      const newScreenX = (worldX - this.camera.x) * this.camera.zoom + this.canvas.width / 2;
      const newScreenY = (worldY - this.camera.y) * this.camera.zoom + this.canvas.height / 2;
      
      this.camera.x += (x - newScreenX) / this.camera.zoom;
      this.camera.y += (y - newScreenY) / this.camera.zoom;
      
      this.clampCameraToBounds();
    }
  }

  private resetCamera(): void {
    this.camera.x = (this.worldBounds.minX + this.worldBounds.maxX) / 2;
    this.camera.y = (this.worldBounds.minY + this.worldBounds.maxY) / 2;
    this.camera.zoom = 1;
  }

  public setWorldBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }): void {
    this.worldBounds = bounds;
    this.clampCameraToBounds();
  }

  public setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public setWorldData(worldData: WorldData): void {
    this.worldData = worldData;
    
    // Update world bounds based on world data
    if (worldData.tiles.length > 0) {
      const maxX = worldData.tiles.length * 10; // Assuming 10px tile size
      const maxY = (worldData.tiles[0]?.length ?? 0) * 10;
      this.setWorldBounds({ minX: 0, minY: 0, maxX, maxY });
    }
  }

  public setCamera(x: number, y: number, zoom: number): void {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.zoom = Math.max(0.1, Math.min(5, zoom));
    this.clampCameraToBounds();
  }

  public getCamera(): { x: number; y: number; zoom: number } {
    return { ...this.camera };
  }

  public render(worldTiles: WorldTile[][], agents: any[], structures: Structure[]): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply camera transform
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Calculate visible area for optimization
    const visibleArea = this.getVisibleArea();

    // Render terrain
    if (this.options.showTerrain) {
      this.renderTerrain(worldTiles, visibleArea);
    }

    // Render political regions
    if (this.options.showPoliticalRegions && this.worldData) {
      this.renderPoliticalRegions(visibleArea);
    }

    // Render rivers
    if (this.options.showRivers && this.worldData) {
      this.renderRivers(visibleArea);
    }

    // Render lakes
    if (this.options.showLakes && this.worldData) {
      this.renderLakes(visibleArea);
    }

    // Render roads
    if (this.options.showRoads && this.worldData) {
      this.renderRoads(worldTiles, visibleArea);
    }

    // Render cities
    if (this.options.showCities && this.worldData) {
      this.renderCities(visibleArea);
    }

    // Render structures
    if (this.options.showStructures) {
      this.renderStructures(structures, visibleArea);
    }

    // Render resources
    if (this.options.showResources) {
      this.renderResources(worldTiles, visibleArea);
    }

    // Render agents
    if (this.options.showAgents) {
      this.renderAgents(agents, visibleArea);
    }

    // Render grid
    if (this.options.showGrid) {
      this.renderGrid(visibleArea);
    }

    this.ctx.restore();

    // Render UI overlay (not affected by camera)
    this.renderUI();
  }

  private getVisibleArea(): { minX: number; minY: number; maxX: number; maxY: number } {
    const margin = 100; // Extra margin for smooth scrolling
    const minX = (this.camera.x - this.canvas.width / 2 / this.camera.zoom) - margin;
    const maxX = (this.camera.x + this.canvas.width / 2 / this.camera.zoom) + margin;
    const minY = (this.camera.y - this.canvas.height / 2 / this.camera.zoom) - margin;
    const maxY = (this.camera.y + this.canvas.height / 2 / this.camera.zoom) + margin;
    
    return { minX, minY, maxX, maxY };
  }

  private renderTerrain(worldTiles: WorldTile[][], visibleArea: any): void {
    
    for (let x = 0; x < worldTiles.length; x++) {
      for (let y = 0; y < (worldTiles[x]?.length ?? 0); y++) {
        const tile = worldTiles[x]?.[y];
        if (tile) {
          // Check if tile is visible
          if (tile.x < visibleArea.minX || tile.x > visibleArea.maxX ||
              tile.y < visibleArea.minY || tile.y > visibleArea.maxY) {
            continue;
          }
          
          this.renderTile(tile);
        }
      }
    }
  }

  private renderTile(tile: WorldTile): void {
    const tileSize = 10;
    const x = tile.x;
    const y = tile.y;

    // Get biome color
    let color = this.biomeColors[tile.type.toLowerCase()] || '#90ee90';

    // Apply elevation shading
    const elevation = tile.elevation || 0;
    const shade = 0.3 + elevation * 0.7;
    color = this.shadeColor(color, shade);

    // Apply temperature tinting
    const temperature = tile.temperature || 0.5;
    if (temperature < 0.3) {
      color = this.tintColor(color, '#87ceeb', 0.3); // Cold blue tint
    } else if (temperature > 0.7) {
      color = this.tintColor(color, '#ff6347', 0.2); // Hot red tint
    }

    // Apply humidity effects
    const humidity = tile.humidity || 0.5;
    if (humidity > 0.7) {
      color = this.tintColor(color, '#4682b4', 0.2); // Wet blue tint
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, tileSize, tileSize);

    // Add fertility indicators
    const fertility = tile.fertility || 0;
    if (fertility > 0.7) {
      this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      this.ctx.fillRect(x, y, tileSize, tileSize);
    }
  }

  private renderPoliticalRegions(visibleArea: any): void {
    if (!this.worldData) return;

    for (const region of this.worldData.politicalRegions) {
      this.ctx.strokeStyle = region.color;
      this.ctx.lineWidth = 2 / this.camera.zoom;
      this.ctx.setLineDash([5, 5]);

      for (const territory of region.territory) {
        // Check if territory is visible
        if (territory.x < visibleArea.minX || territory.x > visibleArea.maxX ||
            territory.y < visibleArea.minY || territory.y > visibleArea.maxY) {
          continue;
        }
        
        this.ctx.strokeRect(
          territory.x,
          territory.y,
          territory.width,
          territory.height
        );
      }

      this.ctx.setLineDash([]);
    }
  }

  private renderRivers(visibleArea: any): void {
    if (!this.worldData) return;

    this.ctx.strokeStyle = '#4682b4';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (const river of this.worldData.rivers) {
      if (river.points.length < 2) continue;

      // Check if river is visible
      let isVisible = false;
      for (const point of river.points) {
        if (point.x >= visibleArea.minX && point.x <= visibleArea.maxX &&
            point.y >= visibleArea.minY && point.y <= visibleArea.maxY) {
          isVisible = true;
          break;
        }
      }
      
      if (!isVisible) continue;

      this.ctx.lineWidth = (river.width || 1) / this.camera.zoom;
      this.ctx.beginPath();
      const firstPoint = river.points[0];
      if (firstPoint) {
        this.ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < river.points.length; i++) {
          const point = river.points[i];
          if (point) {
            this.ctx.lineTo(point.x, point.y);
          }
        }
      }

      this.ctx.stroke();
    }
  }

  private renderLakes(visibleArea: any): void {
    if (!this.worldData) return;

    this.ctx.fillStyle = '#4682b4';

    for (const lake of this.worldData.lakes) {
      // Check if lake is visible
      if (lake.center.x < visibleArea.minX - lake.radius || 
          lake.center.x > visibleArea.maxX + lake.radius ||
          lake.center.y < visibleArea.minY - lake.radius || 
          lake.center.y > visibleArea.maxY + lake.radius) {
        continue;
      }
      
      this.ctx.beginPath();
      this.ctx.arc(
        lake.center.x,
        lake.center.y,
        lake.radius,
        0,
        2 * Math.PI
      );
      this.ctx.fill();
    }
  }

  private renderRoads(worldTiles: WorldTile[][], visibleArea: any): void {
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 1 / this.camera.zoom;

    for (let x = 0; x < worldTiles.length; x++) {
      for (let y = 0; y < (worldTiles[x]?.length ?? 0); y++) {
        const tile = worldTiles[x]?.[y];
        if (tile && tile.type === 'road') {
          // Check if tile is visible
          if (tile.x < visibleArea.minX || tile.x > visibleArea.maxX ||
              tile.y < visibleArea.minY || tile.y > visibleArea.maxY) {
            continue;
          }
          
          this.ctx.fillStyle = '#8b4513';
          this.ctx.fillRect(x, y, 10, 10);
        }
      }
    }
  }

  private renderCities(visibleArea: any): void {
    if (!this.worldData) return;

    for (const city of this.worldData.cities) {
      // Check if city is visible
      if (city.x < visibleArea.minX - city.size * 2 || 
          city.x > visibleArea.maxX + city.size * 2 ||
          city.y < visibleArea.minY - city.size * 2 || 
          city.y > visibleArea.maxY + city.size * 2) {
        continue;
      }
      
      // City center
      this.ctx.fillStyle = '#ff6347';
      this.ctx.beginPath();
      this.ctx.arc(city.x, city.y, city.size * 2, 0, 2 * Math.PI);
      this.ctx.fill();

      // City border
      this.ctx.strokeStyle = '#8b0000';
      this.ctx.lineWidth = 1 / this.camera.zoom;
      this.ctx.stroke();

      // City name (only show if zoomed in enough)
      if (this.camera.zoom > 0.5) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = `${12 / this.camera.zoom}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(city.name, city.x, city.y - city.size * 3);
      }
    }
  }

  private renderStructures(structures: Structure[], visibleArea: any): void {
    for (const structure of structures) {
      // Check if structure is visible
      if (structure.position.x < visibleArea.minX || 
          structure.position.x > visibleArea.maxX ||
          structure.position.y < visibleArea.minY || 
          structure.position.y > visibleArea.maxY) {
        continue;
      }
      
      const x = structure.position.x;
      const y = structure.position.y;
      const width = structure.size.width;
      const height = structure.size.height;

      // Structure color based on type
      let color = '#8b4513';
      switch (structure.type) {
        case 'house':
          color = '#cd853f';
          break;
        case 'market':
          color = '#ffd700';
          break;
        case 'school':
          color = '#4169e1';
          break;
        case 'government':
          color = '#dc143c';
          break;
      }

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);

      // Structure border
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1 / this.camera.zoom;
      this.ctx.strokeRect(x, y, width, height);

      // Health indicator
      const healthPercent = structure.health / structure.maxHealth;
      this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
      this.ctx.fillRect(x, y + height - 2, width * healthPercent, 2);
    }
  }

  private renderResources(worldTiles: WorldTile[][], visibleArea: any): void {
    for (let x = 0; x < worldTiles.length; x++) {
      for (let y = 0; y < (worldTiles[x]?.length ?? 0); y++) {
        const tile = worldTiles[x]?.[y];
        if (tile && tile.resources.length > 0) {
          // Check if tile is visible
          if (tile.x < visibleArea.minX || tile.x > visibleArea.maxX ||
              tile.y < visibleArea.minY || tile.y > visibleArea.maxY) {
            continue;
          }
          
          for (const resource of tile.resources) {
            if (resource.amount > 0) {
              this.renderResource(x, y, resource);
            }
          }
        }
      }
    }
  }

  private renderResource(x: number, y: number, resource: any): void {
    const size = 3;
    let color = '#ffffff';

    switch (resource.type) {
      case ResourceType.FOOD:
        color = '#90ee90';
        break;
      case ResourceType.WOOD:
        color = '#8b4513';
        break;
      case ResourceType.STONE:
        color = '#696969';
        break;
      case ResourceType.METAL:
        color = '#ffd700';
        break;
      case ResourceType.WATER:
        color = '#4682b4';
        break;
    }

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + 3, y + 3, size, size);
  }

  private renderAgents(agents: any[], visibleArea: any): void {
    for (const agent of agents) {
      // Check if agent is visible
      if (agent.position.x < visibleArea.minX || 
          agent.position.x > visibleArea.maxX ||
          agent.position.y < visibleArea.minY || 
          agent.position.y > visibleArea.maxY) {
        continue;
      }
      
      const x = agent.position.x;
      const y = agent.position.y;

      // Agent body
      this.ctx.fillStyle = '#00ff00';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
      this.ctx.fill();

      // Agent border
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 0.5 / this.camera.zoom;
      this.ctx.stroke();

      // Health indicator
      if (agent.health !== undefined) {
        const healthPercent = agent.health;
        this.ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        this.ctx.fillRect(x - 2, y - 4, 4 * healthPercent, 1);
      }
    }
  }

  private renderGrid(visibleArea: any): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 0.5 / this.camera.zoom;

    const tileSize = 10;
    const startX = Math.floor(visibleArea.minX / tileSize) * tileSize;
    const startY = Math.floor(visibleArea.minY / tileSize) * tileSize;
    const endX = Math.ceil(visibleArea.maxX / tileSize) * tileSize;
    const endY = Math.ceil(visibleArea.maxY / tileSize) * tileSize;

    for (let x = startX; x <= endX; x += tileSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }

    for (let y = startY; y <= endY; y += tileSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }
  }

  private renderUI(): void {
    // Camera info
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 100);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}x`, 20, 30);
    this.ctx.fillText(`Position: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})`, 20, 50);
    this.ctx.fillText('Left-click + drag to pan', 20, 70);
    this.ctx.fillText('Mouse wheel to zoom', 20, 90);
    
    // Controls info
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 120, 200, 80);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('WASD or Arrow Keys: Pan', 20, 140);
    this.ctx.fillText('+/-: Zoom in/out', 20, 160);
    this.ctx.fillText('0: Reset camera', 20, 180);
    
    // World info
    if (this.worldData) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(10, 210, 200, 120);
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Regions: ${this.worldData.politicalRegions.length}`, 20, 230);
      this.ctx.fillText(`Cities: ${this.worldData.cities.length}`, 20, 250);
      this.ctx.fillText(`Rivers: ${this.worldData.rivers.length}`, 20, 270);
      this.ctx.fillText(`Lakes: ${this.worldData.lakes.length}`, 20, 290);
      this.ctx.fillText(`Agents: ${this.worldData.agents.length}`, 20, 310);
      this.ctx.fillText(`Structures: ${this.worldData.structures.length}`, 20, 330);
    }
  }

  private shadeColor(color: string, factor: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * factor);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private tintColor(color: string, tintColor: string, factor: number): string {
    const color1 = this.hexToRgb(color);
    const color2 = this.hexToRgb(tintColor);
    
    if (!color1 || !color2) return color;
    
    const r = Math.round(color1.r * (1 - factor) + color2.r * factor);
    const g = Math.round(color1.g * (1 - factor) + color2.g * factor);
    const b = Math.round(color1.b * (1 - factor) + color2.b * factor);
    
    return this.rgbToHex(r, g, b);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1] ?? '0', 16),
      g: parseInt(result[2] ?? '0', 16),
      b: parseInt(result[3] ?? '0', 16)
    } : null;
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
} 