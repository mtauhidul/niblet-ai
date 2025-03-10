// lib/runStateManager.ts - Enhanced with better timeout handling

/**
 * Utility to manage OpenAI thread run states globally
 * This helps prevent the "Can't add messages to thread while a run is active" error
 */

interface RunState {
  isActive: boolean;
  runId: string | null;
  lastUpdated: number;
  createdAt: number;
}

class RunStateManager {
  private static instance: RunStateManager;
  private runStates: Map<string, RunState> = new Map();
  // Increased from 60 seconds to 120 seconds to account for image processing
  private timeoutDuration = 120000; // 120 seconds
  // Add a timeout for waiting
  private waitTimeout = 30000; // 30 seconds

  private constructor() {
    // Start a cleanup process to clear stale run states
    setInterval(() => this.cleanupStaleRuns(), 60000);
  }

  public static getInstance(): RunStateManager {
    if (!RunStateManager.instance) {
      RunStateManager.instance = new RunStateManager();
    }
    return RunStateManager.instance;
  }

  /**
   * Set a thread as having an active run
   */
  public setRunActive(threadId: string, runId: string): void {
    this.runStates.set(threadId, {
      isActive: true,
      runId,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    });
    console.log(`Run ${runId} set active for thread ${threadId}`);
  }

  /**
   * Update the timestamp for an active run
   */
  public updateRunActivity(threadId: string): void {
    const state = this.runStates.get(threadId);
    if (state && state.isActive) {
      state.lastUpdated = Date.now();
      this.runStates.set(threadId, state);
    }
  }

  /**
   * Mark a run as completed or inactive
   */
  public setRunInactive(threadId: string): void {
    const state = this.runStates.get(threadId);
    if (state) {
      state.isActive = false;
      state.runId = null;
      state.lastUpdated = Date.now();
      this.runStates.set(threadId, state);
      console.log(`Run marked inactive for thread ${threadId}`);
    }
  }

  /**
   * Check if a thread has an active run
   */
  public hasActiveRun(threadId: string): boolean {
    const state = this.runStates.get(threadId);
    if (!state) return false;

    // Check if the run is stale (hasn't been updated in a while)
    if (
      state.isActive &&
      Date.now() - state.lastUpdated > this.timeoutDuration
    ) {
      console.log(`Run for thread ${threadId} appears stale, marking inactive`);
      this.setRunInactive(threadId);
      return false;
    }

    return state.isActive;
  }

  /**
   * Wait for a run to complete with a specified timeout
   * Enhanced to handle longer timeouts for image processing
   */
  public async waitForRunCompletion(
    threadId: string,
    timeout = this.waitTimeout
  ): Promise<boolean> {
    const startTime = Date.now();
    console.log(
      `Waiting for run completion on thread ${threadId} with timeout: ${timeout}ms`
    );

    // Add progressive backoff for polling
    let pollInterval = 500; // Start with 500ms
    const maxPollInterval = 3000; // Max 3 seconds
    const backoffFactor = 1.5;

    while (this.hasActiveRun(threadId) && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      // Increase polling interval with backoff
      pollInterval = Math.min(pollInterval * backoffFactor, maxPollInterval);
    }

    const completed = !this.hasActiveRun(threadId);
    console.log(
      `Wait for run completed: ${completed}, time taken: ${
        Date.now() - startTime
      }ms`
    );

    // Return true if run completed, false if timed out
    return completed;
  }

  /**
   * Get information about an active run
   */
  public getRunInfo(threadId: string): RunState | null {
    const state = this.runStates.get(threadId);
    if (!state) return null;

    // If the run is stale, mark it inactive
    if (
      state.isActive &&
      Date.now() - state.lastUpdated > this.timeoutDuration
    ) {
      this.setRunInactive(threadId);
      return this.runStates.get(threadId) || null;
    }

    return state;
  }

  /**
   * Clean up stale run states
   */
  private cleanupStaleRuns(): void {
    const now = Date.now();

    for (const [threadId, state] of this.runStates.entries()) {
      // If the run is stale or has been inactive for more than 5 minutes, remove it
      if (
        (state.isActive && now - state.lastUpdated > this.timeoutDuration) ||
        (!state.isActive && now - state.lastUpdated > 300000)
      ) {
        this.runStates.delete(threadId);
        console.log(`Cleaned up run state for thread ${threadId}`);
      }
    }
  }

  /**
   * Extract run ID from OpenAI error message
   */
  public extractRunIdFromError(errorMessage: string): string | null {
    const runIdMatch = errorMessage.match(/run\s+(\w+)\s+is active/);
    if (runIdMatch && runIdMatch[1]) {
      return runIdMatch[1];
    }
    return null;
  }

  // Set custom timeouts
  public setTimeoutDuration(milliseconds: number): void {
    this.timeoutDuration = milliseconds;
  }

  public setWaitTimeout(milliseconds: number): void {
    this.waitTimeout = milliseconds;
  }
}

// Create and export a singleton instance
const runStateManager = RunStateManager.getInstance();
export default runStateManager;
