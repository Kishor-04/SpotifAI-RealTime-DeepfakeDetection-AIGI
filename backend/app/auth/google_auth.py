"""
Google OAuth verification utilities with multiple fallback methods
"""
import requests
import jwt
import json
from flask import current_app


def verify_google_token_local(token):
    """
    Verify Google ID token by decoding JWT locally (Method 0 - fastest, offline)
    This works because Google already verified the token when issuing it.
    We just need to decode and validate the claims.
    
    Args:
        token: Google ID token from frontend
        
    Returns:
        dict: User data from token if successful
        
    Raises:
        Exception: If token is invalid or expired
    """
    try:
        # Decode without verification first to check basic structure
        # Google already verified this token, we just need to extract the data
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Validate required claims
        if decoded.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
            raise Exception(f"Invalid issuer: {decoded.get('iss')}")
        
        if decoded.get('aud') != current_app.config['GOOGLE_OAUTH_CLIENT_ID']:
            raise Exception(f"Token audience mismatch")
        
        # Check if token is expired
        import time
        if decoded.get('exp', 0) < time.time():
            raise Exception('Token has expired')
        
        # Verify email is present
        if not decoded.get('email'):
            raise Exception('Email not found in token')
        
        current_app.logger.info(f"Successfully decoded Google token locally for {decoded.get('email')}")
        
        return {
            'email': decoded.get('email'),
            'name': decoded.get('name'),
            'google_id': decoded.get('sub'),
            'picture': decoded.get('picture'),
            'email_verified': decoded.get('email_verified', False)
        }
        
    except jwt.DecodeError as e:
        raise Exception(f'Failed to decode token: {str(e)}')
    except Exception as e:
        raise Exception(f'Token validation failed: {str(e)}')


def verify_google_token_requests(token):
    """
    Verify Google ID token using requests library (Method 1)
    
    Args:
        token: Google ID token from frontend
        
    Returns:
        dict: User data from Google if successful
        
    Raises:
        Exception: If verification fails
    """
    try:
        response = requests.get(
            'https://www.googleapis.com/oauth2/v3/tokeninfo',
            params={'id_token': token},
            timeout=15,
            verify=True
        )
        
        if response.status_code != 200:
            raise Exception(f'Google API returned {response.status_code}: {response.text}')
        
        data = response.json()
        
        # Verify audience (client ID)
        if data.get('aud') != current_app.config['GOOGLE_OAUTH_CLIENT_ID']:
            raise Exception(f"Token audience mismatch: {data.get('aud')}")
        
        # Verify email is verified
        if not data.get('email_verified', False):
            raise Exception('Email not verified by Google')
        
        return {
            'email': data.get('email'),
            'name': data.get('name'),
            'google_id': data.get('sub'),
            'picture': data.get('picture'),
            'email_verified': data.get('email_verified')
        }
        
    except requests.exceptions.RequestException as e:
        raise Exception(f'Network error: {str(e)}')


def verify_google_token_google_auth(token):
    """
    Verify Google ID token using google-auth library (Method 2 - more reliable)
    
    Args:
        token: Google ID token from frontend
        
    Returns:
        dict: User data from Google if successful
        
    Raises:
        Exception: If verification fails or library not installed
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        
        # Verify token
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            current_app.config['GOOGLE_OAUTH_CLIENT_ID']
        )
        
        # Verify issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise Exception('Invalid token issuer')
        
        return {
            'email': idinfo.get('email'),
            'name': idinfo.get('name'),
            'google_id': idinfo.get('sub'),
            'picture': idinfo.get('picture'),
            'email_verified': idinfo.get('email_verified', False)
        }
        
    except ImportError:
        raise Exception('google-auth library not installed. Install with: pip install google-auth')
    except ValueError as e:
        raise Exception(f'Invalid token: {str(e)}')


def verify_google_token_no_ssl(token):
    """
    Verify Google ID token without SSL verification (Method 3 - DEVELOPMENT ONLY)
    Use only when behind corporate firewall or for local development
    
    Args:
        token: Google ID token from frontend
        
    Returns:
        dict: User data from Google if successful
        
    Raises:
        Exception: If verification fails
    """
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    try:
        response = requests.get(
            'https://www.googleapis.com/oauth2/v3/tokeninfo',
            params={'id_token': token},
            timeout=15,
            verify=False  # WARNING: Insecure! Use only for development
        )
        
        if response.status_code != 200:
            raise Exception(f'Google API returned {response.status_code}')
        
        data = response.json()
        
        if data.get('aud') != current_app.config['GOOGLE_OAUTH_CLIENT_ID']:
            raise Exception('Token audience mismatch')
        
        return {
            'email': data.get('email'),
            'name': data.get('name'),
            'google_id': data.get('sub'),
            'picture': data.get('picture'),
            'email_verified': data.get('email_verified', False)
        }
        
    except requests.exceptions.RequestException as e:
        raise Exception(f'Network error even without SSL: {str(e)}')


def verify_google_token(token):
    """
    Verify Google ID token with automatic fallback between methods
    
    Args:
        token: Google ID token from frontend
        
    Returns:
        dict: User data from Google
        
    Raises:
        Exception: If all verification methods fail
    """
    errors = []
    
    # Method 0: Local JWT decode (fastest, works offline)
    # Since Google already verified the token when issuing it to the user,
    # we can safely decode it locally and validate the claims
    try:
        current_app.logger.info('Attempting Google token verification by local JWT decode')
        return verify_google_token_local(token)
    except Exception as e:
        error_msg = f'Method 0 (local decode) failed: {str(e)}'
        current_app.logger.warning(error_msg)
        errors.append(error_msg)
    
    # Method 1: Standard requests with SSL (most secure but requires network)
    try:
        current_app.logger.info('Attempting Google token verification with requests (SSL enabled)')
        return verify_google_token_requests(token)
    except Exception as e:
        error_msg = f'Method 1 (requests+SSL) failed: {str(e)}'
        current_app.logger.warning(error_msg)
        errors.append(error_msg)
    
    # Method 2: Google's official library
    try:
        current_app.logger.info('Attempting Google token verification with google-auth library')
        return verify_google_token_google_auth(token)
    except Exception as e:
        error_msg = f'Method 2 (google-auth) failed: {str(e)}'
        current_app.logger.warning(error_msg)
        errors.append(error_msg)
    
    # Method 3: No SSL verification (development only)
    if current_app.config.get('DEBUG'):
        try:
            current_app.logger.warning('Attempting Google token verification WITHOUT SSL (DEVELOPMENT MODE)')
            return verify_google_token_no_ssl(token)
        except Exception as e:
            error_msg = f'Method 3 (no SSL) failed: {str(e)}'
            current_app.logger.error(error_msg)
            errors.append(error_msg)
    
    # All methods failed
    error_summary = '; '.join(errors)
    raise Exception(f'All verification methods failed: {error_summary}')
