const https = require('https');

/**
 * Brevo (formerly Sendinblue) email service integration
 * Requires BREVO_API_KEY environment variable
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@fellowship.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Our Fellowship';

if (!BREVO_API_KEY) {
  console.warn('⚠️  BREVO_API_KEY not configured. Email sending will be disabled.');
}

/**
 * Send email via Brevo
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML email body
 * @param {string} [options.textContent] - Plain text email body
 * @returns {Promise<Object>} Response from Brevo API
 */
async function sendEmail({ to, subject, htmlContent, textContent }) {
  if (!BREVO_API_KEY) {
    console.warn(`⚠️  Email not sent (Brevo not configured): ${subject} to ${to}`);
    return { skipped: true, msg: 'Brevo not configured' };
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
      to: [{ email: to }],
      subject,
      htmlContent,
      textContent
    });

    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Brevo API error (${res.statusCode}): ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Brevo response: ${data}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

/**
 * Send OCF code to organization admin
 */
async function sendOCFCodeEmail({ email, organizationName, ocfCode }) {
  const subject = 'Your OCF Code - Our Fellowship';
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome to Our Fellowship!</h2>
          <p>Your organization <strong>${organizationName}</strong> has been approved.</p>
          <p style="margin: 30px 0;">Your unique OCF Code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; color: #2c3e50; letter-spacing: 2px;">${ocfCode}</h1>
          </div>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This code is case-insensitive and should be used to identify your organization in the system.
          </p>
          <p>If you have any questions, please contact our support team.</p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            Best regards,<br/>
            Our Fellowship Team
          </p>
        </div>
      </body>
    </html>
  `;
  
  const textContent = `Welcome to Our Fellowship!\n\nYour organization ${organizationName} has been approved.\n\nYour OCF Code: ${ocfCode}\n\nThis code is case-insensitive.`;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent
  });
}

/**
 * Send phone verification code
 */
async function sendPhoneVerificationEmail({ email, name, verificationCode }) {
  const subject = 'Verify Your Phone Number - Our Fellowship';
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Phone Verification</h2>
          <p>Hi ${name},</p>
          <p>Please verify your phone number by entering the following code:</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; color: #2c3e50; letter-spacing: 3px;">${verificationCode}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p style="margin-top: 30px; color: #999; font-size: 12px;">
            Best regards,<br/>
            Our Fellowship Team
          </p>
        </div>
      </body>
    </html>
  `;
  
  const textContent = `Phone Verification\n\nHi ${name},\n\nPlease verify your phone number with this code: ${verificationCode}\n\nThis code will expire in 10 minutes.`;

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent
  });
}

module.exports = {
  sendEmail,
  sendOCFCodeEmail,
  sendPhoneVerificationEmail
};
