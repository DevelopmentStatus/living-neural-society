// Core Types for Living Neural Society Simulation

// ===== AGENT TYPES =====
export interface Agent {
  id: string;
  name: string;
  age: number;
  generation: number;
  position: Position;
  status: AgentStatus;
  
  // Biological traits
  genetics: Genetics;
  metabolism: Metabolism;
  health: Health;
  needs: Needs;
  
  // Cognitive model
  neuralNetwork: NeuralNetwork;
  memory: Memory;
  emotions: Emotions;
  personality: Personality;
  
  // Skills and capabilities
  skills: Skill[];
  job?: Job;
  inventory: Inventory;
  
  // Social connections
  relationships: Relationship[];
  faction?: Faction;
  
  // Goals and decision making
  goals: Goal[];
  currentAction?: Action;
  decisionHistory: Decision[];
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export enum AgentStatus {
  ALIVE = 'alive',
  DEAD = 'dead',
  UNCONSCIOUS = 'unconscious',
  TRAVELING = 'traveling',
  WORKING = 'working',
  SOCIALIZING = 'socializing',
  FIGHTING = 'fighting',
}

// ===== BIOLOGICAL TYPES =====
export interface Genetics {
  strength: number; // 0-1
  intelligence: number; // 0-1
  charisma: number; // 0-1
  agility: number; // 0-1
  endurance: number; // 0-1
  creativity: number; // 0-1
  mutations: Mutation[];
}

export interface Mutation {
  id: string;
  name: string;
  effect: MutationEffect;
  probability: number;
  inherited: boolean;
}

export interface MutationEffect {
  type: 'stat_boost' | 'stat_penalty' | 'ability_unlock' | 'behavior_change';
  target: string;
  value: number;
  description: string;
}

export interface Metabolism {
  baseMetabolicRate: number;
  foodEfficiency: number;
  waterEfficiency: number;
  energyEfficiency: number;
  stressResponse: number;
}

export interface Health {
  currentHealth: number;
  maxHealth: number;
  diseases: Disease[];
  injuries: Injury[];
  immunities: string[];
}

export interface Disease {
  id: string;
  name: string;
  severity: number; // 0-1
  contagious: boolean;
  symptoms: Symptom[];
  treatment: Treatment[];
}

export interface Injury {
  id: string;
  type: InjuryType;
  severity: number; // 0-1
  healingProgress: number; // 0-1
  permanent: boolean;
}

export enum InjuryType {
  CUT = 'cut',
  BRUISE = 'bruise',
  FRACTURE = 'fracture',
  BURN = 'burn',
  POISON = 'poison',
  DISEASE = 'disease',
}

export interface Symptom {
  type: string;
  severity: number;
  effect: string;
}

export interface Treatment {
  type: string;
  effectiveness: number;
  resources: ResourceRequirement[];
}

export interface Needs {
  hunger: number; // 0-1
  thirst: number; // 0-1
  energy: number; // 0-1
  social: number; // 0-1
  safety: number; // 0-1
  happiness: number; // 0-1
  purpose: number; // 0-1
}

// ===== COGNITIVE TYPES =====
export interface NeuralNetwork {
  id: string;
  layers: Layer[];
  weights: number[][][];
  biases: number[][];
  learningRate: number;
  activationFunction: ActivationFunction;
  lastUpdate: number;
}

export interface Layer {
  neurons: number;
  activation: ActivationFunction;
}

export enum ActivationFunction {
  RELU = 'relu',
  SIGMOID = 'sigmoid',
  TANH = 'tanh',
  SOFTMAX = 'softmax',
}

export interface Memory {
  shortTerm: MemoryEntry[];
  longTerm: MemoryEntry[];
  episodic: EpisodicMemory[];
  semantic: SemanticMemory[];
  working: WorkingMemory;
}

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: any;
  importance: number; // 0-1
  timestamp: number;
  decayRate: number;
  associations: string[];
}

export enum MemoryType {
  EVENT = 'event',
  PERSON = 'person',
  PLACE = 'place',
  SKILL = 'skill',
  EMOTION = 'emotion',
  DECISION = 'decision',
}

export interface Emotion {
  type: string;
  intensity: number; // 0-1
  duration: number;
  source: string;
}

export interface EpisodicMemory {
  id: string;
  event: string;
  participants: string[];
  location: Position;
  timestamp: number;
  emotions: Emotion[];
  outcome: string;
}

export interface SemanticMemory {
  id: string;
  concept: string;
  knowledge: any;
  confidence: number;
  lastAccessed: number;
}

export interface WorkingMemory {
  currentTask?: string;
  immediateGoals: string[];
  attention: string[];
  cognitiveLoad: number; // 0-1
}

