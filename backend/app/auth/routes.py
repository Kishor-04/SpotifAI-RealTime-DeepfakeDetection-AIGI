"""
Authentication routes and endpoints.
"""
from flask import request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from app import db
from app.models import User
from app.auth import auth_bp
from app.auth.utils import validate_email, validate_password
from app.auth.google_auth import verify_google_token
import requests
import smtplib
import socket as sock
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def get_smtp_server():
    """Get SMTP server hostname or IP with fallback."""
    try:
        # Try to resolve the hostname first
        sock.gethostbyname('smtp.gmail.com')
        return 'smtp.gmail.com'
    except:
        # Fallback to direct IP if DNS fails
        return '74.125.24.108'


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """
    User registration endpoint.
    POST /api/auth/signup
    Body: { "email": "user@example.com", "username": "username", "password": "password123" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    
    # Validation
    if not email or not username or not password:
        return jsonify({'error': 'Email, username, and password are required'}), 400
    
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    if not validate_password(password):
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Check if user exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create new user
    user = User(
        email=email,
        username=username,
        oauth_provider='email',
        email_verified=False
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    # Generate verification OTP
    otp_expiry_minutes = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    otp = user.generate_verification_otp(expiry_minutes=otp_expiry_minutes)
    db.session.commit()
    
    # Send verification email
    try:
        msg = MIMEMultipart()
        msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
        msg['To'] = email
        msg['Subject'] = 'Email Verification - SpotifAI'
        
        body = f"""
Hello {user.username},

Thank you for signing up! Please verify your email address using this One-Time Password (OTP):

{otp}

This OTP will expire in {otp_expiry_minutes} minutes.

If you didn't create this account, please ignore this email.

