import { PrismaClient } from "@prisma/client";
import logger from "./logger.js";

const prisma = new PrismaClient();

export async function auditLogger(userid, action, data) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userid,
                action: action,
                data: JSON.stringify(data),
            },
        });
        logger.info(`User ${userid} ${action} ${JSON.stringify(data)}`, "Audit Log");
    } catch (err) {
        logger.error(err);
    }
}

export default auditLogger