export interface Emotions {
  fear: number; // 0-1
  anger: number; // 0-1
  joy: number; // 0-1
  sadness: number; // 0-1
  surprise: number; // 0-1
  disgust: number; // 0-1
  trust: number; // 0-1
  anticipation: number; // 0-1
  love: number; // 0-1
  guilt: number; // 0-1
}

export interface Personality {
  openness: number; // 0-1
  conscientiousness: number; // 0-1
  extraversion: number; // 0-1
  agreeableness: number; // 0-1
  neuroticism: number; // 0-1
  traits: PersonalityTrait[];
}

export interface PersonalityTrait {
  id: string;
  name: string;
  strength: number; // 0-1
  description: string;
}

// ===== SKILL & JOB TYPES =====
export interface Skill {
  id: string;
  name: string;
  level: number; // 0-1
  experience: number;
  category: SkillCategory;
  prerequisites: string[];
  effects: SkillEffect[];
}

export enum SkillCategory {
  COMBAT = 'combat',
  CRAFTING = 'crafting',
  SOCIAL = 'social',
  SURVIVAL = 'survival',
  KNOWLEDGE = 'knowledge',
  LEADERSHIP = 'leadership',
}

export interface SkillEffect {
  type: string;
  target: string;
  value: number;
  condition?: string;
}

export interface Job {
  id: string;
  name: string;
  type: JobType;
  requirements: JobRequirement[];
  benefits: JobBenefit[];
  responsibilities: string[];
  status: JobStatus;
}

export enum JobType {
  LEADER = 'leader',
  WORKER = 'worker',
  CRAFTSMAN = 'craftsman',
  WARRIOR = 'warrior',
  HEALER = 'healer',
  TRADER = 'trader',
  FARMER = 'farmer',
  HUNTER = 'hunter',
}

export interface JobRequirement {
  type: string;
  value: number;
  skill?: string;
}

export interface JobBenefit {
  type: string;
  value: number;
  description: string;
}

export enum JobStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRAINING = 'training',
  RETIRED = 'retired',
}

// ===== INVENTORY & RESOURCES =====
export interface Inventory {
  items: InventoryItem[];
  capacity: number;
  weight: number;
  maxWeight: number;
}

export interface InventoryItem {
  id: string;
  type: ItemType;
  name: string;
  quantity: number;
  quality: number; // 0-1
  durability: number; // 0-1
  properties: Record<string, any>;
}

export enum ItemType {
  FOOD = 'food',
  WATER = 'water',
  TOOL = 'tool',
  WEAPON = 'weapon',
  ARMOR = 'armor',
  MATERIAL = 'material',
  MEDICINE = 'medicine',
  ARTIFACT = 'artifact',
}

// ===== SOCIAL TYPES =====
export interface Relationship {
  targetId: string;
  type: RelationshipType;
  strength: number; // -1 to 1
  trust: number; // 0-1
  fear: number; // 0-1
  love: number; // 0-1
  loyalty: number; // 0-1
  history: RelationshipEvent[];
  lastInteraction: number;
}

export enum RelationshipType {
  FRIEND = 'friend',
  FAMILY = 'family',
  LOVER = 'lover',
  ENEMY = 'enemy',
  ACQUAINTANCE = 'acquaintance',
  MENTOR = 'mentor',
  STUDENT = 'student',
  LEADER = 'leader',
  FOLLOWER = 'follower',
}

export interface RelationshipEvent {
  id: string;
  type: string;
  description: string;
  impact: number; // -1 to 1
  timestamp: number;
}

export interface Faction {
  id: string;
  name: string;
  type: FactionType;
  members: string[];
  leader?: string;
  territory: Territory[];
  culture: Culture;
  resources: ResourcePool;
  relationships: FactionRelationship[];
}

export enum FactionType {
  TRIBE = 'tribe',
  CLAN = 'clan',
  KINGDOM = 'kingdom',
  EMPIRE = 'empire',
  REPUBLIC = 'republic',
  THEOCRACY = 'theocracy',
  OLIGARCHY = 'oligarchy',
}

// ===== GOAL & ACTION TYPES =====
export interface Goal {
  id: string;
  type: GoalType;
  description: string;
  priority: number; // 0-1
  progress: number; // 0-1
  deadline?: number;
  subGoals: Goal[];
  requirements: GoalRequirement[];
}

export enum GoalType {
  SURVIVAL = 'survival',
  SOCIAL = 'social',
  ACHIEVEMENT = 'achievement',
  EXPLORATION = 'exploration',
  CREATION = 'creation',
  DESTRUCTION = 'destruction',
  KNOWLEDGE = 'knowledge',
  POWER = 'power',
}

