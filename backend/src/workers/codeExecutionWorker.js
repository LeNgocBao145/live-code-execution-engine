import { Worker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import Execution from '../models/Execution.js';
import Session from '../models/Session.js';
import Language from '../models/Language.js';
import CodeExecutionService from '../services/CodeExecutionService.js';
import SafetyService from '../services/SafetyService.js';

dotenv.config();

// Separate connection for Worker
const workerConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

async function processExecution(job) {
  const { execution_id, session_id, time_limit, memory_limit } = job.data;

  console.log(`[Worker] Processing execution ${execution_id} from session ${session_id} (attempt ${job.attemptsMade + 1})`);

  try {
    await Execution.updateStarted(execution_id);
    await SafetyService.logExecutionEvent(execution_id, 'RUNNING', {
      job_attempt: job.attemptsMade + 1,
    });

    const session = await Session.findWithLanguage(session_id);
    if (!session) {
      throw new Error(`Session not found: ${session_id}`);
    }

    const language = await Language.findById(session.language_id);
    if (!language) {
      throw new Error(`Language not found: ${session.language_id}`);
    }

    const result = await CodeExecutionService.executeCode(
      language,
      session.source_code,
      time_limit,
      memory_limit
    );

    await Execution.updateResult(execution_id, {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      execution_time_ms: result.execution_time_ms,
      exit_code: result.exit_code,
      timeout: result.timeout,
      finished_at: new Date(),
    });

    await SafetyService.logExecutionEvent(execution_id, result.status, {
      execution_time_ms: result.execution_time_ms,
      exit_code: result.exit_code,
      timeout: result.timeout,
    });

    console.log(`[Worker] Execution ${execution_id} completed with status: ${result.status}`);
    return result;
  } catch (error) {
    console.error(`[Worker] Execution ${execution_id} failed (attempt ${job.attemptsMade + 1}):`, error);

    await SafetyService.logExecutionEvent(execution_id, 'FAILED', {
      error: error.message,
      job_attempt: job.attemptsMade + 1,
    });

    await Execution.updateResult(execution_id, {
      status: 'FAILED',
      stdout: '',
      stderr: error.message,
      execution_time_ms: 0,
      exit_code: 1,
      timeout: false,
      finished_at: new Date(),
    });

    throw error;
  }
}

async function startWorker() {
  try {
    console.log('[Worker] Starting code execution worker...');

    const concurrency = parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || 10);
    
    const worker = new Worker('code-execution', processExecution, {
      connection: workerConnection,
      concurrency: concurrency,
    });

    worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job.id} failed:`, err.message);
    });

    console.log(`[Worker] Code execution worker running with concurrency: ${concurrency}`);
  } catch (error) {
    console.error('[Worker] Fatal error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('[Worker] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Worker] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startWorker().catch(error => {
  console.error('[Worker] Failed to start:', error);
  process.exit(1);
});
