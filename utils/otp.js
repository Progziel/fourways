const randomstring = require('randomstring');
const generateOTP = () => {
    return randomstring.generate({
        length: 6,
        charset: 'numeric'
    });
};

module.exports = generateOTP;
