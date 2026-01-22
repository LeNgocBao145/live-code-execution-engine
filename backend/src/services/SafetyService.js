import redis from '../libs/redis.js';
import { query } from '../libs/db.js';

export class SafetyService {
  // Configuration
  static MAX_LOOP_ITERATIONS = 100000; // Protect against infinite loops
  static ABUSE_CHECK_WINDOW = 60; // seconds
  static MAX_EXECUTIONS_PER_MINUTE = 10; // executions per window
  static MAX_FAILED_ATTEMPTS = 5; // max failures before rate limit

  /**
   * Detect potential infinite loops in source code
   * Simple heuristics: look for common infinite loop patterns
   */
  static detectInfiniteLoopPatterns(sourceCode, language) {
    const patterns = {
      python: [
        /while\s+True\s*:/gi,
        /while\s+1\s*:/gi,
        /for\s+\w+\s+in\s+iter\(\s*int\s*,\s*1\s*\)/gi,
      ],
      node: [
        /while\s*\(\s*true\s*\)/gi,
        /while\s*\(\s*1\s*\)/gi,
        /for\s*\(\s*;\s*;\s*\)/gi,
      ],
      gcc: [
        /while\s*\(\s*1\s*\)/gi,
        /while\s*\(\s*true\s*\)/gi,
        /for\s*\(\s*;\s*;\s*\)/gi,
      ],
      'g++': [
        /while\s*\(\s*1\s*\)/gi,
        /while\s*\(\s*true\s*\)/gi,
        /for\s*\(\s*;\s*;\s*\)/gi,
      ],
    };

    const langPatterns = patterns[language.runtime] || [];
    for (const pattern of langPatterns) {
      if (pattern.test(sourceCode)) {
        return {
          detected: true,
          pattern: pattern.toString(),
          message: `Potential infinite loop detected: ${pattern}`,
        };
      }
    }

    return { detected: false };
  }

  /**
   * Check for execution abuse (rate limiting)
   * Returns { allowed: boolean, reason?: string, retryAfter?: number }
   */
  static async checkExecutionAbuse(sessionId) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - this.ABUSE_CHECK_WINDOW;

      // Get recent executions count
      const result = await query(
        `SELECT COUNT(*) as count, 
                SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
         FROM executions 
         WHERE session_id = $1 AND created_at > to_timestamp($2)`,
        [sessionId, windowStart]
      );

      const { count, failed_count } = result.rows[0];
      const failedCount = parseInt(failed_count || 0);

      // Check if exceeding execution limit
      if (count >= this.MAX_EXECUTIONS_PER_MINUTE) {
        return {
          allowed: false,
          reason: `Rate limit exceeded: ${count}/${this.MAX_EXECUTIONS_PER_MINUTE} executions in ${this.ABUSE_CHECK_WINDOW}s`,
          retryAfter: this.ABUSE_CHECK_WINDOW,
        };
      }

      // Check if too many failures
      if (failedCount >= this.MAX_FAILED_ATTEMPTS) {
        return {
          allowed: false,
          reason: `Too many failed attempts: ${failedCount}/${this.MAX_FAILED_ATTEMPTS}`,
          retryAfter: this.ABUSE_CHECK_WINDOW,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('[SafetyService] Error checking abuse:', error);
      // Fail open - allow execution if check fails
      return { allowed: true };
    }
  }

  /**
   * Validate execution parameters
   */
  static validateExecutionParams(timeLimit, memoryLimit, language) {
    const errors = [];

    const MAX_TIME_LIMIT = 60000; // 60 seconds
    const MIN_TIME_LIMIT = 100; // 100ms
    const MAX_MEMORY_LIMIT = 2048; // 2GB
    const MIN_MEMORY_LIMIT = 32; // 32MB

    if (timeLimit < MIN_TIME_LIMIT || timeLimit > MAX_TIME_LIMIT) {
      errors.push(
        `Time limit must be between ${MIN_TIME_LIMIT}ms and ${MAX_TIME_LIMIT}ms`
      );
    }

    if (memoryLimit < MIN_MEMORY_LIMIT || memoryLimit > MAX_MEMORY_LIMIT) {
      errors.push(
        `Memory limit must be between ${MIN_MEMORY_LIMIT}MB and ${MAX_MEMORY_LIMIT}MB`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log execution lifecycle event
   */
  static async logExecutionEvent(executionId, stage, metadata = {}) {
    try {
      const event = {
        execution_id: executionId,
        stage, // QUEUED, RUNNING, COMPLETED, FAILED, TIMEOUT
        timestamp: new Date().toISOString(),
        ...metadata,
      };

      // Log to stdout for visibility
      console.log(`[Execution Lifecycle] ${JSON.stringify(event)}`);

      // Store in Redis for quick access (30 min expiry)
      const redisKey = `execution:${executionId}:events`;
      await redis.lpush(redisKey, JSON.stringify(event));
      await redis.expire(redisKey, 1800);

      return event;
    } catch (error) {
      console.error('[SafetyService] Error logging event:', error);
    }
  }

  /**
   * Get execution lifecycle events
   */
  static async getExecutionEvents(executionId) {
    try {
      const redisKey = `execution:${executionId}:events`;
      const events = await redis.lrange(redisKey, 0, -1);
      return events.map(e => JSON.parse(e)).reverse();
    } catch (error) {
      console.error('[SafetyService] Error getting events:', error);
      return [];
    }
  }
}

export default SafetyService;
