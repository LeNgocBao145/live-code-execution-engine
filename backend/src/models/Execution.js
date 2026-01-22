import { query } from '../libs/db.js';

export class Execution {
  static async findById(id) {
    const res = await query(
      'SELECT * FROM executions WHERE id = $1',
      [id]
    );
    return res.rows[0];
  }

  static async findBySessionId(sessionId, limit = 10) {
    const res = await query(
      `SELECT * FROM executions WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [sessionId, limit]
    );
    return res.rows;
  }

  static async create(data) {
    const { id, session_id, status = 'QUEUED' } = data;
    const res = await query(
      `INSERT INTO executions (id, session_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, session_id, status]
    );
    return res.rows[0];
  }

  static async updateResult(id, data) {
    const { status, stdout, stderr, execution_time_ms, exit_code, timeout, finished_at } = data;
    const res = await query(
      `UPDATE executions 
       SET status = $1, stdout = $2, stderr = $3, execution_time_ms = $4, exit_code = $5, timeout = $6, finished_at = $7
       WHERE id = $8 
       RETURNING *`,
      [status, stdout, stderr, execution_time_ms, exit_code, timeout, finished_at, id]
    );
    return res.rows[0];
  }

  static async updateStarted(id) {
    const res = await query(
      `UPDATE executions SET status = 'RUNNING', started_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0];
  }
}

export default Execution;
