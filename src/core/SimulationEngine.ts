import { EventEmitter } from 'events';
import { AgentManager } from './agents/AgentManager';
import { WorldManager } from './world/WorldManager';
import { SocialManager } from './social/SocialManager';
import { SimulationState } from '../types/simulation';

export class SimulationEngine extends EventEmitter {
  private agentManager: AgentManager;
  private worldManager: WorldManager;
  private socialManager: SocialManager;
  private state: SimulationState;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private tickInterval: number = 100; // milliseconds per tick
  private tickId: number | null = null;
  private currentTick: number = 0;
  private speed: number = 1.0;

  constructor() {
    super();
    this.state = {
      currentTick: 0,
      totalAgents: 0,
      totalFactions: 0,
      worldSize: { width: 1000, height: 1000 },
      settings: {
        timeScale: 1.0,
        maxAgents: 1000,
        maxFactions: 10,
        difficulty: 0.5,
        realism: 0.7,
        chaos: 0.3,
      },
    };

    // Initialize managers
    this.agentManager = new AgentManager(this.state);
    this.worldManager = new WorldManager(this.state);
    this.socialManager = new SocialManager(this.state);

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Agent events
    this.agentManager.on('agent:created', (agent) => {
      this.emit('simulation:agentCreated', agent);
    });

    this.agentManager.on('agent:destroyed', (agentId) => {
      this.emit('simulation:agentDestroyed', agentId);
    });

    // World events
    this.worldManager.on('world:updated', (worldData) => {
      this.emit('simulation:worldUpdated', worldData);
    });

    // Social events
    this.socialManager.on('social:relationshipChanged', (data) => {
      this.emit('simulation:relationshipChanged', data);
    });

    this.socialManager.on('social:factionFormed', (faction) => {
      this.emit('simulation:factionFormed', faction);
    });
  }

  public start(): void {
    if (this.isRunning) return;

    console.log('🚀 Starting Living Neural Society Simulation...');
    this.isRunning = true;
    this.isPaused = false;
    this.emit('simulation:started');

    // Initialize systems
    this.initializeSystems();

    // Start the main simulation loop
    this.startSimulationLoop();
  }

  public pause(): void {
    if (!this.isRunning || this.isPaused) return;

    console.log('⏸️ Pausing simulation...');
    this.isPaused = true;
    this.emit('simulation:paused');
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;

    console.log('▶️ Resuming simulation...');
    this.isPaused = false;
    this.emit('simulation:resumed');
  }

  public stop(): void {
    if (!this.isRunning) return;

    console.log('⏹️ Stopping simulation...');
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.tickId) {
      clearInterval(this.tickId);
      this.tickId = null;
    }

    this.emit('simulation:stopped');
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(10.0, speed));
    this.tickInterval = Math.round(100 / this.speed);
    
    if (this.isRunning && !this.isPaused) {
      this.restartSimulationLoop();
    }
  }

  private initializeSystems(): void {
    console.log('🔧 Initializing simulation systems...');
    
    // Initialize world
    this.worldManager.initialize();
    
    // Initialize social systems
    this.socialManager.initialize();
    
    // Initialize agents
    this.agentManager.initialize();
    
    console.log('✅ All systems initialized');
  }

  private startSimulationLoop(): void {
    this.tickId = window.setInterval(() => {
      if (!this.isPaused) {
        this.processTick();
      }
    }, this.tickInterval);
  }

  private restartSimulationLoop(): void {
    if (this.tickId) {
      clearInterval(this.tickId);
    }
    this.startSimulationLoop();
  }

  private processTick(): void {
    const startTime = performance.now();

    try {
      // Update world
      this.worldManager.update(this.currentTick);
      
      // Update social systems
      this.socialManager.update(this.currentTick);
      
      // Update agents
      this.agentManager.update(this.currentTick);
      
      // Update simulation state
      this.updateSimulationState();
      
      // Emit tick event
      this.emit('simulation:tick', {
        tick: this.currentTick,
        agents: this.state.totalAgents,
        factions: this.state.totalFactions,
        performance: performance.now() - startTime,
      });

      this.currentTick++;
      
    } catch (error) {
      console.error('❌ Error in simulation tick:', error);
      this.emit('simulation:error', error);
    }
  }

  private updateSimulationState(): void {
    this.state.currentTick = this.currentTick;
    this.state.totalAgents = this.agentManager.getAgentCount();
    this.state.totalFactions = this.socialManager.getFactionCount();
  }

  public getState(): SimulationState {
    return { ...this.state };
  }

  public getStatistics(): any {
    return {
      currentTick: this.currentTick,
      totalAgents: this.state.totalAgents,
      totalFactions: this.state.totalFactions,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      speed: this.speed,
      agentStats: this.agentManager.getStatistics(),
      worldStats: this.worldManager.getStatistics(),
      socialStats: this.socialManager.getStatistics(),
    };
  }

  public updateSettings(settings: Partial<SimulationState['settings']>): void {
    this.state.settings = { ...this.state.settings, ...settings };
    this.emit('simulation:settingsUpdated', this.state.settings);
  }

  public getWorldData(): any {
    // Return the world tiles 2D array from the worldManager
    // If not implemented, return an empty array
    if (typeof (this.worldManager as any).getWorldTiles === 'function') {
      return (this.worldManager as any).getWorldTiles();
    }
    return [];
  }

  public getAgentData(): any[] {
    // Return all agents from the agentManager
    if (typeof (this.agentManager as any).getAgents === 'function') {
      return (this.agentManager as any).getAgents();
    }
    return [];
  }

  public getStructureData(): any[] {
    // Return all structures from the worldManager
    if (typeof (this.worldManager as any).getStructures === 'function') {
      return (this.worldManager as any).getStructures();
    }
    return [];
  }

  public getWorldManager(): WorldManager {
    return this.worldManager;
  }
} 