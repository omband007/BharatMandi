import { EventEmitter } from 'events';
import type { PostgreSQLAdapter } from './pg-adapter';

/**
 * Connection Monitor for PostgreSQL Database
 * Monitors PostgreSQL connectivity and emits events on state changes
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */
export class ConnectionMonitor extends EventEmitter {
  private pgAdapter: PostgreSQLAdapter;
  private connected: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date | null = null;
  private instanceId: string;

  constructor(pgAdapter: PostgreSQLAdapter) {
    super();
    this.pgAdapter = pgAdapter;
    this.instanceId = Math.random().toString(36).substring(7);
    console.log(`[ConnectionMonitor] New instance created: ${this.instanceId}`);
  }

  /**
   * Start monitoring PostgreSQL connectivity
   * Checks connectivity every 30 seconds (Requirement 9.1)
   */
  async start(): Promise<void> {
    console.log(`[ConnectionMonitor:${this.instanceId}] Starting - performing initial connectivity check...`);
    
    // Initial check (wait for it to complete)
    await this.checkConnectivity();
    
    console.log(`[ConnectionMonitor:${this.instanceId}] Initial check complete - connected: ${this.connected}`);

    // Check connectivity every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, 30000);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check PostgreSQL connectivity and emit events on state changes
   * Validates: Requirements 9.2, 9.3
   */
  private async checkConnectivity(): Promise<void> {
    const wasConnected = this.connected;
    
    try {
      this.connected = await this.pgAdapter.checkConnection();
    } catch (error) {
      console.error(`[ConnectionMonitor:${this.instanceId}] Error checking connectivity:`, error);
      this.connected = false;
    }
    
    this.lastCheckTime = new Date();

    // Only log on state change, not every check
    // Emit events on state change
    if (this.connected && !wasConnected) {
      console.log(`[ConnectionMonitor:${this.instanceId}] PostgreSQL connected`);
      this.emit('connected');
    } else if (!this.connected && wasConnected) {
      console.log(`[ConnectionMonitor:${this.instanceId}] PostgreSQL disconnected`);
      this.emit('disconnected');
    }
  }

  /**
   * Get current connectivity status
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    // Don't log every call - too noisy
    return this.connected;
  }

  /**
   * Get last check time
   * @returns Date of last connectivity check or null if not checked yet
   */
  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  /**
   * Get health status data for health check endpoint
   * Validates: Requirement 9.4
   * @returns Object with connectivity status and last check time
   */
  getHealthStatus(): {
    connected: boolean;
    lastCheck: Date | null;
  } {
    return {
      connected: this.connected,
      lastCheck: this.lastCheckTime
    };
  }
}
