import { WorldTile, TileType } from '../../types/simulation';
import { DFRoad, DFSettlement } from './DwarfFortressWorldGenerator';

export interface RoadProject {
  id: string;
  name: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  type: 'dirt' | 'stone' | 'paved' | 'magical';
  priority: number;
  progress: number;
  requiredEnergy: number;
  requiredResources: { type: string; amount: number }[];
  builders: string[]; // Agent IDs working on this road
  estimatedCompletion: number;
  createdAt: number;
  status: 'planned' | 'in_progress' | 'completed' | 'abandoned';
}

export interface RoadNeed {
  settlementId: string;
  settlementType: string;
  population: number;
  needs: {
    trade: number;
    defense: number;
    resources: number;
    travel: number;
  };
  priority: number;
}

export class RoadManager {
  private roads: DFRoad[] = [];
  private roadProjects: RoadProject[] = [];
  private roadNeeds: Map<string, RoadNeed> = new Map();
  private nextProjectId: number = 1;

  constructor() {}

  // Add a new road to the world
  public addRoad(road: DFRoad): void {
    this.roads.push(road);
  }

  // Get all roads
  public getRoads(): DFRoad[] {
    return this.roads;
  }

  // Get road projects
  public getRoadProjects(): RoadProject[] {
    return this.roadProjects;
  }

  // Analyze settlement needs and create road projects
  public analyzeSettlementNeeds(settlements: DFSettlement[]): void {
    this.roadNeeds.clear();
    
    for (const settlement of settlements) {
      const needs = this.calculateSettlementNeeds(settlement);
      this.roadNeeds.set(settlement.id, needs);
    }

    // Create road projects based on needs
    this.createRoadProjectsFromNeeds(settlements);
  }

  // Calculate what a settlement needs in terms of roads
  private calculateSettlementNeeds(settlement: DFSettlement): RoadNeed {
    const baseNeeds = {
      trade: 0.3,
      defense: 0.2,
      resources: 0.3,
      travel: 0.2
    };

    // Adjust needs based on settlement type
    switch (settlement.type) {
      case 'capital':
        baseNeeds.trade = 0.8;
        baseNeeds.defense = 0.6;
        baseNeeds.travel = 0.7;
        break;
      case 'city':
        baseNeeds.trade = 0.7;
        baseNeeds.defense = 0.4;
        baseNeeds.travel = 0.5;
        break;
      case 'town':
        baseNeeds.trade = 0.5;
        baseNeeds.defense = 0.3;
        baseNeeds.travel = 0.4;
        break;
      case 'village':
        baseNeeds.trade = 0.3;
        baseNeeds.defense = 0.2;
        baseNeeds.travel = 0.3;
        break;
      case 'hamlet':
        baseNeeds.trade = 0.2;
        baseNeeds.defense = 0.1;
        baseNeeds.travel = 0.2;
        break;
      case 'fortress':
        baseNeeds.defense = 0.8;
        baseNeeds.trade = 0.4;
        break;
      case 'monastery':
        baseNeeds.travel = 0.6;
        baseNeeds.trade = 0.2;
        break;
      case 'trading_post':
        baseNeeds.trade = 0.9;
        baseNeeds.travel = 0.7;
        break;
    }

    // Adjust based on population
    const populationFactor = Math.min(settlement.population / 1000, 2.0);
    baseNeeds.trade *= populationFactor;
    baseNeeds.travel *= populationFactor;

    // Calculate overall priority
    const priority = (baseNeeds.trade + baseNeeds.defense + baseNeeds.resources + baseNeeds.travel) / 4;

    return {
      settlementId: settlement.id,
      settlementType: settlement.type,
      population: settlement.population,
      needs: baseNeeds,
      priority
    };
  }

