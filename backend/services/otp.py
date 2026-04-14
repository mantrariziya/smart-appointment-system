"""
OTP Service for Forgot Password
Generates, stores, and verifies OTPs
"""
import random
import string
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from dotenv import load_dotenv
from logger import setup_logger

load_dotenv()

logger = setup_logger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv('SMTP_EMAIL')
SENDER_PASSWORD = os.getenv('SMTP_PASSWORD')
SENDER_NAME = os.getenv('HOSPITAL_NAME', 'Smart Medical Center')

# In-memory OTP store: { email: { otp, expires_at } }
_otp_store = {}


def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


def send_otp(email: str) -> dict:
    """Send OTP to email for password reset"""
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        return {'success': False, 'error': 'Email service not configured'}

    otp = generate_otp()
    expires_at = datetime.now() + timedelta(minutes=10)
    _otp_store[email] = {'otp': otp, 'expires_at': expires_at}

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg['To'] = email
        msg['Subject'] = f"Your Password Reset OTP - {SENDER_NAME}"

        current_time = datetime.now().strftime('%d %B %Y, %I:%M %p')

        body = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(30,64,175,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:36px 40px 28px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%;padding:14px;margin-bottom:12px;">
                <span style="font-size:32px;">&#128274;</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">{SENDER_NAME}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.80);font-size:14px;">Secure Password Reset</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 8px;color:#374151;font-size:16px;font-weight:600;">Hello,</p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your account associated with
                <strong style="color:#1e40af;">{email}</strong>.
                Use the OTP below to proceed.
              </p>

              <!-- OTP Box -->
              <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px dashed #3b82f6;border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your One-Time Password</p>
                <span style="font-size:44px;font-weight:900;letter-spacing:14px;color:#1e40af;font-family:'Courier New',monospace;">{otp}</span>
                <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">
                  &#9201; Expires in <strong>10 minutes</strong> &nbsp;|&nbsp; Valid for single use only
                </p>
              </div>

              <!-- Steps -->
              <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
                <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:700;">How to reset your password:</p>
                <table cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:4px 0;">
                      <span style="display:inline-block;background:#1e40af;color:#fff;border-radius:50%;width:20px;height:20px;text-align:center;font-size:11px;font-weight:700;line-height:20px;margin-right:10px;">1</span>
                      <span style="color:#6b7280;font-size:13px;">Enter the OTP on the password reset page</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">
                      <span style="display:inline-block;background:#1e40af;color:#fff;border-radius:50%;width:20px;height:20px;text-align:center;font-size:11px;font-weight:700;line-height:20px;margin-right:10px;">2</span>
                      <span style="color:#6b7280;font-size:13px;">Set your new password (min. 6 characters)</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">
                      <span style="display:inline-block;background:#1e40af;color:#fff;border-radius:50%;width:20px;height:20px;text-align:center;font-size:11px;font-weight:700;line-height:20px;margin-right:10px;">3</span>
                      <span style="color:#6b7280;font-size:13px;">Log in with your new password</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Warning -->
              <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:14px 18px;margin-bottom:8px;">
                <p style="margin:0;color:#92400e;font-size:13px;">
                  <strong>&#9888; Security Notice:</strong> If you did not request a password reset,
                  please ignore this email. Your account remains secure.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">This email was sent on {current_time}</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; {datetime.now().year} {SENDER_NAME} &nbsp;|&nbsp; Do not reply to this email
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)

        logger.info(f"OTP sent to {email}")
        return {'success': True, 'message': 'OTP sent successfully'}

    except Exception as e:
        logger.error(f"Failed to send OTP to {email}: {e}")
        return {'success': False, 'error': str(e)}


def verify_otp(email: str, otp: str) -> dict:
    """Verify OTP for given email"""
    record = _otp_store.get(email)

    if not record:
        return {'success': False, 'error': 'No OTP found for this email'}

    if datetime.now() > record['expires_at']:
        del _otp_store[email]
        return {'success': False, 'error': 'OTP has expired'}

    if record['otp'] != otp:
        return {'success': False, 'error': 'Invalid OTP'}

    del _otp_store[email]
    # Store verified token so reset-password can confirm OTP was verified
    _otp_store[f"{email}__verified"] = datetime.now() + timedelta(minutes=10)
    return {'success': True, 'message': 'OTP verified'}
