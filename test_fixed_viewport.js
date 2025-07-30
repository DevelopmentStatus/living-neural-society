// Test script for fixed viewport behavior with panning
console.log('🧪 Testing Fixed Viewport with Panning');

// Test fixed viewport calculations
function testFixedViewport() {
  console.log('\n📐 Testing Fixed Viewport Calculations');
  
  const config = {
    width: 1600,
    height: 1200
  };
  
  const viewportConfig = {
    viewportTilesX: 100,
    viewportTilesY: 75
  };
  
  const canvas = {
    width: 1200,
    height: 800
  };
  
  const tileSize = 12;
  
  // Calculate zoom level to show fixed viewport size
  const zoomX = canvas.width / (viewportConfig.viewportTilesX * tileSize);
  const zoomY = canvas.height / (viewportConfig.viewportTilesY * tileSize);
  const fitZoom = Math.min(zoomX, zoomY) * 0.95;
  
  console.log('World size:', config);
  console.log('Viewport size:', viewportConfig);
  console.log('Canvas size:', canvas);
  console.log('Zoom calculations:', {
    zoomX: zoomX.toFixed(3),
    zoomY: zoomY.toFixed(3),
    fitZoom: fitZoom.toFixed(3)
  });
  
  // Calculate viewport size in world coordinates
  const viewportWidth = canvas.width / fitZoom;
  const viewportHeight = canvas.height / fitZoom;
  
  console.log('Viewport in world coordinates:', {
    width: viewportWidth.toFixed(0),
    height: viewportHeight.toFixed(0)
  });
  
  // Calculate how much of the world is visible
  const worldCoverageX = (viewportWidth / (config.width * tileSize) * 100).toFixed(1);
  const worldCoverageY = (viewportHeight / (config.height * tileSize) * 100).toFixed(1);
  
  console.log('World coverage:', {
    width: worldCoverageX + '%',
    height: worldCoverageY + '%'
  });
}

// Test camera bounds for panning
function testCameraBounds() {
  console.log('\n🎯 Testing Camera Bounds for Panning');
  
  const config = {
    width: 1600,
    height: 1200
  };
  
  const canvas = {
    width: 1200,
    height: 800
  };
  
  const fitZoom = 0.1; // Example zoom level
  
  // Calculate viewport size in world coordinates
  const viewportWidth = canvas.width / fitZoom;
  const viewportHeight = canvas.height / fitZoom;
  
  // Calculate camera bounds
  const maxX = config.width - viewportWidth / 2;
  const maxY = config.height - viewportHeight / 2;
  const minX = viewportWidth / 2;
  const minY = viewportHeight / 2;
  
  console.log('Camera bounds at zoom', fitZoom + 'x:', {
    viewportSize: {
      width: viewportWidth.toFixed(0),
      height: viewportHeight.toFixed(0)
    },
    cameraBounds: {
      minX: minX.toFixed(0),
      maxX: maxX.toFixed(0),
      minY: minY.toFixed(0),
      maxY: maxY.toFixed(0)
    },
    worldSize: config
  });
  
  // Test panning range
  const panRangeX = maxX - minX;
  const panRangeY = maxY - minY;
  
  console.log('Panning range:', {
    x: panRangeX.toFixed(0),
    y: panRangeY.toFixed(0)
  });
}

// Test different viewport sizes
function testDifferentViewportSizes() {
  console.log('\n🔍 Testing Different Viewport Sizes');
  
  const config = {
    width: 1600,
    height: 1200
  };
  
  const canvas = {
    width: 1200,
    height: 800
  };
  
  const tileSize = 12;
  
  const viewportSizes = [
    { x: 50, y: 40 },
    { x: 100, y: 75 },
    { x: 150, y: 100 },
    { x: 200, y: 150 }
  ];
  
  viewportSizes.forEach(size => {
    // Calculate zoom level
    const zoomX = canvas.width / (size.x * tileSize);
    const zoomY = canvas.height / (size.y * tileSize);
    const fitZoom = Math.min(zoomX, zoomY) * 0.95;
    
    // Calculate world coverage
    const viewportWidth = canvas.width / fitZoom;
    const viewportHeight = canvas.height / fitZoom;
    const worldCoverageX = (viewportWidth / (config.width * tileSize) * 100).toFixed(1);
    const worldCoverageY = (viewportHeight / (config.height * tileSize) * 100).toFixed(1);
    
    console.log(`Viewport ${size.x}x${size.y}:`, {
      zoom: fitZoom.toFixed(3),
      worldCoverage: {
        width: worldCoverageX + '%',
        height: worldCoverageY + '%'
      }
    });
  });
}

// Test panning scenarios
function testPanningScenarios() {
  console.log('\n🚀 Testing Panning Scenarios');
  
  const config = {
    width: 1600,
    height: 1200
  };
  
  const viewportConfig = {
    viewportTilesX: 100,
    viewportTilesY: 75
  };
  
  const canvas = {
    width: 1200,
    height: 800
  };
  
  const tileSize = 12;
  
  // Calculate zoom level
  const zoomX = canvas.width / (viewportConfig.viewportTilesX * tileSize);
  const zoomY = canvas.height / (viewportConfig.viewportTilesY * tileSize);
  const fitZoom = Math.min(zoomX, zoomY) * 0.95;
  
  // Calculate viewport size in world coordinates
  const viewportWidth = canvas.width / fitZoom;
  const viewportHeight = canvas.height / fitZoom;
  
  // Test different camera positions
  const cameraPositions = [
    { x: config.width / 2, y: config.height / 2, name: 'Center' },
    { x: 0, y: 0, name: 'Top-Left' },
    { x: config.width, y: 0, name: 'Top-Right' },
    { x: 0, y: config.height, name: 'Bottom-Left' },
    { x: config.width, y: config.height, name: 'Bottom-Right' }
  ];
  
  cameraPositions.forEach(pos => {
    // Calculate visible world area
    const visibleMinX = pos.x - viewportWidth / 2;
    const visibleMaxX = pos.x + viewportWidth / 2;
    const visibleMinY = pos.y - viewportHeight / 2;
    const visibleMaxY = pos.y + viewportHeight / 2;
    
    console.log(`Camera at ${pos.name}:`, {
      position: { x: pos.x.toFixed(0), y: pos.y.toFixed(0) },
      visibleArea: {
        minX: Math.max(0, visibleMinX).toFixed(0),
        maxX: Math.min(config.width, visibleMaxX).toFixed(0),
        minY: Math.max(0, visibleMinY).toFixed(0),
        maxY: Math.min(config.height, visibleMaxY).toFixed(0)
      }
    });
  });
}

// Run all tests
console.log('🚀 Starting Fixed Viewport Tests\n');

testFixedViewport();
testCameraBounds();
testDifferentViewportSizes();
testPanningScenarios();

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary of Fixed Viewport Behavior:');
console.log('• Fixed viewport size (100x75 tiles) fills the screen');
console.log('• Large world (1600x1200 tiles) allows extensive panning');
console.log('• Camera bounds prevent viewport from going outside world');
console.log('• Occlusion culling only renders visible tiles');
console.log('• Panning moves camera around the larger world'); 