import { EventEmitter } from 'events';
import { Agent, AgentStatus, Personality, Memory, Trait, Skill, Goal, SimulationState, WorldTile } from '../../types/simulation';
import { AgentAI } from './AgentAI';
import { AgentBehavior } from './AgentBehavior';
import { AgentMemory } from './AgentMemory';

export class AgentManager extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private agentAI: Map<string, AgentAI> = new Map();
  private agentBehavior: Map<string, AgentBehavior> = new Map();
  private agentMemory: Map<string, AgentMemory> = new Map();
  private state: SimulationState;
  private nextAgentId: number = 1;

  constructor(state: SimulationState) {
    super();
    this.state = state;
  }

  public initialize(): void {
    console.log('🤖 Initializing Agent Manager...');
    
    // Create initial population
    this.createInitialPopulation();
    
    console.log(`✅ Agent Manager initialized with ${this.agents.size} agents`);
  }

  private createInitialPopulation(): void {
    const initialCount = Math.min(50, this.state.settings.maxAgents);
    
    for (let i = 0; i < initialCount; i++) {
      this.createAgent();
    }
  }

  public createAgent(position?: { x: number; y: number }): Agent {
    const id = `agent_${this.nextAgentId++}`;
    
    // Generate random position if not provided
    const agentPosition = position || {
      x: Math.random() * this.state.worldSize.width,
      y: Math.random() * this.state.worldSize.height,
    };

    // Create agent with random personality and traits
    const agent: Agent = {
      id,
      name: this.generateName(),
      position: agentPosition,
      velocity: { x: 0, y: 0 },
      health: 1.0,
      energy: 1.0,
      age: Math.floor(Math.random() * 30) + 18, // 18-48 years old
      personality: this.generatePersonality(),
      memory: this.createInitialMemory(),
      relationships: [],
      status: AgentStatus.ALIVE,
      traits: this.generateTraits(),
      skills: this.generateSkills(),
      goals: this.generateGoals(),
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    // Create AI, behavior, and memory systems for this agent
    this.agentAI.set(id, new AgentAI(agent));
    this.agentBehavior.set(id, new AgentBehavior(agent));
    this.agentMemory.set(id, new AgentMemory(agent));

    // Add to agents map
    this.agents.set(id, agent);

    // Emit event
    this.emit('agent:created', agent);

    return agent;
  }

  public update(tick: number): void {
    const agents = Array.from(this.agents.values());
    
    for (const agent of agents) {
      try {
        this.updateAgent(agent, tick);
      } catch (error) {
        console.error(`Error updating agent ${agent.id}:`, error);
      }
    }

    // Clean up dead agents
    this.cleanupDeadAgents();
  }

  private updateAgent(agent: Agent, tick: number): void {
    // Skip dead agents
    if (agent.status === AgentStatus.DEAD) return;

    // Update age
    if (tick % 1000 === 0) { // Age every 1000 ticks
      agent.age += 1;
    }

    // Update energy and health
    this.updateVitals(agent);

    // Get AI decisions
    const ai = this.agentAI.get(agent.id);
    if (ai) {
      const decision = ai.makeDecision(agent, tick);
      this.executeDecision(agent, decision);
    }

    // Update behavior
    const behavior = this.agentBehavior.get(agent.id);
    if (behavior) {
      behavior.update(agent, tick);
    }

    // Update memory
    const memory = this.agentMemory.get(agent.id);
    if (memory) {
      memory.update(agent, tick);
    }

    // Update position based on velocity
    this.updatePosition(agent);

    // Check for death conditions
    this.checkDeathConditions(agent);

    // Update timestamp
    agent.lastUpdated = Date.now();
  }

  private updateVitals(agent: Agent): void {
    // Energy decreases over time
    agent.energy = Math.max(0, agent.energy - 0.001);
    
    // Health decreases if energy is low
    if (agent.energy < 0.2) {
      agent.health = Math.max(0, agent.health - 0.002);
    }
    
    // Health can regenerate if energy is high
    if (agent.energy > 0.8 && agent.health < 1.0) {
      agent.health = Math.min(1.0, agent.health + 0.001);
    }
  }

  private executeDecision(agent: Agent, decision: any): void {
    // Execute AI decision (simplified for now)
    if (decision.type === 'move') {
      agent.velocity.x = decision.velocity.x;
      agent.velocity.y = decision.velocity.y;
    } else if (decision.type === 'rest') {
      agent.status = AgentStatus.SLEEPING;
      agent.energy = Math.min(1.0, agent.energy + 0.01);
    } else if (decision.type === 'socialize') {
      agent.status = AgentStatus.SOCIALIZING;
    } else if (decision.type === 'build_road') {
      agent.status = AgentStatus.WORKING;
      // Road building logic will be handled by the RoadManager
      // This just sets the agent to working status
    }
  }

  private updatePosition(agent: Agent): void {
    // Update position based on velocity
    agent.position.x += agent.velocity.x;
    agent.position.y += agent.velocity.y;

    // Keep agent within world bounds
    agent.position.x = Math.max(0, Math.min(this.state.worldSize.width, agent.position.x));
    agent.position.y = Math.max(0, Math.min(this.state.worldSize.height, agent.position.y));

    // Apply friction to velocity
    agent.velocity.x *= 0.95;
    agent.velocity.y *= 0.95;
  }

  private checkDeathConditions(agent: Agent): void {
    if (agent.health <= 0 || agent.energy <= 0 || agent.age > 80) {
      this.killAgent(agent.id);
    }
  }

  private killAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.status = AgentStatus.DEAD;
    this.emit('agent:destroyed', agentId);
  }

  private cleanupDeadAgents(): void {
    const deadAgents = Array.from(this.agents.values()).filter(agent => agent.status === AgentStatus.DEAD);
    
    for (const agent of deadAgents) {
      this.agents.delete(agent.id);
      this.agentAI.delete(agent.id);
      this.agentBehavior.delete(agent.id);
      this.agentMemory.delete(agent.id);
    }
  }

  public getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  public getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getAgentCount(): number {
    return this.agents.size;
  }

  public getStatistics(): any {
    const agents = Array.from(this.agents.values());
    const aliveAgents = agents.filter(a => a.status === AgentStatus.ALIVE);
    
    return {
      totalAgents: agents.length,
      aliveAgents: aliveAgents.length,
      averageAge: aliveAgents.length > 0 ? aliveAgents.reduce((sum, a) => sum + a.age, 0) / aliveAgents.length : 0,
      averageHealth: aliveAgents.length > 0 ? aliveAgents.reduce((sum, a) => sum + a.health, 0) / aliveAgents.length : 0,
      averageEnergy: aliveAgents.length > 0 ? aliveAgents.reduce((sum, a) => sum + a.energy, 0) / aliveAgents.length : 0,
    };
  }

  /**
   * Place an agent on a specific tile
   */
  public placeAgentOnTile(agent: Agent, tile: WorldTile): boolean {
    // Remove agent from current tile if any
    this.removeAgentFromCurrentTile(agent);

    // Add agent to new tile
    if (!tile.agents.includes(agent.id)) {
      tile.agents.push(agent.id);
    }

    // Update agent position to tile center
    agent.position = { x: tile.x, y: tile.y };

    this.emit('agent:placed', { agent, tile });

    return true;
  }

  /**
   * Remove an agent from their current tile
   */
  public removeAgentFromCurrentTile(agent: Agent): void {
    // This would need to be implemented with a reverse lookup
    // For now, we'll assume the tile manager handles this
  }

  /**
   * Get all agents on a specific tile
   */
  public getAgentsOnTile(tile: WorldTile): Agent[] {
    return tile.agents
      .map(agentId => this.getAgent(agentId))
      .filter(agent => agent !== undefined) as Agent[];
  }

  /**
   * Move an agent to a new position and update their tile
   */
  public moveAgent(agent: Agent, newPosition: { x: number; y: number }, newTile?: WorldTile): void {
    // Update agent position
    agent.position = newPosition;
    
    // If new tile is provided, place agent on it
    if (newTile) {
      this.placeAgentOnTile(agent, newTile);
    }

    this.emit('agent:moved', { agent, newPosition, newTile });
  }

  /**
   * Get agents within a certain range of a position
   */
  public getAgentsInRange(center: { x: number; y: number }, range: number): Agent[] {
    const agents = Array.from(this.agents.values());
    return agents.filter(agent => {
      const distance = Math.sqrt(
        Math.pow(agent.position.x - center.x, 2) + 
        Math.pow(agent.position.y - center.y, 2)
      );
      return distance <= range;
    });
  }

  // Helper methods for generating agent properties
  private generateName(): string {
    const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Blake'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  private generatePersonality(): Personality {
    return {
      openness: Math.random(),
      conscientiousness: Math.random(),
      extraversion: Math.random(),
      agreeableness: Math.random(),
      neuroticism: Math.random(),
    };
  }

  private createInitialMemory(): Memory {
    return {
      shortTerm: [],
      longTerm: [],
      capacity: 100,
      decayRate: 0.01,
    };
  }

  private generateTraits(): Trait[] {
    const possibleTraits = [
      'intelligent', 'strong', 'charismatic', 'creative', 'analytical',
      'empathetic', 'ambitious', 'cautious', 'adventurous', 'loyal'
    ];
    
    const traitCount = Math.floor(Math.random() * 3) + 2; // 2-4 traits
    const traits: Trait[] = [];
    
    for (let i = 0; i < traitCount; i++) {
      const traitName = possibleTraits[Math.floor(Math.random() * possibleTraits.length)];
      if (traitName && !traits.find(t => t.name === traitName)) {
        traits.push({
          name: traitName,
          value: Math.random(),
          inherited: Math.random() > 0.5,
          mutable: Math.random() > 0.3,
        });
      }
    }
    
    return traits;
  }

  private generateSkills(): Skill[] {
    const skillCategories = ['physical', 'mental', 'social', 'technical'];
    const skills: Skill[] = [];
    
    for (const category of skillCategories) {
      if (Math.random() > 0.3) { // 70% chance to have a skill in each category
        skills.push({
          name: `${category}_skill`,
          level: Math.random(),
          experience: Math.random() * 100,
          category: category as any,
        });
      }
    }
    
    return skills;
  }

  private generateGoals(): Goal[] {
    const goalTypes = ['survival', 'social', 'achievement', 'exploration'];
    const goals: Goal[] = [];
    
    // Each agent has 1-3 goals
    const goalCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < goalCount; i++) {
      const type = goalTypes[Math.floor(Math.random() * goalTypes.length)];
      goals.push({
        id: `goal_${Date.now()}_${i}`,
        type: type as any,
        description: `Achieve ${type} goals`,
        priority: Math.random(),
        progress: 0,
      });
    }
    
    return goals;
  }
} 