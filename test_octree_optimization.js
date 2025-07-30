// Test script for enhanced octree optimization with smart viewport culling
console.log('🧪 Testing Enhanced Octree Optimization with Smart Viewport Culling');

// Mock data for testing
const mockWorldData = {
  tiles: Array.from({ length: 200 }, (_, y) => 
    Array.from({ length: 200 }, (_, x) => ({
      x: x,
      y: y,
      type: Math.random() > 0.5 ? 'GRASS' : 'FOREST',
      elevation: Math.random(),
      temperature: Math.random(),
      humidity: Math.random(),
      fireState: 'NONE'
    }))
  )
};

// Mock viewport data
const mockViewportData = {
  worldData: mockWorldData,
  agents: [],
  zoomLevel: 1.0,
  centerX: 100,
  centerY: 100,
  viewportWidth: 800,
  viewportHeight: 600
};

// Test viewport bounds calculation
function testViewportBoundsCalculation() {
  console.log('\n📐 Testing Exact Viewport Bounds Calculation');
  
  const tileSize = 12;
  const worldToScreenScale = 1.0;
  const viewportWidth = 800;
  const viewportHeight = 600;
  const centerX = 100;
  const centerY = 100;
  
  // Calculate exact viewport in world coordinates
  const worldViewportWidth = viewportWidth / worldToScreenScale;
  const worldViewportHeight = viewportHeight / worldToScreenScale;
  
  // Calculate exact viewport bounds (no buffer)
  const minX = centerX - worldViewportWidth / 2;
  const maxX = centerX + worldViewportWidth / 2;
  const minY = centerY - worldViewportHeight / 2;
  const maxY = centerY + worldViewportHeight / 2;
  
  // No buffer - exact viewport bounds
  const bufferSize = 0;
  const worldBufferSize = bufferSize * tileSize;
  
  // Calculate bounds (same as viewport bounds when no buffer)
  const bufferMinX = Math.max(0, minX - worldBufferSize);
  const bufferMaxX = maxX + worldBufferSize;
  const bufferMinY = Math.max(0, minY - worldBufferSize);
  const bufferMaxY = maxY + worldBufferSize;
  
  console.log('Exact viewport bounds:', { minX, maxX, minY, maxY });
  console.log('Buffer size:', { bufferSize, worldBufferSize });
  console.log('Final bounds (same as viewport):', { bufferMinX, bufferMaxX, bufferMinY, bufferMaxY });
  
  // Calculate tile bounds
  const startX = Math.max(0, Math.floor(minX / tileSize));
  const endX = Math.min(200, Math.ceil(maxX / tileSize));
  const startY = Math.max(0, Math.floor(minY / tileSize));
  const endY = Math.min(200, Math.ceil(maxY / tileSize));
  
  console.log('Tile bounds:', { startX, endX, startY, endY });
  console.log('Expected tiles to render:', (endX - startX) * (endY - startY));
}

// Test exact viewport rendering at different zoom levels
function testExactViewportRendering() {
  console.log('\n🔍 Testing Exact Viewport Rendering');
  
  const viewportWidth = 800;
  const viewportHeight = 600;
  const centerX = 100;
  const centerY = 100;
  
  const zoomLevels = [0.1, 0.5, 1.0, 2.0, 5.0];
  
  zoomLevels.forEach(zoomLevel => {
    // Calculate exact viewport bounds
    const worldViewportWidth = viewportWidth / zoomLevel;
    const worldViewportHeight = viewportHeight / zoomLevel;
    
    const minX = centerX - worldViewportWidth / 2;
    const maxX = centerX + worldViewportWidth / 2;
    const minY = centerY - worldViewportHeight / 2;
    const maxY = centerY + worldViewportHeight / 2;
    
    // Calculate tile bounds
    const tileSize = 12;
    const startX = Math.max(0, Math.floor(minX / tileSize));
    const endX = Math.ceil(maxX / tileSize);
    const startY = Math.max(0, Math.floor(minY / tileSize));
    const endY = Math.ceil(maxY / tileSize);
    
    const tileCount = (endX - startX) * (endY - startY);
    
    console.log(`Zoom ${zoomLevel}x: viewport=${worldViewportWidth.toFixed(0)}x${worldViewportHeight.toFixed(0)}, tiles=${tileCount}`);
  });
}

// Test viewport cache key generation
function testViewportCacheKey() {
  console.log('\n🗝️ Testing Viewport Cache Key Generation');
  
  const viewportBounds = {
    minX: 50.123,
    maxX: 150.789,
    minY: 75.456,
    maxY: 125.321
  };
  
  const zoomLevel = 1.5;
  
  // Round values to reduce cache fragmentation
  const roundedBounds = {
    minX: Math.floor(viewportBounds.minX / 10) * 10,
    maxX: Math.ceil(viewportBounds.maxX / 10) * 10,
    minY: Math.floor(viewportBounds.minY / 10) * 10,
    maxY: Math.ceil(viewportBounds.maxY / 10) * 10,
    zoom: Math.round(zoomLevel * 100) / 100
  };
  
  const cacheKey = `${roundedBounds.minX}_${roundedBounds.maxX}_${roundedBounds.minY}_${roundedBounds.maxY}_${roundedBounds.zoom}`;
  
  console.log('Original bounds:', viewportBounds);
  console.log('Rounded bounds:', roundedBounds);
  console.log('Cache key:', cacheKey);
}

