import validator from 'validator'
//could have used JOI or YUP but would have been overkill and Regex is just tedious


export function registerValidator(req, res, next) {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username ||
        validator.isEmpty(email) || validator.isEmpty(password) || validator.isEmpty(username)) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({ error: 'Use a stronger password' });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}

export function logValidator(req, res, next) {
  try {
    const { email, username, password } = req.body;

    if ((!email || validator.isEmpty(email)) && (!username || validator.isEmpty(username))) {
      return res.status(400).json({ error: 'Email or username is required' });
    }
    if (email && !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!password || validator.isEmpty(password)) {
      return res.status(400).json({ error: 'Password is required' });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}