Best regards,
SpotifAI Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email via SMTP
        smtp_server = get_smtp_server()
        current_app.logger.info(f'Using SMTP server: {smtp_server}')
        
        old_timeout = sock.getdefaulttimeout()
        sock.setdefaulttimeout(20)
        
        try:
            with smtplib.SMTP(smtp_server, current_app.config['MAIL_PORT'], timeout=20) as server:
                server.set_debuglevel(0)
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
                server.send_message(msg)
        finally:
            sock.setdefaulttimeout(old_timeout)
        
        current_app.logger.info(f'Verification OTP sent to {email}')
        
        return jsonify({
            'message': 'Account created. Please check your email for verification OTP.',
            'email': email,
            'expiry_minutes': otp_expiry_minutes
        }), 201
        
    except Exception as e:
        current_app.logger.error(f'Failed to send verification email: {str(e)}')
        # Delete user if email failed
        db.session.delete(user)
        db.session.commit()
        return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint.
    POST /api/auth/login
    Body: { "email": "user@example.com", "password": "password123" }
    """
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Check if email is verified (only for email auth, not OAuth)
    if user.oauth_provider == 'email' and not user.email_verified:
        return jsonify({
            'error': 'Email not verified. Please check your email for the verification OTP.',
            'email_verified': False,
            'email': user.email
        }), 403
    
    # Generate tokens
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    Refresh access token.
    POST /api/auth/refresh
    Headers: Authorization: Bearer <refresh_token>
    """
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    
    return jsonify({
        'access_token': access_token
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """
    Get current authenticated user.
    GET /api/auth/me
    Headers: Authorization: Bearer <access_token>
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': user.to_dict()
    }), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Logout user (client should discard tokens).
    POST /api/auth/logout
    Headers: Authorization: Bearer <access_token>
    """
    # In a production app, you'd want to blacklist the token
    # For now, we just return success and let client discard tokens
    return jsonify({
        'message': 'Logout successful'
    }), 200


@auth_bp.route('/google', methods=['POST'])
def google_oauth():
    """
    Google OAuth login/signup.
    POST /api/auth/google
    Body: { "token": "google_id_token" }
    """
    data = request.get_json()
    
    if not data or 'token' not in data:
        return jsonify({'error': 'Google token required'}), 400
    
    google_token = data['token']
    
    # Log token info for debugging (first/last 20 chars only for security)
    token_preview = f"{google_token[:20]}...{google_token[-20:]}" if len(google_token) > 40 else "TOKEN_TOO_SHORT"
    current_app.logger.info(f'Received Google token: {token_preview}')
    
    # Verify Google token using utility with automatic fallback
    try:
        user_data = verify_google_token(google_token)
        
        email = user_data.get('email')
        google_id = user_data.get('google_id')
        username = user_data.get('name', email.split('@')[0] if email else 'user')
        
        if not email:
            return jsonify({'error': 'Email not provided by Google'}), 400
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Create new user
            user = User(
                email=email,
                username=username,
                oauth_provider='google',
                oauth_id=google_id,
                email_verified=True  # Google verifies emails
            )
            db.session.add(user)
            db.session.commit()
            current_app.logger.info(f'Created new Google OAuth user: {email}')
        else:
            current_app.logger.info(f'Existing user logged in via Google: {email}')
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        error_msg = str(e)
        current_app.logger.error(f'Google OAuth verification failed: {error_msg}')
        
        # Return user-friendly error message
        if 'Network error' in error_msg or 'Connection' in error_msg:
            return jsonify({
                'error': 'Cannot connect to Google authentication service. Please check your internet connection or try again later.',
                'details': error_msg if current_app.config.get('DEBUG') else None
            }), 503
        elif 'SSL' in error_msg or 'certificate' in error_msg:
            return jsonify({
                'error': 'SSL certificate verification failed. This may be due to network security settings.',
                'details': error_msg if current_app.config.get('DEBUG') else None
            }), 503
        else:
            return jsonify({
                'error': 'Failed to verify Google authentication',
                'details': error_msg if current_app.config.get('DEBUG') else None
            }), 401


@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Update user profile (username and email).
    PUT /api/auth/update-profile
    Headers: Authorization: Bearer <access_token>
    Body: { "username": "new_username", "email": "new_email@example.com" }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    email = data.get('email')
    
    # Update username if provided
    if username:
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        user.username = username
    
    # Update email if provided
    if email:
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if email is already taken by another user
        existing_user = User.query.filter_by(email=email).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({'error': 'Email already in use'}), 409
        
        user.email = email
    
    db.session.commit()
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    """
    Change user password.
    PUT /api/auth/change-password
    Headers: Authorization: Bearer <access_token>
    Body: { "current_password": "old_pass", "new_password": "new_pass" }
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if user uses OAuth (cannot change password)
    if user.oauth_provider != 'email':
        return jsonify({'error': 'Cannot change password for OAuth accounts'}), 400
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new passwords are required'}), 400
    
    # Verify current password
    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    # Validate new password
    if not validate_password(new_password):
        return jsonify({'error': 'New password must be at least 8 characters'}), 400
    
    # Update password
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({
        'message': 'Password changed successfully'
    }), 200


@auth_bp.route('/delete-account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """
    Delete user account and all associated data.
    DELETE /api/auth/delete-account
    Headers: Authorization: Bearer <access_token>
    Body: { "password": "user_password" } (required for email accounts)
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Verify password for email accounts
    if user.oauth_provider == 'email':
        if not data or not data.get('password'):
            return jsonify({'error': 'Password required for account deletion'}), 400
        
        if not user.check_password(data.get('password')):
            return jsonify({'error': 'Incorrect password'}), 401
    
    # Delete user (cascade will delete associated sessions and frames)
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Account deleted successfully'
    }), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    Request password reset OTP.
    POST /api/auth/forgot-password
    Body: { "email": "user@example.com" }
    """
    data = request.get_json()
    
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    email = data.get('email')
    
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        # Don't reveal if user exists - security best practice
        return jsonify({'message': 'If the email exists, an OTP has been sent'}), 200
    
    # Check if user uses OAuth (cannot reset password)
    if user.oauth_provider != 'email':
        return jsonify({'error': 'Cannot reset password for OAuth accounts. Please login with Google.'}), 400
    
    # Generate OTP
    otp_expiry_minutes = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    otp = user.generate_reset_otp(expiry_minutes=otp_expiry_minutes)
    db.session.commit()
    
    # Send email with OTP
    try:
        msg = MIMEMultipart()
        msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
        msg['To'] = email
        msg['Subject'] = 'Password Reset OTP - AI Deepfake Detection'
        
        body = f"""
Hello {user.username},

You requested to reset your password. Your One-Time Password (OTP) is:

{otp}

This OTP will expire in {otp_expiry_minutes} minutes.

If you didn't request this, please ignore this email.

