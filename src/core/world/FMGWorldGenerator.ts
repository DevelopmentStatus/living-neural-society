import { WorldTile, TileType, ResourceType } from '../../types/simulation';

// Configuration interface for world generation
export interface WorldGenerationConfig {
  worldSize: { width: number; height: number };
  maxAgents: number;
  maxFactions: number;
  difficulty: number;
  realism: number;
  chaos: number;
  timeScale: number;
  temperatureRange: { min: number; max: number };
  rainfallRange: { min: number; max: number };
  growingSeason: { start: number; end: number };
  threatLevel: number;
  fertilityVariation: number;
  resourceRichness: number;
  continentCount: number;
  mountainRanges: number;
  riverCount: number;
  lakeCount: number;
  politicalRegions: number;
  cityCount: number;
  roadDensity: number;
}

// Enhanced FMG-inspired world generation using Voronoi diagrams and sophisticated algorithms
export class FMGWorldGenerator {
  private seed: number;
  private width: number;
  private height: number;
  private cells: number;
  private spacing: number;
  private config: WorldGenerationConfig;
  
  // Voronoi-based data structures
  private points: [number, number][] = [];
  private voronoiCells: any[] = [];
  private heights: Uint8Array;
  private temperatures: Float32Array;
  private precipitation: Float32Array;
  private biomes: Uint8Array;
  private cellTypes: Int8Array; // -2: deep ocean, -1: ocean, 0: coast, 1: land

  constructor(
    width: number, 
    height: number, 
    cells: number = 10000, 
    seed?: number,
    config?: Partial<WorldGenerationConfig>
  ) {
    this.width = width;
    this.height = height;
    this.cells = cells;
    this.seed = seed || Math.floor(Math.random() * 1000000);
    
    // Set default configuration
    this.config = {
      worldSize: { width, height },
      maxAgents: 1000,
      maxFactions: 10,
      difficulty: 0.5,
      realism: 0.7,
      chaos: 0.3,
      timeScale: 1.0,
      temperatureRange: { min: 0.1, max: 0.9 },
      rainfallRange: { min: 0.2, max: 0.9 },
      growingSeason: { start: 60, end: 300 },
      threatLevel: 0.5,
      fertilityVariation: 0.3,
      resourceRichness: 0.7,
      continentCount: 3,
      mountainRanges: 5,
      riverCount: 15,
      lakeCount: 8,
      politicalRegions: 8,
      cityCount: 20,
      roadDensity: 0.3,
      ...config // Override with provided config
    };
    
    // Calculate spacing and grid dimensions
    this.spacing = Math.sqrt((width * height) / cells);
    
      // Initialize arrays
  this.heights = new Uint8Array(cells);
  this.temperatures = new Float32Array(cells);
  this.precipitation = new Float32Array(cells);
  this.biomes = new Uint8Array(cells);
  this.cellTypes = new Int8Array(cells);
  }

  public generate(): {
    tiles: WorldTile[][];
    rivers: any[];
    lakes: any[];
    politicalRegions: any[];
    cities: any[];
  } {
    console.log('🎮 Generating refined FMG-style world with config:', this.config);
    
    // Set seed for reproducible generation
    this.setSeed(this.seed);
    
    // Generate jittered grid points
    this.generateJitteredGrid();
    
    // Generate heightmap using sophisticated algorithms
    this.generateRefinedHeightmap();
    
    // Define land and water
    this.defineLandAndWater();
    
    // Generate climate data
    this.generateClimate();
    
    // Generate rivers and lakes
    const rivers = this.generateRivers();
    const lakes = this.generateLakes();
    
    // Generate biomes
    this.generateBiomes();
    
    // Generate political regions and cities
    const politicalRegions = this.generatePoliticalRegions();
    const cities = this.generateCities();
    
    // Convert to WorldTile format
    const tiles = this.convertToWorldTiles();
    
    console.log('✅ Refined FMG world generation complete');
    
    return {
      tiles,
      rivers,
      lakes,
      politicalRegions,
      cities
    };
  }

  private setSeed(seed: number): void {
    // Simple seedable random number generator
    Math.random = this.seededRandom(seed);
  }

