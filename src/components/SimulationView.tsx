import React, { useRef, useEffect, useState } from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { DwarfFortressWorldGenerator, DwarfFortressConfig, DFWorldData } from '../core/world/DwarfFortressWorldGenerator';
import { DwarfFortressRenderer, DFRenderConfig, DFRenderData } from '../core/world/DwarfFortressRenderer';
import { PerformanceRenderer, PerformanceRenderConfig, PerformanceRenderData } from '../core/world/PerformanceRenderer';
import { Minimap } from './Minimap';
import './SimulationView.css';

export interface SelectedEntity {
  type: 'agent' | 'settlement' | 'civilization' | 'river' | 'lake' | 'cave';
  id: string;
  data: any;
  position: { x: number; y: number };
}

export const SimulationView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PerformanceRenderer | null>(null);
  const worldDataRef = useRef<DFWorldData | null>(null);
  const cameraCenteredRef = useRef(false);
  const { 
    engine,
    state, 
    statistics, 
    isRunning, 
    isPaused, 
    start, 
    pause, 
    resume, 
    stop, 
    setSpeed 
  } = useSimulation();
  
  // Dwarf Fortress configuration
  const [config, setConfig] = useState<DwarfFortressConfig>({
    width: 200,
    height: 200,
    seed: Math.floor(Math.random() * 1000000),
    // World generation parameters
    elevationScale: 0.02,
    temperatureScale: 0.03,
    rainfallScale: 0.025,
    // New parameters for improved world generation
    seaLevel: 0.45, // Creates more land than water
    continentCount: 3, // Number of major continents
    islandDensity: 0.4, // Density of smaller islands
    // Feature generation
    mountainRanges: 3,
    riverCount: 8,
    lakeCount: 5,
    forestDensity: 0.4,
    caveSystems: 4,
    // Civilization parameters
    civilizationCount: 3,
    settlementDensity: 0.6,
    roadDensity: 0.4,
    // Resource parameters
    mineralRichness: 0.3,
    soilFertility: 0.5,
    waterAvailability: 0.4,
  });
  
  const [showConfig, setShowConfig] = useState(!state);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [toolbarStates, setToolbarStates] = useState({
    controls: true,
    tools: false,
    info: false,
    settings: false,
  });
  const [renderOptions, setRenderOptions] = useState({
    showGrid: false,
    showResources: true,
    showStructures: true,
    showAgents: true,
    showRivers: true,
    showRoads: true,
    showSettlements: true,
    showLabels: false,
    // New layer options
    showBiomeColors: true,
    showSoilQuality: false,
    showFireEffects: true,
    showVegetationDensity: false,
    showErosion: false,
    // Performance options
    enableOctrees: true,
    maxVisibleTiles: 10000,
    resourceVisibilityThreshold: 0.3,
  });
  const [speed, setSpeedState] = useState(1.0);

  // Camera state management
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize world generator and renderer
  useEffect(() => {
    if (showConfig) return; // Don't create renderer until simulation starts
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to full viewport
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Update renderer with new canvas size
      if (rendererRef.current) {
        rendererRef.current.resize(canvas.width, canvas.height);
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate Dwarf Fortress world
    console.log('🏔️ Starting Dwarf Fortress world generation...');
    const worldGenerator = new DwarfFortressWorldGenerator(config);
    const worldData = worldGenerator.generate();
    worldDataRef.current = worldData;
    
    console.log('✅ Dwarf Fortress world generated:', {
      tiles: worldData.tiles?.length || 0,
      civilizations: worldData.civilizations?.length || 0,
      settlements: worldData.settlements?.length || 0,
      rivers: worldData.rivers?.length || 0,
      lakes: worldData.lakes?.length || 0,
      caves: worldData.caves?.length || 0,
      roads: worldData.roads?.length || 0
    });
    
    // Create Performance renderer with optimizations
    const renderConfig: PerformanceRenderConfig = {
      tileSize: 12,
      fontSize: 14,
      fontFamily: 'monospace',
      showAgents: renderOptions.showAgents,
      showStructures: renderOptions.showStructures,
      showResources: renderOptions.showResources,
      showRivers: renderOptions.showRivers,
      showRoads: renderOptions.showRoads,
      showSettlements: renderOptions.showSettlements,
      showGrid: renderOptions.showGrid,
      showLabels: renderOptions.showLabels,
      colorScheme: 'classic',
      // Performance options
      enableGreedyMeshing: true, // Always enabled for better performance
      enableOctrees: renderOptions.enableOctrees,
      maxVisibleTiles: renderOptions.maxVisibleTiles,
      resourceVisibilityThreshold: renderOptions.resourceVisibilityThreshold,
      // New layer options
      showBiomeColors: renderOptions.showBiomeColors,
      showSoilQuality: renderOptions.showSoilQuality,
      showFireEffects: renderOptions.showFireEffects,
      showVegetationDensity: renderOptions.showVegetationDensity,
      showErosion: renderOptions.showErosion
    };
    
    rendererRef.current = new PerformanceRenderer(renderConfig);
    rendererRef.current.setCanvas(canvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (rendererRef.current) {
        rendererRef.current = null;
      }
    };
  }, [showConfig, config]);

  // Center camera ONCE when world data becomes available
  useEffect(() => {
    if (
      !cameraCenteredRef.current &&
      worldDataRef.current &&
      rendererRef.current &&
      canvasRef.current
    ) {
      // Calculate zoom level to fit entire world in viewport
      const canvas = canvasRef.current;
      const worldWidth = config.width;
      const worldHeight = config.height;
      
      // Calculate zoom levels needed to fit world in viewport
      const zoomX = canvas.width / (worldWidth * 12); // 12 is tileSize
      const zoomY = canvas.height / (worldHeight * 12);
      
      // Use the smaller zoom to ensure entire world fits
      const fitZoom = Math.min(zoomX, zoomY) * 0.95; // 95% to add some margin
      
      // Center camera on the middle of the world
      setCamera({
        x: worldWidth / 2,
        y: worldHeight / 2,
        zoom: fitZoom
      });
      cameraCenteredRef.current = true;
      
      console.log('🎯 Camera set to show entire world:', {
        worldSize: { width: worldWidth, height: worldHeight },
        canvasSize: { width: canvas.width, height: canvas.height },
        calculatedZoom: fitZoom,
        zoomX,
        zoomY
      });
    }
  }, [worldDataRef.current, config.width, config.height]);

  // Camera controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left mouse button
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate delta in world coordinates
        const deltaX = (e.clientX - dragStart.x) / camera.zoom;
        const deltaY = (e.clientY - dragStart.y) / camera.zoom;
        
        setCamera(currentCamera => {
          const newX = currentCamera.x - deltaX;
          const newY = currentCamera.y - deltaY;
          
          // Keep camera within world bounds
          const maxX = config.width;
          const maxY = config.height;
          const minX = 0;
          const minY = 0;
          
          return {
            ...currentCamera,
            x: Math.max(minX, Math.min(maxX, newX)),
            y: Math.max(minY, Math.min(maxY, newY))
          };
        });
        
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomFactor));
      
      // Zoom towards mouse position
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Convert mouse position to world coordinates
      const worldX = (mouseX - canvas.width / 2) / camera.zoom + camera.x;
      const worldY = (mouseY - canvas.height / 2) / camera.zoom + camera.y;
      
      // Calculate new camera position to keep mouse point fixed
      setCamera(prev => ({
        x: worldX - (mouseX - canvas.width / 2) / newZoom,
        y: worldY - (mouseY - canvas.height / 2) / newZoom,
        zoom: newZoom
      }));
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isDragging, dragStart, camera]);

  // Continuous rendering loop
  useEffect(() => {
    const renderer = rendererRef.current;
    const worldData = worldDataRef.current;
    if (!renderer || !worldData) {
      return;
    }
    
    let animationId: number;
    const renderLoop = () => {
      // Update renderer config with current options
      const renderConfig: PerformanceRenderConfig = {
        tileSize: 12,
        fontSize: 14,
        fontFamily: 'monospace',
        showAgents: renderOptions.showAgents,
        showStructures: renderOptions.showStructures,
        showResources: renderOptions.showResources,
        showRivers: renderOptions.showRivers,
        showRoads: renderOptions.showRoads,
        showSettlements: renderOptions.showSettlements,
        showGrid: renderOptions.showGrid,
        showLabels: renderOptions.showLabels,
        colorScheme: 'classic',
        // Performance options
        enableGreedyMeshing: true, // Always enabled for better performance
        enableOctrees: renderOptions.enableOctrees,
        maxVisibleTiles: renderOptions.maxVisibleTiles,
        resourceVisibilityThreshold: renderOptions.resourceVisibilityThreshold,
        // New layer options
        showBiomeColors: renderOptions.showBiomeColors,
        showSoilQuality: renderOptions.showSoilQuality,
        showFireEffects: renderOptions.showFireEffects,
        showVegetationDensity: renderOptions.showVegetationDensity,
        showErosion: renderOptions.showErosion
      };
      
      renderer['config'] = renderConfig;
      
      // Get road data from RoadManager
      const roadManager = engine?.getRoadManager();
      const roads = roadManager?.getRoads() || [];
      
      // Update world data with roads from RoadManager
      const worldDataWithRoads = {
        ...worldData,
        roads: roads
      };
      
      // Create render data
      const renderData: PerformanceRenderData = {
        worldData: worldDataWithRoads,
        agents: engine?.getAgentData() || [],
        zoomLevel: camera.zoom,
        centerX: camera.x,
        centerY: camera.y,
        viewportWidth: canvasRef.current?.width || 800,
        viewportHeight: canvasRef.current?.height || 600
      };
      
      // Ensure camera is within world bounds
      const clampedX = Math.max(0, Math.min(config.width, camera.x));
      const clampedY = Math.max(0, Math.min(config.height, camera.y));
      
      if (clampedX !== camera.x || clampedY !== camera.y) {
        setCamera(prev => ({ ...prev, x: clampedX, y: clampedY }));
        return; // Skip this render frame, let the camera update
      }
      
      renderer.render(renderData);
      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [worldDataRef.current, camera, engine, renderOptions]);

  // Handle canvas click events for entity selection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let clickTimeout: NodeJS.Timeout;

    const handleCanvasClick = (e: MouseEvent) => {
      clickTimeout = setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const worldX = (x - canvas.width / 2) / camera.zoom + camera.x;
        const worldY = (y - canvas.height / 2) / camera.zoom + camera.y;
        
        // Find entity at click position
        const entity = findEntityAtPosition(worldX, worldY);
        setSelectedEntity(entity);
      }, 150);
    };

    const handleMouseDown = () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [camera]);

  const findEntityAtPosition = (x: number, y: number): SelectedEntity | null => {
    const worldData = worldDataRef.current;
    if (!worldData) return null;

    // Check settlements
    const settlements = worldData.settlements || [];
    for (const settlement of settlements) {
      const distance = Math.sqrt((x - settlement.position.x) ** 2 + (y - settlement.position.y) ** 2);
      if (distance < 2) {
        return {
          type: 'settlement',
          id: settlement.id,
          data: settlement,
          position: settlement.position
        };
      }
    }

    // Check civilizations
    const civilizations = worldData.civilizations || [];
    for (const civ of civilizations) {
      const distance = Math.sqrt((x - civ.capital.x) ** 2 + (y - civ.capital.y) ** 2);
      if (distance < 5) {
        return {
          type: 'civilization',
          id: civ.id,
          data: civ,
          position: civ.capital
        };
      }
    }

    // Check agents
    const agents = engine?.getAgentData() || [];
    for (const agent of agents) {
      const distance = Math.sqrt((x - agent.position.x) ** 2 + (y - agent.position.y) ** 2);
      if (distance < 1) {
        return {
          type: 'agent',
          id: agent.id,
          data: agent,
          position: agent.position
        };
      }
    }

    return null;
  };

  const handleRenderOptionChange = (option: string, value: boolean | number): void => {
    setRenderOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeedState(newSpeed);
    setSpeed(newSpeed);
  };

  const toggleToolbar = (toolbar: keyof typeof toolbarStates) => {
    setToolbarStates(prev => ({
      ...prev,
      [toolbar]: !prev[toolbar],
    }));
  };

  const handleStartRandomFire = () => {
    if (!worldDataRef.current) return;
    
    // Find a random tile with vegetation to start a fire
    const tiles = worldDataRef.current.tiles;
    const candidates: { x: number; y: number }[] = [];
    
    for (let y = 0; y < tiles.length; y++) {
      const row = tiles[y];
      if (!row) continue;
      
      for (let x = 0; x < row.length; x++) {
        const tile = row[x];
        if (tile && tile.vegetationDensity > 0.3 && tile.fireState === 'none') {
          candidates.push({ x, y });
        }
      }
    }
    
    if (candidates.length > 0) {
      const randomTile = candidates[Math.floor(Math.random() * candidates.length)];
      // We need to access the world generator to start the fire
      // For now, we'll just log the position
      console.log('Starting fire at:', randomTile);
    }
  };

  const handleUpdateTileStates = () => {
    if (!worldDataRef.current) return;
    
    // Update tile states (fire spreading, etc.)
    console.log('Updating tile states...');
    // This would call the world generator's updateTileStates method
    // For now, we'll just log
  };

  // Debug function to log camera state
  const logCameraState = () => {
    console.log('Camera State:', {
      x: camera.x,
      y: camera.y,
      zoom: camera.zoom,
      worldSize: { width: config.width, height: config.height },
      viewport: {
        width: canvasRef.current?.width || 800,
        height: canvasRef.current?.height || 600
      }
    });
  };

  const handleAnalyzeRoadNeeds = () => {
    const roadManager = engine?.getRoadManager();
    if (roadManager && worldDataRef.current?.settlements) {
      roadManager.analyzeSettlementNeeds(worldDataRef.current.settlements);
      console.log('🛣️ Road needs analyzed');
      console.log('📋 Available projects:', roadManager.getAvailableProjects());
    } else {
      console.log('⚠️ No road manager or settlements available');
    }
  };

  const handleShowRoadProjects = () => {
    const roadManager = engine?.getRoadManager();
    if (roadManager) {
      const projects = roadManager.getRoadProjects();
      const available = roadManager.getAvailableProjects();
      console.log('📋 All road projects:', projects);
      console.log('🚧 Available projects:', available);
    } else {
      console.log('⚠️ No road manager available');
    }
  };

  const handleCreateTestRoad = () => {
    const roadManager = engine?.getRoadManager();
    if (roadManager) {
      // Create a simple test road
      const testRoad = {
        id: 'test_road_1',
        name: 'Test Road',
        points: [
          { x: 50, y: 50 },
          { x: 100, y: 100 }
        ],
        width: 2,
        type: 'dirt' as const,
        condition: 1.0,
        settlements: []
      };
      roadManager.addRoad(testRoad);
      console.log('🚧 Test road created');
    } else {
      console.log('⚠️ No road manager available');
    }
  };

  const handleStartSimulation = () => {
    setShowConfig(false);
    
    // Update simulation settings with config
    if (engine) {
      engine.updateSettings({
        timeScale: 1.0,
        maxAgents: 100,
        maxFactions: config.civilizationCount,
        difficulty: 0.5,
        realism: 0.7,
        chaos: 0.3,
      });
    }
    
    start();
  };

  if (showConfig) {
    return <DwarfFortressConfigPanel config={config} setConfig={setConfig} onStart={handleStartSimulation} />;
  }

  return (
    <div className="simulation-view-fullscreen">
      {/* Top Toolbar */}
      <div className="simulation-toolbar">
        <div className="toolbar-section">
          <button 
            className={`toolbar-btn ${toolbarStates.controls ? 'active' : ''}`}
            onClick={() => toggleToolbar('controls')}
          >
            🎮 Controls
          </button>
          
          {toolbarStates.controls && (
            <div className="toolbar-panel">
              <div className="control-group">
                <button 
                  className={`control-btn ${isRunning && !isPaused ? 'active' : ''}`}
                  onClick={isRunning && !isPaused ? pause : (isPaused ? resume : start)}
                  disabled={!state}
                >
                  {isRunning && !isPaused ? '⏸️ Pause' : isPaused ? '▶️ Resume' : '🚀 Start'}
                </button>
                
                <button 
                  className="control-btn"
                  onClick={stop}
                  disabled={!isRunning}
                >
                  ⏹️ Stop
                </button>
              </div>

              <div className="control-group">
                <label>Speed:</label>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={speed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  disabled={!isRunning}
                />
                <span className="speed-value">{speed}x</span>
              </div>

              <div className="control-group">
                <button onClick={() => handleSpeedChange(0.5)} disabled={!isRunning}>0.5x</button>
                <button onClick={() => handleSpeedChange(1.0)} disabled={!isRunning}>1x</button>
                <button onClick={() => handleSpeedChange(2.0)} disabled={!isRunning}>2x</button>
              </div>

              <div className="control-group">
                <button 
                  className="control-btn"
                  onClick={() => {
                    if (canvasRef.current && worldDataRef.current) {
                      const canvas = canvasRef.current;
                      const worldWidth = config.width;
                      const worldHeight = config.height;
                      
                      // Calculate zoom level to fit entire world in viewport
                      const zoomX = canvas.width / (worldWidth * 12);
                      const zoomY = canvas.height / (worldHeight * 12);
                      const fitZoom = Math.min(zoomX, zoomY) * 0.95;
                      
                      setCamera({
                        x: worldWidth / 2,
                        y: worldHeight / 2,
                        zoom: fitZoom
                      });
                      
                      console.log('🎯 Show Full Map clicked:', {
                        worldSize: { width: worldWidth, height: worldHeight },
                        canvasSize: { width: canvas.width, height: canvas.height },
                        calculatedZoom: fitZoom
                      });
                    }
                  }}
                  disabled={!state}
                >
                  🗺️ Show Full Map
                </button>
                
                <button 
                  className="control-btn"
                  onClick={() => {
                    setCamera({
                      x: config.width / 2,
                      y: config.height / 2,
                      zoom: 1.0
                    });
                  }}
                  disabled={!state}
                >
                  🎯 Recenter
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-section">
          <button 
            className={`toolbar-btn ${toolbarStates.tools ? 'active' : ''}`}
            onClick={() => toggleToolbar('tools')}
          >
            🛠️ Tools
          </button>
          
          {toolbarStates.tools && (
            <div className="toolbar-panel">
              <div className="render-options">
                <h4>Basic Layers</h4>
                <label><input type="checkbox" checked={renderOptions.showGrid} onChange={(e) => handleRenderOptionChange('showGrid', e.target.checked)} /> Grid</label>
                <label><input type="checkbox" checked={renderOptions.showAgents} onChange={(e) => handleRenderOptionChange('showAgents', e.target.checked)} /> Agents</label>
                <label><input type="checkbox" checked={renderOptions.showStructures} onChange={(e) => handleRenderOptionChange('showStructures', e.target.checked)} /> Structures</label>
                <label><input type="checkbox" checked={renderOptions.showResources} onChange={(e) => handleRenderOptionChange('showResources', e.target.checked)} /> Resources</label>
                <label><input type="checkbox" checked={renderOptions.showRivers} onChange={(e) => handleRenderOptionChange('showRivers', e.target.checked)} /> Rivers</label>
                <label><input type="checkbox" checked={renderOptions.showRoads} onChange={(e) => handleRenderOptionChange('showRoads', e.target.checked)} /> Roads</label>
                <label><input type="checkbox" checked={renderOptions.showSettlements} onChange={(e) => handleRenderOptionChange('showSettlements', e.target.checked)} /> Settlements</label>
                <label><input type="checkbox" checked={renderOptions.showLabels} onChange={(e) => handleRenderOptionChange('showLabels', e.target.checked)} /> Labels</label>
                
                <h4>Environmental Layers</h4>
                <label><input type="checkbox" checked={renderOptions.showBiomeColors} onChange={(e) => handleRenderOptionChange('showBiomeColors', e.target.checked)} /> Biome Colors</label>
                <label><input type="checkbox" checked={renderOptions.showSoilQuality} onChange={(e) => handleRenderOptionChange('showSoilQuality', e.target.checked)} /> Soil Quality</label>
                <label><input type="checkbox" checked={renderOptions.showFireEffects} onChange={(e) => handleRenderOptionChange('showFireEffects', e.target.checked)} /> Fire Effects</label>
                <label><input type="checkbox" checked={renderOptions.showVegetationDensity} onChange={(e) => handleRenderOptionChange('showVegetationDensity', e.target.checked)} /> Vegetation Density</label>
                <label><input type="checkbox" checked={renderOptions.showErosion} onChange={(e) => handleRenderOptionChange('showErosion', e.target.checked)} /> Erosion</label>
                
                <h4>Performance Options</h4>
                <label><input type="checkbox" checked={true} disabled /> Greedy Meshing (Always Enabled)</label>
                <label><input type="checkbox" checked={renderOptions.enableOctrees} onChange={(e) => handleRenderOptionChange('enableOctrees', e.target.checked)} /> Octree Optimization</label>
                <label>
                  Resource Visibility: 
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={renderOptions.resourceVisibilityThreshold} 
                    onChange={(e) => handleRenderOptionChange('resourceVisibilityThreshold', parseFloat(e.target.value))}
                    style={{width: '60px', marginLeft: '8px'}}
                  />
                  {renderOptions.resourceVisibilityThreshold.toFixed(1)}
                </label>
                <label>
                  Max Visible Tiles: 
                  <input 
                    type="range" 
                    min="1000" 
                    max="50000" 
                    step="1000" 
                    value={renderOptions.maxVisibleTiles} 
                    onChange={(e) => handleRenderOptionChange('maxVisibleTiles', parseInt(e.target.value))}
                    style={{width: '60px', marginLeft: '8px'}}
                  />
                  {renderOptions.maxVisibleTiles.toLocaleString()}
                </label>
              </div>
              
              <div className="world-tools">
                <h4>World Tools</h4>
                <button onClick={handleStartRandomFire} className="tool-btn">
                  🔥 Start Random Fire
                </button>
                <button onClick={handleUpdateTileStates} className="tool-btn">
                  ⏰ Update Environment
                </button>
                <button onClick={logCameraState} className="tool-btn">
                  🐛 Debug Camera
                </button>
                
                <h4>Road Management</h4>
                <button onClick={handleAnalyzeRoadNeeds} className="tool-btn">
                  🛣️ Analyze Road Needs
                </button>
                <button onClick={handleShowRoadProjects} className="tool-btn">
                  📋 Show Road Projects
                </button>
                <button onClick={handleCreateTestRoad} className="tool-btn">
                  🚧 Create Test Road
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-section">
          <button 
            className={`toolbar-btn ${toolbarStates.info ? 'active' : ''}`}
            onClick={() => toggleToolbar('info')}
          >
            📊 Info
          </button>
          
          {toolbarStates.info && (
            <div className="toolbar-panel">
              {statistics && (
                <div className="statistics-panel">
                  <div className="stat-group">
                    <h4>Population</h4>
                    <p>Alive: {statistics.agentStats?.aliveAgents || 0}</p>
                    <p>Total: {statistics.agentStats?.totalAgents || 0}</p>
                    <p>Avg Age: {Math.round(statistics.agentStats?.averageAge || 0)}</p>
                  </div>
                  <div className="stat-group">
                    <h4>Society</h4>
                    <p>Factions: {statistics.socialStats?.totalFactions || 0}</p>
                    <p>Avg Size: {Math.round(statistics.socialStats?.averageFactionSize || 0)}</p>
                    <p>Conflict: {Math.round((statistics.socialStats?.conflictLevel || 0) * 100)}%</p>
                  </div>
                  <div className="stat-group">
                    <h4>World</h4>
                    <p>Tiles: {statistics.worldStats?.totalTiles || 0}</p>
                    <p>Structures: {statistics.worldStats?.structureCount || 0}</p>
                    <p>Temp: {Math.round((statistics.worldStats?.averageTemperature || 0) * 100)}°</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="toolbar-section">
          <button 
            className={`toolbar-btn ${toolbarStates.settings ? 'active' : ''}`}
            onClick={() => toggleToolbar('settings')}
          >
            ⚙️ Settings
          </button>
          
          {toolbarStates.settings && (
            <div className="toolbar-panel">
              <button onClick={() => setShowConfig(true)} className="config-btn">
                🔧 World Configuration
              </button>
              <button onClick={() => window.location.reload()} className="reset-btn">
                🔄 Reset Simulation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Simulation Canvas */}
      <div className="simulation-canvas-container">
        <canvas
          ref={canvasRef}
          className="simulation-canvas"
        />
        
        {/* Camera Info Display */}
        <div className="camera-info">
          <div className="camera-stat">
            <span>X: {Math.round(camera.x)}</span>
          </div>
          <div className="camera-stat">
            <span>Y: {Math.round(camera.y)}</span>
          </div>
          <div className="camera-stat">
            <span>Zoom: {camera.zoom.toFixed(2)}x</span>
          </div>
        </div>
        
        {/* Camera Instructions */}
        <div className="camera-instructions">
          <p>🖱️ Drag to pan • 🖱️ Scroll to zoom • 🖱️ Click to select</p>
        </div>
        
        {/* Camera Controls */}
        <div className="camera-controls">
          <button 
            className="recenter-btn"
            onClick={() => {
              if (worldDataRef.current && config.width && config.height) {
                setCamera({
                  x: config.width / 2,
                  y: config.height / 2,
                  zoom: 1.0
                });
                console.log('🎯 Camera recentered');
              }
            }}
            title="Recenter camera on world"
          >
            🎯 Recenter
          </button>

        </div>
        
        {/* Dwarf Fortress Legend */}
        <div className="ascii-legend">
          <h4>Dwarf Fortress Legend:</h4>
          <div className="legend-grid">
            <div className="legend-item"><span className="legend-char">.</span> Grass</div>
            <div className="legend-item"><span className="legend-char">♣</span> Forest</div>
            <div className="legend-item"><span className="legend-char">^</span> Mountain</div>
            <div className="legend-item"><span className="legend-char">~</span> Water</div>
            <div className="legend-item"><span className="legend-char">·</span> Desert</div>
            <div className="legend-item"><span className="legend-char">#</span> Urban</div>
            <div className="legend-item"><span className="legend-char">≈</span> Farm</div>
            <div className="legend-item"><span className="legend-char">=</span> Road</div>
            <div className="legend-item"><span className="legend-char">n</span> Hills</div>
            <div className="legend-item"><span className="legend-char">†</span> Ruins</div>
            <div className="legend-item"><span className="legend-char">◊</span> Capital</div>
            <div className="legend-item"><span className="legend-char">$</span> Trade Hub</div>
            <div className="legend-item"><span className="legend-char">⌂</span> Building</div>
            <div className="legend-item"><span className="legend-char">☩</span> Temple</div>
            <div className="legend-item"><span className="legend-char">@</span> Agent</div>
          </div>
        </div>
        
        {/* Minimap */}
        {worldDataRef.current && (
          <Minimap
            tiles={worldDataRef.current.tiles || []}
            camera={camera}
            worldSize={{ width: config.width, height: config.height }}
            viewportSize={{ 
              width: canvasRef.current?.width || 800, 
              height: canvasRef.current?.height || 600 
            }}
            onMinimapClick={(x, y) => {
              setCamera({
                x,
                y,
                zoom: 1.0
              });
              console.log('🎯 Camera moved to:', { x, y });
            }}
          />
        )}
        
        {!state && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Initializing Dwarf Fortress simulation...</p>
          </div>
        )}
      </div>

      {/* Entity Details Panel */}
      {selectedEntity && (
        <EntityDetailsPanel 
          entity={selectedEntity} 
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  );
};

// Dwarf Fortress Configuration Panel Component
interface DwarfFortressConfigPanelProps {
  config: DwarfFortressConfig;
  setConfig: React.Dispatch<React.SetStateAction<DwarfFortressConfig>>;
  onStart: () => void;
}

const DwarfFortressConfigPanel: React.FC<DwarfFortressConfigPanelProps> = ({ config, setConfig, onStart }) => {
  const handleConfigChange = (key: keyof DwarfFortressConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="game-config-overlay">
      <div className="game-config-panel">
        <h2>🏔️ Dwarf Fortress World Configuration</h2>
        
        <div className="config-section">
          <h3>World Settings</h3>
          <div className="config-group">
            <label>World Width: {config.width}</label>
            <input 
              type="range" 
              value={config.width}
              onChange={(e) => handleConfigChange('width', parseInt(e.target.value))}
              min="100" max="400" step="50"
            />
          </div>
          <div className="config-group">
            <label>World Height: {config.height}</label>
            <input 
              type="range" 
              value={config.height}
              onChange={(e) => handleConfigChange('height', parseInt(e.target.value))}
              min="100" max="400" step="50"
            />
          </div>
          <div className="config-group">
            <label>Seed: {config.seed}</label>
            <input 
              type="number" 
              value={config.seed}
              onChange={(e) => handleConfigChange('seed', parseInt(e.target.value))}
              min="0" max="999999"
            />
          </div>
        </div>

        <div className="config-section">
          <h3>Terrain Generation</h3>
          <div className="config-group">
            <label>Mountain Ranges: {config.mountainRanges}</label>
            <input 
              type="range" 
              value={config.mountainRanges}
              onChange={(e) => handleConfigChange('mountainRanges', parseInt(e.target.value))}
              min="1" max="8" step="1"
            />
          </div>
          <div className="config-group">
            <label>River Count: {config.riverCount}</label>
            <input 
              type="range" 
              value={config.riverCount}
              onChange={(e) => handleConfigChange('riverCount', parseInt(e.target.value))}
              min="3" max="15" step="1"
            />
          </div>
          <div className="config-group">
            <label>Lake Count: {config.lakeCount}</label>
            <input 
              type="range" 
              value={config.lakeCount}
              onChange={(e) => handleConfigChange('lakeCount', parseInt(e.target.value))}
              min="2" max="10" step="1"
            />
          </div>
          <div className="config-group">
            <label>Cave Systems: {config.caveSystems}</label>
            <input 
              type="range" 
              value={config.caveSystems}
              onChange={(e) => handleConfigChange('caveSystems', parseInt(e.target.value))}
              min="1" max="8" step="1"
            />
          </div>
        </div>

        <div className="config-section">
          <h3>Civilization Settings</h3>
          <div className="config-group">
            <label>Civilization Count: {config.civilizationCount}</label>
            <input 
              type="range" 
              value={config.civilizationCount}
              onChange={(e) => handleConfigChange('civilizationCount', parseInt(e.target.value))}
              min="2" max="8" step="1"
            />
          </div>
          <div className="config-group">
            <label>Settlement Density: {config.settlementDensity.toFixed(1)}</label>
            <input 
              type="range" 
              value={config.settlementDensity}
              onChange={(e) => handleConfigChange('settlementDensity', parseFloat(e.target.value))}
              min="0.1" max="1.0" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>Road Density: {config.roadDensity.toFixed(1)}</label>
            <input 
              type="range" 
              value={config.roadDensity}
              onChange={(e) => handleConfigChange('roadDensity', parseFloat(e.target.value))}
              min="0.1" max="1.0" step="0.1"
            />
          </div>
        </div>

        <div className="config-section">
          <h3>Resource Settings</h3>
          <div className="config-group">
            <label>Mineral Richness: {config.mineralRichness.toFixed(1)}</label>
            <input 
              type="range" 
              value={config.mineralRichness}
              onChange={(e) => handleConfigChange('mineralRichness', parseFloat(e.target.value))}
              min="0.1" max="1.0" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>Soil Fertility: {config.soilFertility.toFixed(1)}</label>
            <input 
              type="range" 
              value={config.soilFertility}
              onChange={(e) => handleConfigChange('soilFertility', parseFloat(e.target.value))}
              min="0.1" max="1.0" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>Water Availability: {config.waterAvailability.toFixed(1)}</label>
            <input 
              type="range" 
              value={config.waterAvailability}
              onChange={(e) => handleConfigChange('waterAvailability', parseFloat(e.target.value))}
              min="0.1" max="1.0" step="0.1"
            />
          </div>
        </div>

        <div className="config-actions">
          <button onClick={onStart} className="start-btn">
            🚀 Start Dwarf Fortress Simulation
          </button>
        </div>
      </div>
    </div>
  );
};

// Entity Details Panel Component
const EntityDetailsPanel: React.FC<{ entity: SelectedEntity; onClose: () => void }> = ({ entity, onClose }) => {
  const renderEntityDetails = () => {
    switch (entity.type) {
      case 'agent':
        return (
          <div className="entity-details">
            <h3>👤 Agent: {entity.data.name}</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Health:</label>
                <span>{Math.round(entity.data.health * 100)}%</span>
              </div>
              <div className="detail-item">
                <label>Energy:</label>
                <span>{Math.round(entity.data.energy * 100)}%</span>
              </div>
              <div className="detail-item">
                <label>Age:</label>
                <span>{entity.data.age}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <span>{entity.data.status}</span>
              </div>
            </div>
          </div>
        );

      case 'settlement':
        return (
          <div className="entity-details">
            <h3>🏘️ Settlement: {entity.data.name}</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Type:</label>
                <span>{entity.data.type}</span>
              </div>
              <div className="detail-item">
                <label>Population:</label>
                <span>{entity.data.population}</span>
              </div>
              <div className="detail-item">
                <label>Position:</label>
                <span>({Math.round(entity.data.position.x)}, {Math.round(entity.data.position.y)})</span>
              </div>
              <div className="detail-item">
                <label>Civilization:</label>
                <span>{entity.data.civilization}</span>
              </div>
            </div>
          </div>
        );

      case 'civilization':
        return (
          <div className="entity-details">
            <h3>🏛️ Civilization: {entity.data.name}</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Type:</label>
                <span>{entity.data.type}</span>
              </div>
              <div className="detail-item">
                <label>Population:</label>
                <span>{entity.data.population}</span>
              </div>
              <div className="detail-item">
                <label>Technology:</label>
                <span>{Math.round(entity.data.technology * 100)}%</span>
              </div>
              <div className="detail-item">
                <label>Wealth:</label>
                <span>{Math.round(entity.data.wealth * 100)}%</span>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="entity-details">
            <h3>❓ Unknown Entity</h3>
            <p>Type: {entity.type}</p>
            <p>ID: {entity.id}</p>
          </div>
        );
    }
  };

  return (
    <div className="entity-details-panel">
      <button className="close-btn" onClick={onClose}>×</button>
      {renderEntityDetails()}
    </div>
  );
}; 