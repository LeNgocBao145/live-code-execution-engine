import { v4 as uuidv4 } from 'uuid';
import Execution from '../models/Execution.js';
import Session from '../models/Session.js';
import { codeExecutionQueue } from '../libs/queue.js';
import SafetyService from './SafetyService.js';

export class ExecutionService {
  static async submitExecution(sessionId, timeLimit, memoryLimit) {
    // Validate parameters
    const validation = SafetyService.validateExecutionParams(
      timeLimit,
      memoryLimit,
      {}
    );

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check for execution abuse
    const abuseCheck = await SafetyService.checkExecutionAbuse(sessionId);
    if (!abuseCheck.allowed) {
      const error = new Error(abuseCheck.reason);
      error.status = 429; // Too Many Requests
      error.retryAfter = abuseCheck.retryAfter;
      throw error;
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check for infinite loop patterns
    const loopCheck = SafetyService.detectInfiniteLoopPatterns(
      session.source_code,
      { runtime: 'node' }
    );

    if (loopCheck.detected) {
      console.warn(`[ExecutionService] Infinite loop warning: ${loopCheck.message}`);
    }

    const executionId = uuidv4();

    const execution = await Execution.create({
      id: executionId,
      session_id: sessionId,
      status: 'QUEUED',
    });

    // Log QUEUED stage
    await SafetyService.logExecutionEvent(executionId, 'QUEUED', {
      session_id: sessionId,
      time_limit: timeLimit,
      memory_limit: memoryLimit,
    });

    await codeExecutionQueue.add(
      'execute',
      {
        execution_id: executionId,
        session_id: sessionId,
        time_limit: timeLimit,
        memory_limit: memoryLimit,
      },
      {
        jobId: executionId,
      }
    );

    return {
      execution_id: execution.id,
      status: execution.status,
    };
  }

  static async getExecution(executionId) {
    const execution = await Execution.findById(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Base response with only required fields per assignment
    const response = {
      execution_id: execution.id,
      status: execution.status,
    };

    // Add output fields only when execution is complete
    if (['COMPLETED', 'FAILED', 'TIMEOUT'].includes(execution.status)) {
      response.stdout = execution.stdout || '';
      response.stderr = execution.stderr || '';
      response.execution_time_ms = execution.execution_time_ms;
    }

    return response;
  }

  static async getSessionExecutions(sessionId, limit = 10) {
    const executions = await Execution.findBySessionId(sessionId, limit);
    return executions.map(ex => ({
      execution_id: ex.id,
      status: ex.status,
      execution_time_ms: ex.execution_time_ms,
      exit_code: ex.exit_code,
      created_at: ex.created_at,
    }));
  }

  static async updateExecutionWithResult(executionId, result) {
    const { status, stdout, stderr, execution_time_ms, exit_code, timeout } = result;

    const updated = await Execution.updateResult(executionId, {
      status,
      stdout: stdout || '',
      stderr: stderr || '',
      execution_time_ms,
      exit_code,
      timeout,
      finished_at: new Date(),
    });

    return {
      execution_id: updated.id,
      status: updated.status,
      stdout: updated.stdout,
      stderr: updated.stderr,
      execution_time_ms: updated.execution_time_ms,
      exit_code: updated.exit_code,
      timeout: updated.timeout,
    };
  }
}

export default ExecutionService;
