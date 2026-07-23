//import bcrypt from 'bcryptjs'
//import jwebtoken from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client';
import { registration, login } from '../services/authServices.js';
import { logger } from '../utils/logger.js';
import { rotateRefreshToken, listActiveSessions, revokeSession } from '../services/tokenServices.js';
import { ROLES } from '../config/permissions.js';


const prisma = new PrismaClient();

export async function regCredVerification(req, res) {
    try{
        const { email, password, username} = req.body;
         if(await prisma.user.findFirst( {where: { email : email }}))
            {
                logger.warn({ email }, "Email already in use!");
                return res.status(409).json({ error: "Email already in use!"});
            } else if(await prisma.user.findFirst( { where: { username: username}})){
                logger.warn({ username }, "Username already in use!");
                return res.status(409).json({ error: "Username already in use!"});
            }else{
                const { accessToken, refreshToken} = await registration(email, password, username, req.ip); // req.ip is the ip address of the incoing request
                logger.info({ email, username }, "User Registered");
                //setting cookie
                res.cookie(
                    'refreshToken', refreshToken, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                    }
                )
                return res.status(200).json({ accessToken });
            }
    } catch(err) {
        logger.error(err, "Cred Verification Error")
        return res.status(500).json({ error: err.message || "Internal Server Error"});
    }
    
}

export async function logCredVerification(req, res) {
    try{
        const { email, password, username} = req.body;
        //separate {email} and {username } like this or it caues logical errors as OR needs conditions to be separated. 
        const user = await prisma.user.findFirst({where: { OR: [{ email }, { username }]}})//finds the user with the given email and  username and returns all info
        if(user){ 
            const { accessToken, refreshToken} = await login(user, password, req.ip);
            logger.info({ email, username }, "User Logged In");
            //setting cookie
            res.cookie(
                'refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production' ? true : false,
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
                }
            )
            return res.status(200).json({ accessToken });
        }
        else {
            logger.warn({ email, username }, "User Does Not Exist ");
            return res.status(404).json({error: "User Does Not Exist "});
        }
    }catch(err){
        logger.error(err, "Cred Verification Error");
        return res.status(500).json({ error: err.message || "Internal Server Error"});
    }
    
}

export async function stateController(req, res) {
    try{
        const activeSessions = await listActiveSessions(req.user.id);
        logger.info({ activeSessions }, "State");
        return res.status(200).json({ activeSessions });
    }catch(err){
        logger.error(err, "State Error");
        return res.status(500).json({ error: err.message || "Internal Server Error"});
    }
}

export async function sessionController(req, res) {
    try {
        const userId = req.user.id;
        const { familyId } = req.params;
        await revokeSession(userId, familyId);
        logger.info({ userId, familyId }, "Session Revoked");
        return res.status(200).json({ msg: "Session Revoked"});
    } catch (err) {
        logger.error(err, "Session Error");
        return res.status(500).json({ error: err.message || "Internal Server Error"});
    }
}

export async function rotateController(req, res) {
    try {
        if (!req.cookies) {
            return res.status(400).json({ error: "Cookies not found"});
        }
            const refreshToken = req.cookies.refreshToken
            if (!refreshToken){ 
                return res.status(400).json({ error: "Refresh Token Not Found"});
            }
            const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(refreshToken);
            res.cookie(
                'refreshToken', newRefreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production' ? true : false,
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                }
            )
            return res.status(200).json({ accessToken });
        }catch(err){
            logger.error(err, "Error while rotating refresh token");
            // throwing err in case of empty cookei, so 400
            if (err.message === "Invalid Refresh Token" || err.message === "Refresh Token Expired") {
                return res.status(401).json({ error: err.message});
            }
            return res.status(500).json({ error: err.message || "Internal Server Error"});
        }
}

export async function getProfile(req, res) {
    try {
        const userId = req.user.id;
        if(!userId) {
            logger.error("No User ID Found");
            return res.status(400).json({ error: "Bad Request" });
        }
        const user = await prisma.user.findUnique({ 
            where: { 
                id: userId
            }, 
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        if (!user) {
            logger.error("User Not Found");
            return res.status(404).json({ error: "User Not Found" });
        }
        logger.info({ userId }, "User Profile Fetched");
        return res.status(200).json({ user });
    } catch(err) {
        logger.error(err, "Get Profile Error");
        return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

export async function getUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                banned: true,
                createdAt: true
            }
        });
        logger.info("Users Fetched");
        return res.status(200).json({ users });
    } catch(err) {
        logger.error(err, "Get Users Error");
        return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

export async function promoteUser(req, res) {
    try {
        // target user
        const { id } = req.params; // string
        const userId = parseInt(id, 10);
        // promotion role
        const { role } = req.body;
        if( role === null || !Object.values(ROLES).includes(role)) {
            return res.status(400).json({ error: "Invalid Role" });
        } else if (role === ROLES.ADMIN) {
            return res.status(403).json({ error: "Forbidden: Cannot promote to Admin" });
        } else if (parseInt(userId) === req.user.id) {
            return res.status(403).json({ error: "Forbidden: Cannot change self" });
        }
        const user = await prisma.user.update({
            where: { id: userId },
            data: { role: role },
            select: { id: true, email: true, username: true, role: true }
        });
        logger.info({ userId }, "User Promoted");
        return res.status(200).json({ user });
    } catch(err) {
        logger.error(err, "Promote User Error");
        return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

export async function banUser(req, res) {
    try {
        // target user
        const { id } = req.params; // string
        const userId = parseInt(id, 10);
        if (parseInt(userId) === req.user.id) {
            return res.status(403).json({ error: "Forbidden: Cannot ban self" });
        }
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { banned: true },
            select: { id: true, email: true, username: true, role: true }
        });
        logger.info({ userId }, "User Banned");
        return res.status(200).json({ user });
    } catch(err) {
        logger.error(err, "Ban User Error");
        return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

export async function restoreUser(req, res) {
    try {
        // target user
        const { id } = req.params; // string
        const userId = parseInt(id, 10);
        if (parseInt(userId) === req.user.id) {
            return res.status(403).json({ error: "Forbidden: Cannot restore self" });
        }
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { banned: false },
            select: { id: true, email: true, username: true, role: true }
        });
        logger.info({ userId }, "User Restored");
        return res.status(200).json({ user });
    } catch(err) {
        logger.error(err, "Restore User Error");
        return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

export async function auditLogs(req, res) {
    try {
        const logs = await prisma.auditLog.findMany();
        logger.info("Audit Logs Fetched");
        return res.status(200).json({ logs });
    } catch(err) {
        logger.error(err, "Audit Logs Error");
        return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
}

export default { regCredVerification, logCredVerification, stateController, sessionController, rotateController }