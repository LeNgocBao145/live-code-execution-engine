import ExecutionService from '../services/ExecutionService.js';
import SafetyService from '../services/SafetyService.js';

export async function getExecution(req, res, next) {
  try {
    const { execution_id } = req.params;
    const execution = await ExecutionService.getExecution(execution_id);

    return res.json(execution);
  } catch (error) {
    console.error('[Controller] Get execution error:', error);
    return res.status(404).json({ error: error.message });
  }
}

export async function submitExecution(req, res, next) {
  try {
    const { session_id, time_limit, memory_limit } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const result = await ExecutionService.submitExecution(
      session_id,
      time_limit,
      memory_limit
    );

    return res.status(202).json(result);
  } catch (error) {
    console.error('[Controller] Submit execution error:', error);

    // Handle rate limiting
    if (error.status === 429) {
      return res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }

    return res.status(400).json({ error: error.message });
  }
}
