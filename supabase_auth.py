"""
Supabase Authentication Module for PocketBizz
Handles user registration, login, logout, and session management
"""

import os
import logging
from datetime import datetime, timedelta
from functools import wraps
from supabase import create_client, Client
from flask import session, request, redirect, url_for, flash, jsonify, g
from jose import jwt, JWTError

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", os.environ.get("SESSION_SECRET"))

# Initialize Supabase client
supabase: Client = None

def init_supabase():
    """Initialize Supabase client"""
    global supabase
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        logging.info("✅ Supabase client initialized successfully")
        return True
    else:
        logging.warning("⚠️ Supabase credentials not found - running in demo mode")
        return False

def get_current_user():
    """Get current authenticated user from session"""
    if 'user' in session:
        return session['user']
    
    # Check for JWT token in headers (for API calls)
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return payload
        except JWTError:
            pass
    
    return None

def login_required(f):
    """Decorator to require authentication for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            flash('Sila log masuk untuk mengakses halaman ini', 'warning')
            return redirect(url_for('auth_login'))
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            if request.is_json:
                return jsonify({'error': 'Authentication required'}), 401
            return redirect(url_for('auth_login'))
        
        # Check if user is admin (you can customize this logic)
        if not user.get('is_admin', False) and user.get('email') != 'admin@pocketbizz.my':
            if request.is_json:
                return jsonify({'error': 'Admin access required'}), 403
            flash('Akses admin diperlukan', 'error')
            return redirect(url_for('index'))
        
        g.current_user = user
        return f(*args, **kwargs)
    return decorated_function

def register_user(email, password, full_name=None, business_name=None):
    """Register a new user with Supabase"""
    if not supabase:
        return {'error': 'Authentication service not available'}, 500
    
    try:
        # Register with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name or "",
                    "business_name": business_name or "",
                    "created_at": datetime.utcnow().isoformat()
                }
            }
        })
        
        if auth_response.user:
            logging.info(f"✅ User registered successfully: {email}")
            return {
                'success': True,
                'user': auth_response.user,
                'session': auth_response.session
            }, 200
        else:
            return {'error': 'Registration failed'}, 400
            
    except Exception as e:
        logging.error(f"❌ Registration error: {str(e)}")
        return {'error': str(e)}, 400

def login_user(email, password):
    """Login user with email and password"""
    if not supabase:
        return {'error': 'Authentication service not available'}, 500
    
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if auth_response.user and auth_response.session:
            # Store user session
            user_data = {
                'id': auth_response.user.id,
                'email': auth_response.user.email,
                'full_name': auth_response.user.user_metadata.get('full_name', ''),
                'business_name': auth_response.user.user_metadata.get('business_name', ''),
                'is_admin': auth_response.user.email == 'admin@pocketbizz.my',
                'access_token': auth_response.session.access_token,
                'refresh_token': auth_response.session.refresh_token
            }
            
            session['user'] = user_data
            session.permanent = True
            
            logging.info(f"✅ User logged in successfully: {email}")
            return {'success': True, 'user': user_data}, 200
        else:
            return {'error': 'Invalid email or password'}, 401
            
    except Exception as e:
        logging.error(f"❌ Login error: {str(e)}")
        return {'error': 'Invalid email or password'}, 401

def logout_user():
    """Logout current user"""
    if not supabase:
        session.clear()
        return {'success': True}, 200
    
    try:
        if 'user' in session and session['user'].get('access_token'):
            # Sign out from Supabase
            supabase.auth.sign_out()
        
        session.clear()
        logging.info("✅ User logged out successfully")
        return {'success': True}, 200
        
    except Exception as e:
        logging.error(f"❌ Logout error: {str(e)}")
        session.clear()  # Clear session anyway
        return {'success': True}, 200

def reset_password(email):
    """Send password reset email"""
    if not supabase:
        return {'error': 'Authentication service not available'}, 500
    
    try:
        response = supabase.auth.reset_password_email(email)
        logging.info(f"✅ Password reset email sent to: {email}")
        return {'success': True, 'message': 'Email reset password telah dihantar'}, 200
        
    except Exception as e:
        logging.error(f"❌ Password reset error: {str(e)}")
        return {'error': 'Failed to send reset email'}, 400

def update_user_profile(user_id, updates):
    """Update user profile information"""
    if not supabase:
        return {'error': 'Authentication service not available'}, 500
    
    try:
        # Update user metadata
        response = supabase.auth.update_user({
            "data": updates
        })
        
        if response.user:
            # Update session data
            if 'user' in session:
                session['user'].update(updates)
                session.modified = True
            
            logging.info(f"✅ User profile updated: {user_id}")
            return {'success': True, 'user': response.user}, 200
        else:
            return {'error': 'Failed to update profile'}, 400
            
    except Exception as e:
        logging.error(f"❌ Profile update error: {str(e)}")
        return {'error': str(e)}, 400

def get_user_business_settings(user_id):
    """Get business settings for user"""
    if not supabase:
        # Return default settings for demo mode
        return {
            'business_name': 'Demo Business',
            'currency': 'RM',
            'monthly_limit': 5000.0
        }
    
    try:
        response = supabase.table('business_settings').select('*').eq('user_id', user_id).execute()
        
        if response.data:
            return response.data[0]
        else:
            # Create default settings
            default_settings = {
                'user_id': user_id,
                'business_name': '',
                'currency': 'RM',
                'monthly_limit': 5000.0,
                'created_at': datetime.utcnow().isoformat()
            }
            
            insert_response = supabase.table('business_settings').insert(default_settings).execute()
            return insert_response.data[0] if insert_response.data else default_settings
            
    except Exception as e:
        logging.error(f"❌ Error getting business settings: {str(e)}")
        return None

def is_demo_mode():
    """Check if running in demo mode (no Supabase)"""
    return supabase is None

# Initialize Supabase on module import
init_supabase()