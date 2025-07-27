import React, { useEffect, useRef, useState } from 'react';
import { RenderData } from '../core/world/EnhancedWorldRenderer';
import { MultiScaleWorldManager, MultiScaleConfig } from '../core/world/MultiScaleWorldManager';
import { WorldTile, Agent, AgentStatus, SettlementType, ResourceType, StructureType } from '../types/simulation';

// Simple mock agent manager for demo
class MockAgentManager {
  private agents: Map<string, Agent> = new Map();
  private nextAgentId: number = 1;

  constructor() {}

  public initialize(): void {
    console.log('🤖 Initializing Mock Agent Manager...');
    this.createInitialPopulation();
    console.log(`✅ Mock Agent Manager initialized with ${this.agents.size} agents`);
  }

  private createInitialPopulation(): void {
    const initialCount = 10;
    
    for (let i = 0; i < initialCount; i++) {
      this.createAgent();
    }
  }

  public createAgent(position?: { x: number; y: number }): Agent {
    const id = `agent_${this.nextAgentId++}`;
    
    const agentPosition = position || {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
    };

    const agent: Agent = {
      id,
      name: `Agent ${id}`,
      position: agentPosition,
      velocity: { x: 0, y: 0 },
      health: 1.0,
      energy: 1.0,
      age: Math.floor(Math.random() * 30) + 18,
      personality: {
        openness: Math.random(),
        conscientiousness: Math.random(),
        extraversion: Math.random(),
        agreeableness: Math.random(),
        neuroticism: Math.random(),
      },
      memory: {
        shortTerm: [],
        longTerm: [],
        capacity: 100,
        decayRate: 0.01,
      },
      relationships: [],
      status: AgentStatus.ALIVE,
      traits: [],
      skills: [],
      goals: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    this.agents.set(id, agent);
    return agent;
  }

  public getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  public getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}

interface HierarchicalWorldDemoProps {
  width?: number;
  height?: number;
}

export const HierarchicalWorldDemo: React.FC<HierarchicalWorldDemoProps> = ({ 
  width = 800, 
  height = 600 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [renderData, setRenderData] = useState<RenderData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Initialize the system
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;



    const multiScaleConfig: MultiScaleConfig = {
      worldZoom: 0.5,
      regionZoom: 1,
      townZoom: 2,
      cityZoom: 4,
      worldSize: { width: 1000, height: 1000 },
      tileSize: 20,
      biomeComplexity: 0.7,
      continentCount: 3,
      mountainRanges: 5,
      riverCount: 10,
      townDensity: 0.1,
      maxTownSize: 100,
      roadDensity: 0.2
    };

    // Create managers
    const agentMgr = new MockAgentManager();
    const multiScaleMgr = new MultiScaleWorldManager(multiScaleConfig);

    // Initialize managers
    agentMgr.initialize();

    // Generate initial world data
    const worldData = multiScaleMgr.getWorldData(1, 0, 0, width, height);
    
    if (worldData && worldData.tiles) {
      // Add some sample data to tiles
      const enhancedTiles = worldData.tiles.map((row: WorldTile[]) => 
        row.map((tile: WorldTile | null) => {
          if (tile) {
            // Add some sample tile data
            tile.tileData.population = Math.floor(Math.random() * 100);
            tile.tileData.settlementType = Math.random() > 0.8 ? SettlementType.VILLAGE : SettlementType.NONE;
            
            // Add some sample resources
            if (Math.random() > 0.7) {
              tile.resources.push({
                type: ResourceType.FOOD,
                amount: Math.random() * 100,
                maxAmount: 100,
                regenerationRate: 0.1,
                lastHarvested: 0
              });
            }
            
            // Add some sample structures
            if (Math.random() > 0.9) {
              tile.structures.push({
                id: `structure_${tile.x}_${tile.y}`,
                type: StructureType.HOUSE,
                position: { x: tile.x + Math.random() * 10, y: tile.y + Math.random() * 10 },
                size: { width: 5, height: 5 },
                health: 1.0,
                maxHealth: 1.0,
                occupants: [],
                functions: []
              });
            }
          }
          return tile;
        })
      );

      // Create initial render data
      const initialRenderData: RenderData = {
        tiles: enhancedTiles,
        agents: agentMgr.getAgents(),
        connections: [],
        zoomLevel: 1,
        centerX: 0,
        centerY: 0,
        viewportWidth: width,
        viewportHeight: height
      };

      setRenderData(initialRenderData);
    }



  }, [width, height]);

