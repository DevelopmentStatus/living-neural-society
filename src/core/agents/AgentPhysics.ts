import { Agent, AgentStatus } from '../../types/simulation';

export interface MovementFactors {
  age: number;
  health: number;
  energy: number;
  terrain: string;
  elevation: number;
  temperature: number;
  humidity: number;
  assistance: boolean;
  experience: number;
  personality: any;
}

export interface PhysicsResult {
  velocity: { x: number; y: number };
  energyCost: number;
  healthImpact: number;
  canMove: boolean;
  movementSpeed: number;
}

export class AgentPhysics {
  private static readonly BASE_SPEED = 2.0;
  private static readonly MAX_SPEED = 5.0;
  private static readonly MIN_SPEED = 0.1;

  public static calculateMovement(agent: Agent, targetVelocity: { x: number; y: number }, factors: MovementFactors): PhysicsResult {
    // Base movement speed
    let movementSpeed = this.BASE_SPEED;

    // Age factor - older agents move slower
    const ageFactor = this.calculateAgeFactor(factors.age);
    movementSpeed *= ageFactor;

    // Health factor - unhealthy agents move slower
    const healthFactor = this.calculateHealthFactor(factors.health);
    movementSpeed *= healthFactor;

    // Energy factor - tired agents move slower
    const energyFactor = this.calculateEnergyFactor(factors.energy);
    movementSpeed *= energyFactor;

    // Terrain factor - different terrains affect movement
    const terrainFactor = this.calculateTerrainFactor(factors.terrain, factors.elevation);
    movementSpeed *= terrainFactor;

    // Environmental factors
    const environmentalFactor = this.calculateEnvironmentalFactor(factors.temperature, factors.humidity);
    movementSpeed *= environmentalFactor;

    // Assistance factor - agents helping each other can move faster
    const assistanceFactor = factors.assistance ? 1.2 : 1.0;
    movementSpeed *= assistanceFactor;

    // Experience factor - experienced agents are more efficient
    const experienceFactor = this.calculateExperienceFactor(factors.experience);
    movementSpeed *= experienceFactor;

    // Personality factor - some personalities affect movement
    const personalityFactor = this.calculatePersonalityFactor(factors.personality);
    movementSpeed *= personalityFactor;

    // Clamp movement speed
    movementSpeed = Math.max(this.MIN_SPEED, Math.min(this.MAX_SPEED, movementSpeed));

    // Calculate energy cost
    const energyCost = this.calculateEnergyCost(targetVelocity, movementSpeed, factors);

    // Calculate health impact
    const healthImpact = this.calculateHealthImpact(energyCost, factors);

    // Determine if agent can move
    const canMove = this.canAgentMove(agent, energyCost, factors);

    // Apply movement speed to velocity
    const velocity = {
      x: targetVelocity.x * movementSpeed,
      y: targetVelocity.y * movementSpeed,
    };

    return {
      velocity,
      energyCost,
      healthImpact,
      canMove,
      movementSpeed,
    };
  }

  private static calculateAgeFactor(age: number): number {
    if (age < 20) {
      return 1.2; // Young agents are fast
    } else if (age < 40) {
      return 1.0; // Prime age
    } else if (age < 60) {
      return 0.8; // Middle age
    } else if (age < 80) {
      return 0.6; // Elderly
    } else {
      return 0.4; // Very elderly
    }
  }

  private static calculateHealthFactor(health: number): number {
    if (health > 0.8) {
      return 1.0; // Healthy
    } else if (health > 0.6) {
      return 0.9; // Slightly unhealthy
    } else if (health > 0.4) {
      return 0.7; // Unhealthy
    } else if (health > 0.2) {
      return 0.5; // Very unhealthy
    } else {
      return 0.3; // Critical health
    }
  }

  private static calculateEnergyFactor(energy: number): number {
    if (energy > 0.8) {
      return 1.0; // Well rested
    } else if (energy > 0.6) {
      return 0.9; // Slightly tired
    } else if (energy > 0.4) {
      return 0.7; // Tired
    } else if (energy > 0.2) {
      return 0.5; // Very tired
    } else {
      return 0.3; // Exhausted
    }
  }

  private static calculateTerrainFactor(terrain: string, elevation: number): number {
    switch (terrain) {
      case 'grass':
        return 1.0;
      case 'forest':
        return 0.7; // Trees slow movement
      case 'mountain':
        return 0.4; // Mountains are very slow
      case 'water':
        return 0.3; // Water is very slow
      case 'desert':
        return 0.6; // Sand slows movement
      case 'urban':
        return 0.9; // Urban areas are slightly slower
      case 'farm':
        return 0.8; // Farmland is slightly slower
      case 'road':
        return 1.2; // Roads are faster
      default:
        return 1.0;
    }
  }

