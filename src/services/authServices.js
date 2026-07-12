import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';
import auditLogger from '../utils/auditLogger.js';

const prisma = new PrismaClient()

export async function registration(email, password, username, ip) {
    try{
        const hpw = await bcrypt.hash(password, 10);
        const created = new Date(Date.now())
        const newUser = await prisma.user.create({
            data: { email, username, password: hpw, createdAt: created}
        })
        logger.info({ email, username }, "User Registered");
        if(!process.env.JWT_SECRET_KEY) { 
            throw new Error("JWT KEY not set in enviroment variables");
        }
        //payload here is userid, sign is JWT SECRET KEY--> we get userid during token verification(authMiddleware) because the payload is userid
        //if we want to get more than just userid during tokenVerfication for protected route functionalites we need to add those fields into the payload as well
        const token =  jwt.sign({ id: newUser.id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
        logger.info({userId: newUser.id}, "Token Generated");
        const tokenExp = new Date(Date.now() + 60 * 60 * 1000)
        const tokenGen = await prisma.session.create({
            data: { userId: newUser.id, token, createdAt: created, expiresAt: tokenExp }
        })
        const log = await prisma.log.create({
            data: { userId: newUser.id, u_token: token, login_time: new Date(Date.now()) }
        })
        logger.info({ email, username }, "User Logged In");
        await auditLogger(newUser.id, "Registration", `ip: ${ip}: User Registered`);
        return token

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
                //del old sessiosn
                await prisma.session.deleteMany({ where: { userId: user.id } });
                logger.info("Old Sessions Deleted");
                const log_token =  jwt.sign({ id: user.id}, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })
                const log_tokenGen = await prisma.session.create({
                     data: { userId: user.id, token: log_token, createdAt: new Date(Date.now()), expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
                    })
                const log = await prisma.log.create({
                     data: { userId: user.id, u_token: log_token, login_time: new Date(Date.now()) }
                       })    
                logger.info({ userId: user.id }, "User Logged In");
                await auditLogger(user.id, "Login", `ip: ${ip} : User Logged In`);
                return log_token
            }
        else{
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
        const token = req.token
        await prisma.log.update({where: {userId: userid, u_token: token}, data: { logout_time: new Date(Date.now())}})
        await prisma.session.delete({where: {token}})
        
        logger.info({ userid }, "User Logged Out");
        return res.status(200).json({msg: "User Logged Out"})
    }catch(err){
        logger.error(err, "Logout Error")
        return res.status(500).json(err.message || 'Internal Server Error')
    }
    
}