import express from 'express';
import * as languageController from '../controllers/languageController.js';

const router = express.Router();

/**
 * GET /languages
 * List all available programming languages
 */
router.get('/', languageController.listLanguages);

/**
 * GET /languages/:language_id
 * Get details of a specific language
 */
router.get('/:language_id', languageController.getLanguage);

export default router;
