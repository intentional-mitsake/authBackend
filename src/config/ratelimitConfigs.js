export const ratelimitConfig = {
    window: 60 * 1000, // 1 minute in milliseconds
    max: 5, // limit each IP to 5 requests per window
    message: 'Too many requests. Please try again later.'
};

export default ratelimitConfig;