  // Create road projects based on settlement needs
  private createRoadProjectsFromNeeds(settlements: DFSettlement[]): void {
    const needsArray = Array.from(this.roadNeeds.values());
    
    // Sort settlements by priority
    needsArray.sort((a, b) => b.priority - a.priority);

    // Create road projects for high-priority settlements
    for (let i = 0; i < Math.min(needsArray.length, 10); i++) {
      const need = needsArray[i];
      if (!need) continue;
      
      const settlement = settlements.find(s => s.id === need.settlementId);
      if (!settlement) continue;

      // Find potential road destinations
      const destinations = this.findRoadDestinations(settlement, settlements, need);
      
      for (const destination of destinations) {
        const project = this.createRoadProject(settlement, destination, need);
        if (project) {
          this.roadProjects.push(project);
        }
      }
    }
  }

  // Find suitable destinations for roads from a settlement
  private findRoadDestinations(
    settlement: DFSettlement, 
    allSettlements: DFSettlement[], 
    need: RoadNeed
  ): DFSettlement[] {
    const destinations: DFSettlement[] = [];
    const maxDistance = 50; // Maximum road distance

    for (const otherSettlement of allSettlements) {
      if (otherSettlement.id === settlement.id) continue;

      const distance = this.calculateDistance(settlement.position, otherSettlement.position);
      if (distance > maxDistance) continue;

      // Check if road already exists
      if (this.roadExists(settlement.id, otherSettlement.id)) continue;

      // Score this destination based on needs
      const score = this.scoreDestination(settlement, otherSettlement, need);
      if (score > 0.3) { // Minimum score threshold
        destinations.push(otherSettlement);
      }
    }

    // Sort by score and return top candidates
    destinations.sort((a, b) => {
      const scoreA = this.scoreDestination(settlement, a, need);
      const scoreB = this.scoreDestination(settlement, b, need);
      return scoreB - scoreA;
    });

    return destinations.slice(0, 3); // Return top 3 destinations
  }

