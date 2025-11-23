import nodemailer from "nodemailer";
import { WELCOME_EMAIL_TEMPLATE } from "./templates";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

export const sendWelcomeEmail = async ({
  email,
  name,
  intro,
}: WelcomeEmailData) => {
  const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace("{{name}}", name).replace(
    "{{intro}}",
    intro
  );
  const mailOptions = {
    from: `"StockUp" <noreply@stockup.com>"`,
    to: email,
    subject: `Welcome to StockUp! - your stock market toolkit is ready`,
    text: `Thank you for signing up for StockUp! We're excited to have you with us.`,
    html: htmlTemplate,
  };
  await transporter.sendMail(mailOptions);
};
