import validator from 'validator'
//could have used JOI or YUP but would have been overkill and Regex is just tedious
import logger from '../utils/logger.js'


export function registerValidator(req, res, next) {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username || validator.isEmpty(email) || validator.isEmpty(password) || validator.isEmpty(username)) {
        logger.warn({ email, username }, "All fields are required");
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (!validator.isEmail(email)) {
        logger.warn({ email }, "Invalid email format");
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validator.isStrongPassword(password)) {
        logger.warn({ password }, "Use a stronger password");
        return res.status(400).json({ error: 'Use a stronger password' });
    }
    logger.info({ email, username }, "Request Validated");
    next();
  } catch (err) {
    logger.error(err, "Validation Error");
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}

export function logValidator(req, res, next) {
  try {
    const { email, username, password } = req.body;

    if ((!email || validator.isEmpty(email)) && (!username || validator.isEmpty(username))) {
        logger.warn({ email, username }, "Email or username is required");
        return res.status(400).json({ error: 'Email or username is required' });
    }
    if (email && !validator.isEmail(email)) {
        logger.warn({ email }, "Invalid email format");
        return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!password || validator.isEmpty(password)) {
        logger.warn({ password }, "Password is required");
        return res.status(400).json({ error: 'Password is required' });
    }
    logger.info({ email, username }, "Request Validated");
    next();
  } catch (err) {
    logger.error(err, "Validation Error");
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}


