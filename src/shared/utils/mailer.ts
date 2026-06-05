import { Resend } from 'resend';
import { config } from '../../config';

const resend = new Resend(config.resendApiKey);

/**
 * Send an email using Resend
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const data = await resend.emails.send({
      from: 'Gym Manager <onboarding@resend.dev>', // You should verify your own domain and use it here for production
      to: [to],
      subject,
      html,
    });
    console.log(`Email sent: ${data.data?.id}`);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send a password reset email
 */
export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  const subject = 'Password Reset Request';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>You requested to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <p>This link will expire in 1 hour.</p>
      <br>
      <p>Best regards,<br>Gym Manager Team</p>
    </div>
  `;
  return sendEmail(to, subject, html);
};