export interface GoalRequirement {
  type: string;
  value: any;
  met: boolean;
}

export interface Action {
  id: string;
  type: ActionType;
  target?: string;
  position?: Position;
  duration: number;
  progress: number;
  requirements: ActionRequirement[];
  effects: ActionEffect[];
  startTime: number;
}

export enum ActionType {
  MOVE = 'move',
  GATHER = 'gather',
  CRAFT = 'craft',
  FIGHT = 'fight',
  SOCIALIZE = 'socialize',
  BUILD = 'build',
  EXPLORE = 'explore',
  REST = 'rest',
  EAT = 'eat',
  DRINK = 'drink',
}

export interface ActionRequirement {
  type: string;
  value: any;
  available: boolean;
}

export interface ActionEffect {
  type: string;
  target: string;
  value: number;
  duration?: number;
}

export interface Decision {
  id: string;
  timestamp: number;
  context: string;
  options: DecisionOption[];
  chosenOption: string;
  outcome: string;
  confidence: number;
  learning: DecisionLearning;
}

export interface DecisionOption {
  id: string;
  description: string;
  expectedValue: number;
  risk: number;
  requirements: string[];
}

export interface DecisionLearning {
  success: boolean;
  newKnowledge: string[];
  behaviorAdjustment: number;
  confidenceChange: number;
}

// ===== WORLD TYPES =====
export interface World {
  id: string;
  name: string;
  size: WorldSize;
  biomes: Biome[];
  resources: Resource[];
  weather: Weather;
  time: TimeSystem;
  events: WorldEvent[];
}

export interface WorldSize {
  width: number;
  height: number;
  depth?: number;
}

export interface Biome {
  id: string;
  name: string;
  type: BiomeType;
  position: Position;
  size: number;
  resources: Resource[];
  climate: Climate;
  flora: Flora[];
  fauna: Fauna[];
}

export enum BiomeType {
  FOREST = 'forest',
  DESERT = 'desert',
  MOUNTAIN = 'mountain',
  PLAINS = 'plains',
  OCEAN = 'ocean',
  TUNDRA = 'tundra',
  SWAMP = 'swamp',
  VOLCANO = 'volcano',
}

export interface Climate {
  temperature: number; // Celsius
  humidity: number; // 0-1
  rainfall: number; // mm/year
  windSpeed: number; // m/s
  seasonality: number; // 0-1
}

export interface Flora {
  id: string;
  name: string;
  type: string;
  density: number; // 0-1
  growthRate: number;
  edible: boolean;
  medicinal: boolean;
}

export interface Fauna {
  id: string;
  name: string;
  type: string;
  population: number;
  behavior: string;
  dangerous: boolean;
  huntable: boolean;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  position: Position;
  quantity: number;
  quality: number; // 0-1
  renewable: boolean;
  regenerationRate: number;
}

export enum ResourceType {
  FOOD = 'food',
  WATER = 'water',
  WOOD = 'wood',
  STONE = 'stone',
  METAL = 'metal',
  HERBS = 'herbs',
  ANIMALS = 'animals',
  MINERALS = 'minerals',
}

export interface Weather {
  current: WeatherCondition;
  forecast: WeatherForecast[];
  patterns: WeatherPattern[];
}

export interface WeatherCondition {
  type: WeatherType;
  intensity: number; // 0-1
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number; // 0-1
}

export enum WeatherType {
  CLEAR = 'clear',
  CLOUDY = 'cloudy',
  RAIN = 'rain',
  STORM = 'storm',
  SNOW = 'snow',
  FOG = 'fog',
  WIND = 'wind',
}

export interface WeatherForecast {
  time: number;
  condition: WeatherCondition;
  probability: number;
}

export interface WeatherPattern {
  id: string;
  name: string;
  cycle: number;
  effects: WeatherEffect[];
}

export interface WeatherEffect {
  type: string;
  target: string;
  value: number;
  duration: number;
}

export interface TimeSystem {
  currentTime: number;
  day: number;
  season: Season;
  year: number;
  timeScale: number;
}

export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter',
}

export interface WorldEvent {
  id: string;
  type: WorldEventType;
  description: string;
  position: Position;
  magnitude: number; // 0-1
  duration: number;
  effects: WorldEventEffect[];
  timestamp: number;
}

export enum WorldEventType {
  NATURAL_DISASTER = 'natural_disaster',
  RESOURCE_DISCOVERY = 'resource_discovery',
  CLIMATE_CHANGE = 'climate_change',
  INVASION = 'invasion',
  PLAGUE = 'plague',
  MIRACLE = 'miracle',
}

