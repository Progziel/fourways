const { secretKey } = require('../config/jwt');
const jwt = require('jsonwebtoken');

exports.verifyToken = async (req, res,next) => {
    
        const Authorization  = req.headers["authorization"];
        if (!Authorization) {
            return res.status(200).json({
                code: 206,
                status: false,
                message: "Please provide an Authorization token",
            });
        }

            // Split the Authorization header to extract the token
    if (!Authorization.startsWith("Bearer ")) {
        return res.status(400).json({
            code: 400,
            status: false,
            message: "Authorization header must start with 'Bearer '",
        });
    }

    const token = Authorization.split(" ")[1]; // Extract the token after "Bearer "

        jwt.verify(token, secretKey, (err, decoded) => {
            if (err) {
                if (err.name === 'JsonWebTokenError') {
                    return res.status(400).json({ message: 'Invalid Token' });
                } else if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ message: 'Token has expired' });
                } else {
                    return res.status(500).json({ message: 'Internal Server Error' });
                }
            }

            req.user = decoded;
            next();
        });
    }
