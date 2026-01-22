import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Separate connection for Queue
const queueConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

export const codeExecutionQueue = new Queue('code-execution', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times for transient failures
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s delay, doubles with each retry
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs for debugging
  },
});

codeExecutionQueue.on('error', (err) => {
  console.error('[Queue] Error:', err);
});

export default codeExecutionQueue;
