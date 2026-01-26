import { query } from '../libs/db.js';

export class Session {
  static async findById(id) {
    const res = await query(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return res.rows[0];
  }

  static async findWithLanguage(id) {
    const res = await query(
      `SELECT s.*, l.name as language_name, l.template_code, l.runtime, l.version, l.file_name,
              l.default_time_limit_ms, l.default_memory_mb
       FROM sessions s
       JOIN languages l ON s.language_id = l.id
       WHERE s.id = $1`,
      [id]
    );
    return res.rows[0];
  }

  static async create(data) {
    const { id, language_id, source_code, status = 'ACTIVE' } = data;
    const res = await query(
      `INSERT INTO sessions (id, language_id, source_code, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, language_id, source_code, status]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { source_code, status } = data;
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (source_code !== undefined) {
      fields.push(`source_code = $${paramCount++}`);
      values.push(source_code);
    }

    if (status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const res = await query(
      `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return res.rows[0];
  }
}

export default Session;
