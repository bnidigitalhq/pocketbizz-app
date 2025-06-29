"""
Authentication API Endpoints for Railway Backend
REST API for user registration, login, logout
"""

from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash
import logging

# Import from parent directory
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase_auth import (
    register_user, login_user, logout_user, 
    reset_password, get_current_user, is_demo_mode
)

auth_api_bp = Blueprint('auth_api', __name__)

@auth_api_bp.route('/register', methods=['POST'])
def api_register():
    """API endpoint for user registration"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        password = data.get('password')
        full_name = data.get('full_name')
        business_name = data.get('business_name')
        
        if not email or not password:
            return jsonify({'error': 'Email dan password diperlukan'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password mestilah sekurang-kurangnya 6 aksara'}), 400
        
        # Attempt registration
        result, status_code = register_user(email, password, full_name, business_name)
        return jsonify(result), status_code
        
    except Exception as e:
        logging.error(f"Registration API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_api_bp.route('/login', methods=['POST'])
def api_login():
    """API endpoint for user login"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email dan password diperlukan'}), 400
        
        # Attempt login
        result, status_code = login_user(email, password)
        return jsonify(result), status_code
        
    except Exception as e:
        logging.error(f"Login API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_api_bp.route('/logout', methods=['POST'])
def api_logout():
    """API endpoint for user logout"""
    try:
        result, status_code = logout_user()
        return jsonify(result), status_code
        
    except Exception as e:
        logging.error(f"Logout API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_api_bp.route('/forgot-password', methods=['POST'])
def api_forgot_password():
    """API endpoint for password reset"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email diperlukan'}), 400
        
        result, status_code = reset_password(email)
        return jsonify(result), status_code
        
    except Exception as e:
        logging.error(f"Password reset API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_api_bp.route('/profile', methods=['GET'])
def api_get_profile():
    """API endpoint to get current user profile"""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        return jsonify({'user': user}), 200
        
    except Exception as e:
        logging.error(f"Get profile API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_api_bp.route('/status', methods=['GET'])
def api_auth_status():
    """API endpoint to check authentication status"""
    try:
        user = get_current_user()
        demo_mode = is_demo_mode()
        
        return jsonify({
            'authenticated': user is not None,
            'user': user if user else None,
            'demo_mode': demo_mode
        }), 200
        
    except Exception as e:
        logging.error(f"Auth status API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_api_bp.route('/demo-login', methods=['POST'])
def api_demo_login():
    """API endpoint for demo login"""
    try:
        # Demo login functionality
        demo_user = {
            'id': 'demo-user-123',
            'email': 'demo@pocketbizz.my',
            'full_name': 'Demo User',
            'business_name': 'Demo Business Sdn Bhd'
        }
        
        # Set session for demo mode
        session['user'] = demo_user
        session.modified = True
        
        logging.info("✅ Demo login successful")
        return jsonify({
            'success': True,
            'message': 'Demo login successful',
            'user': demo_user
        }), 200
        
    except Exception as e:
        logging.error(f"Demo login API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500