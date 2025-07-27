import { SimulationProvider } from './contexts/SimulationContext';
import { SimulationView } from './components/SimulationView';
import { Dashboard } from './components/Dashboard';
import { Navigation } from './components/Navigation';
import './styles/App.css';

function App() {
  return (
    <SimulationProvider>
      <div className="App">
        <Navigation />
        <main className="main-content">
          <SimulationView />
          <Dashboard />
        </main>
      </div>
    </SimulationProvider>
  );
}

export default App; 