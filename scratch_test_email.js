require('dotenv').config({ path: './server/.env' });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('--- Email Test Script ---');
  console.log('User:', process.env.SMTP_USER);
  console.log('Pass length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('Connection verified successfully!');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: process.env.SMTP_USER, // Send to self
      subject: 'TaskFlow SMTP Test',
      text: 'If you see this, your SMTP settings are working perfectly!',
      html: '<b>If you see this, your SMTP settings are working perfectly!</b>',
    });

    console.log('Message sent! ID:', info.messageId);
    console.log('Please check your inbox (and spam folder) for yaseminalili999@gmail.com');
  } catch (error) {
    console.error('ERROR during email test:');
    console.error(error);
  }
}

testEmail();
