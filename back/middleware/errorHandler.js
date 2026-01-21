function errorHandler(err, req, res, next) {
    console.log("error :", err);
    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;

