import { axiosInstance } from './axiosInstance';

const ZEPTO_API_URL = 'https://api.zeptomail.in/v1.1/email';
const ZEPTO_API_KEY = 'Zoho-enczapikey PHtE6r0FRejqjTUu9UJVs/TuEcakMth8ruNmLwBA44wTW/5VTU0Dq9ovljK3rBh+BqYUQPGam4Jst72fte7UIm67NT5KD2qyqK3sx/VYSPOZsbq6x00atV0ff0XdV4Drd9Fq0CXfudzTNA==';

interface SendEmailParams {
    to: {
        email: string;
        name?: string;
    };
    subject: string;
    htmlBody: string;
}

export const emailApi = {
    sendEmail: async (params: SendEmailParams) => {
        const payload = {
            from: { 
                address: 'notifications@turtleit.in'
            },
            to: [{
                email_address: {
                    address: params.to.email,
                    name: params.to.name || params.to.email
                }
            }],
            subject: params.subject,
            htmlbody: params.htmlBody
        };

        const headers = {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': ZEPTO_API_KEY
        };

        try {
            const response = await fetch(ZEPTO_API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Email API error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to send email:', error);
            throw error;
        }
    },

    sendOtpEmail: async (email: string, otp: string) => {
        const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Your One-Time Password (OTP)</h2>
                <p style="color: #666; font-size: 16px;">Please use the following OTP to login to your account:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                    <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px;">This OTP will expire in 5 minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
            </div>
        `;

        return emailApi.sendEmail({
            to: { email },
            subject: 'Your Login OTP - Turtle Software',
            htmlBody
        });
    }
};

export default emailApi;
