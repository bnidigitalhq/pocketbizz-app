"""
Authentication Routes for PocketBizz
Handles login, register, logout pages and API endpoints
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from supabase_auth import register_user, login_user, logout_user, reset_password, get_current_user, is_demo_mode
import logging

# Create auth blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and handler"""
    if request.method == 'POST':
        if request.is_json:
            # API endpoint
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
        else:
            # Form submission
            email = request.form.get('email')
            password = request.form.get('password')
        
        if not email or not password:
            if request.is_json:
                return jsonify({'error': 'Email dan password diperlukan'}), 400
            flash('Email dan password diperlukan', 'error')
            return render_template('auth/login.html')
        
        # Attempt login
        result, status_code = login_user(email, password)
        
        if status_code == 200:
            if request.is_json:
                return jsonify(result), 200
            flash('Berjaya log masuk!', 'success')
            
            # Redirect to originally requested page or dashboard
            next_page = request.args.get('next') or url_for('index')
            return redirect(next_page)
        else:
            if request.is_json:
                return jsonify(result), status_code
            flash(result.get('error', 'Login gagal'), 'error')
            return render_template('auth/login.html')
    
    # GET request - show login form
    # Redirect if already logged in
    if get_current_user():
        return redirect(url_for('index'))
    
    return render_template('auth/login.html', demo_mode=is_demo_mode())

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """Register page and handler"""
    if request.method == 'POST':
        if request.is_json:
            # API endpoint
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
            full_name = data.get('full_name')
            business_name = data.get('business_name')
        else:
            # Form submission
            email = request.form.get('email')
            password = request.form.get('password')
            confirm_password = request.form.get('confirm_password')
            full_name = request.form.get('full_name')
            business_name = request.form.get('business_name')
            
            # Validate password confirmation
            if password != confirm_password:
                flash('Password tidak sepadan', 'error')
                return render_template('auth/register.html')
        
        if not email or not password:
            error_msg = 'Email dan password diperlukan'
            if request.is_json:
                return jsonify({'error': error_msg}), 400
            flash(error_msg, 'error')
            return render_template('auth/register.html')
        
        if len(password) < 6:
            error_msg = 'Password mestilah sekurang-kurangnya 6 aksara'
            if request.is_json:
                return jsonify({'error': error_msg}), 400
            flash(error_msg, 'error')
            return render_template('auth/register.html')
        
        # Attempt registration
        result, status_code = register_user(email, password, full_name, business_name)
        
        if status_code == 200:
            if request.is_json:
                return jsonify(result), 200
            flash('Pendaftaran berjaya! Sila semak email untuk pengesahan.', 'success')
            return redirect(url_for('auth.login'))
        else:
            if request.is_json:
                return jsonify(result), status_code
            flash(result.get('error', 'Pendaftaran gagal'), 'error')
            return render_template('auth/register.html')
    
    # GET request - show register form
    # Redirect if already logged in
    if get_current_user():
        return redirect(url_for('index'))
    
    return render_template('auth/register.html', demo_mode=is_demo_mode())

@auth_bp.route('/logout')
def logout():
    """Logout handler"""
    result, status_code = logout_user()
    
    if request.is_json:
        return jsonify(result), status_code
    
    flash('Berjaya log keluar', 'success')
    return redirect(url_for('landing'))

@auth_bp.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Forgot password page and handler"""
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            email = data.get('email')
        else:
            email = request.form.get('email')
        
        if not email:
            error_msg = 'Email diperlukan'
            if request.is_json:
                return jsonify({'error': error_msg}), 400
            flash(error_msg, 'error')
            return render_template('auth/forgot_password.html')
        
        result, status_code = reset_password(email)
        
        if request.is_json:
            return jsonify(result), status_code
        
        if status_code == 200:
            flash('Email reset password telah dihantar. Sila semak inbox anda.', 'success')
        else:
            flash(result.get('error', 'Gagal menghantar email reset'), 'error')
        
        return render_template('auth/forgot_password.html')
    
    return render_template('auth/forgot_password.html', demo_mode=is_demo_mode())

@auth_bp.route('/profile', methods=['GET', 'POST'])
def profile():
    """User profile page"""
    user = get_current_user()
    if not user:
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        updates = {}
        
        if request.is_json:
            data = request.get_json()
            updates = data
        else:
            full_name = request.form.get('full_name')
            business_name = request.form.get('business_name')
            
            if full_name:
                updates['full_name'] = full_name
            if business_name:
                updates['business_name'] = business_name
        
        if updates:
            from supabase_auth import update_user_profile
            result, status_code = update_user_profile(user['id'], updates)
            
            if request.is_json:
                return jsonify(result), status_code
            
            if status_code == 200:
                flash('Profil berjaya dikemaskini', 'success')
            else:
                flash(result.get('error', 'Gagal mengemaskini profil'), 'error')
        
        return redirect(url_for('auth.profile'))
    
    return render_template('auth/profile.html', user=user, demo_mode=is_demo_mode())

# Demo login route for testing without Supabase
@auth_bp.route('/demo-login')
def demo_login():
    """Demo login for testing without Supabase setup"""
    if not is_demo_mode():
        flash('Demo mode tidak tersedia', 'error')
        return redirect(url_for('auth.login'))
    
    # Create demo user session
    demo_user = {
        'id': 'demo-user-123',
        'email': 'demo@pocketbizz.my',
        'full_name': 'Demo User',
        'business_name': 'Demo Business Sdn Bhd',
        'is_admin': True,  # Demo user has admin access
        'access_token': 'demo-token',
        'refresh_token': 'demo-refresh'
    }
    
    session['user'] = demo_user
    session.permanent = True
    
    flash('Berjaya log masuk sebagai pengguna demo', 'success')
    return redirect(url_for('index'))

# API endpoint to check authentication status
@auth_bp.route('/status')
def auth_status():
    """Check current authentication status"""
    user = get_current_user()
    return jsonify({
        'authenticated': user is not None,
        'user': user,
        'demo_mode': is_demo_mode()
    })