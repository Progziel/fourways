require("dotenv").config();
module.exports = {
  secretKey: process.env.ACCESS_TOKEN_SECRET,
  expiresIn: process.env.EXPIRES_IN,
  refreshSecretKey: process.env.REFRESS_TOKEN_SECRET,
};
