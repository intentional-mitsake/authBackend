export const ratelimitConfig = {
    window: 60 * 60 * 1000, // 1 hour in milliseconds
    max: 100, // limit each IP to 100 requests per window
    message: 'Too many requests. Please try again later.'
};

export default ratelimitConfig;