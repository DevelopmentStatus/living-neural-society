// Core simulation types
export interface SimulationState {
  currentTick: number;
  totalAgents: number;
  totalFactions: number;
  worldSize: { width: number; height: number };
  settings: SimulationSettings;
}

export interface SimulationSettings {
  timeScale: number;
  maxAgents: number;
  maxFactions: number;
  difficulty: number;
  realism: number;
  chaos: number;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  health: number;
  energy: number;
  age: number;
  personality: Personality;
  memory: Memory;
  relationships: Relationship[];
  factionId?: string;
  status: AgentStatus;
  traits: Trait[];
  skills: Skill[];
  goals: Goal[];
  createdAt: number;
  lastUpdated: number;
}

export interface Personality {
  openness: number;      // 0-1: How open to new experiences
  conscientiousness: number; // 0-1: How organized and responsible
  extraversion: number;  // 0-1: How outgoing and social
  agreeableness: number; // 0-1: How cooperative and trusting
  neuroticism: number;   // 0-1: How prone to negative emotions
}

export interface Memory {
  shortTerm: MemoryItem[];
  longTerm: MemoryItem[];
  capacity: number;
  decayRate: number;
}

export interface MemoryItem {
  id: string;
  type: 'event' | 'person' | 'location' | 'fact';
  content: any;
  importance: number; // 0-1
  timestamp: number;
  decayTime: number;
}

export interface Relationship {
  targetId: string;
  type: 'friend' | 'enemy' | 'family' | 'romantic' | 'acquaintance';
  strength: number; // -1 to 1 (negative = hostile, positive = friendly)
  trust: number; // 0-1
  lastInteraction: number;
}

export interface Trait {
  name: string;
  value: number; // 0-1
  inherited: boolean;
  mutable: boolean;
}

export interface Skill {
  name: string;
  level: number; // 0-1
  experience: number;
  category: 'physical' | 'mental' | 'social' | 'technical';
}

export interface Goal {
  id: string;
  type: 'survival' | 'social' | 'achievement' | 'exploration';
  description: string;
  priority: number; // 0-1
  progress: number; // 0-1
  deadline?: number;
}

export enum AgentStatus {
  ALIVE = 'alive',
  DEAD = 'dead',
  UNCONSCIOUS = 'unconscious',
  SLEEPING = 'sleeping',
  WORKING = 'working',
  SOCIALIZING = 'socializing',
  EXPLORING = 'exploring',
  FIGHTING = 'fighting',
  FLEEING = 'fleeing',
}

// World types
export interface WorldTile {
  x: number;
  y: number;
  type: TileType;
  resources: Resource[];
  elevation: number;
  temperature: number;
  humidity: number;
  fertility: number;
  accessibility: number;
  structures: Structure[];
  agents: string[]; // Agent IDs on this tile
  
  // Enhanced environmental properties
  soilQuality: number; // 0-1: Quality of soil for farming
  fireState: FireState; // Current fire state of the tile
  pollution: number; // 0-1: Pollution level
  erosion: number; // 0-1: Erosion level
  moisture: number; // 0-1: Soil moisture content
  vegetationDensity: number; // 0-1: Density of vegetation
  mineralContent: number; // 0-1: Mineral content in soil
  
  // New hierarchical tile properties
  level: TileLevel; // What zoom level this tile represents
  subTiles?: WorldTile[][]; // Sub-tiles for detailed view
  parentTile?: { x: number; y: number }; // Parent tile coordinates
  connections: TileConnection[]; // Connections to other tiles
  tileData: TileData; // Additional tile-specific data
  isExpanded: boolean; // Whether this tile is currently expanded into sub-tiles
}

export enum TileType {
  GRASS = 'grass',
  FOREST = 'forest',
  MOUNTAIN = 'mountain',
  WATER = 'water',
  DESERT = 'desert',
  URBAN = 'urban',
  FARM = 'farm',
  ROAD = 'road',
  HILL = 'hill',
  SWAMP = 'swamp',
  TUNDRA = 'tundra',
  ALPINE = 'alpine',
  VOLCANO = 'volcano',
  RUINS = 'ruins',
  CAPITAL = 'capital',
  TRADE_HUB = 'trade_hub',
  FORTRESS = 'fortress',
  RELIGIOUS_SITE = 'religious_site',
  NATURAL_WONDER = 'natural_wonder',
  LANDMARK = 'landmark',
}

export enum FireState {
  NONE = 'none',
  SMOLDERING = 'smoldering',
  BURNING = 'burning',
  INTENSE = 'intense',
  BURNT = 'burnt',
  RECOVERING = 'recovering'
}

export enum TileLevel {
  WORLD = 'world',      // Continent/global level
  REGION = 'region',    // Regional level (countries/provinces)
  LOCAL = 'local',      // Local level (towns/cities)
  DETAIL = 'detail',    // Detail level (individual buildings/areas)
  MICRO = 'micro',      // Micro level (individual rooms/objects)
  GROUND = 'ground'     // Ground level (basic terrain)
}