  private seededRandom(seed: number): () => number {
    let m = 0x80000000;
    let a = 1103515245;
    let c = 12345;
    let state = seed || Math.floor(Math.random() * (m - 1));
    
    return () => {
      state = (a * state + c) % m;
      return state / (m - 1);
    };
  }

  private generateJitteredGrid(): void {
    console.log('📍 Generating jittered grid...');
    
    const radius = this.spacing / 2;
    const jittering = radius * 0.9; // max deviation
    const doubleJittering = jittering * 2;
    const jitter = () => Math.random() * doubleJittering - jittering;

    // Generate boundary points for proper clipping
    const boundaryPoints = this.generateBoundaryPoints();
    
    // Generate jittered grid points
    for (let y = radius; y < this.height; y += this.spacing) {
      for (let x = radius; x < this.width; x += this.spacing) {
        const xj = Math.min(x + jitter(), this.width);
        const yj = Math.min(y + jitter(), this.height);
        this.points.push([xj, yj]);
      }
    }
    
    // Add boundary points
    this.points.push(...boundaryPoints);
    
    // Generate Voronoi cells (simplified - in real implementation would use Delaunator)
    this.generateVoronoiCells();
  }

  private generateBoundaryPoints(): [number, number][] {
    const offset = -this.spacing;
    const bSpacing = this.spacing * 2;
    const w = this.width - offset * 2;
    const h = this.height - offset * 2;
    const numberX = Math.ceil(w / bSpacing) - 1;
    const numberY = Math.ceil(h / bSpacing) - 1;
    const points: [number, number][] = [];

    for (let i = 0.5; i < numberX; i++) {
      let x = Math.ceil((w * i) / numberX + offset);
      points.push([x, offset], [x, h + offset]);
    }

    for (let i = 0.5; i < numberY; i++) {
      let y = Math.ceil((h * i) / numberY + offset);
      points.push([offset, y], [w + offset, y]);
    }

    return points;
  }

  private generateVoronoiCells(): void {
    // Simplified Voronoi generation - in real implementation would use Delaunator
    // For now, create hexagonal-like cells
    const boundaryPoints = this.generateBoundaryPoints();
    const cellCount = this.points.length - boundaryPoints.length;
    
    for (let i = 0; i < cellCount; i++) {
      const point = this.points[i];
      if (point) {
        const [x, y] = point;
        this.voronoiCells.push({
          center: [x, y],
          vertices: this.generateCellVertices(x, y),
          neighbors: this.findNeighbors(i, cellCount)
        });
      }
    }
  }

  private generateCellVertices(x: number, y: number): [number, number][] {
    // Generate hexagonal-like vertices around center
    const radius = this.spacing * 0.4;
    const vertices: [number, number][] = [];
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const vx = x + radius * Math.cos(angle);
      const vy = y + radius * Math.sin(angle);
      vertices.push([vx, vy]);
    }
    
