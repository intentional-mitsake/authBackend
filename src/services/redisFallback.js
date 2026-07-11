import { Redis } from 'ioredis';

export const fallBackRedis = new Redis();
fallBackRedis.on('error', (err) => console.error("Redis Client Error", err));
// connects auto, no need to do it
export default fallBackRedis