  // Score a potential road destination
  private scoreDestination(
    from: DFSettlement, 
    to: DFSettlement, 
    need: RoadNeed
  ): number {
    let score = 0;

    // Distance factor (closer is better)
    const distance = this.calculateDistance(from.position, to.position);
    const distanceScore = Math.max(0, 1 - (distance / 50));
    score += distanceScore * 0.3;

    // Settlement type compatibility
    if (need.needs.trade > 0.5 && to.type === 'trading_post') {
      score += 0.4;
    }
    if (need.needs.defense > 0.5 && to.type === 'fortress') {
      score += 0.4;
    }
    if (need.needs.travel > 0.5 && to.type === 'monastery') {
      score += 0.3;
    }

    // Population factor (larger settlements are more important)
    const populationScore = Math.min(to.population / 1000, 1.0);
    score += populationScore * 0.2;

    // Civilization factor (same civilization gets bonus)
    if (from.civilization === to.civilization) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  // Create a road project
  private createRoadProject(
    from: DFSettlement, 
    to: DFSettlement, 
    need: RoadNeed
  ): RoadProject | null {
    const distance = this.calculateDistance(from.position, to.position);
    
    // Determine road type based on settlement types and distance
    let roadType: 'dirt' | 'stone' | 'paved' | 'magical' = 'dirt';
    if (from.type === 'capital' || to.type === 'capital') {
      roadType = 'paved';
    } else if (from.type === 'city' || to.type === 'city') {
      roadType = 'stone';
    } else if (distance > 30) {
      roadType = 'stone';
    }

    // Calculate required resources and energy
    const requiredEnergy = distance * 0.1;
    const requiredResources = this.calculateRequiredResources(roadType, distance);

    const project: RoadProject = {
      id: `road_project_${this.nextProjectId++}`,
      name: `${from.name} to ${to.name} Road`,
      startPoint: from.position,
      endPoint: to.position,
      type: roadType,
      priority: need.priority,
      progress: 0,
      requiredEnergy,
      requiredResources,
      builders: [],
      estimatedCompletion: Date.now() + (distance * 1000), // Rough estimate
      createdAt: Date.now(),
      status: 'planned'
    };

    return project;
  }

  // Calculate required resources for a road
  private calculateRequiredResources(
    roadType: string, 
    distance: number
  ): { type: string; amount: number }[] {
    const resources: { type: string; amount: number }[] = [];

    switch (roadType) {
      case 'dirt':
        resources.push({ type: 'stone', amount: distance * 0.5 });
        break;
      case 'stone':
        resources.push({ type: 'stone', amount: distance * 2 });
        resources.push({ type: 'wood', amount: distance * 0.5 });
        break;
      case 'paved':
        resources.push({ type: 'stone', amount: distance * 3 });
        resources.push({ type: 'metal', amount: distance * 0.2 });
        break;
      case 'magical':
        resources.push({ type: 'stone', amount: distance * 2 });
        resources.push({ type: 'magical_essence', amount: distance * 0.1 });
        break;
    }

    return resources;
  }

  // Check if a road already exists between two settlements
  private roadExists(settlement1Id: string, settlement2Id: string): boolean {
    return this.roads.some(road => 
      road.settlements.includes(settlement1Id) && 
      road.settlements.includes(settlement2Id)
    );
  }

  // Calculate distance between two points
  private calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Get available road projects for agents
  public getAvailableProjects(): RoadProject[] {
    return this.roadProjects.filter(project => 
      project.status === 'planned' || project.status === 'in_progress'
    );
  }

  // Assign an agent to work on a road project
  public assignAgentToProject(agentId: string, projectId: string): boolean {
    const project = this.roadProjects.find(p => p.id === projectId);
    if (!project || project.status === 'completed' || project.status === 'abandoned') {
      return false;
    }

    if (!project.builders.includes(agentId)) {
      project.builders.push(agentId);
      if (project.status === 'planned') {
        project.status = 'in_progress';
      }
    }

    return true;
  }

  // Remove an agent from a road project
  public removeAgentFromProject(agentId: string, projectId: string): void {
    const project = this.roadProjects.find(p => p.id === projectId);
    if (project) {
      project.builders = project.builders.filter(id => id !== agentId);
      
      // If no builders, mark as planned again
      if (project.builders.length === 0 && project.status === 'in_progress') {
        project.status = 'planned';
      }
    }
  }

  // Work on a road project (called by agents)
  public workOnProject(projectId: string, energy: number, resources: { type: string; amount: number }[]): number {
    const project = this.roadProjects.find(p => p.id === projectId);
    if (!project || project.status !== 'in_progress') {
      return 0;
    }

    // Calculate progress based on energy and resources
    let progressMade = 0;

    // Energy contribution
    const energyProgress = (energy / project.requiredEnergy) * 0.1;
    progressMade += energyProgress;

    // Resource contribution
    for (const resource of resources) {
      const required = project.requiredResources.find(r => r.type === resource.type);
      if (required) {
        const resourceProgress = (resource.amount / required.amount) * 0.05;
        progressMade += resourceProgress;
      }
    }

    // Update project progress
    project.progress = Math.min(1.0, project.progress + progressMade);

    // Check if project is complete
    if (project.progress >= 1.0) {
      this.completeProject(project);
    }

    return progressMade;
  }

  // Complete a road project
  private completeProject(project: RoadProject): void {
    project.status = 'completed';
    project.progress = 1.0;

    // Create the actual road
    const road: DFRoad = {
      id: `road_${this.roads.length}`,
      name: project.name,
      points: [project.startPoint, project.endPoint],
      width: 1 + Math.random() * 2,
      type: project.type,
      condition: 1.0,
      settlements: [] // Will be populated by settlement IDs
    };

    this.roads.push(road);
  }

  // Get road needs for a specific settlement
  public getSettlementNeeds(settlementId: string): RoadNeed | null {
    return this.roadNeeds.get(settlementId) || null;
  }

  // Update road conditions over time
  public updateRoadConditions(): void {
    for (const road of this.roads) {
      // Roads degrade over time
      road.condition = Math.max(0.1, road.condition - 0.001);
    }
  }
} 