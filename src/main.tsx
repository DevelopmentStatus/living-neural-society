import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SimulationProvider } from './contexts/SimulationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/main.css';

// Performance monitoring
const startTime = performance.now();

// Initialize TensorFlow.js
async function initializeTensorFlow() {
  try {
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    console.log('TensorFlow.js initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize TensorFlow.js:', error);
    return false;
  }
}

// Initialize core systems
async function initializeCoreSystems() {
  console.log('Initializing core systems...');
  
  // Initialize TensorFlow.js
  const tfReady = await initializeTensorFlow();
  
  // Initialize other core systems
  try {
    // Initialize IndexedDB for data persistence
    if ('indexedDB' in window) {
      console.log('IndexedDB available for data persistence');
    }
    
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      console.log('WebGL supported for 3D rendering');
    } else {
      console.warn('WebGL not supported, falling back to 2D rendering');
    }
    
    // Check Web Workers support
    if (typeof Worker !== 'undefined') {
      console.log('Web Workers supported for parallel processing');
    } else {
      console.warn('Web Workers not supported, using main thread');
    }
    
    return {
      tfReady,
      indexedDB: 'indexedDB' in window,
      webgl: !!gl,
      webWorkers: typeof Worker !== 'undefined'
    };
  } catch (error) {
    console.error('Error initializing core systems:', error);
    return {
      tfReady: false,
      indexedDB: false,
      webgl: false,
      webWorkers: false
    };
  }
}

// Main initialization function
async function initializeApp() {
  try {
    console.log('🚀 Starting Living Neural Society Simulation...');
    
    // Initialize core systems
    const systems = await initializeCoreSystems();
    
    // Create root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    // Create React root
    const root = ReactDOM.createRoot(rootElement);
    
    // Render application
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <SimulationProvider systems={systems}>
              <App />
            </SimulationProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    // Calculate and log initialization time
    const initTime = performance.now() - startTime;
    console.log(`✅ Application initialized in ${initTime.toFixed(2)}ms`);
    
    // Dispatch app ready event
    window.dispatchEvent(new CustomEvent('app-ready'));
    
    // Log system capabilities
    console.log('📊 System Capabilities:', {
      tensorFlow: systems.tfReady,
      dataPersistence: systems.indexedDB,
      graphics3D: systems.webgl,
      parallelProcessing: systems.webWorkers,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cores: navigator.hardwareConcurrency || 'unknown'
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    
    // Show error message to user
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          color: white;
          font-family: 'Inter', sans-serif;
          text-align: center;
          padding: 2rem;
        ">
          <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #ff6b6b;">
            🚨 Initialization Error
          </h1>
          <p style="font-size: 1.1rem; margin-bottom: 2rem; color: #a0a0a0;">
            Failed to start the Living Neural Society Simulation.
          </p>
          <div style="
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid #ff6b6b;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 2rem;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            text-align: left;
            max-width: 600px;
            overflow-x: auto;
          ">
            ${error instanceof Error ? error.message : String(error)}
          </div>
          <button onclick="window.location.reload()" style="
            background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s ease;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🔄 Retry
          </button>
        </div>
      `;
    }
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for potential external use
export { initializeApp }; 