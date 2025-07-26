import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SimulationView } from './components/SimulationView';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Documentation } from './components/Documentation';
import { Navigation } from './components/Navigation';
import { useSimulation } from './contexts/SimulationContext';
import './styles/App.css';

const App: React.FC = () => {
  const { systems } = useSimulation();

  return (
    <div className="app">
      <Navigation />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<SimulationView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/docs" element={<Documentation />} />
        </Routes>
      </main>
      
      {/* System Status Indicator */}
      <div className="system-status">
        <div className="status-item">
          <span className={`status-dot ${systems.tfReady ? 'online' : 'offline'}`}></span>
          TensorFlow
        </div>
        <div className="status-item">
          <span className={`status-dot ${systems.webgl ? 'online' : 'offline'}`}></span>
          WebGL
        </div>
        <div className="status-item">
          <span className={`status-dot ${systems.webWorkers ? 'online' : 'offline'}`}></span>
          Workers
        </div>
      </div>
    </div>
  );
};

export default App; 