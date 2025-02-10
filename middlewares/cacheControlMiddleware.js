// middlewares/cacheControlMiddleware.js

const preventBackButton = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
};

module.exports = preventBackButton;