import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session.js';
import Language from '../models/Language.js';

export class SessionService {
  static async createSession(languageId) {
    const language = await Language.findById(languageId);
    if (!language) {
      throw new Error(`Language not found: ${languageId}`);
    }

    const sessionId = uuidv4();
    const session = await Session.create({
      id: sessionId,
      language_id: languageId,
      source_code: language.template_code || '',
      status: 'ACTIVE',
    });

    return {
      session_id: session.id,
      status: session.status,      
    };
  }

  static async updateSessionCode(sessionId, sourceCode) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = await Session.update(sessionId, {
      source_code: sourceCode,
    });

    return {
      session_id: updated.id,
      status: updated.status,      
    };
  }

  static async getSession(sessionId) {
    const session = await Session.findWithLanguage(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      session_id: session.id,
      status: session.status,
      language_id: session.language_id,
      language_name: session.language_name,
      source_code: session.source_code,
      runtime: session.runtime,
      version: session.version,
      created_at: session.created_at,
      updated_at: session.updated_at,
    };
  }

  static async closeSession(sessionId) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = await Session.update(sessionId, {
      status: 'INACTIVE',
    });

    return {
      session_id: updated.id,
      status: updated.status,
    };
  }
}

export default SessionService;
