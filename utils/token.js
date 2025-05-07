const jwt = require('jsonwebtoken');
const { secretKey, expiresIn } = require('../config/jwt');

const generateToken = (user) => {
    return jwt.sign({
        userId: user._id,
      },
      secretKey,
      { expiresIn }
    );
  };

//Refresh Token
const generateRefreshToken = (userId) => {
      return jwt.sign({ userId }, secretKey, { expiresIn: '1000y' }); 
    };

module.exports = {
generateToken,
generateRefreshToken,    
  }