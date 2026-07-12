import { PrismaClient } from "@prisma/client";
import { redisClient } from "../middleware/rate_limiter.js";
import logger from "../utils/logger.js";

const prisma = new PrismaClient();
export async function healthCheck(req, res){
    try {
        await prisma.$queryRaw`SELECT 1`; // this will throw an error if the DB is not reachable
        res.json({
            status: 'ok',
            db: 'up',
            redis: redisClient.isReady ? 'up' : 'down',
            uptime: process.uptime(),
            version: "beta"
        });
    } catch(err) {
        logger.error(err, "Health Check Error")
        res.status(503).json({ status: 'error', db: 'down'});
    }
}

export default healthCheck; 