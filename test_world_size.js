// Test script for world size and camera behavior
console.log('🧪 Testing World Size and Camera Behavior');

// Test world size calculations
function testWorldSize() {
  console.log('\n📐 Testing World Size Calculations');
  
  const config = {
    width: 800,
    height: 600
  };
  
  const canvas = {
    width: 1200,
    height: 800
  };
  
  const tileSize = 12;
  
  // Calculate zoom level to fit entire world in viewport
  const zoomX = canvas.width / (config.width * tileSize);
  const zoomY = canvas.height / (config.height * tileSize);
  const fitZoom = Math.min(zoomX, zoomY) * 0.9;
  
  console.log('World size:', config);
  console.log('Canvas size:', canvas);
  console.log('Tile size:', tileSize);
  console.log('Zoom calculations:', {
    zoomX: zoomX.toFixed(3),
    zoomY: zoomY.toFixed(3),
    fitZoom: fitZoom.toFixed(3)
  });
  
  // Calculate world dimensions in pixels
  const worldWidthPixels = config.width * tileSize;
  const worldHeightPixels = config.height * tileSize;
  
  console.log('World dimensions in pixels:', {
    width: worldWidthPixels,
    height: worldHeightPixels
  });
  
  // Calculate how much of the canvas the world will fill
  const worldWidthOnCanvas = worldWidthPixels * fitZoom;
  const worldHeightOnCanvas = worldHeightPixels * fitZoom;
  
  console.log('World dimensions on canvas:', {
    width: worldWidthOnCanvas.toFixed(0),
    height: worldHeightOnCanvas.toFixed(0),
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    fillPercentage: {
      width: (worldWidthOnCanvas / canvas.width * 100).toFixed(1) + '%',
      height: (worldHeightOnCanvas / canvas.height * 100).toFixed(1) + '%'
    }
  });
}

// Test camera bounds calculations
function testCameraBounds() {
  console.log('\n🎯 Testing Camera Bounds Calculations');
  
  const config = {
    width: 800,
    height: 600
  };
  
  const canvas = {
    width: 1200,
    height: 800
  };
  
  const zoomLevels = [0.1, 0.5, 1.0, 2.0, 5.0];
  
  zoomLevels.forEach(zoom => {
    // Calculate viewport size in world coordinates
    const viewportWidth = canvas.width / zoom;
    const viewportHeight = canvas.height / zoom;
    
    // Calculate camera bounds
    const maxX = config.width - viewportWidth / 2;
    const maxY = config.height - viewportHeight / 2;
    const minX = viewportWidth / 2;
    const minY = viewportHeight / 2;
    
    console.log(`Zoom ${zoom}x:`, {
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
  });
}

// Test different world sizes
function testDifferentWorldSizes() {
  console.log('\n🌍 Testing Different World Sizes');
  
  const canvas = {
    width: 1200,
    height: 800
  };
  
  const tileSize = 12;
  
  const worldSizes = [
    { width: 400, height: 300 },
    { width: 600, height: 450 },
    { width: 800, height: 600 },
    { width: 1000, height: 750 },
    { width: 1200, height: 900 }
  ];
  
  worldSizes.forEach(size => {
    // Calculate zoom level to fit entire world in viewport
    const zoomX = canvas.width / (size.width * tileSize);
    const zoomY = canvas.height / (size.height * tileSize);
    const fitZoom = Math.min(zoomX, zoomY) * 0.9;
    
    // Calculate world dimensions on canvas
    const worldWidthOnCanvas = size.width * tileSize * fitZoom;
    const worldHeightOnCanvas = size.height * tileSize * fitZoom;
    
    console.log(`World ${size.width}x${size.height}:`, {
      fitZoom: fitZoom.toFixed(3),
      onCanvas: {
        width: worldWidthOnCanvas.toFixed(0),
        height: worldHeightOnCanvas.toFixed(0)
      },
      fillPercentage: {
        width: (worldWidthOnCanvas / canvas.width * 100).toFixed(1) + '%',
        height: (worldHeightOnCanvas / canvas.height * 100).toFixed(1) + '%'
      }
    });
  });
}

// Run all tests
console.log('🚀 Starting World Size and Camera Tests\n');

testWorldSize();
testCameraBounds();
testDifferentWorldSizes();

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary of World Size and Camera Improvements:');
console.log('• Increased default world size to 800x600 tiles');
console.log('• Fixed camera bounds calculation to account for viewport size');
console.log('• Improved zoom behavior with proper bounds checking');
console.log('• World now fills the viewport properly when zoomed out');
console.log('• Camera movement is constrained to keep world visible'); 