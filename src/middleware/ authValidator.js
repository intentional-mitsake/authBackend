import validator from 'validator'
//could have used JOI or YUP but would have been overkill and Regex is just tedious


export function registerValidator(req, res, next) {
    try{
        const { email, password, username } = req.body
        if(!validator.isEmail(email))//validator built-in function complies with RMC smth email format
         {
              return res.status(400).json({ error: "Invalid email format" })
         }
        else if(validator.isEmpty(email) || validator.isEmpty(password) || validator.isEmpty(username)) {
             return res.status(400).json({error : "You must input all fields"})
 
         }
         else if(!validator.isStrongPassword(password))
         {
               return res.status(400).json({error : "Use a stronger password"})
         }
         else{
              console.log('Request Verified')
              next()
             }

        }catch(err) {
            console.log(err)
            return res.status(500).json({ error: err.message || "Internal Server Error"})
        }
}

export function logValidator(req, res, next) {
    try{
        const { email, password, username } = req.body
        if(validator.isEmpty(email) && validator.isEmpty(username)) {
            if(!validator.isEmpty(email) && !validator.isEmail(email))//validator built-in function complies with RMC smth email format
            {
              return res.status(400).json({ error: "Invalid email format" })
            }
            return res.status(400).json({ error: "No Email or Username" })
        } else if (validator.isEmpty(password)) {
            return res.status(400).json({error : "You must input all fields"})
        } else if(!validator.isStrongPassword(password)){
               return res.status(400).json({error : "Use a stronger password"})
        }else{
            console.log('Request Verified')
            next()
        }

        }catch(err) {
            console.log(err)
            return res.status(500).json({ error: err.message || "Internal Server Error"})
        }
}



