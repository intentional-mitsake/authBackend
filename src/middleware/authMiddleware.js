// authentication middleware not really necessary for backend with only public api requests like register and login
//this will only be needed when we need to alter user profile values for which we would need JWT key verification
//.i.e unless using protected requests ( get /user, post/user) not really needed
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js'
import { ROLES, PERMISSIONS } from '../config/permissions.js'

const prisma = new PrismaClient();

export async function tokenVerification(req, res, next) {
     const authHeader = req.headers['authorization'];
     const token = authHeader && authHeader.split(' ')[1];
     //console.log(token)
     if(!token){ 
        logger.info("Token Not Found");
        return res.status(404).json({error: "Token Not Found"});
    }
     //verify takes a given token from client side, breaks it into--> header, payload, sign and then takes header+payload and applies a hash algo with the JWT Secret KEY we give as the new sign
     //during token gen, we gave it JWT SECRET KEY as the sign and as we are doing the same now, the resulting new token should be the same as the one we got from client side
     //this just verifies that it is a valid token, it doesnt verify if it is the token we want for protected opts
     //for opts like logout, profile update we call services and it commpares the valid token from here and the token in DB to check if the user can acces stuff
     jwt.verify(token, process.env.JWT_SECRET_KEY, function(err, decoded) {
        if (err) {
            logger.info(err, "Invalid Token");
            return res.status(401).json({msg: err.message || 'Invalid Token'})
         }

         //the payload during token gen was userid, now we can attach it to the req so that we can identify which session to delete
         req.user = {}
         req.user.id = decoded.id
         req.user.role = decoded.role
         //session table has id as prim key and token as unique so it needs one of those two in the condition to delete
         req.token = token
         logger.info(decoded, "Token Verified");
         //clear cookie
         res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        });
         next()
        })
}

export async function onAcces(req, res, next) {
    try{
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if(!token){ return res.status(404).json({error: "Token Not Found"})}
        const session = await prisma.session.findUnique({ where: { token  },})
        if(!session){ return res.status(404).json({error: "Session Not Found"})}
        if (session.expiresAt < new Date(Date.now())) {
         await prisma.log.update({where: {userId: session.userId, u_token: token}, data: { logout_time: new Date(Date.now())}})
         await prisma.session.delete({where: {token}})
        
         console.log("Session Ecpired")
         return res.status(200).json({msg: "User Logged Out"})
         } 
         else {
             next()
              }

        
    }catch(err){
        console.log(err)
        return res.status(500).json(err.message || 'Internal Server Error')
    }
    
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if(!req.user.role) {
            return res.status(403).json({error: "Forbidden: No Role Info"});
        } else if(!Object.values(ROLES).includes(req.user.role)) { // not array, so ROLES.inlcudes doesnt work
            // checks if role is in ROLES object .i.e a valid role
            return res.status(403).json({error: "Forbidden: Invalid Role"});
        } else if(!roles.includes(req.user.role)) {
            // checks if the role of the user is in the roles array(...roles) .i.e the user is authorized to access this route
            return res.status(403).json({error: "Forbidden: Insufficient Role"});
        }
        next();
    }
}

export function requirePerm(permission) {
    return (req, res, next) => {
        // first checks if role is in PERMISSIONS object, then if permission is in that role
        if(!PERMISSIONS[req.user.role]?.includes(permission)) {
            return res.status(403).json({error: "Forbidden: Insufficient Permissions"});
        }
        next();
    }
}