    return vertices;
  }

  private findNeighbors(cellIndex: number, cellCount: number): number[] {
    const neighbors: number[] = [];
    const point = this.points[cellIndex];
    if (!point) return neighbors;
    
    const [x, y] = point;
    
    for (let i = 0; i < cellCount; i++) {
      if (i === cellIndex) continue;
      const neighborPoint = this.points[i];
      if (neighborPoint) {
        const [nx, ny] = neighborPoint;
        const distance = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
        if (distance < this.spacing * 1.5) {
          neighbors.push(i);
        }
      }
    }
    
    return neighbors;
  }

  private generateRefinedHeightmap(): void {
    console.log('🏔️ Generating refined heightmap...');
    
    // Initialize heights
    for (let i = 0; i < this.cells; i++) {
      this.heights[i] = 20; // Base sea level
    }
    
    // Add continental plates with organic shapes
    this.addContinentalPlates();
    
    // Add mountain ranges with realistic patterns
    this.addMountainRanges();
    
    // Add hills and valleys
    this.addHillsAndValleys();
    
    // Add coastal features
    this.addCoastalFeatures();
    
    // Smooth the heightmap
    this.smoothHeightmap();
  }

  private addContinentalPlates(): void {
    // Use config continent count
    const plateCount = this.config.continentCount;
    const plates: { x: number; y: number; height: number; radius: number; shape: number }[] = [];
    
    // Generate plate centers with organic shapes
    for (let i = 0; i < plateCount; i++) {
      plates.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        height: 20 + Math.random() * 60,
        radius: 100 + Math.random() * 200,
        shape: 0.5 + Math.random() * 1.5 // Shape factor for organic boundaries
      });
    }
    
    // Apply plate influence with organic falloff
    for (let i = 0; i < this.cells; i++) {
      const point = this.points[i];
      if (!point) continue;
      
      const [x, y] = point;
      
      let maxInfluence = 0;
      for (const plate of plates) {
        const distance = Math.sqrt((x - plate.x) ** 2 + (y - plate.y) ** 2);
        const normalizedDistance = distance / plate.radius;
        const influence = Math.max(0, Math.pow(1 - normalizedDistance, plate.shape));
        maxInfluence = Math.max(maxInfluence, influence);
      }
      
      this.heights[i]! += maxInfluence * 40;
    }
  }

  private addMountainRanges(): void {
    // Use config mountain ranges count
    const rangeCount = this.config.mountainRanges;
    
    for (let r = 0; r < rangeCount; r++) {
      const startX = Math.random() * this.width;
      const startY = Math.random() * this.height;
      const length = 150 + Math.random() * 400;
      const angle = Math.random() * Math.PI * 2;
      const width = 30 + Math.random() * 60;
      const height = 40 + Math.random() * 60;
      
      // Create curved mountain range
      const controlPoints = this.generateCurvedPath(startX, startY, length, angle);
      
      for (let i = 0; i < this.cells; i++) {
        const point = this.points[i];
        if (!point) continue;
        
        const [x, y] = point;
        
        // Find closest point on mountain curve
        let minDistance = Infinity;
        for (const point of controlPoints) {
          const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
          minDistance = Math.min(minDistance, distance);
        }
        
        if (minDistance <= width) {
          const mountainHeight = height * (1 - minDistance / width);
          this.heights[i]! += mountainHeight;
        }
      }
    }
  }

  private generateCurvedPath(startX: number, startY: number, length: number, angle: number): { x: number; y: number }[] {
    const points = [];
    const segments = Math.floor(length / 20);
    
    let x = startX;
    let y = startY;
    let currentAngle = angle;
    
    for (let i = 0; i < segments; i++) {
      points.push({ x, y });
      
      // Add some curvature
      currentAngle += (Math.random() - 0.5) * 0.3;
      x += Math.cos(currentAngle) * 20;
      y += Math.sin(currentAngle) * 20;
    }
    
    return points;
  }

  private addHillsAndValleys(): void {
    // Add organic hills - affected by realism setting
    const hillCount = Math.floor(this.cells / (80 * this.config.realism));
    for (let h = 0; h < hillCount; h++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const radius = 15 + Math.random() * 40;
      const height = 8 + Math.random() * 20;
      
      for (let i = 0; i < this.cells; i++) {
        const point = this.points[i];
        if (!point) continue;
        
        const [cellX, cellY] = point;
        const distance = Math.sqrt((cellX - x) ** 2 + (cellY - y) ** 2);
        if (distance <= radius) {
          const influence = Math.pow(1 - distance / radius, 2);
          this.heights[i]! += influence * height;
        }
      }
    }
    
    // Add valleys - affected by chaos setting
    const valleyCount = Math.floor(this.cells / (120 * (1 + this.config.chaos)));
    for (let v = 0; v < valleyCount; v++) {
      const startX = Math.random() * this.width;
      const startY = Math.random() * this.height;
      const length = 50 + Math.random() * 150;
      const angle = Math.random() * Math.PI * 2;
      const width = 10 + Math.random() * 25;
      const depth = 5 + Math.random() * 15;
      
      for (let i = 0; i < this.cells; i++) {
        const point = this.points[i];
        if (!point) continue;
        
        const [x, y] = point;
        
        const dx = x - startX;
        const dy = y - startY;
        const distanceAlong = dx * Math.cos(angle) + dy * Math.sin(angle);
        const distancePerp = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
        
        if (distanceAlong >= 0 && distanceAlong <= length && distancePerp <= width) {
          const valleyDepth = depth * (1 - distancePerp / width) * (1 - distanceAlong / length);
          this.heights[i]! -= valleyDepth;
        }
      }
    }
  }

  private addCoastalFeatures(): void {
    // Add coastal cliffs and beaches
    for (let i = 0; i < this.cells; i++) {
      const point = this.points[i];
      if (!point) continue;
      
      const height = this.heights[i];
      
      // Check if near coast
      let nearCoast = false;
      const cell = this.voronoiCells[i];
      if (cell && cell.neighbors) {
        for (const neighbor of cell.neighbors) {
          if (neighbor < this.heights.length && Math.abs(this.heights[neighbor]! - height!) > 15) {
            nearCoast = true;
            break;
          }
        }
      }
      
      if (nearCoast && height! > 20 && height! < 40) {
        // Add coastal variation
        this.heights[i]! += (Math.random() - 0.5) * 10;
      }
    }
  }

  private smoothHeightmap(): void {
    const smoothed = new Uint8Array(this.cells);
    
    for (let i = 0; i < this.cells; i++) {
      let sum = this.heights[i];
      let count = 1;
      
      // Average with neighbors
      const cell = this.voronoiCells[i];
      if (cell && cell.neighbors) {
        for (const neighbor of cell.neighbors) {
          if (neighbor < this.heights.length) {
            sum! += this.heights[neighbor]!;
            count++;
          }
        }
      }
      
      smoothed[i] = Math.floor(sum! / count);
    }
    
    this.heights = smoothed;
  }

  private defineLandAndWater(): void {
    console.log('🌊 Defining land and water...');

    for (let i = 0; i < this.cells; i++) {
      const height = this.heights[i];
      if (typeof height === 'undefined') {
        this.cellTypes[i] = -2; // Default to deep ocean if height is undefined
        continue;
      }

      if (height < 15) {
        this.cellTypes[i] = -2; // Deep ocean
      } else if (height < 20) {
        this.cellTypes[i] = -1; // Ocean
      } else if (height < 25) {
        this.cellTypes[i] = 0; // Coast
      } else {
        this.cellTypes[i] = 1; // Land
      }
    }
  }

  private generateClimate(): void {
    console.log('🌡️ Generating climate...');
    
    // Generate temperature based on latitude and elevation
    for (let i = 0; i < this.cells; i++) {
      const point = this.points[i];
      if (!point) continue;

      const [y] = point;
      const latitude = (y / this.height - 0.5) * 2; // -1 to 1

      // Base temperature from latitude, using config temperature range
      const tempRange = this.config.temperatureRange.max - this.config.temperatureRange.min;
      let temp = this.config.temperatureRange.min + (1 - Math.abs(latitude)) * tempRange;

      // Adjust for elevation
      const height = this.heights ? this.heights[i] : undefined;
      let elevationFactor = 0;
      if (typeof height !== 'undefined') {
        elevationFactor = (height - 20) / 80;
        temp -= elevationFactor * 20;
      }

      // Add some variation based on chaos setting
      temp += (Math.random() - 0.5) * 8 * this.config.chaos;

      this.temperatures[i] = Math.max(-20, Math.min(40, temp));
    }
    
    // Generate precipitation with wind patterns
    this.generatePrecipitation();
  }

  private generatePrecipitation(): void {
    // Simple wind-based precipitation
    for (let i = 0; i < this.cells; i++) {
      const point = this.points[i];
      if (!point) continue;

      const [x, y] = point;
      const temp = this.temperatures ? this.temperatures[i] : undefined;

      // Base precipitation pattern using config rainfall range
      const rainRange = this.config.rainfallRange.max - this.config.rainfallRange.min;
      let prec = this.config.rainfallRange.min + Math.sin(x / this.width * Math.PI * 2) * rainRange * 0.3;
      prec += Math.sin(y / this.height * Math.PI * 3) * rainRange * 0.2;

      // Elevation effect (mountains create rain shadows)
      const height = this.heights ? this.heights[i] : undefined;
      const elevationFactor = typeof height !== 'undefined' ? (height - 20) / 80 : 0;
      if (elevationFactor > 0.3) {
        prec += elevationFactor * 0.4;
      }

      // Temperature effect
      if (typeof temp !== 'undefined' && temp > 20) {
        prec += 0.2;
      }

      // Add variation based on chaos setting
      prec += (Math.random() - 0.5) * 0.15 * this.config.chaos;

      if (this.precipitation) {
        this.precipitation[i] = Math.max(0, Math.min(1, prec));
      }
    }
  }

  private generateRivers(): any[] {
    console.log('🌊 Generating rivers...');
    
    const rivers = [];
    // Use config river count
    const riverCount = this.config.riverCount;
    
    for (let r = 0; r < riverCount; r++) {
      // Find high elevation starting point
      let startCell = -1;
      let maxHeight = -Infinity;
      
      for (let i = 0; i < this.cells; i++) {
        const height = this.heights ? this.heights[i] : undefined;
        if (typeof height !== 'undefined' && height > maxHeight && height > 50) {
          maxHeight = height;
          startCell = i;
        }
      }
      
      if (startCell !== -1) {
        const river = this.traceRiver(startCell);
        if (river && river.points && river.points.length > 3) {
          rivers.push(river);
        }
      }
    }
    
    return rivers;
  }

  private traceRiver(startCell: number): any {
    const points = [];
    const visited = new Set();
    
    let currentCell = startCell;
    while (currentCell !== -1 && !visited.has(currentCell)) {
      visited.add(currentCell);
      
      const point = this.points[currentCell];
      if (point) {
        const [x, y] = point;
        points.push({ x, y });
      }
      
      // Find next downstream cell
      currentCell = this.findDownstreamCell(currentCell);
    }
    
    return {
      points,
      width: 2 + Math.random() * 4
    };
  }

  private findDownstreamCell(cell: number): number {
    const point = this.points[cell];
    if (!point) return -1;

    // Defensive: check heights array
    if (!this.heights || typeof this.heights[cell] === 'undefined') return -1;

    let lowestCell = -1;
    let lowestHeight = this.heights[cell];

    // Check neighbors
    const cellData = this.voronoiCells[cell];
    if (cellData && Array.isArray(cellData.neighbors)) {
      for (const neighbor of cellData.neighbors) {
        // Defensive: check neighbor index and heights array
        if (
          typeof neighbor === 'number' &&
          neighbor >= 0 &&
          neighbor < this.heights.length &&
          typeof this.heights[neighbor] !== 'undefined' &&
          this.heights[neighbor] < lowestHeight
        ) {
          lowestHeight = this.heights[neighbor];
          lowestCell = neighbor;
        }
      }
    }

    return lowestCell;
  }

  private generateLakes(): any[] {
    const lakes = [];
    // Use config lake count
    const lakeCount = this.config.lakeCount;

    for (let i = 0; i < lakeCount; i++) {
      // Find suitable lake location (low elevation, high precipitation)
      let bestCell = -1;
      let bestScore = 0;

      for (let j = 0; j < this.cells; j++) {
        const height = typeof this.heights[j] !== 'undefined' ? this.heights[j] : undefined;
        const precip = typeof this.precipitation[j] !== 'undefined' ? this.precipitation[j] : undefined;
        if (
          typeof height !== 'undefined' &&
          typeof precip !== 'undefined' &&
          height < 30 &&
          precip > 0.6
        ) {
          const score = (30 - height) * precip;
          if (score > bestScore) {
            bestScore = score;
            bestCell = j;
          }
        }
      }

      if (bestCell !== -1) {
        const point = this.points[bestCell];
        if (point) {
          const [x, y] = point;
          lakes.push({
            center: { x, y },
            radius: 25 + Math.random() * 35,
            type: 'freshwater'
          });
        }
      }
    }

    return lakes;
  }

  private generateBiomes(): void {
    console.log('🌲 Generating biomes...');

    for (let i = 0; i < this.cells; i++) {
      const temp = typeof this.temperatures[i] !== 'undefined' ? this.temperatures[i] : undefined;
      const prec = typeof this.precipitation[i] !== 'undefined' ? this.precipitation[i] : undefined;
      const height = typeof this.heights[i] !== 'undefined' ? this.heights[i] : undefined;

      // If any value is undefined, default to water biome
      if (typeof height === 'undefined' || typeof temp === 'undefined' || typeof prec === 'undefined') {
        this.biomes[i] = 0; // Water
        continue;
      }

      if (height < 20) {
        this.biomes[i] = 0; // Water
      } else if (height > 80) {
        this.biomes[i] = 11; // Glacier
      } else if (temp < -5) {
        this.biomes[i] = 10; // Tundra
      } else if (temp < 5) {
        this.biomes[i] = 9; // Taiga
      } else if (temp > 25 && prec < 0.3) {
        this.biomes[i] = 1; // Hot desert
      } else if (temp < 10 && prec < 0.3) {
        this.biomes[i] = 2; // Cold desert
      } else if (temp > 20 && prec > 0.7) {
        this.biomes[i] = 7; // Tropical rainforest
      } else if (temp > 15 && prec > 0.6) {
        this.biomes[i] = 8; // Temperate rainforest
      } else if (temp > 15 && prec > 0.4) {
        this.biomes[i] = 6; // Temperate deciduous forest
      } else if (temp > 20 && prec > 0.4) {
        this.biomes[i] = 5; // Tropical seasonal forest
      } else if (prec > 0.5) {
        this.biomes[i] = 4; // Grassland
      } else {
        this.biomes[i] = 3; // Savanna
      }
    }
  }

  private generatePoliticalRegions(): any[] {
    const regions = [];
    // Use config political regions count
    const regionCount = this.config.politicalRegions;
    
    // Create regions based on geographic features
    const regionTypes = ['Kingdom', 'Empire', 'Republic', 'Duchy', 'Principality', 'Theocracy'];
    
    for (let i = 0; i < regionCount; i++) {
      // Find suitable region center
      let centerCell = -1;
      let bestScore = 0;
      
      for (let j = 0; j < this.cells; j++) {
        const height = this.heights[j];
        const precip = this.precipitation[j];
        const temp = this.temperatures[j];
        if (
          typeof height !== 'undefined' &&
          typeof precip !== 'undefined' &&
          typeof temp !== 'undefined' &&
          this.cellTypes[j] === 1 && 
          height > 25 && 
          height < 70
        ) {
          const score = precip * (1 - Math.abs(temp - 15) / 30);
          if (score > bestScore) {
            bestScore = score;
            centerCell = j;
          }
        }
      }
      
      if (centerCell !== -1) {
        const point = this.points[centerCell];
        if (point) {
          const [x, y] = point;
          const regionType = regionTypes[Math.floor(Math.random() * regionTypes.length)];
          
          regions.push({
            name: `${regionType} of ${this.generateRegionName()}`,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            center: { x, y },
            territory: this.generateTerritory(centerCell),
            population: 5000 + Math.floor(Math.random() * 50000),
            resources: this.generateResources()
          });
        }
      }
    }
    
    return regions;
  }

  private generateRegionName(): string {
    const prefixes = ['Aeth', 'Bryn', 'Cal', 'Dun', 'Eld', 'Fir', 'Gor', 'Hel', 'Ith', 'Jor'];
    const suffixes = ['dor', 'land', 'mar', 'nor', 'ria', 'seth', 'thar', 'ven', 'wyn', 'zar'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return (prefix || 'Aeth') + (suffix || 'dor');
  }

  private generateTerritory(centerCell: number): any[] {
    const territory = [];
    const visited = new Set();
    const queue = [centerCell];
    const maxSize = 20 + Math.floor(Math.random() * 30);
    
    while (queue.length > 0 && territory.length < maxSize) {
      const cell = queue.shift()!;
      if (visited.has(cell)) continue;
      
      visited.add(cell);
      const point = this.points[cell];
      if (point) {
        const [x, y] = point;
        
        territory.push({
          x: x - 50,
          y: y - 50,
          width: 100,
          height: 100
        });
        
        // Add neighbors
        const cellData = this.voronoiCells[cell];
        if (cellData && cellData.neighbors) {
          for (const neighbor of cellData.neighbors) {
            if (!visited.has(neighbor) && this.cellTypes[neighbor] === 1) {
              queue.push(neighbor);
            }
          }
        }
      }
    }
    
    return territory;
  }

  private generateResources(): string[] {
    const allResources = ['food', 'wood', 'stone', 'iron', 'gold', 'fish', 'grain', 'livestock'];
    const count = 2 + Math.floor(Math.random() * 4);
    const resources: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const resource = allResources[Math.floor(Math.random() * allResources.length)];
      if (resource && !resources.includes(resource)) {
        resources.push(resource);
      }
    }
    
    return resources;
  }

  private generateCities(): any[] {
    const cities = [];
    // Use config city count
    const cityCount = this.config.cityCount;
    
    for (let i = 0; i < cityCount; i++) {
      // Find suitable city location
      let bestCell = -1;
      let bestScore = 0;
      
      for (let j = 0; j < this.cells; j++) {
        const height = this.heights[j];
        const precip = this.precipitation[j];
        const temp = this.temperatures[j];
        if (
          typeof height !== 'undefined' &&
          typeof precip !== 'undefined' &&
          typeof temp !== 'undefined' &&
          this.cellTypes[j] === 1 && 
          height > 25 && 
          height < 60
        ) {
          const score = precip * (1 - Math.abs(temp - 18) / 25);
          if (score > bestScore) {
            bestScore = score;
            bestCell = j;
          }
        }
      }
      
      if (bestCell !== -1) {
        const point = this.points[bestCell];
        if (point) {
          const [x, y] = point;
          cities.push({
            name: `City ${i + 1}`,
            x,
            y,
            size: 8 + Math.floor(Math.random() * 12)
          });
        }
      }
    }
    
    return cities;
  }

  private convertToWorldTiles(): WorldTile[][] {
    // Convert Voronoi cells to grid-based tiles for compatibility
    const gridSize = Math.sqrt(this.cells);
    const tiles: WorldTile[][] = [];
    
    for (let x = 0; x < gridSize; x++) {
      tiles[x] = [];
      for (let y = 0; y < gridSize; y++) {
        const index = y * gridSize + x;
        const height = this.heights[index] || 20;
        const biome = this.biomes[index] || 0;
        const temp = this.temperatures[index] || 15;
        const prec = this.precipitation[index] || 0.5;
        
        if (!tiles[x]) {
          tiles[x] = [];
        }
        
        tiles[x]![y] = {
          x,
          y,
          type: this.biomeToTileType(biome),
          resources: this.generateTileResources(biome),
          elevation: height / 100,
          temperature: (temp + 20) / 60, // Normalize to 0-1
          humidity: prec,
          fertility: this.calculateFertility(biome, prec),
          accessibility: 1 - (height / 100),
          structures: [],
          agents: []
        };
      }
    }
    
    return tiles;
  }

  private biomeToTileType(biome: number): TileType {
    switch (biome) {
      case 0: return TileType.WATER;
      case 1: case 2: return TileType.DESERT;
      case 3: case 4: return TileType.GRASS;
      case 5: case 6: case 7: case 8: case 9: return TileType.FOREST;
      case 10: case 11: return TileType.MOUNTAIN;
      default: return TileType.GRASS;
    }
  }

  private generateTileResources(biome: number): any[] {
    const resources: any[] = [];
    
    // Use config resource richness to affect resource generation
    const resourceChance = this.config.resourceRichness;
    
    switch (biome) {
      case 1: case 2: // Deserts
        if (Math.random() < 0.1 * resourceChance) resources.push({ type: ResourceType.STONE, amount: 1 });
        break;
      case 5: case 6: case 7: case 8: case 9: // Forests
        if (Math.random() < 0.3 * resourceChance) resources.push({ type: ResourceType.WOOD, amount: 1 });
        break;
      case 10: case 11: // Mountains
        if (Math.random() < 0.2 * resourceChance) resources.push({ type: ResourceType.STONE, amount: 1 });
        break;
      default: // Grasslands
        if (Math.random() < 0.2 * resourceChance) resources.push({ type: ResourceType.FOOD, amount: 1 });
        break;
    }
    
    return resources;
  }

  private calculateFertility(biome: number, precipitation: number): number {
    let fertility = precipitation * 0.5;
    
    // Apply fertility variation from config
    fertility *= (1 + (Math.random() - 0.5) * this.config.fertilityVariation);
    
    switch (biome) {
      case 1: case 2: fertility *= 0.2; break; // Deserts
      case 3: case 4: fertility *= 0.8; break; // Grasslands
      case 5: case 6: case 7: case 8: case 9: fertility *= 0.6; break; // Forests
      case 10: case 11: fertility *= 0.1; break; // Mountains
    }
    
    return Math.max(0, Math.min(1, fertility));
  }
} 