  // Render loop
  // useEffect(() => {
  //   if (!renderer || !renderData) return;

  //   const renderLoop = () => {
  //     // Update render data with current camera
  //     const updatedRenderData: RenderData = {
  //       ...renderData,
  //       zoomLevel: camera.zoom,
  //       centerX: camera.x,
  //       centerY: camera.y
  //     };

  //     renderer.render(updatedRenderData);
  //   };

  //   renderLoop();
  // }, [renderer, renderData, camera]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setCamera(prev => ({
        ...prev,
        x: prev.x - deltaX / prev.zoom,
        y: prev.y - deltaY / prev.zoom
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom * zoomFactor))
    }));
  };

  const handleTileClick = () => {
    console.log('Tile clicked!');
    // if (!hierarchicalManager || !renderData) return;

    // const rect = canvasRef.current?.getBoundingClientRect();
    // if (!rect) return;

    // const mouseX = e.clientX - rect.left;
    // const mouseY = e.clientY - rect.top;

    // // Convert screen coordinates to world coordinates
    // const tileSize = 20 * Math.pow(2, camera.zoom);
    // const worldX = (mouseX - width / 2) / tileSize + camera.x;
    // const worldY = (mouseY - height / 2) / tileSize + camera.y;

    // // Find the tile at this position
    // const tileX = Math.floor(worldX / tileSize) * tileSize;
    // const tileY = Math.floor(worldY / tileSize) * tileSize;

    // // Find the tile in our data
    // for (const row of renderData.tiles) {
    //   for (const tile of row) {
    //     if (tile && Math.abs(tile.x - tileX) < tileSize && Math.abs(tile.y - tileY) < tileSize) {
    //       // Try to expand the tile
    //       const result = hierarchicalManager.expandTile(tile, camera.zoom);
          
    //       if (result.success) {
    //         console.log('Tile expanded!', result);
    //         // Update render data with new sub-tiles
    //         setRenderData(prev => {
    //           if (!prev) return prev;
            
    //           // Replace the expanded tile with its sub-tiles
    //           const newTiles = [...prev.tiles];
    //           // This is a simplified approach - in a real implementation,
    //           // you'd need to properly integrate the sub-tiles into the grid
            
    //           return {
    //             ...prev,
    //             tiles: newTiles,
    //             connections: [...prev.connections, ...result.newConnections],
    //             agents: [...prev.agents, ...result.newAgents]
    //           };
    //         });
    //       } else {
    //         console.log('Tile cannot be expanded:', result.message);
    //       }
    //       break;
    //     }
    //   }
    // }
  };

  return (
    <div className="hierarchical-world-demo">
      <div className="controls">
        <h3>Hierarchical World Demo</h3>
        <p>Click on tiles to expand them into sub-tiles</p>
        <p>Mouse wheel to zoom, drag to pan</p>
        <div className="camera-info">
          <span>Camera: ({Math.round(camera.x)}, {Math.round(camera.y)})</span>
          <span>Zoom: {camera.zoom.toFixed(2)}x</span>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleTileClick}
        style={{
          border: '1px solid #ccc',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />
      
      <div className="info-panel">
        <h4>World Information</h4>
        {renderData && (
          <div>
            <p>Total Tiles: {renderData.tiles.flat().filter(t => t).length}</p>
            <p>Total Agents: {renderData.agents.length}</p>
            <p>Total Connections: {renderData.connections.length}</p>
            <p>Zoom Level: {camera.zoom.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchicalWorldDemo; 