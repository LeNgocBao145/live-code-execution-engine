import 'dotenv/config';
import express from "express";
import route from "./routes/index.js";
import { query } from './libs/db.js';
import redis from './libs/redis.js';

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());

route(app);

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected error occurred"
  });
});

async function initialize() {
  try {
    console.log('[Server] Testing database connection...');
    const result = await query('SELECT 1');
    console.log('[Server] Database connection successful');

    console.log('[Server] Testing Redis connection...');
    const pong = await redis.ping();
    console.log('[Server] Redis connection successful:', pong);

    app.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Initialization failed:', error);
    process.exit(1);
  }
}

initialize();
