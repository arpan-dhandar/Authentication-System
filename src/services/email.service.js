import nodemailer from 'nodemailer';
import config from '../connfig/config.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN,
        user: config.GOOGLE_USER
    }   
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Error setting up email transporter:', error);
    } else {
        console.log('Email transporter is ready to send messages');
    }
});

export const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `Your name <${config.GOOGLE_USER}>`,
            to,
            subject,
            text,
            html
        });

        console.log('Message Sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

    } catch (error) {
        console.error('Error sending email:', error);
    }
}