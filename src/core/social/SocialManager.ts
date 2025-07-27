import { EventEmitter } from 'events';
import { SimulationState, Faction, Ideology, FactionRelationship, Policy } from '../../types/simulation';

export class SocialManager extends EventEmitter {
  private state: SimulationState;
  private factions: Map<string, Faction> = new Map();
  private nextFactionId: number = 1;

  constructor(state: SimulationState) {
    super();
    this.state = state;
  }

  public initialize(): void {
    console.log('👥 Initializing Social Manager...');
    this.createInitialFactions();
    console.log('✅ Social Manager initialized');
  }

  private createInitialFactions(): void {
    // Create a few initial factions
    const initialFactionCount = Math.min(3, this.state.settings.maxFactions);
    
    for (let i = 0; i < initialFactionCount; i++) {
      this.createFaction();
    }
  }

  public createFaction(): Faction {
    const id = `faction_${this.nextFactionId++}`;
    
    const faction: Faction = {
      id,
      name: this.generateFactionName(),
      leaderId: '', // Will be set when agents join
      members: [],
      territory: [],
      ideology: this.generateIdeology(),
      resources: [],
      relationships: [],
      policies: this.generatePolicies(),
      createdAt: Date.now(),
    };

    this.factions.set(id, faction);
    this.emit('social:factionFormed', faction);

    return faction;
  }

  public update(tick: number): void {
    // Update faction relationships
    this.updateFactionRelationships();

    // Update faction policies
    this.updateFactionPolicies();

    // Process social events
    this.processSocialEvents(tick);
  }

