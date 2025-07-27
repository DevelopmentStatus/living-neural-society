import { Agent } from '../../types/simulation';

export interface AIDecision {
  type: 'move' | 'rest' | 'socialize' | 'work' | 'explore' | 'fight' | 'flee';
  priority: number;
  velocity?: { x: number; y: number };
  target?: { x: number; y: number };
  duration?: number;
  data?: any;
}

export class AgentAI {
  private agent: Agent;
  private decisionHistory: AIDecision[] = [];
  private currentGoal: string | null = null;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  public makeDecision(agent: Agent, _tick: number): AIDecision {
    // Update agent reference
    this.agent = agent;

    // Evaluate current situation
    const situation = this.evaluateSituation();
    
    // Generate possible actions
    const possibleActions = this.generatePossibleActions(situation);
    
    // Select best action based on personality and current state
    const decision = this.selectBestAction(possibleActions, situation);
    
    // Store decision in history
    this.decisionHistory.push(decision);
    
    // Keep only recent decisions
    if (this.decisionHistory.length > 10) {
      this.decisionHistory.shift();
    }

    return decision;
  }

  private evaluateSituation(): any {
    return {
      health: this.agent.health,
      energy: this.agent.energy,
      age: this.agent.age,
      status: this.agent.status,
      position: this.agent.position,
      personality: this.agent.personality,
      goals: this.agent.goals,
      relationships: this.agent.relationships,
      isLowEnergy: this.agent.energy < 0.3,
      isLowHealth: this.agent.health < 0.5,
      isOld: this.agent.age > 60,
      isYoung: this.agent.age < 25,
    };
  }

  private generatePossibleActions(situation: any): AIDecision[] {
    const actions: AIDecision[] = [];

    // Rest action - always available
    actions.push({
      type: 'rest',
      priority: situation.isLowEnergy ? 0.9 : 0.1,
    });

    // Move action - always available
    actions.push({
      type: 'move',
      priority: 0.5,
      velocity: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
      },
    });

    // Socialize action - based on extraversion
    if (this.agent.personality.extraversion > 0.6) {
      actions.push({
        type: 'socialize',
        priority: 0.7,
      });
    }

    // Work action - based on conscientiousness
    if (this.agent.personality.conscientiousness > 0.5) {
      actions.push({
        type: 'work',
        priority: 0.6,
      });
    }

    // Explore action - based on openness
    if (this.agent.personality.openness > 0.6) {
      actions.push({
        type: 'explore',
        priority: 0.5,
        target: {
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        },
      });
    }

    // Adjust priorities based on situation
    this.adjustPriorities(actions, situation);

    return actions;
  }

  private adjustPriorities(actions: AIDecision[], situation: any): void {
    for (const action of actions) {
      // Boost rest priority if low energy
      if (action.type === 'rest' && situation.isLowEnergy) {
        action.priority *= 2;
      }

      // Boost rest priority if low health
      if (action.type === 'rest' && situation.isLowHealth) {
        action.priority *= 1.5;
      }

      // Reduce movement priority if low energy
      if (action.type === 'move' && situation.isLowEnergy) {
        action.priority *= 0.5;
      }

      // Boost socialize priority if extraverted and not socializing
      if (action.type === 'socialize' && 
          this.agent.personality.extraversion > 0.7 && 
          this.agent.status !== 'socializing') {
        action.priority *= 1.3;
      }

      // Boost work priority if conscientious and not working
      if (action.type === 'work' && 
          this.agent.personality.conscientiousness > 0.7 && 
          this.agent.status !== 'working') {
        action.priority *= 1.3;
      }

      // Add some randomness to prevent predictable behavior
      action.priority *= 0.8 + Math.random() * 0.4; // ±20% variation
    }
  }

  private selectBestAction(actions: AIDecision[], _situation: any): AIDecision {
    // Sort actions by priority
    actions.sort((a, b) => b.priority - a.priority);

    // Sometimes choose a random action to add unpredictability
    if (Math.random() < 0.1 && actions.length > 0) { // 10% chance of random action
      return actions[Math.floor(Math.random() * actions.length)]!;
    }

    // Usually choose the highest priority action
    return actions[0] || { type: 'rest', priority: 1.0 }; // Fallback to rest if no actions
  }

  public getDecisionHistory(): AIDecision[] {
    return [...this.decisionHistory];
  }

  public getCurrentGoal(): string | null {
    return this.currentGoal;
  }

  public setCurrentGoal(goal: string | null): void {
    this.currentGoal = goal;
  }
} 