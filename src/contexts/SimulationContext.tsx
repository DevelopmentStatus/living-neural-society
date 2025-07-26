import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// System capabilities interface
export interface SystemCapabilities {
  tfReady: boolean;
  indexedDB: boolean;
  webgl: boolean;
  webWorkers: boolean;
}

// Simulation state interface
export interface SimulationState {
  systems: SystemCapabilities;
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  currentTick: number;
  totalAgents: number;
  totalFactions: number;
  worldSize: { width: number; height: number };
  settings: {
    timeScale: number;
    maxAgents: number;
    maxFactions: number;
    difficulty: number;
    realism: number;
    chaos: number;
  };
}

// Action types
type SimulationAction =
  | { type: 'SET_SYSTEMS'; payload: SystemCapabilities }
  | { type: 'START_SIMULATION' }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'STOP_SIMULATION' }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'UPDATE_TICK'; payload: number }
  | { type: 'UPDATE_STATISTICS'; payload: Partial<SimulationState> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<SimulationState['settings']> };

// Initial state
const initialState: SimulationState = {
  systems: {
    tfReady: false,
    indexedDB: false,
    webgl: false,
    webWorkers: false,
  },
  isRunning: false,
  isPaused: false,
  speed: 1,
  currentTick: 0,
  totalAgents: 0,
  totalFactions: 0,
  worldSize: { width: 1000, height: 1000 },
  settings: {
    timeScale: 1,
    maxAgents: 1000,
    maxFactions: 10,
    difficulty: 0.5,
    realism: 0.7,
    chaos: 0.3,
  },
};

// Reducer function
function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'SET_SYSTEMS':
      return {
        ...state,
        systems: action.payload,
      };
    case 'START_SIMULATION':
      return {
        ...state,
        isRunning: true,
        isPaused: false,
      };
    case 'PAUSE_SIMULATION':
      return {
        ...state,
        isPaused: true,
      };
    case 'STOP_SIMULATION':
      return {
        ...state,
        isRunning: false,
        isPaused: false,
      };
    case 'SET_SPEED':
      return {
        ...state,
        speed: action.payload,
      };
    case 'UPDATE_TICK':
      return {
        ...state,
        currentTick: action.payload,
      };
    case 'UPDATE_STATISTICS':
      return {
        ...state,
        ...action.payload,
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

// Context interface
interface SimulationContextType {
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
  systems: SystemCapabilities;
  startSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  setSpeed: (speed: number) => void;
  updateSettings: (settings: Partial<SimulationState['settings']>) => void;
}

// Create context
const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

// Provider component
interface SimulationProviderProps {
  children: ReactNode;
  systems: SystemCapabilities;
}

export const SimulationProvider: React.FC<SimulationProviderProps> = ({ children, systems }) => {
  const [state, dispatch] = useReducer(simulationReducer, {
    ...initialState,
    systems,
  });

  // Action creators
  const startSimulation = () => {
    dispatch({ type: 'START_SIMULATION' });
  };

  const pauseSimulation = () => {
    dispatch({ type: 'PAUSE_SIMULATION' });
  };

  const stopSimulation = () => {
    dispatch({ type: 'STOP_SIMULATION' });
  };

  const setSpeed = (speed: number) => {
    dispatch({ type: 'SET_SPEED', payload: speed });
  };

  const updateSettings = (settings: Partial<SimulationState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const value: SimulationContextType = {
    state,
    dispatch,
    systems: state.systems,
    startSimulation,
    pauseSimulation,
    stopSimulation,
    setSpeed,
    updateSettings,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

// Hook to use simulation context
export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}; 