Best regards,
AI Deepfake Detection Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email via SMTP with timeout and SSL
        smtp_server = get_smtp_server()
        current_app.logger.info(f'Using SMTP server: {smtp_server}')
        
        # Temporarily set socket timeout for SMTP only
        old_timeout = sock.getdefaulttimeout()
        sock.setdefaulttimeout(20)
        
        try:
            with smtplib.SMTP(smtp_server, current_app.config['MAIL_PORT'], timeout=20) as server:
                server.set_debuglevel(0)  # Disable debug output
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
                server.send_message(msg)
        finally:
            # Restore original timeout
            sock.setdefaulttimeout(old_timeout)
        
        current_app.logger.info(f'Password reset OTP sent to {email}')
        
        return jsonify({
            'message': 'OTP has been sent to your email',
            'expiry_minutes': otp_expiry_minutes
        }), 200
        
    except smtplib.SMTPException as e:
        current_app.logger.error(f'SMTP error sending OTP email: {str(e)}')
        # Clear OTP if email failed
        user.clear_reset_otp()
        db.session.commit()
        return jsonify({'error': f'Failed to send email: {str(e)}'}), 500
    except Exception as e:
        current_app.logger.error(f'Failed to send OTP email: {str(e)}')
        # Clear OTP if email failed
        user.clear_reset_otp()
        db.session.commit()
        
        # Check if it's a network/DNS error
        error_msg = str(e).lower()
        if 'timed out' in error_msg or 'lookup' in error_msg or '11002' in error_msg:
            return jsonify({'error': 'Cannot connect to email server. Please check your internet connection or try again later.'}), 503
        
        return jsonify({'error': 'Failed to send OTP email. Please try again later.'}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verify password reset OTP.
    POST /api/auth/verify-otp
    Body: { "email": "user@example.com", "otp": "123456" }
    """
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('otp'):
        return jsonify({'error': 'Email and OTP are required'}), 400
    
    email = data.get('email')
    otp = data.get('otp')
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Invalid email or OTP'}), 401
    
    # Verify OTP
    if not user.verify_reset_otp(otp):
        return jsonify({'error': 'Invalid or expired OTP'}), 401
    
    return jsonify({
        'message': 'OTP verified successfully',
        'email': email
    }), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """
    Reset password with OTP.
    POST /api/auth/reset-password
    Body: { "email": "user@example.com", "otp": "123456", "new_password": "newpass123" }
    """
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('otp') or not data.get('new_password'):
        return jsonify({'error': 'Email, OTP, and new password are required'}), 400
    
    email = data.get('email')
    otp = data.get('otp')
    new_password = data.get('new_password')
    
    # Validate new password
    if not validate_password(new_password):
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Invalid email or OTP'}), 401
    
    # Verify OTP again
    if not user.verify_reset_otp(otp):
        return jsonify({'error': 'Invalid or expired OTP'}), 401
    
    # Update password
    user.set_password(new_password)
    user.clear_reset_otp()
    db.session.commit()
    
    current_app.logger.info(f'Password reset successful for {email}')
    
    return jsonify({
        'message': 'Password reset successfully. You can now login with your new password.'
    }), 200


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """
    Verify email with OTP after signup.
    POST /api/auth/verify-email
    Body: { "email": "user@example.com", "otp": "123456" }
    """
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('otp'):
        return jsonify({'error': 'Email and OTP are required'}), 400
    
    email = data.get('email')
    otp = data.get('otp')
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Invalid email or OTP'}), 401
    
    # Check if already verified
    if user.email_verified:
        return jsonify({'error': 'Email already verified'}), 400
    
    # Verify OTP
    if not user.verify_email_otp(otp):
        return jsonify({'error': 'Invalid or expired OTP'}), 401
    
    # Mark email as verified
    user.clear_verification_otp()
    db.session.commit()
    
    current_app.logger.info(f'Email verified successfully for {email}')
    
    # Generate tokens for immediate login
    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'message': 'Email verified successfully. You can now login.',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200


@auth_bp.route('/resend-verification-otp', methods=['POST'])
def resend_verification_otp():
    """
    Resend email verification OTP.
    POST /api/auth/resend-verification-otp
    Body: { "email": "user@example.com" }
    """
    data = request.get_json()
    
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    email = data.get('email')
    
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Find user
    user = User.query.filter_by(email=email).first()
    
    if not user:
        # Don't reveal if user exists
        return jsonify({'message': 'If the email exists and is unverified, an OTP has been sent'}), 200
    
    # Check if already verified
    if user.email_verified:
        return jsonify({'error': 'Email already verified'}), 400
    
    # Generate new OTP
    otp_expiry_minutes = current_app.config.get('OTP_EXPIRY_MINUTES', 10)
    otp = user.generate_verification_otp(expiry_minutes=otp_expiry_minutes)
    db.session.commit()
    
    # Send email with OTP
    try:
        msg = MIMEMultipart()
        msg['From'] = current_app.config['MAIL_DEFAULT_SENDER']
        msg['To'] = email
        msg['Subject'] = 'Email Verification - SpotifAI'
        
        body = f"""
Hello {user.username},

Your new verification One-Time Password (OTP) is:

{otp}

This OTP will expire in {otp_expiry_minutes} minutes.

If you didn't request this, please ignore this email.

Best regards,
SpotifAI Team
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Send email via SMTP
        smtp_server = get_smtp_server()
        current_app.logger.info(f'Using SMTP server: {smtp_server}')
        
        old_timeout = sock.getdefaulttimeout()
        sock.setdefaulttimeout(20)
        
        try:
            with smtplib.SMTP(smtp_server, current_app.config['MAIL_PORT'], timeout=20) as server:
                server.set_debuglevel(0)
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(current_app.config['MAIL_USERNAME'], current_app.config['MAIL_PASSWORD'])
                server.send_message(msg)
        finally:
            sock.setdefaulttimeout(old_timeout)
        
        current_app.logger.info(f'Verification OTP resent to {email}')
        
        return jsonify({
            'message': 'Verification OTP has been sent to your email',
            'expiry_minutes': otp_expiry_minutes
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Failed to resend verification OTP: {str(e)}')
        user.clear_verification_otp()
        db.session.commit()
        return jsonify({'error': 'Failed to send verification email. Please try again later.'}), 500


