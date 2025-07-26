# Living Neural Society Simulation - Project Setup Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher) or **yarn** (v1.22.0 or higher)
- **Git** (v2.30.0 or higher)
- **Modern web browser** with WebGL support (Chrome 90+, Firefox 88+, Safari 14+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DevelopmentStatus/living-neural-society.git
   cd living-neural-society
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` to see the application running.

## 📁 Project Structure

```
living-neural-society/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   │   ├── SimulationView.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Settings.tsx
│   │   ├── Documentation.tsx
│   │   ├── Navigation.tsx
│   │   └── ErrorBoundary.tsx
│   ├── contexts/           # React contexts
│   │   └── SimulationContext.tsx
│   ├── core/               # Core simulation engine
│   │   ├── agents/         # Agent system
│   │   ├── world/          # World generation
│   │   ├── social/         # Social dynamics
│   │   ├── civilization/   # Civilization mechanics
│   │   ├── conflict/       # Conflict system
│   │   └── evolution/      # Evolution mechanics
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # Constants and configurations
│   ├── styles/             # CSS stylesheets
│   ├── App.tsx             # Main App component
│   └── main.tsx            # Application entry point
├── tests/                  # Test files
├── docs/                   # Documentation
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── jest.config.js          # Jest test configuration
└── README.md               # Project overview
```

## 🛠️ Development Commands

### Core Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
npm run lint:fix     # Fix linting issues
npm run format       # Format code with Prettier
npm run docs         # Generate documentation
npm run clean        # Clean build artifacts
npm run type-check   # TypeScript type checking
```

### Additional Commands
```bash
npm run analyze      # Analyze bundle size
npm run coverage     # Generate test coverage report
npm run storybook    # Start Storybook (if configured)
npm run e2e          # Run end-to-end tests
```

## 🧠 Technical Architecture

### Core Systems

#### 1. **AI Core Layer** (`src/core/agents/`)
- **Neural Networks**: TensorFlow.js-based decision making
- **Memory Systems**: LSTM/Transformer memory models
- **Reinforcement Learning**: Reward-based behavior adaptation
- **Emotional Models**: Fear, trust, happiness as decision weights

#### 2. **World Layer** (`src/core/world/`)
- **Biome Generation**: Procedural world creation
- **Resource Distribution**: Dynamic resource placement
- **Weather Systems**: Realistic climate simulation
- **Territory Management**: Strategic location handling

#### 3. **Social Layer** (`src/core/social/`)
- **Relationship Graph**: Dynamic social network
- **Communication Systems**: Symbolic to natural language
- **Faction Formation**: Tribe and alliance mechanics
- **Cultural Evolution**: Belief and tradition systems

#### 4. **Civilization Layer** (`src/core/civilization/`)
- **Government Systems**: Evolving political structures
- **Technology Trees**: Cultural and technological advancement
- **Infrastructure**: Building and development systems
- **Economic Models**: Resource and trade mechanics

#### 5. **Conflict Layer** (`src/core/conflict/`)
- **Combat Systems**: Emotion-influenced warfare
- **Diplomacy**: Inter-faction relations
- **Internal Strife**: Social tension mechanics
- **War and Peace**: Conflict resolution systems

#### 6. **Evolution Layer** (`src/core/evolution/`)
- **Genetic Inheritance**: Trait passing mechanisms
- **Cultural Memory**: Historical event tracking
- **Generational Change**: Long-term societal transformation
- **Achievement Systems**: Milestone tracking

### Technology Stack

#### Frontend
- **React 18**: UI framework with hooks and concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing

#### AI & Machine Learning
- **TensorFlow.js**: Neural network implementation
- **Brain.js**: Lightweight neural network alternative
- **Web Workers**: Parallel agent processing
- **WebAssembly**: Performance-critical computations

#### Visualization & Graphics
- **Three.js**: 3D world rendering
- **D3.js**: Data visualization
- **Canvas API**: 2D rendering
- **WebGL**: Hardware-accelerated graphics

#### Data Management
- **IndexedDB**: Local data persistence
- **Zustand**: State management
- **Immer**: Immutable state updates
- **Zod**: Data validation

#### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **TypeDoc**: Documentation generation

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Development
NODE_ENV=development
VITE_API_URL=http://localhost:3000
VITE_DEBUG_MODE=true

# Production
NODE_ENV=production
VITE_API_URL=https://api.living-neural-society.com
VITE_DEBUG_MODE=false

# AI Configuration
VITE_TENSORFLOW_BACKEND=webgl
VITE_NEURAL_NETWORK_LAYERS=64,32,16
VITE_LEARNING_RATE=0.001

# Simulation Settings
VITE_MAX_AGENTS=1000
VITE_MAX_FACTIONS=10
VITE_WORLD_SIZE=1000x1000
VITE_TIME_SCALE=1.0
```

### TypeScript Configuration
The project uses strict TypeScript configuration with:
- Strict type checking
- Path aliases for clean imports
- Modern ES2022 features
- React JSX support

### Vite Configuration
- React plugin for JSX support
- Path aliases for clean imports
- Optimized build with code splitting
- Development server with hot reload

## 🧪 Testing

### Test Structure
```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
├── fixtures/         # Test data
└── utils/            # Test utilities
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- SimulationView.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="agent"
```

### Test Guidelines
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies
- Use TypeScript for test files
- Maintain good test coverage (>80%)

## 📦 Build & Deployment

### Development Build
```bash
npm run build:dev
```

### Production Build
```bash
npm run build
```

### Build Optimization
- Code splitting by route and feature
- Tree shaking for unused code
- Minification and compression
- Source maps for debugging
- Asset optimization

### Deployment Options

#### Static Hosting (Netlify, Vercel, GitHub Pages)
```bash
npm run build
# Deploy dist/ folder
```

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 Debugging

### Development Tools
- **React DevTools**: Component inspection
- **Redux DevTools**: State management debugging
- **TensorFlow.js Inspector**: Neural network debugging
- **Performance Profiler**: Performance analysis

### Debug Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### Common Issues

#### TensorFlow.js Issues
- Ensure WebGL support is available
- Check for memory leaks in neural networks
- Monitor GPU memory usage

#### Performance Issues
- Use Web Workers for heavy computations
- Implement proper cleanup in useEffect
- Monitor bundle size and optimize imports

#### TypeScript Errors
- Ensure all dependencies have proper types
- Use strict type checking
- Avoid `any` types when possible

## 📚 Documentation

### Code Documentation
- Use JSDoc comments for functions and classes
- Document complex algorithms and data structures
- Include usage examples in comments

### API Documentation
- Document all public APIs
- Include parameter types and return values
- Provide usage examples

### Architecture Documentation
- Document system interactions
- Explain design decisions
- Include sequence diagrams for complex flows

## 🤝 Contributing

### Development Workflow
1. Create a feature branch from `main`
2. Make your changes with proper tests
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request

### Code Standards
- Follow ESLint and Prettier configurations
- Use TypeScript for all new code
- Write meaningful commit messages
- Include tests for new features

### Pull Request Guidelines
- Clear description of changes
- Include tests for new functionality
- Update documentation if needed
- Ensure CI/CD pipeline passes

## 🚀 Performance Optimization

### Bundle Optimization
- Code splitting by routes
- Lazy loading of components
- Tree shaking of unused code
- Asset compression and optimization

### Runtime Optimization
- Use Web Workers for heavy computations
- Implement proper memoization
- Optimize re-renders with React.memo
- Use efficient data structures

### Memory Management
- Proper cleanup in useEffect
- Avoid memory leaks in neural networks
- Monitor memory usage in development
- Implement garbage collection strategies

## 🔒 Security Considerations

### Frontend Security
- Validate all user inputs
- Sanitize data before rendering
- Use Content Security Policy
- Implement proper error handling

### Data Security
- Encrypt sensitive data in IndexedDB
- Validate data schemas
- Implement proper access controls
- Regular security audits

## 📈 Monitoring & Analytics

### Performance Monitoring
- Core Web Vitals tracking
- Custom performance metrics
- Error tracking and reporting
- User interaction analytics

### Application Metrics
- Agent behavior patterns
- Simulation performance metrics
- User engagement tracking
- System resource usage

## 🎯 Future Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [x] Project setup and configuration
- [x] Basic React application structure
- [x] TypeScript type definitions
- [ ] Core simulation engine
- [ ] Basic agent system

### Phase 2: Agent Intelligence (Weeks 5-8)
- [ ] Neural network implementation
- [ ] Memory and learning systems
- [ ] Emotional state management
- [ ] Decision-making algorithms

### Phase 3: Social Systems (Weeks 9-12)
- [ ] Relationship graph implementation
- [ ] Communication protocols
- [ ] Faction formation mechanics
- [ ] Social event processing

### Phase 4: World & Environment (Weeks 13-16)
- [ ] Biome generation and management
- [ ] Resource distribution systems
- [ ] Territory and pathfinding
- [ ] Environmental effects

### Phase 5: Civilization Mechanics (Weeks 17-20)
- [ ] Government systems
- [ ] Technology trees
- [ ] Building and infrastructure
- [ ] Economic systems

### Phase 6: Conflict & Diplomacy (Weeks 21-24)
- [ ] Combat mechanics
- [ ] Diplomatic relations
- [ ] War and peace systems
- [ ] Internal conflict resolution

### Phase 7: Evolution & Generations (Weeks 25-28)
- [ ] Genetic inheritance
- [ ] Cultural memory systems
- [ ] Generational progression
- [ ] Historical event tracking

### Phase 8: Polish & Optimization (Weeks 29-32)
- [ ] Performance optimization
- [ ] UI/UX refinement
- [ ] Documentation completion
- [ ] Testing and bug fixes

## 📞 Support

### Getting Help
- Check the documentation first
- Search existing issues on GitHub
- Create a new issue with detailed information
- Join the community Discord/forum

### Reporting Bugs
- Include steps to reproduce
- Provide error messages and stack traces
- Include browser and OS information
- Attach relevant log files

### Feature Requests
- Describe the feature clearly
- Explain the use case and benefits
- Consider implementation complexity
- Check if similar features exist

---

**Happy coding! 🧠✨**

This project represents a monumental effort to create a truly living, breathing digital society. Every line of code contributes to the emergence of complex behaviors and fascinating narratives. Let's build something extraordinary together! 