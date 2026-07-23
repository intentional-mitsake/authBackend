import jwt from 'jsonwebtoken';
import { randomUUID, createHash } from 'crypto';
import logger from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function generateTokens(payload) {
    if(!process.env.JWT_SECRET_KEY) { 
            throw new Error("JWT KEY not set in enviroment variables");
        }
    //short lived access token
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const refreshToken = randomUUID(); // rand str
    //logger.info({ accessToken, refreshToken }, "Tokens Generated");
    const hashedRefToken = createHash('sha256').update(refreshToken).digest('hex'); // hash 

    return { accessToken, refreshToken, hashedRefToken };
}

export async function rotateRefreshToken(refreshToken) {
        const hashedRefToken = createHash('sha256').update(refreshToken).digest('hex');
        const tokenExists = await prisma.refreshToken.findFirst({ where: { tokenHash: hashedRefToken } });

        if(!tokenExists) { throw new Error("Invalid Refresh Token") }
        if( tokenExists.used || tokenExists.expiresAt < new Date(Date.now())) { 
            await invalidateFamily(tokenExists.familyId);
            throw new Error("Refresh Token Expired");
        }
        await prisma.refreshToken.update({
        where: { id: tokenExists.id },
        data: { used: true }
        });
        const { accessToken, refreshToken: newRefreshToken, hashedRefToken: newHashedRefToken } = generateTokens({ id: tokenExists.userId }); 
        await prisma.refreshToken.create({
        // in the same family
        data: { tokenHash: newHashedRefToken, userId: tokenExists.userId, familyId: tokenExists.familyId, createdAt: new Date(Date.now()), expiresAt: new Date(Date.now() + 7 * 24 *60 * 60 * 1000) }
        });
        return { accessToken , newRefreshToken };
}

export async function invalidateFamily(familyId) {
    await prisma.refreshToken.updateMany({ where: { familyId }, data: { used: true } });
}

export async function revokeRefreshToken(refreshToken) {
    const hashedRefToken = createHash('sha256').update(refreshToken).digest('hex');
    //logger.info({ hashedRefToken }, "Refresh Token Revoked");
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashedRefToken }, data: { used: true } });
}

export async function listActiveSessions(userId) {
    logger.info({ userId }, "Sessions Fetched");
    // list all user sessions with valid refresh tokens
    return await prisma.refreshToken.findMany({ 
        where: { 
            userId, 
            used: false, 
            expiresAt: { gt: new Date(Date.now()) },
        }, 
        select: {
            familyId: true,
            createdAt: true,
            lastUsedAt: true
        }
    });
}

export async function revokeSession(userId, familyId) {
    logger.info({ userId, familyId }, "Session Revoked");
    const { count } =await prisma.refreshToken.updateMany({ 
        where: { userId, familyId }, 
        data: { used: true } 
    });
    if(count === 0) { throw new Error("Session Not Found") }
}

export default { generateTokens, rotateRefreshToken, revokeRefreshToken, listActiveSessions, revokeSession };