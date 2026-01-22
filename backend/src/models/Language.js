import { query } from '../libs/db.js';

export class Language {
  static async findById(id) {
    const res = await query(
      'SELECT * FROM languages WHERE id = $1',
      [id]
    );
    return res.rows[0];
  }

  static async findByName(name) {
    const res = await query(
      'SELECT * FROM languages WHERE name = $1',
      [name]
    );
    return res.rows[0];
  }

  static async findAll() {
    const res = await query('SELECT * FROM languages ORDER BY name');
    return res.rows;
  }
}

export default Language;
