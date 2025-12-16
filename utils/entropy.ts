import { ethers } from 'ethers';

const ENTROPY_POOL_SIZE = 2000; // Total mouse events needed
const MIN_MOVEMENT_THRESHOLD = 5; // Minimum pixel movement required to register entropy

export class EntropyCollector {
  private pool: string[] = [];
  private completed = false;
  private lastX: number | null = null;
  private lastY: number | null = null;
  
  constructor() {
    this.pool = [];
    this.reset();
  }

  public addEvent(e: React.MouseEvent | MouseEvent): number {
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
    // Combine mouse data with browser's cryptographically secure random values
    const randomValues = new Uint8Array(32);
    window.crypto.getRandomValues(randomValues);
    
    const mouseData = this.pool.join('|');
    const combinedData = ethers.toUtf8Bytes(mouseData);
    
    // Hash the mouse data
    const mouseHash = ethers.keccak256(combinedData);
    
    // Combine Hash + Random Values
    const finalMix = ethers.concat([
        ethers.getBytes(mouseHash),
        randomValues
    ]);

    // Final Hash to ensure uniform distribution and 32-byte length
    return ethers.keccak256(finalMix);
  }

  public reset() {
    this.pool = [];
    this.completed = false;
    this.lastX = null;
    this.lastY = null;
  }
}

export const entropyCollector = new EntropyCollector();