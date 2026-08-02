import { ethers } from 'ethers';

const ENTROPY_POOL_SIZE = 2000; // Total mouse events needed
const MIN_MOVEMENT_THRESHOLD = 5; // Minimum pixel movement required to register entropy
export const DICE_MIN_ROLLS = 50;
export const DICE_RECOMMENDED_ROLLS = 100;

function assertSecureRandomAvailable() {
  if (!window.crypto?.getRandomValues) {
    throw new Error('A cryptographically secure random number generator is not available in this browser.');
  }
}

export function generateSystemEntropy(): string {
  assertSecureRandomAvailable();

  const randomValues = new Uint8Array(32);
  window.crypto.getRandomValues(randomValues);
  const entropy = ethers.hexlify(randomValues);
  randomValues.fill(0);

  return entropy;
}

export function estimateDiceEntropyBits(rollCount: number): number {
  return rollCount * Math.log2(6);
}

export function hasWeakDicePattern(rolls: string): boolean {
  if (rolls.length < DICE_MIN_ROLLS) return false;

  const uniqueRolls = new Set(rolls).size;
  if (uniqueRolls <= 2) return true;

  for (let patternLength = 1; patternLength <= 6; patternLength += 1) {
    const pattern = rolls.slice(0, patternLength);
    if (pattern.repeat(Math.ceil(rolls.length / patternLength)).slice(0, rolls.length) === rolls) {
      return true;
    }
  }

  return false;
}

export function normalizeDiceRolls(input: string): string {
  const rolls = input.replace(/[\s,.;:|_-]/g, '');

  if (!rolls) {
    throw new Error('Enter dice rolls using only values 1 through 6.');
  }

  if (/[^1-6]/.test(rolls)) {
    throw new Error('Dice entropy can only contain rolls from 1 to 6.');
  }

  if (rolls.length < DICE_MIN_ROLLS) {
    throw new Error(`Enter at least ${DICE_MIN_ROLLS} dice rolls.`);
  }

  return rolls;
}

export function generateDiceMixedEntropy(diceInput: string): string {
  assertSecureRandomAvailable();

  const rolls = normalizeDiceRolls(diceInput);
  const randomValues = new Uint8Array(32);
  window.crypto.getRandomValues(randomValues);

  // Dice is supplemental only. Even a weak dice sequence cannot reduce security
  // because every output also includes a fresh 256-bit browser CSPRNG sample.
  const diceHash = ethers.sha256(ethers.toUtf8Bytes(`dice-v1:${rolls.length}:${rolls}`));
  const finalMix = ethers.getBytes(ethers.concat([
    ethers.toUtf8Bytes('omnivault-dice-csprng-v1'),
    ethers.getBytes(diceHash),
    randomValues,
  ]));
  const entropy = ethers.sha256(finalMix);

  randomValues.fill(0);
  finalMix.fill(0);

  return entropy;
}

export class MouseEntropyCollector {
  private pool: string[] = [];
  private completed = false;
  private finalizedEntropy: string | null = null;
  private lastX: number | null = null;
  private lastY: number | null = null;
  
  constructor() {
    this.pool = [];
    this.reset();
  }

  public addEvent(e: MouseEvent): number {
    if (this.completed) return 100;

    const x = e.clientX;
    const y = e.clientY;

    // To mimic bitaddress.org's physical randomness purity:
    // Only accept events where the mouse has moved significantly (>= 5px)
    // This prevents flooding the pool with micro-movements or high-frequency polling duplicates.
    if (this.lastX !== null && this.lastY !== null) {
        const diffX = Math.abs(x - this.lastX);
        const diffY = Math.abs(y - this.lastY);
        
        if (diffX < MIN_MOVEMENT_THRESHOLD && diffY < MIN_MOVEMENT_THRESHOLD) {
            // Movement too small, return current progress without adding to pool
            return Math.floor((this.pool.length / ENTROPY_POOL_SIZE) * 100);
        }
    }

    // Update last known position
    this.lastX = x;
    this.lastY = y;

    // Use high-precision timestamp (microseconds) for better entropy
    const timestamp = performance.now();
    // Capture mouse coordinates and high-precision timing
    // Note: We removed Math.random() as it's not cryptographically secure
    // The entropy comes from unpredictable human mouse movements and precise timing
    const data = `${x}-${y}-${timestamp}`;
    this.pool.push(data);

    const progress = Math.min(100, Math.floor((this.pool.length / ENTROPY_POOL_SIZE) * 100));
    
    if (this.pool.length >= ENTROPY_POOL_SIZE) {
      this.completed = true;
    }

    return progress;
  }

  public isComplete(): boolean {
    return this.completed;
  }

  public getFinalEntropy(): string {
    if (this.finalizedEntropy) {
      return this.finalizedEntropy;
    }

    if (!this.completed || this.pool.length < ENTROPY_POOL_SIZE) {
      throw new Error('Entropy collection is incomplete.');
    }

    assertSecureRandomAvailable();

    // Combine mouse data with browser's cryptographically secure random values
    const randomValues = new Uint8Array(32);
    window.crypto.getRandomValues(randomValues);
    
    const mouseData = this.pool.join('|');
    const combinedData = ethers.toUtf8Bytes(mouseData);
    
    // Hash the mouse data
    const mouseHash = ethers.keccak256(combinedData);
    
    // Combine Hash + Random Values
    const finalMix = ethers.getBytes(ethers.concat([
        ethers.getBytes(mouseHash),
        randomValues
    ]));

    // Final Hash to ensure uniform distribution and 32-byte length
    const finalEntropy = ethers.keccak256(finalMix);

    randomValues.fill(0);
    finalMix.fill(0);
    this.pool = [];
    this.finalizedEntropy = finalEntropy;

    return finalEntropy;
  }

  public reset() {
    this.pool = [];
    this.completed = false;
    this.finalizedEntropy = null;
    this.lastX = null;
    this.lastY = null;
  }
}

// 移除全局单例以防止数据残留
// 组件内部应创建新实例以确保数据隔离
