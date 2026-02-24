import Redis from 'ioredis';

const REDIS_URL = process.env['REDIS_URL'] || 'redis://localhost:6379';

const createRedisClient = () => {
   const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
         const delay = Math.min(times * 50, 2000);
         return delay;
      },
      lazyConnect: true // Don't connect immediately on instantiation
   });

   client.on('error', (err) => {
      console.error('Redis Client Error:', err);
   });

   client.on('connect', () => {
      console.log('Redis Client Connected');
   });

   return client;
};

// Use a simplified global typing to avoid needing complex type declarations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalWithoutTrace = global as any;

// Singleton instance for the application
// In Next.js dev mode, globalThis prevents creating multiple instances on hot reload
const globalForRedis = globalWithoutTrace as unknown as {
   redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
   globalForRedis.redis = redis;
}

export default redis;
