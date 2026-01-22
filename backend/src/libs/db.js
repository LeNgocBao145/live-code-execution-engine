import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
    'PG_HOST',
    'PG_DATABASE',
    'PG_USER',
    'PG_PASSWORD',
    'PG_PORT',
    'PG_SSL',
];

requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
});

const db = new pg.Pool({
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT, 10),
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
});

// Set session timezone to UTC for all connections in the pool
db.on('connect', (client) => {
    client.query("SET timezone = 'UTC'");
});

db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit process, just log the error
});

export const query = async (text, params) => {
    try {
        const result = await db.query(text, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};
