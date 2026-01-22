import express from 'express';
import * as executionController from '../controllers/executionController.js';

const router = express.Router();

/**
 * GET /executions/:execution_id
 * Get details of a specific execution
 */
router.get('/:execution_id', executionController.getExecution);

export default router;