  private updateFactionRelationships(): void {
    const factions = Array.from(this.factions.values());

    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        const faction1 = factions[i];
        const faction2 = factions[j];

        // Get or create relationship
        let relationship = this.getFactionRelationship(faction1.id, faction2.id);
        if (!relationship) {
          relationship = {
            targetFactionId: faction2.id,
            type: 'neutral',
            strength: 0,
            trust: 0.5,
            lastInteraction: Date.now(),
          };
          faction1.relationships.push(relationship);
        }

        // Update relationship based on ideology compatibility
        this.updateRelationshipStrength(relationship, faction1.ideology, faction2.ideology);
      }
    }
  }

  private updateRelationshipStrength(
    relationship: FactionRelationship,
    ideology1: Ideology,
    ideology2: Ideology
  ): void {
    // Calculate compatibility based on ideology differences
    const individualismDiff = Math.abs(ideology1.individualism - ideology2.individualism);
    const hierarchyDiff = Math.abs(ideology1.hierarchy - ideology2.hierarchy);
    const traditionDiff = Math.abs(ideology1.tradition - ideology2.tradition);
    const aggressionDiff = Math.abs(ideology1.aggression - ideology2.aggression);
    const opennessDiff = Math.abs(ideology1.openness - ideology2.openness);

    // Overall compatibility (lower difference = higher compatibility)
    const compatibility = 1 - (
      individualismDiff + hierarchyDiff + traditionDiff + aggressionDiff + opennessDiff
    ) / 5;

    // Update relationship strength
    relationship.strength = Math.max(-1, Math.min(1, compatibility));

    // Determine relationship type
    if (relationship.strength > 0.5) {
      relationship.type = 'alliance';
    } else if (relationship.strength < -0.5) {
      relationship.type = 'enemy';
    } else if (Math.abs(relationship.strength) < 0.2) {
      relationship.type = 'neutral';
    } else {
      relationship.type = 'trade';
    }

    // Update trust based on relationship strength
    relationship.trust = Math.max(0, Math.min(1, 0.5 + relationship.strength * 0.5));
  }

  private updateFactionPolicies(): void {
    for (const faction of this.factions.values()) {
      for (const policy of faction.policies) {
        // Update policy support based on faction ideology
        this.updatePolicySupport(policy, faction.ideology);
      }
    }
  }

  private updatePolicySupport(policy: Policy, ideology: Ideology): void {
    // Policy support is influenced by ideology alignment
    let support = 0.5; // Base support

    switch (policy.type) {
      case 'economic':
        // Economic policies favor individualism
        support += (ideology.individualism - 0.5) * 0.3;
        break;
      case 'social':
        // Social policies favor openness
        support += (ideology.openness - 0.5) * 0.3;
        break;
      case 'military':
        // Military policies favor aggression
        support += (ideology.aggression - 0.5) * 0.3;
        break;
      case 'environmental':
        // Environmental policies favor tradition
        support += (1 - ideology.tradition - 0.5) * 0.3;
        break;
    }

    // Clamp support value
    policy.support = Math.max(0, Math.min(1, support));
  }

  private processSocialEvents(tick: number): void {
    // Process faction formation events
    if (tick % 1000 === 0) { // Every 1000 ticks
      this.processFactionFormation();
    }

    // Process relationship changes
    if (tick % 500 === 0) { // Every 500 ticks
      this.processRelationshipChanges();
    }
  }

  private processFactionFormation(): void {
    // Check if new factions should be formed
    if (this.factions.size < this.state.settings.maxFactions) {
      if (Math.random() < 0.1) { // 10% chance
        this.createFaction();
      }
    }
  }

  private processRelationshipChanges(): void {
    // Random relationship changes
    for (const faction of this.factions.values()) {
      for (const relationship of faction.relationships) {
        // Small random changes to relationship strength
        relationship.strength += (Math.random() - 0.5) * 0.1;
        relationship.strength = Math.max(-1, Math.min(1, relationship.strength));
      }
    }
  }

  public getFaction(id: string): Faction | undefined {
    return this.factions.get(id);
  }

  public getFactions(): Faction[] {
    return Array.from(this.factions.values());
  }

  public getFactionCount(): number {
    return this.factions.size;
  }

  public getFactionRelationship(faction1Id: string, faction2Id: string): FactionRelationship | null {
    const faction1 = this.factions.get(faction1Id);
    if (!faction1) return null;

    return faction1.relationships.find(r => r.targetFactionId === faction2Id) || null;
  }

  public addAgentToFaction(agentId: string, factionId: string): boolean {
    const faction = this.factions.get(factionId);
    if (!faction) return false;

    if (!faction.members.includes(agentId)) {
      faction.members.push(agentId);
      
      // Set as leader if no leader exists
      if (!faction.leaderId) {
        faction.leaderId = agentId;
      }

      this.emit('social:agentJoinedFaction', { agentId, factionId });
      return true;
    }

    return false;
  }

  public removeAgentFromFaction(agentId: string, factionId: string): boolean {
    const faction = this.factions.get(factionId);
    if (!faction) return false;

    const memberIndex = faction.members.indexOf(agentId);
    if (memberIndex !== -1) {
      faction.members.splice(memberIndex, 1);
      
      // If this was the leader, assign new leader
      if (faction.leaderId === agentId) {
        faction.leaderId = faction.members.length > 0 ? faction.members[0] : '';
      }

      this.emit('social:agentLeftFaction', { agentId, factionId });
      return true;
    }

    return false;
  }

  public getStatistics(): any {
    const factions = Array.from(this.factions.values());
    
    return {
      totalFactions: factions.length,
      averageFactionSize: factions.length > 0 
        ? factions.reduce((sum, f) => sum + f.members.length, 0) / factions.length 
        : 0,
      totalRelationships: factions.reduce((sum, f) => sum + f.relationships.length, 0),
      averageRelationshipStrength: this.calculateAverageRelationshipStrength(),
      conflictLevel: this.calculateConflictLevel(),
      cooperationLevel: this.calculateCooperationLevel(),
    };
  }

  private calculateAverageRelationshipStrength(): number {
    let totalStrength = 0;
    let relationshipCount = 0;

    for (const faction of this.factions.values()) {
      for (const relationship of faction.relationships) {
        totalStrength += relationship.strength;
        relationshipCount++;
      }
    }

    return relationshipCount > 0 ? totalStrength / relationshipCount : 0;
  }

  private calculateConflictLevel(): number {
    let conflictCount = 0;
    let totalRelationships = 0;

    for (const faction of this.factions.values()) {
      for (const relationship of faction.relationships) {
        if (relationship.type === 'enemy') {
          conflictCount++;
        }
        totalRelationships++;
      }
    }

    return totalRelationships > 0 ? conflictCount / totalRelationships : 0;
  }

  private calculateCooperationLevel(): number {
    let cooperationCount = 0;
    let totalRelationships = 0;

    for (const faction of this.factions.values()) {
      for (const relationship of faction.relationships) {
        if (relationship.type === 'alliance') {
          cooperationCount++;
        }
        totalRelationships++;
      }
    }

    return totalRelationships > 0 ? cooperationCount / totalRelationships : 0;
  }

  private generateFactionName(): string {
    const prefixes = ['The', 'New', 'United', 'Free', 'People\'s', 'Democratic', 'Progressive'];
    const nouns = ['Alliance', 'Federation', 'Union', 'Republic', 'Nation', 'Society', 'Community'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${prefix} ${noun}`;
  }

  private generateIdeology(): Ideology {
    return {
      individualism: Math.random(),
      hierarchy: Math.random(),
      tradition: Math.random(),
      aggression: Math.random(),
      openness: Math.random(),
    };
  }

  private generatePolicies(): Policy[] {
    const policyTypes = ['economic', 'social', 'military', 'environmental'];
    const policies: Policy[] = [];

    for (const type of policyTypes) {
      if (Math.random() > 0.3) { // 70% chance to have each policy type
        policies.push({
          name: `${type} policy`,
          type: type as any,
          effect: {
            resourceProduction: {},
            socialStability: Math.random() - 0.5,
            militaryStrength: Math.random() - 0.5,
            environmentalImpact: Math.random() - 0.5,
          },
          support: Math.random(),
        });
      }
    }

    return policies;
  }
} 