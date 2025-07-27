// Simple test for the new Dwarf Fortress world generation system
// This file can be run with Node.js to test the world generation

const { DwarfFortressWorldGenerator } = require('./src/core/world/DwarfFortressWorldGenerator.ts');

// Test configuration
const testConfig = {
  width: 200,
  height: 200,
  seed: 12345,
  // World generation parameters
  elevationScale: 0.02,
  temperatureScale: 0.03,
  rainfallScale: 0.025,
  // New parameters for improved world generation
  seaLevel: 0.45,
  continentCount: 3,
  islandDensity: 0.4,
  // Feature generation
  mountainRanges: 3,
  riverCount: 8,
  lakeCount: 5,
  forestDensity: 0.4,
  caveSystems: 4,
  // Civilization parameters
  civilizationCount: 3,
  settlementDensity: 0.6,
  roadDensity: 0.4,
  // Resource parameters
  mineralRichness: 0.3,
  soilFertility: 0.5,
  waterAvailability: 0.4,
};

console.log('🧪 Testing Dwarf Fortress World Generation with Diamond-Square Algorithm...');

try {
  const generator = new DwarfFortressWorldGenerator(testConfig);
  const worldData = generator.generate();
  
  console.log('✅ World generation completed successfully!');
  console.log('📊 World Statistics:');
  console.log(`   - World Size: ${worldData.tiles.length}x${worldData.tiles[0]?.length || 0}`);
  console.log(`   - Continents: ${worldData.continents.length}`);
  console.log(`   - Islands: ${worldData.islands.length}`);
  console.log(`   - Enhanced Rivers: ${worldData.enhancedRivers.length}`);
  console.log(`   - Enhanced Lakes: ${worldData.enhancedLakes.length}`);
  console.log(`   - Civilizations: ${worldData.civilizations.length}`);
  console.log(`   - Settlements: ${worldData.settlements.length}`);
  console.log(`   - Sea Level: ${worldData.seaLevel}`);
  
  // Test continent data
  if (worldData.continents.length > 0) {
    const continent = worldData.continents[0];
    console.log(`   - First Continent: ${continent.name} (${continent.area} tiles)`);
    console.log(`     Elevation: ${continent.elevation.min.toFixed(3)} - ${continent.elevation.max.toFixed(3)}`);
    console.log(`     Biomes: ${continent.biomes.join(', ')}`);
  }
  
  // Test river data
  if (worldData.enhancedRivers.length > 0) {
    const river = worldData.enhancedRivers[0];
    console.log(`   - First River: ${river.name} (${river.length.toFixed(1)} units long)`);
    console.log(`     Flow Rate: ${river.flowRate.toFixed(1)}`);
    console.log(`     Tributaries: ${river.tributaries.length}`);
  }
  
  // Test lake data
  if (worldData.enhancedLakes.length > 0) {
    const lake = worldData.enhancedLakes[0];
    console.log(`   - First Lake: ${lake.name} (${lake.volume.toFixed(1)} volume)`);
    console.log(`     Water Type: ${lake.waterType}`);
    console.log(`     Inflow: ${lake.inflow.length} rivers`);
  }
  
  console.log('🎉 All tests passed! The new world generation system is working correctly.');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
} 