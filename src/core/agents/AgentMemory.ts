import { Agent, Memory, MemoryItem } from '../../types/simulation';

export class AgentMemory {
  private agent: Agent;
  private memoryDecayRate: number = 0.001; // Rate at which memories decay

  constructor(agent: Agent) {
    this.agent = agent;
  }

  public update(agent: Agent, tick: number): void {
    this.agent = agent;

    // Update memory decay
    this.updateMemoryDecay(tick);

    // Clean up old memories
    this.cleanupOldMemories();

    // Consolidate short-term memories to long-term
    this.consolidateMemories(tick);
  }

  private updateMemoryDecay(tick: number): void {
    const memory = this.agent.memory;

    // Decay short-term memories
    for (const item of memory.shortTerm) {
      item.importance = Math.max(0, item.importance - this.memoryDecayRate);
    }

    // Decay long-term memories (slower)
    for (const item of memory.longTerm) {
      item.importance = Math.max(0, item.importance - this.memoryDecayRate * 0.1);
    }
  }

  private cleanupOldMemories(): void {
    const memory = this.agent.memory;
    const currentTime = Date.now();

    // Remove short-term memories with very low importance
    memory.shortTerm = memory.shortTerm.filter(item => item.importance > 0.01);

    // Remove long-term memories that are too old or have very low importance
    memory.longTerm = memory.longTerm.filter(item => 
      item.importance > 0.05 && 
      (currentTime - item.timestamp) < 30 * 24 * 60 * 60 * 1000 // 30 days
    );
  }

  private consolidateMemories(tick: number): void {
    const memory = this.agent.memory;
    const currentTime = Date.now();

    // Move important short-term memories to long-term
    const importantShortTerm = memory.shortTerm.filter(item => 
      item.importance > 0.5 && 
      (currentTime - item.timestamp) > 5 * 60 * 1000 // 5 minutes
    );

    for (const item of importantShortTerm) {
      // Check if similar memory already exists in long-term
      const existingMemory = memory.longTerm.find(lt => 
        lt.type === item.type && 
        JSON.stringify(lt.content) === JSON.stringify(item.content)
      );

      if (existingMemory) {
        // Strengthen existing memory
        existingMemory.importance = Math.min(1.0, existingMemory.importance + 0.1);
        existingMemory.timestamp = currentTime;
      } else {
        // Add new long-term memory
        memory.longTerm.push({
          ...item,
          importance: item.importance * 0.8, // Slightly reduce importance during consolidation
          timestamp: currentTime,
        });
      }

      // Remove from short-term
      memory.shortTerm = memory.shortTerm.filter(st => st.id !== item.id);
    }
  }

  public addMemory(
    type: 'event' | 'person' | 'location' | 'fact',
    content: any,
    importance: number,
    tick: number
  ): void {
    const memory = this.agent.memory;
    const currentTime = Date.now();

    const memoryItem: MemoryItem = {
      id: `memory_${Date.now()}_${Math.random()}`,
      type,
      content,
      importance: Math.min(1.0, importance),
      timestamp: currentTime,
      decayTime: currentTime + (importance * 24 * 60 * 60 * 1000), // More important = longer decay
    };

    // Add to short-term memory
    memory.shortTerm.push(memoryItem);

    // Keep short-term memory size manageable
    if (memory.shortTerm.length > memory.capacity) {
      // Remove least important memories
      memory.shortTerm.sort((a, b) => b.importance - a.importance);
      memory.shortTerm = memory.shortTerm.slice(0, memory.capacity);
    }
  }

  public recallMemory(
    type?: 'event' | 'person' | 'location' | 'fact',
    contentFilter?: (content: any) => boolean
  ): MemoryItem[] {
    const memory = this.agent.memory;
    const allMemories = [...memory.shortTerm, ...memory.longTerm];

    let filteredMemories = allMemories;

    // Filter by type if specified
    if (type) {
      filteredMemories = filteredMemories.filter(item => item.type === type);
    }

    // Filter by content if specified
    if (contentFilter) {
      filteredMemories = filteredMemories.filter(item => contentFilter(item.content));
    }

    // Sort by importance and recency
    filteredMemories.sort((a, b) => {
      const importanceDiff = b.importance - a.importance;
      if (Math.abs(importanceDiff) > 0.1) {
        return importanceDiff;
      }
      return b.timestamp - a.timestamp;
    });

    return filteredMemories;
  }

  public getMemoryStats(): any {
    const memory = this.agent.memory;
    
    return {
      shortTermCount: memory.shortTerm.length,
      longTermCount: memory.longTerm.length,
      totalMemories: memory.shortTerm.length + memory.longTerm.length,
      averageShortTermImportance: memory.shortTerm.length > 0 
        ? memory.shortTerm.reduce((sum, item) => sum + item.importance, 0) / memory.shortTerm.length 
        : 0,
      averageLongTermImportance: memory.longTerm.length > 0 
        ? memory.longTerm.reduce((sum, item) => sum + item.importance, 0) / memory.longTerm.length 
        : 0,
      memoryCapacity: memory.capacity,
      memoryUtilization: (memory.shortTerm.length + memory.longTerm.length) / memory.capacity,
    };
  }

  public forgetMemory(memoryId: string): boolean {
    const memory = this.agent.memory;
    
    // Try to remove from short-term memory
    const shortTermIndex = memory.shortTerm.findIndex(item => item.id === memoryId);
    if (shortTermIndex !== -1) {
      memory.shortTerm.splice(shortTermIndex, 1);
      return true;
    }

    // Try to remove from long-term memory
    const longTermIndex = memory.longTerm.findIndex(item => item.id === memoryId);
    if (longTermIndex !== -1) {
      memory.longTerm.splice(longTermIndex, 1);
      return true;
    }

    return false;
  }

  public strengthenMemory(memoryId: string, amount: number = 0.1): boolean {
    const memory = this.agent.memory;
    
    // Try to strengthen in short-term memory
    const shortTermItem = memory.shortTerm.find(item => item.id === memoryId);
    if (shortTermItem) {
      shortTermItem.importance = Math.min(1.0, shortTermItem.importance + amount);
      return true;
    }

    // Try to strengthen in long-term memory
    const longTermItem = memory.longTerm.find(item => item.id === memoryId);
    if (longTermItem) {
      longTermItem.importance = Math.min(1.0, longTermItem.importance + amount);
      return true;
    }

    return false;
  }
} 