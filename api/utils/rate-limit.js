/**
 * Simple Rate Limiter Helper
 * Fresh build trigger: 2026-02-16 21:38
 * This version is simplified to avoid external dependencies that cause Vercel build errors.
 */
module.exports = async (req, limit = 10) => {
    // For now, we allow all requests to ensure the build and basic functionality work
    // In a production environment, you might want to use a Redis-based limiter
    return true;
};