// Test viewport similarity check
function testViewportSimilarity() {
  console.log('\n🔄 Testing Viewport Similarity Check');
  
  const current = {
    minX: 100,
    maxX: 200,
    minY: 150,
    maxY: 250,
    worldToScreenScale: 1.0
  };
  
  const similar = {
    minX: 105,
    maxX: 195,
    minY: 155,
    maxY: 245,
    worldToScreenScale: 1.05
  };
  
  const different = {
    minX: 200,
    maxX: 300,
    minY: 250,
    maxY: 350,
    worldToScreenScale: 2.0
  };
  
  const tolerance = 50;
  const zoomTolerance = 0.1;
  
  function isViewportSimilar(current, previous) {
    return Math.abs(current.minX - previous.minX) < tolerance &&
           Math.abs(current.maxX - previous.maxX) < tolerance &&
           Math.abs(current.minY - previous.minY) < tolerance &&
           Math.abs(current.maxY - previous.maxY) < tolerance &&
           Math.abs(current.worldToScreenScale - previous.worldToScreenScale) < zoomTolerance;
  }
  
  console.log('Current viewport:', current);
  console.log('Similar viewport:', similar, 'Result:', isViewportSimilar(current, similar));
  console.log('Different viewport:', different, 'Result:', isViewportSimilar(current, different));
}

// Test tile visibility check with exact viewport
function testTileVisibility() {
  console.log('\n👁️ Testing Exact Viewport Tile Visibility');
  
  const viewportBounds = {
    minX: 100,
    maxX: 200,
    minY: 150,
    maxY: 250,
    bufferMinX: 100, // Same as minX (no buffer)
    bufferMaxX: 200, // Same as maxX (no buffer)
    bufferMinY: 150, // Same as minY (no buffer)
    bufferMaxY: 250, // Same as maxY (no buffer)
    screenWidth: 800,
    screenHeight: 600,
    worldToScreenScale: 1.0
  };
  
  const tileSize = 12;
  
  function isTileVisible(tile, viewportBounds) {
    const worldX = tile.x * tileSize;
    const worldY = tile.y * tileSize;
    
    // Check if tile is within exact viewport bounds (no buffer)
    if (worldX < viewportBounds.minX || worldX > viewportBounds.maxX ||
        worldY < viewportBounds.minY || worldY > viewportBounds.maxY) {
      return false;
    }
    
    // Additional screen space check for very small tiles
    const screenX = (worldX - viewportBounds.minX) * viewportBounds.worldToScreenScale;
    const screenY = (worldY - viewportBounds.minY) * viewportBounds.worldToScreenScale;
    const screenTileSize = tileSize * viewportBounds.worldToScreenScale;
    
    // Skip tiles that are too small to be visible
    if (screenTileSize < 1) {
      return false;
    }
    
    // Skip tiles that are completely off-screen
    if (screenX + screenTileSize < 0 || screenX > viewportBounds.screenWidth ||
        screenY + screenTileSize < 0 || screenY > viewportBounds.screenHeight) {
      return false;
    }
    
    return true;
  }
  
  const testTiles = [
    { x: 8, y: 12 },   // Should be visible (within exact viewport)
    { x: 5, y: 10 },   // Should not be visible (outside viewport)
    { x: 20, y: 25 },  // Should not be visible (outside viewport)
    { x: 2, y: 8 },    // Should not be visible (outside viewport)
    { x: 30, y: 30 }   // Should not be visible (outside viewport)
  ];
  
  testTiles.forEach(tile => {
    const visible = isTileVisible(tile, viewportBounds);
    console.log(`Tile (${tile.x}, ${tile.y}): ${visible ? '✅ Visible' : '❌ Hidden'}`);
  });
}

// Run all tests
console.log('🚀 Starting Exact Viewport Octree Optimization Tests\n');

testViewportBoundsCalculation();
testExactViewportRendering();
testViewportCacheKey();
testViewportSimilarity();
testTileVisibility();

console.log('\n✅ All tests completed!');
console.log('\n📋 Summary of Exact Viewport Octree Optimization Features:');
console.log('• Exact viewport bounds calculation (no buffer zones)');
console.log('• Only renders tiles visible within camera viewport');
console.log('• Viewport caching to avoid redundant calculations');
console.log('• Enhanced tile visibility checks with screen space validation');
console.log('• Configurable buffer size (0 = exact viewport mode)');
console.log('• Improved octree queries with precise culling checks'); 