export enum ConnectionType {
  ROAD = 'road',
  RIVER = 'river',
  TRADE_ROUTE = 'trade_route',
  BORDER = 'border',
  TELEPORT = 'teleport',
  UNDERGROUND = 'underground',
  AIR_ROUTE = 'air_route',
  SEA_ROUTE = 'sea_route'
}

export enum SettlementType {
  NONE = 'none',
  HAMLET = 'hamlet',
  VILLAGE = 'village',
  TOWN = 'town',
  CITY = 'city',
  CAPITAL = 'capital',
  FORTRESS = 'fortress',
  MONASTERY = 'monastery',
  TRADING_POST = 'trading_post',
  MINING_CAMP = 'mining_camp',
  FARMING_COMMUNITY = 'farming_community'
}

export interface TileConnection {
  targetTile: { x: number; y: number };
  type: ConnectionType;
  strength: number; // 0-1
  bidirectional: boolean;
  data?: any; // Additional connection data
}

export interface TileData {
  // Geographic data
  biome: string;
  climate: string;
  terrain: string;
  
  // Settlement data
  settlementType?: SettlementType;
  population?: number;
  buildings?: BuildingData[];
  
  // Resource data
  resourceNodes: ResourceNode[];
  resourceClusters: ResourceCluster[];
  
  // Infrastructure data
  roads: RoadData[];
  bridges: BridgeData[];
  walls: WallData[];
  
  // Environmental data
  vegetation: VegetationData[];
  wildlife: WildlifeData[];
  weather: WeatherData;
  
  // Cultural data
  culture: string;
  religion: string;
  language: string;
  
  // Economic data
  tradeRoutes: TradeRouteData[];
  markets: MarketData[];
  industries: IndustryData[];
  
  // Political data
  ownership: string;
  governance: string;
  laws: LawData[];
  
  // Historical data
  history: HistoricalEvent[];
  ruins: RuinData[];
  artifacts: ArtifactData[];
  
  // Additional properties from FMGWorldGenerator
  owner?: any;
  features?: any[];
  tags?: any[];
  notes?: string;
  lastVisited?: any;
  lastModified?: any;
  customName?: any;
  isCapital?: boolean;
  isTradeHub?: boolean;
  isNaturalWonder?: boolean;
  isLandmark?: boolean;
  isColony?: boolean;
  isRuins?: boolean;
  isOutpost?: boolean;
  isFort?: boolean;
  isReligiousSite?: boolean;
  isCulturalSite?: boolean;
  isResourceRich?: boolean;
  isStrategic?: boolean;
}

export interface BuildingData {
  id: string;
  type: StructureType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  condition: number; // 0-1
  occupants: string[];
  functions: StructureFunction[];
  construction: ConstructionData;
}

export interface ConstructionData {
  material: string;
  quality: number; // 0-1
  age: number;
  style: string;
  features: string[];
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  position: { x: number; y: number };
  amount: number;
  maxAmount: number;
  regenerationRate: number;
  quality: number; // 0-1
  accessibility: number; // 0-1
  lastHarvested: number;
}

export interface ResourceCluster {
  id: string;
  type: ResourceType;
  center: { x: number; y: number };
  radius: number;
  density: number; // 0-1
  nodes: string[]; // Resource node IDs
}

export interface RoadData {
  id: string;
  type: 'dirt' | 'stone' | 'paved' | 'highway';
  start: { x: number; y: number };
  end: { x: number; y: number };
  width: number;
  condition: number; // 0-1
  traffic: number; // 0-1
}

export interface BridgeData {
  id: string;
  type: 'wooden' | 'stone' | 'iron' | 'suspension';
  position: { x: number; y: number };
  length: number;
  width: number;
  condition: number; // 0-1
  capacity: number;
}

export interface WallData {
  id: string;
  type: 'wooden' | 'stone' | 'iron' | 'magical';
  start: { x: number; y: number };
  end: { x: number; y: number };
  height: number;
  thickness: number;
  condition: number; // 0-1
  gates: GateData[];
}

export interface GateData {
  id: string;
  position: { x: number; y: number };
  type: 'simple' | 'portcullis' | 'drawbridge';
  isOpen: boolean;
  guards: string[];
}

export interface VegetationData {
  id: string;
  type: 'tree' | 'bush' | 'grass' | 'flower' | 'crop';
  position: { x: number; y: number };
  size: number;
  health: number; // 0-1
  age: number;
  species: string;
}

export interface WildlifeData {
  id: string;
  type: 'mammal' | 'bird' | 'fish' | 'insect' | 'reptile';
  position: { x: number; y: number };
  species: string;
  population: number;
  behavior: string;
  habitat: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  visibility: number; // 0-1
  conditions: string[];
}

export interface TradeRouteData {
  id: string;
  type: 'local' | 'regional' | 'international';
  start: { x: number; y: number };
  end: { x: number; y: number };
  goods: ResourceType[];
  volume: number; // 0-1
  security: number; // 0-1
  tolls: number;
}

export interface MarketData {
  id: string;
  type: 'local' | 'regional' | 'specialized';
  position: { x: number; y: number };
  size: number;
  goods: ResourceType[];
  prices: Record<ResourceType, number>;
  activity: number; // 0-1
}

