import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const worldGeneratorRef = useRef<DwarfFortressWorldGenerator | null>(null);
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
    width: 400, // Further reduced world size for better performance
    height: 300, // Further reduced world size for better performance
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
  
  // Fixed viewport configuration
  const [viewportConfig, setViewportConfig] = useState({
    viewportTilesX: 120, // Increased viewport width to show more of the world
    viewportTilesY: 90,  // Increased viewport height to show full world height
  });
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [toolbarStates, setToolbarStates] = useState({
    controls: true,
    tools: false,
    info: false,
    settings: false,
  });
  
  // State for collapsible sections in Tools menu
  const [toolsSections, setToolsSections] = useState({
    basicLayers: true,
    environmentalLayers: false,
    performanceOptions: false,
    viewportCulling: false,
    worldTools: false,
    roadManagement: false,
  });

  // State for collapsible sections in Controls menu
  const [controlsSections, setControlsSections] = useState({
    playbackControls: true,
    speedControls: false,
    navigationControls: false,
    worldActions: false,
    environmentTools: false,
  });
  const [renderOptions, setRenderOptions] = useState({
    showGrid: false,
    showResources: true, // Enabled for better visibility
    showStructures: true,
    showAgents: true,
    showRivers: true,
    showRoads: true,
    showSettlements: true,
    showLabels: false,
    // New layer options
    showBiomeColors: true,
    showSoilQuality: false,
    showFireEffects: false, // Disabled for better performance
    showVegetationDensity: false,
    showErosion: false,
    // Performance options
    enableGreedyMeshing: true, // Enabled for better performance
    enableOctrees: false, // Disabled to fix visibility issues
    maxVisibleTiles: 50000, // Increased for full world visibility at all zoom levels
    resourceVisibilityThreshold: 0.1, // Lowered threshold for better visibility
    // Enhanced viewport culling options
    viewportBufferSize: 16, // Reduced buffer for better performance
    adaptiveBufferScaling: false, // Disabled to simplify rendering
    maxBufferMultiplier: 1.0, // No buffer scaling
    // UI options
    showCameraInstructions: false,
    showHoverInfo: true,
  });
  const [speed, setSpeedState] = useState(1.0);

  // Camera state management
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Hover state management
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    tile: any;
    biome: string;
    position: { x: number; y: number };
  } | null>(null);

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
    worldGeneratorRef.current = worldGenerator; // Store world generator
    
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
      enableGreedyMeshing: renderOptions.enableGreedyMeshing,
      enableOctrees: renderOptions.enableOctrees,
      maxVisibleTiles: renderOptions.maxVisibleTiles,
      resourceVisibilityThreshold: renderOptions.resourceVisibilityThreshold,
      // Enhanced viewport culling options
      viewportBufferSize: renderOptions.viewportBufferSize,
      adaptiveBufferScaling: renderOptions.adaptiveBufferScaling,
      maxBufferMultiplier: renderOptions.maxBufferMultiplier,
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
        rendererRef.current.cleanup();
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
      // Set camera to show the full world area
      const canvas = canvasRef.current;
      const worldWidth = config.width;
      const worldHeight = config.height;
      const tileSize = 12; // Tile size in pixels
      
      // Calculate zoom level to show the entire world
      const zoomX = canvas.width / (worldWidth * tileSize);
      const zoomY = canvas.height / (worldHeight * tileSize);
      
      // Use the smaller zoom to ensure entire world fits
      const fitZoom = Math.min(zoomX, zoomY) * 0.95; // 95% to add some margin
      
      // Center camera on the middle of the world
      const worldCenterX = worldWidth / 2; // World center in tiles
      const worldCenterY = worldHeight / 2; // World center in tiles
      
      setCamera({
        x: worldCenterX,
        y: worldCenterY,
        zoom: fitZoom
      });
      cameraCenteredRef.current = true;
      
      console.log('✅ Camera centered on full world');
    }
  }, [worldDataRef.current, config.width, config.height]);

  // Camera controls and entity selection
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dragStart = { x: 0, y: 0 };
    let clickTimeout: NodeJS.Timeout | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left mouse button
        dragStart = { x: e.clientX, y: e.clientY };
        setIsDragging(true);
        
        // Clear any existing click timeout
        if (clickTimeout) {
          clearTimeout(clickTimeout);
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Update hover info
      if (renderOptions.showHoverInfo && worldDataRef.current) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Check if mouse is within canvas bounds
        if (mouseX >= 0 && mouseX < canvas.width && mouseY >= 0 && mouseY < canvas.height) {
          // Convert screen coordinates to world coordinates
          const tileSize = 12; // Tile size in pixels
          const worldX = (mouseX - canvas.width / 2) / (camera.zoom * tileSize) + camera.x;
          const worldY = (mouseY - canvas.height / 2) / (camera.zoom * tileSize) + camera.y;
          
          // Get tile at this position
          const worldTileSize = 12; // Tile size in pixels
          const tileX = Math.floor(worldX / worldTileSize) * worldTileSize;
          const tileY = Math.floor(worldY / worldTileSize) * worldTileSize;
          
          const tile = worldDataRef.current.tiles[tileY]?.[tileX];
          if (tile) {
            setHoverInfo({
              x: mouseX,
              y: mouseY,
              tile,
              biome: tile.tileData?.biome || 'unknown',
              position: { x: tileX, y: tileY }
            });
          } else {
            setHoverInfo(null);
          }
        } else {
          setHoverInfo(null);
        }
      }
      
      if (!isDragging) return;
      
      setCamera(currentCamera => {
        // Calculate delta in tile coordinates
        const tileSize = 12; // Tile size in pixels
        const deltaX = (e.clientX - dragStart.x) / (currentCamera.zoom * tileSize);
        const deltaY = (e.clientY - dragStart.y) / (currentCamera.zoom * tileSize);
        
        const newX = currentCamera.x - deltaX;
        const newY = currentCamera.y - deltaY;
        
        // Keep camera within world bounds (in tiles)
        const worldWidth = config.width; // World width in tiles
        const worldHeight = config.height; // World height in tiles
        
        // Camera position should never go outside the world dimensions
        const clampedX = Math.max(0, Math.min(worldWidth, newX));
        const clampedY = Math.max(0, Math.min(worldHeight, newY));
        
        return {
          ...currentCamera,
          x: clampedX,
          y: clampedY
        };
      });
      
      dragStart = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseLeave = () => {
      setIsDragging(false);
      setHoverInfo(null);
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (isDragging) return; // Don't handle clicks if we were dragging
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Convert screen coordinates to world coordinates
      const tileSize = 12; // Tile size in pixels
      const worldX = (mouseX - canvas.width / 2) / (camera.zoom * tileSize) + camera.x;
      const worldY = (mouseY - canvas.height / 2) / (camera.zoom * tileSize) + camera.y;
      
      // Find entity at this position
      const entity = findEntityAtPosition(worldX, worldY);
      setSelectedEntity(entity);
    };

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events when mouse is over the canvas
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      if (mouseX < rect.left || mouseX > rect.right || mouseY < rect.top || mouseY > rect.bottom) {
        return; // Mouse is not over the canvas
      }
      
      e.preventDefault();
      
      setCamera(currentCamera => {
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9; // Inverted for more intuitive zooming
        const newZoom = Math.max(0.1, Math.min(5, currentCamera.zoom * zoomFactor));
        
        // Keep camera at the same x,y position, only change zoom
        const newX = currentCamera.x;
        const newY = currentCamera.y;
        
        // Keep camera within world bounds (in tiles)
        const worldWidth = config.width; // World width in tiles
        const worldHeight = config.height; // World height in tiles
        
        // Camera position should never go outside the world dimensions
        const clampedX = Math.max(0, Math.min(worldWidth, newX));
        const clampedY = Math.max(0, Math.min(worldHeight, newY));
        
        return {
          x: clampedX,
          y: clampedY,
          zoom: newZoom
        };
      });
    };

    // Make sure canvas can receive focus and wheel events
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';
    

    
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    

    
    // Also add wheel event listener to the window to catch wheel events that might not reach the canvas
    window.addEventListener('wheel', handleWheel, { passive: false });
    
    // Add global mouse up listener to handle mouse release outside canvas
    window.addEventListener('mouseup', handleMouseUp);
    
    console.log('✅ Event listeners attached successfully');
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleMouseUp);
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [config.width, config.height, camera, isDragging]);

  // Performance monitoring
  const [fps, setFps] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const fpsRef = useRef(0);
  const renderTimeRef = useRef(0);

  // Update performance metrics
  useEffect(() => {
    const updatePerformance = () => {
      setFps(fpsRef.current);
      setRenderTime(renderTimeRef.current);
    };
    
    const interval = setInterval(updatePerformance, 1000);
    return () => clearInterval(interval);
  }, []);

  // Performance monitoring in render loop
  useEffect(() => {
    const renderer = rendererRef.current;
    const worldData = worldDataRef.current;
    if (!renderer || !worldData) {
      return;
    }
    
    let animationId: number;
    let lastRenderTime = 0;
    let frameCount = 0;
    let lastFpsUpdate = 0;
    const targetFPS = 30; // Reduced from 60 to 30 for better performance
    const frameInterval = 1000 / targetFPS;
    let isRendering = false; // Prevent multiple render calls
    
    // Memoize render config to prevent unnecessary updates
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
      enableGreedyMeshing: renderOptions.enableGreedyMeshing,
      enableOctrees: renderOptions.enableOctrees,
      maxVisibleTiles: renderOptions.maxVisibleTiles,
      resourceVisibilityThreshold: renderOptions.resourceVisibilityThreshold,
      // Enhanced viewport culling options
      viewportBufferSize: renderOptions.viewportBufferSize,
      adaptiveBufferScaling: renderOptions.adaptiveBufferScaling,
      maxBufferMultiplier: renderOptions.maxBufferMultiplier,
      // New layer options
      showBiomeColors: renderOptions.showBiomeColors,
      showSoilQuality: renderOptions.showSoilQuality,
      showFireEffects: renderOptions.showFireEffects,
      showVegetationDensity: renderOptions.showVegetationDensity,
      showErosion: renderOptions.showErosion
    };
    
    const renderLoop = (currentTime: number) => {
      // Throttle rendering to target FPS (30 FPS for better performance)
      const targetFPS = 30;
      const frameInterval = 1000 / targetFPS;
      
      if (currentTime - lastRenderTime < frameInterval) {
        animationId = requestAnimationFrame(renderLoop);
        return;
      }
      
      // Prevent multiple simultaneous renders
      if (isRendering) {
        animationId = requestAnimationFrame(renderLoop);
        return;
      }
      
      isRendering = true;
      lastRenderTime = currentTime;
      frameCount++;
      
      // Update FPS counter
      if (currentTime - lastFpsUpdate >= 1000) {
        fpsRef.current = frameCount;
        frameCount = 0;
        lastFpsUpdate = currentTime;
      }
      
      const renderStart = performance.now();
      
      try {
        // Update renderer config with current options
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
        
        renderer.render(renderData);
        
        const renderEnd = performance.now();
        renderTimeRef.current = renderEnd - renderStart;
      } catch (error) {
        console.error('Rendering error:', error);
      } finally {
        isRendering = false;
      }
      
      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop(0);
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [worldDataRef.current, camera, engine, renderOptions]);



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
    setToolbarStates(prev => {
      // If clicking the same toolbar, toggle it
      if (prev[toolbar]) {
        return {
          ...prev,
          [toolbar]: false,
        };
      }
      
      // If clicking a different toolbar, close all others and open the clicked one
      return {
        controls: toolbar === 'controls',
        tools: toolbar === 'tools',
        info: toolbar === 'info',
        settings: toolbar === 'settings',
      };
    });
  };

  const toggleToolsSection = (section: keyof typeof toolsSections) => {
    setToolsSections(prev => {
      // If clicking the same section, toggle it
      if (prev[section]) {
        return {
          ...prev,
          [section]: false,
        };
      }
      
      // If clicking a different section, close all others and open the clicked one
      return {
        basicLayers: section === 'basicLayers',
        environmentalLayers: section === 'environmentalLayers',
        performanceOptions: section === 'performanceOptions',
        viewportCulling: section === 'viewportCulling',
        worldTools: section === 'worldTools',
        roadManagement: section === 'roadManagement',
      };
    });
  };

  const toggleControlsSection = (section: keyof typeof controlsSections) => {
    setControlsSections(prev => {
      // If clicking the same section, toggle it
      if (prev[section]) {
        return {
          ...prev,
          [section]: false,
        };
      }
      
      // If clicking a different section, close all others and open the clicked one
      return {
        playbackControls: section === 'playbackControls',
        speedControls: section === 'speedControls',
        navigationControls: section === 'navigationControls',
        worldActions: section === 'worldActions',
        environmentTools: section === 'environmentTools',
      };
    });
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

  // Helper function to calculate dynamic viewport size and bounds
  const calculateViewportInfo = () => {
    const canvas = canvasRef.current;
    const tileSize = 12;
    const worldWidth = config.width; // World width in tiles
    const worldHeight = config.height; // World height in tiles
    const viewportWidth = canvas ? canvas.width / camera.zoom : 0;
    const viewportHeight = canvas ? canvas.height / camera.zoom : 0;
    
    // Calculate bounds to keep camera within world bounds (in tiles)
    const minX = 0;
    const maxX = worldWidth;
    const minY = 0;
    const maxY = worldHeight;
    
    return {
      worldSize: { width: worldWidth, height: worldHeight },
      viewportSize: { width: viewportWidth, height: viewportHeight },
      canvasSize: { width: canvas?.width || 0, height: canvas?.height || 0 },
      bounds: { minX, maxX, minY, maxY },
      tileSize
    };
  };

  // Debug function to log camera state
  const logCameraState = () => {
    const viewportInfo = calculateViewportInfo();
    
    console.log('Camera State:', {
      position: { x: camera.x, y: camera.y },
      zoom: camera.zoom,
      ...viewportInfo,
      isWithinBounds: {
        x: camera.x >= viewportInfo.bounds.minX && camera.x <= viewportInfo.bounds.maxX,
        y: camera.y >= viewportInfo.bounds.minY && camera.y <= viewportInfo.bounds.maxY
      }
    });
  };

  // Add global debug functions for testing camera controls
  useEffect(() => {
    // @ts-ignore
    window.debugCamera = {
      log: logCameraState,
      setPosition: (x: number, y: number) => setCamera(prev => ({ ...prev, x, y })),
      setZoom: (zoom: number) => setCamera(prev => ({ ...prev, zoom })),
      recenter: () => {
        const worldCenterX = config.width / 2; // World center in tiles
        const worldCenterY = config.height / 2; // World center in tiles
        
        console.log('🎯 Recenter calculation:', {
          worldSize: { width: config.width, height: config.height },
          worldCenter: { x: worldCenterX, y: worldCenterY }
        });
        
        setCamera({ x: worldCenterX, y: worldCenterY, zoom: 1.0 });
      },
      getViewportInfo: calculateViewportInfo,
      testBounds: () => {
        const viewportInfo = calculateViewportInfo();
        console.log('Viewport Info:', viewportInfo);
        console.log('Camera within bounds:', {
          x: camera.x >= viewportInfo.bounds.minX && camera.x <= viewportInfo.bounds.maxX,
          y: camera.y >= viewportInfo.bounds.minY && camera.y <= viewportInfo.bounds.maxY
        });
      }
    };
    
    return () => {
      // @ts-ignore
      delete window.debugCamera;
    };
  }, [camera, config.width, config.height]);

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
    
    // Reset camera centering flag so it will be set properly
    cameraCenteredRef.current = false;
    
    start();
  };

  if (showConfig) {
    return <DwarfFortressConfigPanel 
      config={config} 
      setConfig={setConfig} 
      viewportConfig={viewportConfig}
      setViewportConfig={setViewportConfig}
      onStart={handleStartSimulation} 
    />;
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
              <div className="render-options">
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${controlsSections.playbackControls ? 'active' : ''}`}
                    onClick={() => toggleControlsSection('playbackControls')}
                  >
                    <span>🎮 Playback Controls</span>
                    <span className="section-toggle">{controlsSections.playbackControls ? '▼' : '▶'}</span>
                  </button>
                  {controlsSections.playbackControls && (
                    <div className="tools-section-content">
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
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${controlsSections.speedControls ? 'active' : ''}`}
                    onClick={() => toggleControlsSection('speedControls')}
                  >
                    <span>⚡ Speed Controls</span>
                    <span className="section-toggle">{controlsSections.speedControls ? '▼' : '▶'}</span>
                  </button>
                  {controlsSections.speedControls && (
                    <div className="tools-section-content">
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
                        <button 
                          className={`control-btn ${speed === 0.5 ? 'active' : ''}`}
                          onClick={() => handleSpeedChange(0.5)} 
                          disabled={!isRunning}
                        >
                          0.5x
                        </button>
                        <button 
                          className={`control-btn ${speed === 1.0 ? 'active' : ''}`}
                          onClick={() => handleSpeedChange(1.0)} 
                          disabled={!isRunning}
                        >
                          1x
                        </button>
                        <button 
                          className={`control-btn ${speed === 2.0 ? 'active' : ''}`}
                          onClick={() => handleSpeedChange(2.0)} 
                          disabled={!isRunning}
                        >
                          2x
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${controlsSections.navigationControls ? 'active' : ''}`}
                    onClick={() => toggleControlsSection('navigationControls')}
                  >
                    <span>🗺️ Navigation</span>
                    <span className="section-toggle">{controlsSections.navigationControls ? '▼' : '▶'}</span>
                  </button>
                  {controlsSections.navigationControls && (
                    <div className="tools-section-content">
                      <button 
                        className="control-btn"
                        onClick={() => {
                          if (canvasRef.current && worldDataRef.current) {
                            const canvas = canvasRef.current;
                            const worldWidth = config.width;
                            const worldHeight = config.height;
                            const tileSize = 12;
                            
                            // Calculate zoom level to show the entire world
                            const zoomX = canvas.width / (worldWidth * tileSize);
                            const zoomY = canvas.height / (worldHeight * tileSize);
                            const fitZoom = Math.min(zoomX, zoomY) * 0.95;
                            
                            // Center camera on the middle of the world
                            const worldCenterX = worldWidth / 2; // World center in tiles
                            const worldCenterY = worldHeight / 2; // World center in tiles
                            
                            setCamera({
                              x: worldCenterX,
                              y: worldCenterY,
                              zoom: fitZoom
                            });
                            
                            console.log('🎯 Show Full World clicked:', {
                              worldSize: { width: worldWidth, height: worldHeight },
                              canvasSize: { width: canvas.width, height: canvas.height },
                              calculatedZoom: fitZoom,
                              tileSize,
                              worldCenter: { x: worldCenterX, y: worldCenterY }
                            });
                          }
                        }}
                        disabled={!state}
                        style={{width: '100%', marginBottom: '0.5rem'}}
                      >
                        🗺️ Show Full World
                      </button>
                      
                      <button 
                        className="control-btn"
                        onClick={() => {
                          const worldCenterX = config.width / 2; // World center in tiles
                          const worldCenterY = config.height / 2; // World center in tiles
                          
                          setCamera({
                            x: worldCenterX,
                            y: worldCenterY,
                            zoom: 1.0
                          });
                          console.log('🎯 Camera recentered to world center:', {
                            x: worldCenterX,
                            y: worldCenterY,
                            zoom: 1.0
                          });
                        }}
                        disabled={!state}
                        style={{width: '100%'}}
                      >
                        🎯 Recenter
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${controlsSections.worldActions ? 'active' : ''}`}
                    onClick={() => toggleControlsSection('worldActions')}
                  >
                    <span>🌍 World Actions</span>
                    <span className="section-toggle">{controlsSections.worldActions ? '▼' : '▶'}</span>
                  </button>
                  {controlsSections.worldActions && (
                    <div className="tools-section-content">
                      <button 
                        className="control-btn"
                        onClick={() => {
                          if (worldGeneratorRef.current) {
                            const stats = worldGeneratorRef.current.getWorldStatistics();
                            console.log('📊 World Statistics:', stats);
                            alert(`World Statistics:\n` +
                              `Total Tiles: ${stats.totalTiles}\n` +
                              `Cached Tiles: ${stats.cachedTiles}\n` +
                              `Burning Tiles: ${stats.burningTiles}\n` +
                              `Avg Soil Quality: ${stats.averageSoilQuality.toFixed(2)}\n` +
                              `Avg Vegetation: ${stats.averageVegetationDensity.toFixed(2)}`);
                          }
                        }}
                        disabled={!state}
                        style={{width: '100%'}}
                      >
                        📊 World Stats
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${controlsSections.environmentTools ? 'active' : ''}`}
                    onClick={() => toggleControlsSection('environmentTools')}
                  >
                    <span>🛠️ Environment Tools</span>
                    <span className="section-toggle">{controlsSections.environmentTools ? '▼' : '▶'}</span>
                  </button>
                  {controlsSections.environmentTools && (
                    <div className="tools-section-content">
                      <button 
                        className="control-btn"
                        onClick={() => {
                          if (worldGeneratorRef.current && canvasRef.current) {
                            const centerX = Math.floor(camera.x);
                            const centerY = Math.floor(camera.y);
                            
                            // Apply farming to a 3x3 area around camera center
                            for (let y = centerY - 1; y <= centerY + 1; y++) {
                              for (let x = centerX - 1; x <= centerX + 1; x++) {
                                worldGeneratorRef.current.applyFarming(x, y);
                              }
                            }
                            console.log(`🌾 Applied farming to area around (${centerX}, ${centerY})`);
                          }
                        }}
                        disabled={!state}
                        style={{width: '100%', marginBottom: '0.5rem'}}
                      >
                        🌾 Apply Farming
                      </button>

                      <button 
                        className="control-btn"
                        onClick={() => {
                          if (worldGeneratorRef.current && canvasRef.current) {
                            const centerX = Math.floor(camera.x);
                            const centerY = Math.floor(camera.y);
                            
                            // Apply building to camera center
                            worldGeneratorRef.current.applyBuilding(centerX, centerY, 'house');
                            console.log(`🏠 Applied building at (${centerX}, ${centerY})`);
                          }
                        }}
                        disabled={!state}
                        style={{width: '100%', marginBottom: '0.5rem'}}
                      >
                        🏠 Apply Building
                      </button>

                      <button 
                        className="control-btn"
                        onClick={() => {
                          if (worldGeneratorRef.current && canvasRef.current) {
                            const centerX = Math.floor(camera.x);
                            const centerY = Math.floor(camera.y);
                            
                            // Start fire at camera center
                            worldGeneratorRef.current.startFire(centerX, centerY);
                            console.log(`🔥 Started fire at (${centerX}, ${centerY})`);
                          }
                        }}
                        disabled={!state}
                        style={{width: '100%'}}
                      >
                        🔥 Start Fire
                      </button>
                    </div>
                  )}
                </div>
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
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${toolsSections.basicLayers ? 'active' : ''}`}
                    onClick={() => toggleToolsSection('basicLayers')}
                  >
                    <span>📊 Basic Layers</span>
                    <span className="section-toggle">{toolsSections.basicLayers ? '▼' : '▶'}</span>
                  </button>
                  {toolsSections.basicLayers && (
                    <div className="tools-section-content">
                      <label><input type="checkbox" checked={renderOptions.showGrid} onChange={(e) => handleRenderOptionChange('showGrid', e.target.checked)} /> Grid</label>
                      <label><input type="checkbox" checked={renderOptions.showAgents} onChange={(e) => handleRenderOptionChange('showAgents', e.target.checked)} /> Agents</label>
                      <label><input type="checkbox" checked={renderOptions.showStructures} onChange={(e) => handleRenderOptionChange('showStructures', e.target.checked)} /> Structures</label>
                      <label><input type="checkbox" checked={renderOptions.showResources} onChange={(e) => handleRenderOptionChange('showResources', e.target.checked)} /> Resources</label>
                      <label><input type="checkbox" checked={renderOptions.showRivers} onChange={(e) => handleRenderOptionChange('showRivers', e.target.checked)} /> Rivers</label>
                      <label><input type="checkbox" checked={renderOptions.showRoads} onChange={(e) => handleRenderOptionChange('showRoads', e.target.checked)} /> Roads</label>
                      <label><input type="checkbox" checked={renderOptions.showSettlements} onChange={(e) => handleRenderOptionChange('showSettlements', e.target.checked)} /> Settlements</label>
                      <label><input type="checkbox" checked={renderOptions.showLabels} onChange={(e) => handleRenderOptionChange('showLabels', e.target.checked)} /> Labels</label>
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${toolsSections.environmentalLayers ? 'active' : ''}`}
                    onClick={() => toggleToolsSection('environmentalLayers')}
                  >
                    <span>🌍 Environmental Layers</span>
                    <span className="section-toggle">{toolsSections.environmentalLayers ? '▼' : '▶'}</span>
                  </button>
                  {toolsSections.environmentalLayers && (
                    <div className="tools-section-content">
                      <label><input type="checkbox" checked={renderOptions.showBiomeColors} onChange={(e) => handleRenderOptionChange('showBiomeColors', e.target.checked)} /> Biome Colors</label>
                      <label><input type="checkbox" checked={renderOptions.showSoilQuality} onChange={(e) => handleRenderOptionChange('showSoilQuality', e.target.checked)} /> Soil Quality</label>
                      <label><input type="checkbox" checked={renderOptions.showFireEffects} onChange={(e) => handleRenderOptionChange('showFireEffects', e.target.checked)} /> Fire Effects</label>
                      <label><input type="checkbox" checked={renderOptions.showVegetationDensity} onChange={(e) => handleRenderOptionChange('showVegetationDensity', e.target.checked)} /> Vegetation Density</label>
                      <label><input type="checkbox" checked={renderOptions.showErosion} onChange={(e) => handleRenderOptionChange('showErosion', e.target.checked)} /> Erosion</label>
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${toolsSections.performanceOptions ? 'active' : ''}`}
                    onClick={() => toggleToolsSection('performanceOptions')}
                  >
                    <span>⚡ Performance Options</span>
                    <span className="section-toggle">{toolsSections.performanceOptions ? '▼' : '▶'}</span>
                  </button>
                  {toolsSections.performanceOptions && (
                    <div className="tools-section-content">
                      <label><input type="checkbox" checked={renderOptions.enableGreedyMeshing} onChange={(e) => handleRenderOptionChange('enableGreedyMeshing', e.target.checked)} /> Greedy Meshing</label>
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
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${toolsSections.viewportCulling ? 'active' : ''}`}
                    onClick={() => toggleToolsSection('viewportCulling')}
                  >
                    <span>🎯 Viewport Culling Options</span>
                    <span className="section-toggle">{toolsSections.viewportCulling ? '▼' : '▶'}</span>
                  </button>
                  {toolsSections.viewportCulling && (
                    <div className="tools-section-content">
                      <label>
                        Buffer Size: 
                        <input 
                          type="range" 
                          min="0" 
                          max="32" 
                          step="4" 
                          value={renderOptions.viewportBufferSize} 
                          onChange={(e) => handleRenderOptionChange('viewportBufferSize', parseInt(e.target.value))}
                          style={{width: '60px', marginLeft: '8px'}}
                        />
                        {renderOptions.viewportBufferSize} {renderOptions.viewportBufferSize === 0 ? '(Exact Viewport)' : 'tiles'}
                      </label>
                      <label><input type="checkbox" checked={renderOptions.adaptiveBufferScaling} onChange={(e) => handleRenderOptionChange('adaptiveBufferScaling', e.target.checked)} disabled={renderOptions.viewportBufferSize === 0} /> Adaptive Buffer Scaling</label>
                      <label>
                        Max Buffer Multiplier: 
                        <input 
                          type="range" 
                          min="1.0" 
                          max="5.0" 
                          step="0.5" 
                          value={renderOptions.maxBufferMultiplier} 
                          onChange={(e) => handleRenderOptionChange('maxBufferMultiplier', parseFloat(e.target.value))}
                          style={{width: '60px', marginLeft: '8px'}}
                          disabled={renderOptions.viewportBufferSize === 0}
                        />
                        {renderOptions.maxBufferMultiplier.toFixed(1)}x
                      </label>
                      <p style={{fontSize: '12px', color: '#888', marginTop: '8px'}}>
                        {renderOptions.viewportBufferSize === 0 ? 
                          '🎯 Exact Viewport Mode: Only renders tiles visible in camera viewport' : 
                          '🔄 Buffer Mode: Renders additional tiles around viewport for smooth scrolling'
                        }
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${toolsSections.worldTools ? 'active' : ''}`}
                    onClick={() => toggleToolsSection('worldTools')}
                  >
                    <span>🛠️ World Tools</span>
                    <span className="section-toggle">{toolsSections.worldTools ? '▼' : '▶'}</span>
                  </button>
                  {toolsSections.worldTools && (
                    <div className="tools-section-content">
                      <button onClick={handleStartRandomFire} className="tool-btn">
                        🔥 Start Random Fire
                      </button>
                      <button onClick={handleUpdateTileStates} className="tool-btn">
                        ⏰ Update Environment
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="tools-section">
                  <button 
                    className={`tools-section-header ${toolsSections.roadManagement ? 'active' : ''}`}
                    onClick={() => toggleToolsSection('roadManagement')}
                  >
                    <span>🛣️ Road Management</span>
                    <span className="section-toggle">{toolsSections.roadManagement ? '▼' : '▶'}</span>
                  </button>
                  {toolsSections.roadManagement && (
                    <div className="tools-section-content">
                      <button onClick={handleAnalyzeRoadNeeds} className="tool-btn">
                        🛣️ Analyze Road Needs
                      </button>
                      <button onClick={handleShowRoadProjects} className="tool-btn">
                        📋 Show Road Projects
                      </button>
                      <button onClick={handleCreateTestRoad} className="tool-btn">
                        🚧 Create Test Road
                      </button>
                      <button onClick={() => {
                        // Test greedy meshing performance
                        if (worldDataRef.current && rendererRef.current) {
                          const tiles = worldDataRef.current.tiles.flat().filter(tile => tile);
                          console.log('🧪 Testing greedy meshing performance with', tiles.length, 'tiles');
                          
                          // Test with greedy meshing enabled
                          setRenderOptions(prev => ({ ...prev, enableGreedyMeshing: true }));
                          const startTime1 = performance.now();
                          
                          setTimeout(() => {
                            const endTime1 = performance.now();
                            const timeWithGreedy = endTime1 - startTime1;
                            
                            // Test with greedy meshing disabled
                            setRenderOptions(prev => ({ ...prev, enableGreedyMeshing: false }));
                            const startTime2 = performance.now();
                            
                            setTimeout(() => {
                              const endTime2 = performance.now();
                              const timeWithoutGreedy = endTime2 - startTime2;
                              
                              console.log('🧪 Performance comparison:');
                              console.log(`  With greedy meshing: ${timeWithGreedy.toFixed(2)}ms`);
                              console.log(`  Without greedy meshing: ${timeWithoutGreedy.toFixed(2)}ms`);
                              console.log(`  Performance improvement: ${((timeWithoutGreedy - timeWithGreedy) / timeWithoutGreedy * 100).toFixed(1)}%`);
                              
                              // Re-enable greedy meshing
                              setRenderOptions(prev => ({ ...prev, enableGreedyMeshing: true }));
                            }, 100);
                          }, 100);
                        }
                      }} className="tool-btn">
                        🧪 Test Greedy Meshing Performance
                      </button>
                    </div>
                  )}
                </div>
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
              <div className="info-section">
                <h4>📊 Statistics</h4>
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
              
              <div className="info-section">
                <h4>🎮 Interface Options</h4>
                <div className="interface-options">
                  <div className="option-item">
                    <div className="option-header">
                      <span className="option-icon">🖱️</span>
                      <span className="option-title">Camera Instructions</span>
                    </div>
                    <div className="option-description">
                      Display camera control hints on screen
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={renderOptions.showCameraInstructions} 
                        onChange={(e) => handleRenderOptionChange('showCameraInstructions', e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="option-item">
                    <div className="option-header">
                      <span className="option-icon">ℹ️</span>
                      <span className="option-title">Hover Information</span>
                    </div>
                    <div className="option-description">
                      Show tile details when hovering over the world
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={renderOptions.showHoverInfo} 
                        onChange={(e) => handleRenderOptionChange('showHoverInfo', e.target.checked)} 
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
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
        className={`simulation-canvas ${isDragging ? 'dragging' : ''}`}
      />
        

        
        {/* Camera Instructions */}
        {renderOptions.showCameraInstructions && (
          <div className="camera-instructions">
            <p>🖱️ <strong>Drag</strong> to pan • 🖱️ <strong>Scroll</strong> to zoom • 🖱️ <strong>Click</strong> to select</p>
            <p style={{fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8}}>
              Camera: ({Math.round(camera.x)}, {Math.round(camera.y)}) tiles • Zoom: {camera.zoom.toFixed(2)}x • 
              World: {config.width}×{config.height} tiles • View: Full World
            </p>
          </div>
        )}
        
        {/* Hover Information */}
        {renderOptions.showHoverInfo && hoverInfo && (
          <div 
            className="hover-info"
            style={{
              position: 'absolute',
              left: hoverInfo.x + 10,
              top: hoverInfo.y - 10,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              pointerEvents: 'none',
              zIndex: 1000,
              maxWidth: '200px'
            }}
          >
            <div><strong>Tile:</strong> ({hoverInfo.position.x}, {hoverInfo.position.y})</div>
            <div><strong>Biome:</strong> {hoverInfo.biome}</div>
            <div><strong>Elevation:</strong> {hoverInfo.tile.elevation?.toFixed(2) || 'N/A'}</div>
            <div><strong>Temperature:</strong> {hoverInfo.tile.temperature ? Math.round(hoverInfo.tile.temperature * 100) + '°' : 'N/A'}</div>
            <div><strong>Humidity:</strong> {hoverInfo.tile.humidity ? Math.round(hoverInfo.tile.humidity * 100) + '%' : 'N/A'}</div>
            <div><strong>Fertility:</strong> {hoverInfo.tile.fertility ? Math.round(hoverInfo.tile.fertility * 100) + '%' : 'N/A'}</div>
            {hoverInfo.tile.resources && hoverInfo.tile.resources.length > 0 && (
              <div><strong>Resources:</strong> {hoverInfo.tile.resources.map((r: any) => r.type).join(', ')}</div>
            )}
          </div>
        )}
        

        
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
            viewportSize={(() => {
              const viewportInfo = calculateViewportInfo();
              return viewportInfo.viewportSize;
            })()}
            onMinimapClick={(x, y) => {
              // x and y are already in tile coordinates from minimap
              const worldX = x;
              const worldY = y;
              
              // Ensure camera stays within world bounds (in tiles)
              const worldWidth = config.width; // World width in tiles
              const worldHeight = config.height; // World height in tiles
              const clampedX = Math.max(0, Math.min(worldWidth, worldX));
              const clampedY = Math.max(0, Math.min(worldHeight, worldY));
              
              setCamera({
                x: clampedX,
                y: clampedY,
                zoom: 1.0
              });
              console.log('🎯 Camera moved to:', { x: clampedX, y: clampedY });
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
  viewportConfig: { viewportTilesX: number; viewportTilesY: number };
  setViewportConfig: React.Dispatch<React.SetStateAction<{ viewportTilesX: number; viewportTilesY: number }>>;
  onStart: () => void;
}

const DwarfFortressConfigPanel: React.FC<DwarfFortressConfigPanelProps> = ({ config, setConfig, viewportConfig, setViewportConfig, onStart }) => {
  const handleConfigChange = (key: keyof DwarfFortressConfig, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="game-config-overlay">
      <div className="game-config-panel">
        <h2>🏔️ World Configuration</h2>
        
        <div className="config-section">
          <h3>World Settings</h3>
          <div className="config-group">
            <label>World Width: {config.width}</label>
            <input 
              type="range" 
              value={config.width}
              onChange={(e) => handleConfigChange('width', parseInt(e.target.value))}
              min="800" max="2400" step="200"
            />
          </div>
          <div className="config-group">
            <label>World Height: {config.height}</label>
            <input 
              type="range" 
              value={config.height}
              onChange={(e) => handleConfigChange('height', parseInt(e.target.value))}
              min="600" max="1800" step="200"
            />
          </div>
          <div className="config-group">
            <label>Viewport Width: {viewportConfig.viewportTilesX} tiles</label>
            <input 
              type="range" 
              value={viewportConfig.viewportTilesX}
              onChange={(e) => setViewportConfig(prev => ({ ...prev, viewportTilesX: parseInt(e.target.value) }))}
              min="50" max="200" step="25"
            />
          </div>
          <div className="config-group">
            <label>Viewport Height: {viewportConfig.viewportTilesY} tiles</label>
            <input 
              type="range" 
              value={viewportConfig.viewportTilesY}
              onChange={(e) => setViewportConfig(prev => ({ ...prev, viewportTilesY: parseInt(e.target.value) }))}
              min="40" max="150" step="25"
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
            🚀 Start Simulation
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