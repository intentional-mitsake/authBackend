import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import auditLogger from '../utils/auditLogger.js';
import { metrics } from '../utils/metrics.js';
import { rotateRefreshToken, generateTokens, revokeRefreshToken } from './tokenServices.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient()

export async function registration(email, password, username, ip) {
    try{
        const hpw = await bcrypt.hash(password, 10);
        const created = new Date(Date.now())
        const newUser = await prisma.user.create({
            data: { email, username, password: hpw, createdAt: created}
        })
        logger.info({ email, username }, "User Registered");
        //payload here is userid, sign is JWT SECRET KEY--> we get userid during token verification(authMiddleware) because the payload is userid
        //if we want to get more than just userid during tokenVerfication for protected route functionalites we need to add those fields into the payload as well
        const { accessToken, refreshToken, hashedRefToken } = generateTokens({ id: newUser.id });// pasing id as payload
        logger.info({userId: newUser.id}, "Token Generated");
        const tokenExp = new Date(Date.now() + 60 * 60 * 1000);
        await prisma.refreshToken.create({
            data: { tokenHash: hashedRefToken, userId: newUser.id, familyId: randomUUID(), createdAt: created, expiresAt: tokenExp }
        });
        logger.info({ email, username }, "User Logged In");
        await auditLogger(newUser.id, "Registration", `ip: ${ip}: User Registered`);
        metrics.tokens_issued_total++;
        return { accessToken, refreshToken }
    }catch(err)
    {
        logger.error(err, "Registration Error")
        throw new Error(err.message || "Internal Server Error")
    }
}

export async function login(user, password, ip) {
    try{
        const match = await bcrypt.compare(password, user.password)//it hashes the pw user provides and compares wiht the hashed pw from DB. Returns true or false
        if(match) { 
                if(!process.env.JWT_SECRET_KEY) { 
                    throw new Error("JWT KEY not set in enviroment variables");
                }
                const { accessToken, refreshToken, hashedRefToken } =  generateTokens({ id: user.id }); 
                await prisma.refreshToken.create({
                    data : { tokenHash: hashedRefToken, userId: user.id, familyId: randomUUID(), createdAt: new Date(Date.now()), expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
                })
                logger.info({ userId: user.id }, "User Logged In");
                await auditLogger(user.id, "Login", `ip: ${ip} : User Logged In`);
                metrics.tokens_issued_total++;
                return { accessToken, refreshToken };
            }
        else{
            metrics.auth_failures_total++;
            await auditLogger(user.id, "Login", `ip: ${ip} : Incorrect Password`);
            throw new Error("Password Incorrect")
        }
    }catch(err){
        logger.error(err, "Login Error")
        throw new Error(err.message || "Internal Server Error")
    }
}

export async function logout(req, res) {
    try{
        const userid = req.userid
        const refreshToken = req.token
        await revokeRefreshToken(refreshToken);
        await auditLogger(userid, "Logout", {});
        logger.info({ userid }, "User Logged Out");
        return res.status(200).json({msg: "User Logged Out"})
    }catch(err){
        logger.error(err, "Logout Error")
        return res.status(500).json(err.message || 'Internal Server Error')
    }
    
}