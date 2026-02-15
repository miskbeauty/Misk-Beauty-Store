const rateLimit = require('lambda-rate-limiter')({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500
});

module.exports = async (req, limit = 10) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await rateLimit.check(limit, ip);
    } catch (error) {
        throw new Error('Rate limit exceeded');
    }
};
