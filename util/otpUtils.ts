import nodemailer from "nodemailer";
import { emailForgotPasswordOTP, emailMessage, emailUpdateOTP, resendRegistrationOTPEmail } from "../constants/email_message";
import dotenv from "dotenv";
dotenv.config();

export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};


export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  const mailTransporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    service: "gmail",
    auth: {
      user: process.env.NODE_MAILER_USER,
      pass: process.env.NODE_MAILER_PASSWORD,
    },
  });

  const mailOptions = {
    from: "no-reply@yourdomain.com",
    to,
    subject,
    html: htmlContent,
  };

  await mailTransporter.sendMail(mailOptions);
};

// Different email templates can be passed here
export const sendRegistrationOTPEmail = async (userName: string, email: string, otp: string) => {
    await sendEmail(email, "Your OTP Code for SocialApp", emailMessage(userName, email, otp));
};
  

export const sendUpdateEmailOTP = async (userName: string, email: string, otp: string) => {
  await sendEmail(email, "Your OTP Code for SocialApp", emailUpdateOTP(userName, email, otp));
};

export const sendForgotPasswordOTP = async (userName: string, email: string, otp: string) => {
  await sendEmail(email, "Your OTP Code for SocialApp", emailForgotPasswordOTP(userName, email, otp));
};

export const resendRegistrationOTP = async (userName: string, email: string, otp: string) => {
  await sendEmail(email, "Your OTP Code for SocialApp", resendRegistrationOTPEmail(userName, email, otp));
};