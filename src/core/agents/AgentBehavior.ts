import { Agent, AgentStatus } from '../../types/simulation';

export class AgentBehavior {
  private agent: Agent;
  private behaviorHistory: string[] = [];
  private currentBehavior: string = 'idle';
  private behaviorTimer: number = 0;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  public update(agent: Agent, _tick: number): void {
    this.agent = agent;
    this.behaviorTimer++;

    // Update behavior based on current state and personality
    this.updateBehavior();

    // Apply behavior effects
    this.applyBehaviorEffects();
  }

  private updateBehavior(): void {
    const status = this.agent.status;

    // Determine behavior based on current status and personality
    switch (status) {
      case AgentStatus.SLEEPING:
        this.currentBehavior = 'sleeping';
        break;
      case AgentStatus.SOCIALIZING:
        this.currentBehavior = 'socializing';
        break;
      case AgentStatus.WORKING:
        this.currentBehavior = 'working';
        break;
      case AgentStatus.EXPLORING:
        this.currentBehavior = 'exploring';
        break;
      case AgentStatus.FIGHTING:
        this.currentBehavior = 'fighting';
        break;
      case AgentStatus.FLEEING:
        this.currentBehavior = 'fleeing';
        break;
      default:
        this.currentBehavior = this.determineIdleBehavior();
    }

    // Record behavior change
    if (this.behaviorHistory.length === 0 || 
        this.behaviorHistory[this.behaviorHistory.length - 1] !== this.currentBehavior) {
      this.behaviorHistory.push(this.currentBehavior);
      this.behaviorTimer = 0;
    }

    // Keep behavior history manageable
    if (this.behaviorHistory.length > 20) {
      this.behaviorHistory.shift();
    }
  }

  private determineIdleBehavior(): string {
    const personality = this.agent.personality;
    
    // High extraversion leads to social behaviors
    if (personality.extraversion > 0.7) {
      return 'seeking_social';
    }
    
    // High openness leads to exploration
    if (personality.openness > 0.7) {
      return 'curious';
    }
    
    // High conscientiousness leads to productive behaviors
    if (personality.conscientiousness > 0.7) {
      return 'planning';
    }
    
    // High neuroticism leads to anxious behaviors
    if (personality.neuroticism > 0.7) {
      return 'anxious';
    }
    
    // Default idle behavior
    return 'idle';
  }

  private applyBehaviorEffects(): void {
    switch (this.currentBehavior) {
      case 'sleeping':
        // Sleeping restores energy
        this.agent.energy = Math.min(1.0, this.agent.energy + 0.02);
        break;
        
      case 'socializing':
        // Socializing affects mood and relationships
        if (this.agent.personality.extraversion > 0.5) {
          this.agent.energy = Math.min(1.0, this.agent.energy + 0.005);
        } else {
          this.agent.energy = Math.max(0, this.agent.energy - 0.002);
        }
        break;
        
      case 'working':
        // Working consumes energy but can be rewarding
        this.agent.energy = Math.max(0, this.agent.energy - 0.01);
        break;
        
      case 'exploring':
        // Exploring consumes energy but increases knowledge
        this.agent.energy = Math.max(0, this.agent.energy - 0.005);
        break;
        
      case 'fighting':
        // Fighting is very energy intensive
        this.agent.energy = Math.max(0, this.agent.energy - 0.02);
        this.agent.health = Math.max(0, this.agent.health - 0.01);
        break;
        
      case 'fleeing':
        // Fleeing is energy intensive
        this.agent.energy = Math.max(0, this.agent.energy - 0.015);
        break;
        
      case 'anxious':
        // Anxiety consumes energy
        this.agent.energy = Math.max(0, this.agent.energy - 0.003);
        break;
        
      default:
        // Idle behavior has minimal effects
        break;
    }
  }

  public getCurrentBehavior(): string {
    return this.currentBehavior;
  }

  public getBehaviorHistory(): string[] {
    return [...this.behaviorHistory];
  }

  public getBehaviorTimer(): number {
    return this.behaviorTimer;
  }

  public isBehaviorStable(): boolean {
    // Check if the agent has been in the same behavior for a while
    return this.behaviorTimer > 50; // 50 ticks = 5 seconds at 10 ticks/second
  }

  public shouldChangeBehavior(): boolean {
    // Determine if it's time to change behavior
    const personality = this.agent.personality;
    
    // High neuroticism makes agents change behavior more frequently
    if (personality.neuroticism > 0.8) {
      return Math.random() < 0.1; // 10% chance per tick
    }
    
    // Low conscientiousness makes agents less stable
    if (personality.conscientiousness < 0.3) {
      return Math.random() < 0.05; // 5% chance per tick
    }
    
    // Default: change behavior after a certain time
    return this.behaviorTimer > 100; // 10 seconds
  }
} 