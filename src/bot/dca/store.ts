export interface DcaRule {
  id: string;
  userId: number;
  fromTokenId: string;
  toTokenId: string;
  fromSymbol: string;
  toSymbol: string;
  amount: string;
  cron: string;
  fromChain?: string;
  toChain?: string;
  withdraw?: {
    enabled: boolean;
    address: string;
    chain?: string;
  };
  dryRun?: boolean;
  createdAt: number;
  lastRunAt?: number;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

class DcaStore {
  private rules = new Map<string, DcaRule>();

  add(rule: Omit<DcaRule, "id" | "createdAt">): DcaRule {
    const id = generateId();
    const createdAt = Date.now();
    const entry: DcaRule = { ...rule, id, createdAt };
    this.rules.set(id, entry);
    return entry;
  }

  list(userId: number): DcaRule[] {
    return Array.from(this.rules.values()).filter(
      (rule) => rule.userId === userId
    );
  }

  get(id: string): DcaRule | undefined {
    return this.rules.get(id);
  }

  remove(userId: number, id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule || rule.userId !== userId) {
      return false;
    }
    return this.rules.delete(id);
  }
}

export const dcaStore = new DcaStore();
