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