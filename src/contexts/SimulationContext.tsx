import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SimulationEngine } from '../core/SimulationEngine';
import { SimulationState, SimulationStatistics } from '../types/simulation';

interface SimulationContextType {
  engine: SimulationEngine | null;
  state: SimulationState | null;
  statistics: SimulationStatistics | null;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  updateSettings: (settings: Partial<SimulationState['settings']>) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};

interface SimulationProviderProps {
  children: React.ReactNode;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children }) => {
  const [engine, setEngine] = useState<SimulationEngine | null>(null);
  const [state, setState] = useState<SimulationState | null>(null);
  const [statistics, setStatistics] = useState<SimulationStatistics | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Initialize simulation engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        console.log('🚀 Initializing Living Neural Society Simulation...');
        
        const simulationEngine = new SimulationEngine();
        
        // Set up event listeners
        simulationEngine.on('simulation:started', () => {
          console.log('✅ Simulation started');
          setIsRunning(true);
          setIsPaused(false);
        });

        simulationEngine.on('simulation:paused', () => {
          console.log('⏸️ Simulation paused');
          setIsPaused(true);
        });

        simulationEngine.on('simulation:resumed', () => {
          console.log('▶️ Simulation resumed');
          setIsPaused(false);
        });

        simulationEngine.on('simulation:stopped', () => {
          console.log('⏹️ Simulation stopped');
          setIsRunning(false);
          setIsPaused(false);
        });

        simulationEngine.on('simulation:tick', (tickData) => {
          // Update state and statistics on each tick
          setState(simulationEngine.getState());
          setStatistics(simulationEngine.getStatistics());
        });

        simulationEngine.on('simulation:agentCreated', (agent) => {
          console.log(`🤖 Agent created: ${agent.name}`);
        });

        simulationEngine.on('simulation:agentDestroyed', (agentId) => {
          console.log(`💀 Agent destroyed: ${agentId}`);
        });

        simulationEngine.on('simulation:factionFormed', (faction) => {
          console.log(`👥 Faction formed: ${faction.name}`);
        });

        simulationEngine.on('simulation:error', (error) => {
          console.error('❌ Simulation error:', error);
        });

        setEngine(simulationEngine);
        setState(simulationEngine.getState());
        setStatistics(simulationEngine.getStatistics());
        
        console.log('✅ Simulation engine initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize simulation engine:', error);
      }
    };

    initEngine();

    // Cleanup on unmount
    return () => {
      if (engine) {
        engine.stop();
        engine.removeAllListeners();
      }
    };
  }, []);

  const start = useCallback(() => {
    if (engine && !isRunning) {
      engine.start();
    }
  }, [engine, isRunning]);

  const pause = useCallback(() => {
    if (engine && isRunning && !isPaused) {
      engine.pause();
    }
  }, [engine, isRunning, isPaused]);

  const resume = useCallback(() => {
    if (engine && isRunning && isPaused) {
      engine.resume();
    }
  }, [engine, isRunning, isPaused]);

  const stop = useCallback(() => {
    if (engine && isRunning) {
      engine.stop();
    }
  }, [engine, isRunning]);

  const setSpeed = useCallback((speed: number) => {
    if (engine) {
      engine.setSpeed(speed);
    }
  }, [engine]);

  const updateSettings = useCallback((settings: Partial<SimulationState['settings']>) => {
    if (engine) {
      engine.updateSettings(settings);
    }
  }, [engine]);

  const contextValue: SimulationContextType = {
    engine,
    state,
    statistics,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    setSpeed,
    updateSettings,
  };

  return (
    <SimulationContext.Provider value={contextValue}>
      {children}
    </SimulationContext.Provider>
  );
}; 