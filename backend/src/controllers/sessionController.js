import SessionService from '../services/SessionService.js';
import ExecutionService from '../services/ExecutionService.js';
import CodeExecutionService from '../services/CodeExecutionService.js';

export async function createSession(req, res, next) {
  try {
    const { language_id } = req.body;

    if (!language_id) {
      return res.status(400).json({ error: 'language_id is required' });
    }

    const session = await SessionService.createSession(language_id);
    return res.status(201).json(session);
  } catch (error) {
    console.error('[Controller] Create session error:', error);
    return res.status(400).json({ error: error.message });
  }
}

export async function updateSession(req, res, next) {
  try {
    const { session_id } = req.params;
    const { source_code } = req.body;

    if (!source_code) {
      return res.status(400).json({ error: 'source_code is required' });
    }

    const validation = CodeExecutionService.validateCode(source_code);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const session = await SessionService.updateSessionCode(session_id, source_code);
    return res.json(session);
  } catch (error) {
    console.error('[Controller] Update session error:', error);
    return res.status(400).json({ error: error.message });
  }
}

export async function getSession(req, res, next) {
  try {
    const { session_id } = req.params;
    const session = await SessionService.getSession(session_id);
    return res.json(session);
  } catch (error) {
    console.error('[Controller] Get session error:', error);
    return res.status(404).json({ error: error.message });
  }
}

export async function closeSession(req, res, next) {
  try {
    const { session_id } = req.params;
    const session = await SessionService.closeSession(session_id);
    return res.json(session);
  } catch (error) {
    console.error('[Controller] Close session error:', error);
    return res.status(400).json({ error: error.message });
  }
}

export async function runCode(req, res, next) {
  try {
    const { session_id } = req.params;

    // Fetch session with language to get per-language default limits
    const session = await SessionService.getSessionWithLimits(session_id);

    const execution = await ExecutionService.submitExecution(
      session_id,
      session.default_time_limit_ms || parseInt(process.env.DEFAULT_TIME_LIMIT_MS || 5000),
      session.default_memory_mb || parseInt(process.env.DEFAULT_MEMORY_MB || 256)
    );

    return res.status(202).json(execution);
  } catch (error) {
    console.error('[Controller] Run code error:', error);
    if (error.status === 429) {
      return res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter
      });
    }
    return res.status(400).json({ error: error.message });
  }
}

export async function getSessionExecutions(req, res, next) {
  try {
    const { session_id } = req.params;
    const { limit = 10 } = req.query;

    const executions = await ExecutionService.getSessionExecutions(session_id, parseInt(limit));
    return res.json({
      session_id,
      executions,
    });
  } catch (error) {
    console.error('[Controller] Get executions error:', error);
    return res.status(400).json({ error: error.message });
  }
}