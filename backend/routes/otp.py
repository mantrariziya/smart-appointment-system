"""
OTP Routes for Forgot Password
"""
from flask import Blueprint, request, jsonify
from services.otp import send_otp, verify_otp
from logger import setup_logger
import os
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

logger = setup_logger(__name__)
otp_bp = Blueprint('otp', __name__)

_firebase_app = None

def _get_auth():
    """Get Firebase Auth, initializing a named app if needed"""
    global _firebase_app
    try:
        # Try to get existing app named 'otp'
        _firebase_app = firebase_admin.get_app('otp')
    except ValueError:
        sa_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        cred = credentials.Certificate(sa_path)
        _firebase_app = firebase_admin.initialize_app(cred, name='otp')
    return firebase_auth


@otp_bp.route('/auth/send-otp', methods=['POST'])
def send_otp_route():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return jsonify({'success': False, 'error': 'Email is required'}), 400

        # Check user exists in Firebase
        auth = _get_auth()
        try:
            auth.get_user_by_email(email, app=_firebase_app)
        except firebase_admin.auth.UserNotFoundError:
            return jsonify({'success': False, 'error': 'No account found with this email'}), 404

        result = send_otp(email)
        if result['success']:
            return jsonify({'success': True, 'message': 'OTP sent to your email'}), 200
        else:
            return jsonify({'success': False, 'error': result['error']}), 500

    except Exception as e:
        logger.exception(f"Send OTP error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@otp_bp.route('/auth/verify-otp', methods=['POST'])
def verify_otp_route():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()

        if not email or not otp:
            return jsonify({'success': False, 'error': 'Email and OTP are required'}), 400

        result = verify_otp(email, otp)
        return jsonify(result), 200 if result['success'] else 400

    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@otp_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        new_password = data.get('newPassword', '')

        if not email or not new_password:
            return jsonify({'success': False, 'error': 'Email and new password are required'}), 400

        if len(new_password) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400

        if not any(c.isupper() for c in new_password):
            return jsonify({'success': False, 'error': 'Password must contain at least one uppercase letter'}), 400

        if not any(c.isdigit() for c in new_password):
            return jsonify({'success': False, 'error': 'Password must contain at least one number'}), 400

        # Check OTP was verified
        from services.otp import _otp_store
        from datetime import datetime
        verified_key = f"{email}__verified"
        verified_expiry = _otp_store.get(verified_key)
        if not verified_expiry or datetime.now() > verified_expiry:
            return jsonify({'success': False, 'error': 'OTP verification required before reset'}), 403
        del _otp_store[verified_key]

        auth = _get_auth()
        user = auth.get_user_by_email(email, app=_firebase_app)
        auth.update_user(user.uid, password=new_password, app=_firebase_app)

        logger.info(f"Password reset for {email}")
        return jsonify({'success': True, 'message': 'Password reset successfully'}), 200

    except firebase_admin.auth.UserNotFoundError:
        return jsonify({'success': False, 'error': 'User not found'}), 404
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
