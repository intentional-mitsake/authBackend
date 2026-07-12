//import bcrypt from 'bcryptjs'
//import jwebtoken from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client';
import { registration, login } from '../services/authServices.js';
import { logger } from '../utils/logger.js';


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
                const token = await registration(email, password, username, req.ip); // req.ip is the ip address of the incoing request
                logger.info({ email, username }, "User Registered");
                return res.status(200).json({ token });
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
            const log_token = await login(user, password, req.ip);
            logger.info({ email, username }, "User Logged In");
            return res.status(200).json({ log_token });
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