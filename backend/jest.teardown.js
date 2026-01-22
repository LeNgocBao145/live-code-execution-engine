/**
 * Jest teardown file - runs after all tests
 * Closes any open handles (Redis, PostgreSQL)
 */

export default async () => {
  try {
    // Close Redis connections if they exist
    const redisModule = await import('./src/libs/redis.js');
    if (redisModule.default && typeof redisModule.default.quit === 'function') {
      await redisModule.default.quit();
    }
  } catch (err) {
    // Ignore if Redis not initialized
  }

  try {
    // Close PostgreSQL connections if they exist
    const dbModule = await import('./src/libs/db.js');
    if (dbModule.default && typeof dbModule.default.end === 'function') {
      await dbModule.default.end();
    }
  } catch (err) {
    // Ignore if database not initialized
  }

  // Give a small delay for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
};
