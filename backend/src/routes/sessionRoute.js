import express from 'express';
import * as sessionController from '../controllers/sessionController.js';

const router = express.Router();

/**
 * POST /code-sessions
 * Create a new code session
 */
router.post('/', sessionController.createSession);

/**
 * GET /code-sessions/:session_id
 * Get details of a specific session
 */
router.get('/:session_id', sessionController.getSession);

/**
 * PATCH /code-sessions/:session_id
 * Update session code
 */
router.patch('/:session_id', sessionController.updateSession);

/**
 * POST /code-sessions/:session_id/run
 * Execute code in the session
 */
router.post('/:session_id/run', sessionController.runCode);

/**
 * PATCH /code-sessions/:session_id/close
 * Close a session
 */
router.patch('/:session_id/close', sessionController.closeSession);

/**
 * GET /code-sessions/:session_id/executions
 * Get all executions in a session
 */
router.get('/:session_id/executions', sessionController.getSessionExecutions);

export default router;