import React, { useRef, useEffect, useState } from 'react';
import { useSimulation } from '../contexts/SimulationContext';
import { EnhancedWorldRenderer } from '../core/world/EnhancedWorldRenderer';
import { MultiScaleConfig } from '../core/world/MultiScaleWorldManager';
import { FMGWorldGenerator } from '../core/world/FMGWorldGenerator';
import './SimulationView.css';

export interface SelectedEntity {
  type: 'agent' | 'city' | 'region' | 'structure' | 'resource';
  id: string;
  data: any;
  position: { x: number; y: number };
}

export const SimulationView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRendererRef = useRef<EnhancedWorldRenderer | null>(null);
  const cameraCenteredRef = useRef(false); // <-- add this line
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
  
  // LIFTED CONFIG STATE
  const [config, setConfig] = useState({
    worldSize: { width: 1000, height: 1000 },
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
  });
  const [speed, setSpeedState] = useState(1.0); // Restore speed state

  // Initialize world renderer (only on mount or when config changes)
  useEffect(() => {
    if (showConfig) return; // Don't create renderer until simulation starts
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to full viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 60; // Account for top bar
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate world using FMG algorithms
    console.log('🎮 Starting FMG world generation...');
    const fmgGenerator = new FMGWorldGenerator(
      config.worldSize.width,
      config.worldSize.height,
      10000, // cell count
      Math.floor(Math.random() * 1000000), // random seed
      config // Pass the full configuration
    );
    
    const worldData = fmgGenerator.generate();
    
    // Use config from state for renderer
    const rendererConfig: MultiScaleConfig = {
      worldZoom: 0.1,
      regionZoom: 0.5,
      townZoom: 2,
      cityZoom: 5,
      worldSize: config.worldSize,
      tileSize: 10,
      biomeComplexity: config.realism,
      continentCount: config.continentCount,
      mountainRanges: config.mountainRanges,
      riverCount: config.riverCount,
      townDensity: 0.2,
      maxTownSize: 100,
      roadDensity: config.roadDensity,
    };
    
    // Create renderer with FMG world data
    worldRendererRef.current = new EnhancedWorldRenderer(canvas, rendererConfig, worldData);
    
    // Store world data for simulation engine to use
    console.log('✅ FMG world data generated:', worldData);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (worldRendererRef.current) {
        worldRendererRef.current = null;
      }
    };
  }, [showConfig, config]);

  // Center camera ONCE when state becomes available
  useEffect(() => {
    if (
      !cameraCenteredRef.current &&
      state &&
      worldRendererRef.current
    ) {
      worldRendererRef.current.setCamera(
        state.worldSize.width / 2,
        state.worldSize.height / 2,
        1
      );
      cameraCenteredRef.current = true;
    }
  }, [state]);

  // Canvas rendering
  useEffect(() => {
    const renderer = worldRendererRef.current;
    if (!renderer) return;
    // Map renderOptions from UI to EnhancedWorldRenderer's RenderOptions
    renderer.setRenderOptions({
      showPoliticalRegions: renderOptions.showPoliticalRegions,
      showCities: renderOptions.showCities,
      showRivers: renderOptions.showRivers,
      showLakes: renderOptions.showLakes,
      showRoads: renderOptions.showRoads,
      // The rest use EnhancedWorldRenderer defaults
    });
  }, [renderOptions]);

  // Continuous rendering loop for smooth camera controls
  useEffect(() => {
    const renderer = worldRendererRef.current;
    if (!renderer) return;
    let animationId: number;
    const renderLoop = () => {
      renderer.render();
      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [state]);

  // Handle canvas click events for entity selection (with delay to avoid conflicts)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let clickTimeout: NodeJS.Timeout;

    const handleCanvasClick = (e: MouseEvent) => {
      // Add a small delay to avoid conflicts with drag events
      clickTimeout = setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const renderer = worldRendererRef.current;
        if (!renderer) return;
        
        const camera = renderer.getCamera();
        const worldX = (x - canvas.width / 2) / camera.zoom + camera.x;
        const worldY = (y - canvas.height / 2) / camera.zoom + camera.y;
        
        // Find entity at click position
        const entity = findEntityAtPosition(worldX, worldY);
        setSelectedEntity(entity);
      }, 150); // 150ms delay to distinguish from drag
    };

    const handleMouseDown = () => {
      // Clear any pending click timeout when mouse down occurs
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
  }, []);

  const findEntityAtPosition = (x: number, y: number): SelectedEntity | null => {
    const worldManager = engine?.getWorldManager?.();
    if (!worldManager) return null;

    // Check cities
    const cities = worldManager.getCities();
    for (const city of cities) {
      const distance = Math.sqrt((x - city.x) ** 2 + (y - city.y) ** 2);
      if (distance < 50) {
        return {
          type: 'city',
          id: city.name,
          data: city,
          position: { x: city.x, y: city.y }
        };
      }
    }

    // Check political regions
    const regions = worldManager.getPoliticalRegions();
    for (const region of regions) {
      for (const territory of region.territory) {
        if (x >= territory.x && x <= territory.x + territory.width &&
            y >= territory.y && y <= territory.y + territory.height) {
          return {
            type: 'region',
            id: region.name,
            data: region,
            position: { x: territory.x + territory.width / 2, y: territory.y + territory.height / 2 }
          };
        }
      }
    }

    // Check agents
    const agents = engine?.getAgentData() || [];
    for (const agent of agents) {
      const distance = Math.sqrt((x - agent.position.x) ** 2 + (y - agent.position.y) ** 2);
      if (distance < 10) {
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

  const handleRenderOptionChange = (option: string, value: boolean) => {
    setRenderOptions(prev => ({
      ...prev,
      [option]: value,
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

  const handleStartSimulation = () => {
    setShowConfig(false);
    
    // Update simulation settings with config
    if (engine) {
      engine.updateSettings({
        timeScale: config.timeScale,
        maxAgents: config.maxAgents,
        maxFactions: config.maxFactions,
        difficulty: config.difficulty,
        realism: config.realism,
        chaos: config.chaos,
      });
    }
    
    // Renderer will be created with config by useEffect above
    start();
  };

  if (showConfig) {
    return <GameConfigPanel config={config} setConfig={setConfig} onStart={handleStartSimulation} />;
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
                <label><input type="checkbox" checked={renderOptions.showGrid} onChange={(e) => handleRenderOptionChange('showGrid', e.target.checked)} /> Grid</label>
                <label><input type="checkbox" checked={renderOptions.showAgents} onChange={(e) => handleRenderOptionChange('showAgents', e.target.checked)} /> Agents</label>
                <label><input type="checkbox" checked={renderOptions.showStructures} onChange={(e) => handleRenderOptionChange('showStructures', e.target.checked)} /> Structures</label>
                <label><input type="checkbox" checked={renderOptions.showResources} onChange={(e) => handleRenderOptionChange('showResources', e.target.checked)} /> Resources</label>
                <label><input type="checkbox" checked={renderOptions.showPoliticalRegions} onChange={(e) => handleRenderOptionChange('showPoliticalRegions', e.target.checked)} /> Regions</label>
                <label><input type="checkbox" checked={renderOptions.showCities} onChange={(e) => handleRenderOptionChange('showCities', e.target.checked)} /> Cities</label>
                <label><input type="checkbox" checked={renderOptions.showRivers} onChange={(e) => handleRenderOptionChange('showRivers', e.target.checked)} /> Rivers</label>
                <label><input type="checkbox" checked={renderOptions.showLakes} onChange={(e) => handleRenderOptionChange('showLakes', e.target.checked)} /> Lakes</label>
                <label><input type="checkbox" checked={renderOptions.showRoads} onChange={(e) => handleRenderOptionChange('showRoads', e.target.checked)} /> Roads</label>
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
                🔧 Game Configuration
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
        
        {!state && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Initializing simulation...</p>
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

// Game Configuration Panel Component
interface GameConfigPanelProps {
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  onStart: () => void;
}

const GameConfigPanel: React.FC<GameConfigPanelProps> = ({ config, setConfig, onStart }) => {
  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNestedConfigChange = (parentKey: string, childKey: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [parentKey]: {
        ...(prev[parentKey as keyof typeof prev] as any || {}),
        [childKey]: value,
      },
    }));
  };

  return (
    <div className="game-config-overlay">
      <div className="game-config-panel">
        <h2>🎮 RimWorld-Style Configuration</h2>
        
        <div className="config-section">
          <h3>World Settings</h3>
          <div className="config-group">
            <label>World Width:</label>
            <input 
              type="number" 
              value={config.worldSize.width}
              onChange={(e) => handleNestedConfigChange('worldSize', 'width', parseInt(e.target.value))}
              min="500" max="2000" step="100"
            />
          </div>
          <div className="config-group">
            <label>World Height:</label>
            <input 
              type="number" 
              value={config.worldSize.height}
              onChange={(e) => handleNestedConfigChange('worldSize', 'height', parseInt(e.target.value))}
              min="500" max="2000" step="100"
            />
          </div>
          <div className="config-group">
            <label>Continent Count: {config.continentCount}</label>
            <input 
              type="range" 
              value={config.continentCount}
              onChange={(e) => handleConfigChange('continentCount', parseInt(e.target.value))}
              min="1" max="8" step="1"
            />
          </div>
          <div className="config-group">
            <label>Mountain Ranges: {config.mountainRanges}</label>
            <input 
              type="range" 
              value={config.mountainRanges}
              onChange={(e) => handleConfigChange('mountainRanges', parseInt(e.target.value))}
              min="1" max="10" step="1"
            />
          </div>
        </div>

        <div className="config-section">
          <h3>Climate Settings</h3>
          <div className="config-group">
            <label>Temperature Range: {config.temperatureRange.min.toFixed(1)} - {config.temperatureRange.max.toFixed(1)}</label>
            <div className="range-inputs">
              <input 
                type="range" 
                value={config.temperatureRange.min}
                onChange={(e) => handleNestedConfigChange('temperatureRange', 'min', parseFloat(e.target.value))}
                min="0" max="1" step="0.1"
              />
              <input 
                type="range" 
                value={config.temperatureRange.max}
                onChange={(e) => handleNestedConfigChange('temperatureRange', 'max', parseFloat(e.target.value))}
                min="0" max="1" step="0.1"
              />
            </div>
          </div>
          <div className="config-group">
            <label>Rainfall Range: {config.rainfallRange.min.toFixed(1)} - {config.rainfallRange.max.toFixed(1)}</label>
            <div className="range-inputs">
              <input 
                type="range" 
                value={config.rainfallRange.min}
                onChange={(e) => handleNestedConfigChange('rainfallRange', 'min', parseFloat(e.target.value))}
                min="0" max="1" step="0.1"
              />
              <input 
                type="range" 
                value={config.rainfallRange.max}
                onChange={(e) => handleNestedConfigChange('rainfallRange', 'max', parseFloat(e.target.value))}
                min="0" max="1" step="0.1"
              />
            </div>
          </div>
          <div className="config-group">
            <label>Growing Season: {config.growingSeason.start} - {config.growingSeason.end} days</label>
            <div className="range-inputs">
              <input 
                type="range" 
                value={config.growingSeason.start}
                onChange={(e) => handleNestedConfigChange('growingSeason', 'start', parseInt(e.target.value))}
                min="0" max="365" step="10"
              />
              <input 
                type="range" 
                value={config.growingSeason.end}
                onChange={(e) => handleNestedConfigChange('growingSeason', 'end', parseInt(e.target.value))}
                min="0" max="365" step="10"
              />
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>Simulation Settings</h3>
          <div className="config-group">
            <label>Max Agents: {config.maxAgents}</label>
            <input 
              type="range" 
              value={config.maxAgents}
              onChange={(e) => handleConfigChange('maxAgents', parseInt(e.target.value))}
              min="100" max="5000" step="100"
            />
          </div>
          <div className="config-group">
            <label>Max Factions: {config.maxFactions}</label>
            <input 
              type="range" 
              value={config.maxFactions}
              onChange={(e) => handleConfigChange('maxFactions', parseInt(e.target.value))}
              min="2" max="20" step="1"
            />
          </div>
          <div className="config-group">
            <label>Difficulty: {config.difficulty}</label>
            <input 
              type="range" 
              value={config.difficulty}
              onChange={(e) => handleConfigChange('difficulty', parseFloat(e.target.value))}
              min="0" max="1" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>Threat Level: {config.threatLevel}</label>
            <input 
              type="range" 
              value={config.threatLevel}
              onChange={(e) => handleConfigChange('threatLevel', parseFloat(e.target.value))}
              min="0" max="1" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>Realism: {config.realism}</label>
            <input 
              type="range" 
              value={config.realism}
              onChange={(e) => handleConfigChange('realism', parseFloat(e.target.value))}
              min="0" max="1" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>Chaos: {config.chaos}</label>
            <input 
              type="range" 
              value={config.chaos}
              onChange={(e) => handleConfigChange('chaos', parseFloat(e.target.value))}
              min="0" max="1" step="0.1"
            />
          </div>
        </div>

        <div className="config-section">
          <h3>Resource Settings</h3>
          <div className="config-group">
            <label>Resource Richness: {config.resourceRichness}</label>
            <input 
              type="range" 
              value={config.resourceRichness}
              onChange={(e) => handleConfigChange('resourceRichness', parseFloat(e.target.value))}
              min="0" max="1" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>Fertility Variation: {config.fertilityVariation}</label>
            <input 
              type="range" 
              value={config.fertilityVariation}
              onChange={(e) => handleConfigChange('fertilityVariation', parseFloat(e.target.value))}
              min="0" max="1" step="0.1"
            />
          </div>
          <div className="config-group">
            <label>River Count: {config.riverCount}</label>
            <input 
              type="range" 
              value={config.riverCount}
              onChange={(e) => handleConfigChange('riverCount', parseInt(e.target.value))}
              min="5" max="30" step="1"
            />
          </div>
          <div className="config-group">
            <label>Lake Count: {config.lakeCount}</label>
            <input 
              type="range" 
              value={config.lakeCount}
              onChange={(e) => handleConfigChange('lakeCount', parseInt(e.target.value))}
              min="3" max="15" step="1"
            />
          </div>
          <div className="config-group">
            <label>City Count: {config.cityCount}</label>
            <input 
              type="range" 
              value={config.cityCount}
              onChange={(e) => handleConfigChange('cityCount', parseInt(e.target.value))}
              min="10" max="50" step="1"
            />
          </div>
          <div className="config-group">
            <label>Road Density: {config.roadDensity}</label>
            <input 
              type="range" 
              value={config.roadDensity}
              onChange={(e) => handleConfigChange('roadDensity', parseFloat(e.target.value))}
              min="0" max="1" step="0.1"
            />
          </div>
        </div>

        <div className="config-actions">
          <button onClick={onStart} className="start-btn">
            🚀 Start RimWorld-Style Simulation
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

      case 'city':
        return (
          <div className="entity-details">
            <h3>🏙️ City: {entity.data.name}</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Size:</label>
                <span>{entity.data.size}</span>
              </div>
              <div className="detail-item">
                <label>Position:</label>
                <span>({Math.round(entity.data.x)}, {Math.round(entity.data.y)})</span>
              </div>
            </div>
          </div>
        );

      case 'region':
        return (
          <div className="entity-details">
            <h3>🗺️ Region: {entity.data.name}</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Population:</label>
                <span>{entity.data.population}</span>
              </div>
              <div className="detail-item">
                <label>Resources:</label>
                <span>{entity.data.resources.join(', ')}</span>
              </div>
              <div className="detail-item">
                <label>Color:</label>
                <span style={{ color: entity.data.color }}>■</span>
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