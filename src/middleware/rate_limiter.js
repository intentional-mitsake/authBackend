import { createClient } from 'redis';
import { ratelimitConfig } from '../config/ratelimitConfigs.js';
import { fallBackRedis } from '../services/redisFallback.js';

const redisClient = createClient( { 
  url: process.env.REDIS_URL || "redis://localhost:6379" ,
  socket: {
    reconnectStrategy: false
  }
});
redisClient.on('error', (err) => console.error("Redis Client Error", err));
redisClient.connect().catch(console.error);

// bytebytego for reference
// so its pretty much del unused logs and aldd logs for succesful req
// use timestamps, looks backwards to find logs 
// use redis sorted sets for logs
export async function ratelimiter(req, res, next) {
  try{
    const windowSize = ratelimitConfig.window; // in milliseconds--> diff btwn timestamps
    const maxRequests = ratelimitConfig.max;

    // if req.user obj exists, use that, else use ip
    const id = req.user?.id ? `user:${req.user.id}` : `user:${req.ip}`;

    const now = Date.now(); //current time
    const windowStart = now - windowSize; // any logs befoe this in redis is deleted
    // chacks if redis is ready, if not, it waits and then checks again
    // for the fall back--> redis needs an outer configurtaion, so it can be not ready here
    // ioredis is native/built in node module so it is always ready, that is gonna be the fall back
    let multi;// for race conditions, procides atomic operations
    if(!redisClient.isReady){
      multi = fallBackRedis.multi();
    } else {
      multi = redisClient.multi();
    }
    // 1. (key, min, max)--> rmvs all el in a sorted set at key with a score between (min, max)
    multi.zRemRangeByScore(id, 0, windowStart);

    // 2. after rmving old logs, add log of curr req
    multi.zAdd(id,{
      score: now, // timestamp of curr req
      value: `req:${id}:${now}` // unique val for each req
    });
    multi.zCard(id); // returns num of elements in sorted set with key(id) .i.e num of logs
    multi.expire(id, Math.ceil(windowSize / 1000));// auto TTL on the keyif no req comes
    // this execs all the above ops in one atomic operation
    const results = await multi.exec();
    // results[0] is the rmv op, results[1] is the add op, results[2] is the zcard op
    const count = results[2];

    // set response headers
    res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - count),
        'X-RateLimit-Reset': Math.ceil((windowStart + windowSize) / 1000), // end of curr winodw
      });
      
    // 3. if log size is same/lowr than allowed, accept, else reject
    if (count <= maxRequests) {
      next();
    } else {
      return res.status(429).json({ error: ratelimitConfig.message });
    }   
  } catch(err) {
    console.error('Rate Limiter Error:', err);
    return res.status(500).json({ error: err.message || "Internal Server Error"})
  }
}