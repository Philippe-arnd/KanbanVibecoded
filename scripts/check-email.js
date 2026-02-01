
import nodemailer from 'nodemailer';

// Use the same credentials as in .env
const account = {
    user: 'ggb5z7ebpmznynyl@ethereal.email',
    pass: 'GZVHwh9mY5HWebkbXB'
};

console.log('To view your captured emails, visit this URL:');
console.log(nodemailer.getTestMessageUrl({
    user: account.user,
    pass: account.pass
}) || `https://ethereal.email/login (Login with: ${account.user} / ${account.pass})`);
