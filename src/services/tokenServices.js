import jwt from 'jsonwebtoken';
import { randomUUID, createHash } from 'crypto';

export function generateTokens(payload) {
    //short lived access token
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const refreshToken = randomUUID(); // rand str
    const hashedRefToken = createHash('sha256').update(refreshToken).digest('hex'); // hash 

    return { accessToken, hashedRefToken };
}