export interface WorldEventEffect {
  type: string;
  target: string;
  value: number;
  duration: number;
}

// ===== CIVILIZATION TYPES =====
export interface Territory {
  id: string;
  name: string;
  boundaries: Position[];
  owner?: string;
  resources: Resource[];
  buildings: Building[];
  population: number;
  development: number; // 0-1
}

export interface Building {
  id: string;
  type: BuildingType;
  name: string;
  position: Position;
  size: number;
  health: number; // 0-1
  functionality: number; // 0-1
  occupants: string[];
  storage: Inventory;
}

export enum BuildingType {
  HOUSE = 'house',
  WORKSHOP = 'workshop',
  STORAGE = 'storage',
  DEFENSE = 'defense',
  RELIGIOUS = 'religious',
  GOVERNMENT = 'government',
  FARM = 'farm',
  MINE = 'mine',
}

export interface Culture {
  id: string;
  name: string;
  values: CulturalValue[];
  traditions: Tradition[];
  taboos: string[];
  art: ArtForm[];
  religion?: Religion;
  language: Language;
}

export interface CulturalValue {
  id: string;
  name: string;
  importance: number; // 0-1
  description: string;
  effects: CulturalEffect[];
}

export interface CulturalEffect {
  type: string;
  target: string;
  value: number;
  condition?: string;
}

export interface Tradition {
  id: string;
  name: string;
  description: string;
  frequency: number;
  participants: string[];
  effects: TraditionEffect[];
}

export interface TraditionEffect {
  type: string;
  target: string;
  value: number;
  duration: number;
}

export interface ArtForm {
  id: string;
  name: string;
  type: string;
  complexity: number; // 0-1
  culturalSignificance: number; // 0-1
  practitioners: string[];
}

export interface Religion {
  id: string;
  name: string;
  deities: Deity[];
  rituals: Ritual[];
  beliefs: Belief[];
  hierarchy: ReligiousHierarchy;
}

export interface Deity {
  id: string;
  name: string;
  domain: string[];
  personality: string;
  power: number; // 0-1
  followers: string[];
}

export interface Ritual {
  id: string;
  name: string;
  purpose: string;
  frequency: number;
  participants: string[];
  effects: RitualEffect[];
}

export interface RitualEffect {
  type: string;
  target: string;
  value: number;
  duration: number;
}

export interface Belief {
  id: string;
  name: string;
  description: string;
  strength: number; // 0-1
  effects: BeliefEffect[];
}

export interface BeliefEffect {
  type: string;
  target: string;
  value: number;
  condition?: string;
}

export interface ReligiousHierarchy {
  levels: ReligiousLevel[];
  currentLeader?: string;
}

export interface ReligiousLevel {
  name: string;
  requirements: string[];
  privileges: string[];
  members: string[];
}

export interface Language {
  id: string;
  name: string;
  complexity: number; // 0-1
  vocabulary: string[];
  grammar: GrammarRule[];
  speakers: string[];
}

export interface GrammarRule {
  id: string;
  pattern: string;
  meaning: string;
  complexity: number;
}

export interface ResourcePool {
  food: number;
  water: number;
  materials: Record<string, number>;
  tools: InventoryItem[];
  weapons: InventoryItem[];
  artifacts: InventoryItem[];
}

export interface FactionRelationship {
  targetId: string;
  type: FactionRelationshipType;
  strength: number; // -1 to 1
  trust: number; // 0-1
  fear: number; // 0-1
  trade: number; // 0-1
  conflicts: Conflict[];
  treaties: Treaty[];
}

export enum FactionRelationshipType {
  ALLY = 'ally',
  ENEMY = 'enemy',
  NEUTRAL = 'neutral',
  VASSAL = 'vassal',
  OVERLORD = 'overlord',
  TRADE_PARTNER = 'trade_partner',
}

// ===== CONFLICT TYPES =====
export interface Conflict {
  id: string;
  type: ConflictType;
  participants: ConflictParticipant[];
  location: Position;
  intensity: number; // 0-1
  casualties: Casualty[];
  outcome?: ConflictOutcome;
  startTime: number;
  endTime?: number;
}

export enum ConflictType {
  BATTLE = 'battle',
  SIEGE = 'siege',
  RAID = 'raid',
  DUEL = 'duel',
  CIVIL_WAR = 'civil_war',
  INVASION = 'invasion',
}

export interface ConflictParticipant {
  id: string;
  type: 'individual' | 'faction';
  side: 'attacker' | 'defender';
  strength: number;
  casualties: number;
  performance: number; // 0-1
}