export interface IndustryData {
  id: string;
  type: 'mining' | 'farming' | 'crafting' | 'trading' | 'military';
  position: { x: number; y: number };
  size: number;
  output: ResourceType[];
  efficiency: number; // 0-1
  workers: string[];
}

export interface LawData {
  id: string;
  name: string;
  type: 'criminal' | 'civil' | 'economic' | 'social';
  severity: number; // 0-1
  enforcement: number; // 0-1
  description: string;
}

export interface HistoricalEvent {
  id: string;
  type: 'battle' | 'discovery' | 'construction' | 'disaster' | 'celebration';
  date: number;
  description: string;
  participants: string[];
  impact: number; // 0-1
}

export interface RuinData {
  id: string;
  type: 'building' | 'fortress' | 'temple' | 'tower' | 'underground';
  position: { x: number; y: number };
  size: { width: number; height: number };
  condition: number; // 0-1
  age: number;
  artifacts: string[];
  dangers: string[];
}

export interface ArtifactData {
  id: string;
  type: 'weapon' | 'tool' | 'jewelry' | 'document' | 'statue';
  position: { x: number; y: number };
  value: number;
  condition: number; // 0-1
  age: number;
  origin: string;
  magical: boolean;
}

export interface Resource {
  type: ResourceType;
  amount: number;
  maxAmount: number;
  regenerationRate: number;
  lastHarvested: number;
}

export enum ResourceType {
  FOOD = 'food',
  WATER = 'water',
  WOOD = 'wood',
  STONE = 'stone',
  METAL = 'metal',
  ENERGY = 'energy',
  KNOWLEDGE = 'knowledge',
}

export interface Structure {
  id: string;
  type: StructureType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  health: number;
  maxHealth: number;
  ownerId?: string;
  occupants: string[];
  functions: StructureFunction[];
}

export enum StructureType {
  HOUSE = 'house',
  FARM = 'farm',
  FACTORY = 'factory',
  SCHOOL = 'school',
  HOSPITAL = 'hospital',
  GOVERNMENT = 'government',
  MARKET = 'market',
  TEMPLE = 'temple',
}

export interface StructureFunction {
  type: 'production' | 'storage' | 'living' | 'social' | 'defense';
  efficiency: number;
  capacity: number;
  currentUsage: number;
}

// Social types
export interface Faction {
  id: string;
  name: string;
  leaderId: string;
  members: string[];
  territory: { x: number; y: number; width: number; height: number }[];
  ideology: Ideology;
  resources: Resource[];
  relationships: FactionRelationship[];
  policies: Policy[];
  createdAt: number;
}

export interface Ideology {
  individualism: number; // 0-1 (collectivist vs individualist)
  hierarchy: number;     // 0-1 (egalitarian vs hierarchical)
  tradition: number;     // 0-1 (progressive vs traditional)
  aggression: number;    // 0-1 (pacifist vs aggressive)
  openness: number;      // 0-1 (closed vs open society)
}

export interface FactionRelationship {
  targetFactionId: string;
  type: 'alliance' | 'enemy' | 'neutral' | 'trade';
  strength: number; // -1 to 1
  trust: number; // 0-1
  lastInteraction: number;
}

export interface Policy {
  name: string;
  type: 'economic' | 'social' | 'military' | 'environmental';
  effect: PolicyEffect;
  support: number; // 0-1 (how much faction supports this policy)
}

export interface PolicyEffect {
  resourceProduction: Partial<Record<ResourceType, number>>;
  socialStability: number;
  militaryStrength: number;
  environmentalImpact: number;
}

// Event types
export interface SimulationEvent {
  id: string;
  type: EventType;
  timestamp: number;
  participants: string[];
  location: { x: number; y: number };
  data: any;
  importance: number;
}

export enum EventType {
  AGENT_BIRTH = 'agent_birth',
  AGENT_DEATH = 'agent_death',
  AGENT_MARRIAGE = 'agent_marriage',
  FACTION_FORMED = 'faction_formed',
  FACTION_DISSOLVED = 'faction_dissolved',
  WAR_STARTED = 'war_started',
  WAR_ENDED = 'war_ended',
  DISCOVERY = 'discovery',
  DISASTER = 'disaster',
  ACHIEVEMENT = 'achievement',
}

// Statistics types
export interface SimulationStatistics {
  currentTick: number;
  totalAgents: number;
  totalFactions: number;
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  agentStats: AgentStatistics;
  worldStats: WorldStatistics;
  socialStats: SocialStatistics;
}

export interface AgentStatistics {
  totalAgents: number;
  aliveAgents: number;
  averageAge: number;
  averageHealth: number;
  averageEnergy: number;
  populationGrowth: number;
  deathRate: number;
  birthRate: number;
}

export interface WorldStatistics {
  totalTiles: number;
  resourceDistribution: Record<ResourceType, number>;
  structureCount: number;
  averageTemperature: number;
  averageHumidity: number;
  averageFertility: number;
}

export interface SocialStatistics {
  totalFactions: number;
  averageFactionSize: number;
  totalRelationships: number;
  averageRelationshipStrength: number;
  conflictLevel: number;
  cooperationLevel: number;
} 