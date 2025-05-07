const registerTemplate = (full_name, OTP_Code) => {
    const welcomeText = `Hello ${full_name},\n\nWelcome to our platform! We're excited to have you on board. Your account has been successfully created.\n\nTo verify your email, please use the following OTP: ${OTP_Code}\nThis OTP is valid for 5 minutes.\n\nBest regards,\nThe Team`;
    
    const welcomeHtml = `
      <h1 style="color: #333;">Welcome, ${full_name}!</h1>
      <p style="font-size: 16px; color: #666;">We're excited to have you on board. Your account has been successfully created.</p>
      <p style="font-size: 16px; color: #666;">To verify your email, please use the following OTP: <strong style="color: #007bff;">${OTP_Code}</strong></p>
      <p style="font-size: 16px; color: #666;">This OTP is valid for 5 minutes.</p>
      <p style="font-size: 16px; color: #666;">Start exploring our platform and let us know if you need any assistance.</p>
      <br>
      <p style="font-size: 14px; color: #999;">Best regards,<br>The Team</p>
    `;
  
    return { text: welcomeText, html: welcomeHtml };
  };
  
  module.exports = { registerTemplate };