  private static calculateEnvironmentalFactor(temperature: number, humidity: number): number {
    // Extreme temperatures slow movement
    let tempFactor = 1.0;
    if (temperature < 0.2 || temperature > 0.8) {
      tempFactor = 0.8; // Too cold or too hot
    } else if (temperature < 0.3 || temperature > 0.7) {
      tempFactor = 0.9; // Uncomfortable temperature
    }

    // High humidity can slow movement
    let humidityFactor = 1.0;
    if (humidity > 0.8) {
      humidityFactor = 0.9; // Very humid
    } else if (humidity > 0.6) {
      humidityFactor = 0.95; // Humid
    }

    return tempFactor * humidityFactor;
  }

  private static calculateExperienceFactor(experience: number): number {
    // More experience means more efficient movement
    return 0.8 + (experience / 100) * 0.4; // 0.8 to 1.2 range
  }

  private static calculatePersonalityFactor(personality: any): number {
    let factor = 1.0;

    // Extraversion affects social movement
    if (personality.extraversion > 0.7) {
      factor *= 1.1; // Extraverts move faster in social situations
    }

    // Neuroticism affects movement under stress
    if (personality.neuroticism > 0.7) {
      factor *= 0.9; // High neuroticism can slow movement
    }

    // Conscientiousness affects movement efficiency
    if (personality.conscientiousness > 0.7) {
      factor *= 1.05; // Conscientious agents are more efficient
    }

    return factor;
  }

  private static calculateEnergyCost(velocity: { x: number; y: number }, movementSpeed: number, factors: MovementFactors): number {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    let baseCost = speed * 0.01; // Base energy cost

    // Age affects energy cost
    if (factors.age > 60) {
      baseCost *= 1.5; // Elderly use more energy
    } else if (factors.age < 20) {
      baseCost *= 0.8; // Young use less energy
    }

    // Health affects energy cost
    if (factors.health < 0.5) {
      baseCost *= 1.3; // Unhealthy agents use more energy
    }

    // Terrain affects energy cost
    switch (factors.terrain) {
      case 'mountain':
        baseCost *= 2.0; // Mountains are very energy intensive
        break;
      case 'water':
        baseCost *= 1.8; // Water is energy intensive
        break;
      case 'forest':
        baseCost *= 1.3; // Forests are somewhat energy intensive
        break;
      case 'desert':
        baseCost *= 1.4; // Deserts are energy intensive
        break;
    }

    // Temperature affects energy cost
    if (factors.temperature < 0.3 || factors.temperature > 0.7) {
      baseCost *= 1.2; // Extreme temperatures use more energy
    }

    return baseCost;
  }

  private static calculateHealthImpact(energyCost: number, factors: MovementFactors): number {
    let healthImpact = 0;

    // High energy cost can damage health
    if (energyCost > 0.05) {
      healthImpact = (energyCost - 0.05) * 0.1;
    }

    // Low health makes movement more damaging
    if (factors.health < 0.3) {
      healthImpact *= 2.0;
    }

    // Age affects health impact
    if (factors.age > 70) {
      healthImpact *= 1.5;
    }

    return healthImpact;
  }

  private static canAgentMove(agent: Agent, energyCost: number, factors: MovementFactors): boolean {
    // Check if agent has enough energy
    if (agent.energy < energyCost) {
      return false;
    }

    // Check if agent is in a state that prevents movement
    if (agent.status === AgentStatus.DEAD || 
        agent.status === AgentStatus.UNCONSCIOUS || 
        agent.status === AgentStatus.SLEEPING) {
      return false;
    }

    // Check if agent is too old and tired
    if (factors.age > 80 && factors.energy < 0.3) {
      return false;
    }

    // Check if agent is too unhealthy
    if (factors.health < 0.1) {
      return false;
    }

    return true;
  }

  public static applyMovement(agent: Agent, physicsResult: PhysicsResult): void {
    if (!physicsResult.canMove) {
      // Agent cannot move, set velocity to zero
      agent.velocity.x = 0;
      agent.velocity.y = 0;
      return;
    }

    // Apply calculated velocity
    agent.velocity.x = physicsResult.velocity.x;
    agent.velocity.y = physicsResult.velocity.y;

    // Apply energy cost
    agent.energy = Math.max(0, agent.energy - physicsResult.energyCost);

    // Apply health impact
    agent.health = Math.max(0, agent.health - physicsResult.healthImpact);

    // Update position based on velocity
    agent.position.x += agent.velocity.x;
    agent.position.y += agent.velocity.y;

    // Apply friction to velocity
    agent.velocity.x *= 0.95;
    agent.velocity.y *= 0.95;
  }

  public static getMovementEfficiency(agent: Agent, factors: MovementFactors): number {
    // Calculate how efficiently the agent can move
    const ageFactor = this.calculateAgeFactor(factors.age);
    const healthFactor = this.calculateHealthFactor(factors.health);
    const energyFactor = this.calculateEnergyFactor(factors.energy);
    const terrainFactor = this.calculateTerrainFactor(factors.terrain, factors.elevation);
    const environmentalFactor = this.calculateEnvironmentalFactor(factors.temperature, factors.humidity);
    const experienceFactor = this.calculateExperienceFactor(factors.experience);
    const personalityFactor = this.calculatePersonalityFactor(factors.personality);

    return ageFactor * healthFactor * energyFactor * terrainFactor * 
           environmentalFactor * experienceFactor * personalityFactor;
  }
} 