export interface Casualty {
  id: string;
  type: 'death' | 'injury' | 'capture';
  severity: number; // 0-1
  permanent: boolean;
}

export interface ConflictOutcome {
  winner: string;
  loser: string;
  terms: TreatyTerm[];
  consequences: ConflictConsequence[];
}

export interface TreatyTerm {
  type: string;
  description: string;
  duration: number;
  enforcement: number; // 0-1
}

export interface ConflictConsequence {
  type: string;
  target: string;
  value: number;
  duration: number;
}

export interface Treaty {
  id: string;
  type: TreatyType;
  parties: string[];
  terms: TreatyTerm[];
  startTime: number;
  endTime?: number;
  status: TreatyStatus;
}

export enum TreatyType {
  PEACE = 'peace',
  TRADE = 'trade',
  ALLIANCE = 'alliance',
  NON_AGGRESSION = 'non_aggression',
  MUTUAL_DEFENSE = 'mutual_defense',
}

export enum TreatyStatus {
  ACTIVE = 'active',
  VIOLATED = 'violated',
  EXPIRED = 'expired',
  RENEGOTIATED = 'renegotiated',
}

// ===== EVOLUTION TYPES =====
export interface Achievement {
  id: string;
  name: string;
  type: AchievementType;
  description: string;
  requirements: AchievementRequirement[];
  effects: AchievementEffect[];
  unlocked: boolean;
  unlockTime?: number;
  recipients: string[];
}

export enum AchievementType {
  PERSONAL = 'personal',
  SOCIETAL = 'societal',
  ENVIRONMENTAL = 'environmental',
  TECHNOLOGICAL = 'technological',
  CULTURAL = 'cultural',
}

export interface AchievementRequirement {
  type: string;
  value: any;
  met: boolean;
}

export interface AchievementEffect {
  type: string;
  target: string;
  value: number;
  permanent: boolean;
}

// ===== SIMULATION TYPES =====
export interface Simulation {
  id: string;
  name: string;
  world: World;
  agents: Agent[];
  factions: Faction[];
  time: TimeSystem;
  settings: SimulationSettings;
  state: SimulationState;
  events: SimulationEvent[];
  statistics: SimulationStatistics;
}

export interface SimulationSettings {
  timeScale: number;
  maxAgents: number;
  maxFactions: number;
  worldSize: WorldSize;
  difficulty: number; // 0-1
  realism: number; // 0-1
  chaos: number; // 0-1
}

export interface SimulationState {
  running: boolean;
  paused: boolean;
  speed: number;
  currentTick: number;
  lastUpdate: number;
}

export interface SimulationEvent {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  participants: string[];
  location?: Position;
  data: Record<string, any>;
}

export interface SimulationStatistics {
  totalAgents: number;
  livingAgents: number;
  totalFactions: number;
  totalConflicts: number;
  totalAchievements: number;
  averageAgentAge: number;
  averageFactionSize: number;
  worldDevelopment: number; // 0-1
  culturalDiversity: number; // 0-1
  technologicalProgress: number; // 0-1
}

// ===== UTILITY TYPES =====
export interface ResourceRequirement {
  type: string;
  amount: number;
  quality?: number;
}

export type Vector2D = [number, number];
export type Vector3D = [number, number, number];
export type Matrix = number[][];

// ===== EVENT TYPES =====
export interface Event {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, any>;
}

// ===== CONFIGURATION TYPES =====
export interface Configuration {
  simulation: SimulationSettings;
  neural: NeuralNetworkConfig;
  world: WorldConfig;
  social: SocialConfig;
  civilization: CivilizationConfig;
  conflict: ConflictConfig;
  evolution: EvolutionConfig;
}

export interface NeuralNetworkConfig {
  layers: number[];
  learningRate: number;
  activationFunction: ActivationFunction;
  memoryCapacity: number;
  decisionThreshold: number;
}

export interface WorldConfig {
  size: WorldSize;
  biomeTypes: BiomeType[];
  resourceDensity: number;
  weatherIntensity: number;
  eventFrequency: number;
}

export interface SocialConfig {
  maxRelationships: number;
  relationshipDecay: number;
  communicationRange: number;
  trustThreshold: number;
}

export interface CivilizationConfig {
  maxFactionSize: number;
  governmentTypes: string[];
  technologyTree: string[];
  buildingTypes: string[];
}

export interface ConflictConfig {
  combatSystem: string;
  damageMultiplier: number;
  healingRate: number;
  peaceThreshold: number;
}

export interface EvolutionConfig {
  mutationRate: number;
  inheritanceStrength: number;
  culturalTransmission: number;
  achievementWeight: number;
} 