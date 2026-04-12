export interface EconomyConfig {
  startingMoney: number;
  startingLives: number;
  interestRate: number;
  maxInterest: number;
  interestInterval: number;
  roundBonusBase: number;
  roundBonusMultiplier: number;
  sellRefundPercent: number;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  startingMoney: 650,
  startingLives: 20,
  interestRate: 0,
  maxInterest: 200,
  interestInterval: 5000,
  roundBonusBase: 100,
  roundBonusMultiplier: 50,
  sellRefundPercent: 0.7,
};

export interface Transaction {
  type: TransactionType;
  amount: number;
  timestamp: number;
  description: string;
}

export enum TransactionType {
  KillReward = 'kill_reward',
  Interest = 'interest',
  RoundBonus = 'round_bonus',
  TowerPurchase = 'tower_purchase',
  TowerSell = 'tower_sell',
  TowerUpgrade = 'tower_upgrade',
  LifeLost = 'life_lost',
  GameOver = 'game_over',
}

export class GameEconomy {
  private money: number;
  private lives: number;
  private config: EconomyConfig;
  private transactions: Transaction[];
  private lastInterestTime: number;
  private roundsCompleted: number;
  private totalEarned: number;
  private totalSpent: number;

  constructor(config: Partial<EconomyConfig> = {}) {
    this.config = { ...DEFAULT_ECONOMY_CONFIG, ...config };
    this.money = this.config.startingMoney;
    this.lives = this.config.startingLives;
    this.transactions = [];
    this.lastInterestTime = 0;
    this.roundsCompleted = 0;
    this.totalEarned = 0;
    this.totalSpent = 0;
  }

  getMoney(): number {
    return this.money;
  }

  getLives(): number {
    return this.lives;
  }

  getConfig(): EconomyConfig {
    return { ...this.config };
  }

  getRoundsCompleted(): number {
    return this.roundsCompleted;
  }

  getTotalEarned(): number {
    return this.totalEarned;
  }

  getTotalSpent(): number {
    return this.totalSpent;
  }

  getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  canAfford(amount: number): boolean {
    return this.money >= amount;
  }

  addKillReward(amount: number, description: string = 'Enemy killed'): boolean {
    this.money += amount;
    this.totalEarned += amount;
    this.transactions.push({
      type: TransactionType.KillReward,
      amount,
      timestamp: Date.now(),
      description,
    });
    return true;
  }

  addInterest(currentTime: number): number {
    if (currentTime - this.lastInterestTime < this.config.interestInterval) {
      return 0;
    }

    const interestEarned = Math.min(
      Math.floor(this.money * this.config.interestRate),
      this.config.maxInterest
    );

    if (interestEarned > 0) {
      this.money += interestEarned;
      this.totalEarned += interestEarned;
      this.lastInterestTime = currentTime;
      this.transactions.push({
        type: TransactionType.Interest,
        amount: interestEarned,
        timestamp: currentTime,
        description: `Interest earned (${Math.round(this.config.interestRate * 100)}%)`,
      });
    }

    return interestEarned;
  }

  addRoundBonus(): number {
    const bonus = this.config.roundBonusBase + (this.roundsCompleted * this.config.roundBonusMultiplier);
    this.money += bonus;
    this.totalEarned += bonus;
    this.roundsCompleted++;
    this.transactions.push({
      type: TransactionType.RoundBonus,
      amount: bonus,
      timestamp: Date.now(),
      description: `Round ${this.roundsCompleted} completed`,
    });
    return bonus;
  }

  spend(amount: number, description: string): boolean {
    if (!this.canAfford(amount)) {
      return false;
    }
    this.money -= amount;
    this.totalSpent += amount;
    this.transactions.push({
      type: TransactionType.TowerPurchase,
      amount: -amount,
      timestamp: Date.now(),
      description,
    });
    return true;
  }

  spendForTower(cost: number, towerName: string): boolean {
    return this.spend(cost, `Purchased ${towerName}`);
  }

  sellTower(originalCost: number): number {
    const refund = Math.floor(originalCost * this.config.sellRefundPercent);
    this.money += refund;
    this.totalEarned += refund;
    this.transactions.push({
      type: TransactionType.TowerSell,
      amount: refund,
      timestamp: Date.now(),
      description: `Sold tower (${Math.round(this.config.sellRefundPercent * 100)}% refund)`,
    });
    return refund;
  }

  upgradeTower(cost: number, towerName: string): boolean {
    return this.spend(cost, `Upgraded ${towerName}`);
  }

  loseLife(amount: number = 1): number {
    const lost = Math.min(amount, this.lives);
    this.lives -= lost;
    this.transactions.push({
      type: TransactionType.LifeLost,
      amount: -lost,
      timestamp: Date.now(),
      description: `Lost ${lost} ${lost === 1 ? 'life' : 'lives'}`,
    });
    if (this.lives <= 0) {
      this.transactions.push({
        type: TransactionType.GameOver,
        amount: 0,
        timestamp: Date.now(),
        description: 'Game Over - No lives remaining',
      });
    }
    return lost;
  }

  isGameOver(): boolean {
    return this.lives <= 0;
  }

  reset(): void {
    this.money = this.config.startingMoney;
    this.lives = this.config.startingLives;
    this.transactions = [];
    this.lastInterestTime = 0;
    this.roundsCompleted = 0;
    this.totalEarned = 0;
    this.totalSpent = 0;
  }

  getNetWorth(): number {
    return this.money;
  }

  getSellRefund(cost: number): number {
    return Math.floor(cost * this.config.sellRefundPercent);
  }

  getInterestRate(): number {
    return this.config.interestRate;
  }

  getMaxInterest(): number {
    return this.config.maxInterest;
  }

  update(currentTime: number): number {
    return this.addInterest(currentTime);
  }
}

export function createEconomy(config?: Partial<EconomyConfig>): GameEconomy {
  return new GameEconomy(config);
}

export function getUpgradeCost(baseCost: number, currentTier: number, tierMultiplier: number = 1.5): number {
  return Math.floor(baseCost * Math.pow(tierMultiplier, currentTier));
}

export function calculateTowerValue(baseCost: number, upgradeSpent: number): number {
  return Math.floor((baseCost + upgradeSpent) * 0.7);
}