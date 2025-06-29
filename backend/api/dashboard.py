"""
Dashboard API Endpoints for Railway Backend
REST API for dashboard data and analytics
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

# Import from parent directory
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Transaction, BusinessSettings, Product
from app import db
from supabase_auth import get_current_user

dashboard_api_bp = Blueprint('dashboard_api', __name__)

@dashboard_api_bp.route('/summary', methods=['GET'])
def api_dashboard_summary():
    """API endpoint for dashboard summary data"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get today's date
        today = datetime.now().date()
        
        # Calculate today's income and expenses
        today_income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.type == 'income',
            func.date(Transaction.date) == today
        ).scalar() or 0
        
        today_expenses = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.type == 'expense',
            func.date(Transaction.date) == today
        ).scalar() or 0
        
        today_profit = today_income - today_expenses
        
        # Get monthly data
        start_of_month = today.replace(day=1)
        
        monthly_income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.type == 'income',
            func.date(Transaction.date) >= start_of_month
        ).scalar() or 0
        
        monthly_expenses = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.type == 'expense',
            func.date(Transaction.date) >= start_of_month
        ).scalar() or 0
        
        monthly_profit = monthly_income - monthly_expenses
        
        # Get business settings
        settings = BusinessSettings.query.first()
        monthly_limit = settings.monthly_expense_limit if settings else 5000.0
        
        # Calculate expense percentage
        expense_percentage = (monthly_expenses / monthly_limit * 100) if monthly_limit > 0 else 0
        
        # Get recent transactions
        recent_transactions = Transaction.query.order_by(
            Transaction.date.desc()
        ).limit(5).all()
        
        # Channel performance
        channels = ['shopee', 'tiktok', 'walkin', 'agent']
        channel_data = {}
        
        for channel in channels:
            channel_income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.type == 'income',
                Transaction.channel == channel,
                func.date(Transaction.date) >= start_of_month
            ).scalar() or 0
            
            channel_data[channel] = {
                'income': float(channel_income),
                'percentage': (channel_income / monthly_income * 100) if monthly_income > 0 else 0
            }
        
        return jsonify({
            'today': {
                'income': float(today_income),
                'expenses': float(today_expenses),
                'profit': float(today_profit)
            },
            'monthly': {
                'income': float(monthly_income),
                'expenses': float(monthly_expenses),
                'profit': float(monthly_profit),
                'expense_limit': float(monthly_limit),
                'expense_percentage': float(expense_percentage)
            },
            'channels': channel_data,
            'recent_transactions': [
                {
                    'id': t.id,
                    'type': t.type,
                    'amount': float(t.amount),
                    'description': t.description,
                    'channel': t.channel,
                    'date': t.date.isoformat()
                } for t in recent_transactions
            ]
        }), 200
        
    except Exception as e:
        logging.error(f"Dashboard summary API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_api_bp.route('/analytics', methods=['GET'])
def api_dashboard_analytics():
    """API endpoint for dashboard analytics"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get date range from query params
        days = request.args.get('days', 7, type=int)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days-1)
        
        # Daily income/expense trends
        daily_data = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            
            daily_income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.type == 'income',
                func.date(Transaction.date) == current_date
            ).scalar() or 0
            
            daily_expenses = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.type == 'expense',
                func.date(Transaction.date) == current_date
            ).scalar() or 0
            
            daily_data.append({
                'date': current_date.isoformat(),
                'income': float(daily_income),
                'expenses': float(daily_expenses),
                'profit': float(daily_income - daily_expenses)
            })
        
        # Top categories
        top_income_categories = db.session.query(
            Transaction.category,
            func.sum(Transaction.amount).label('total')
        ).filter(
            Transaction.type == 'income',
            func.date(Transaction.date) >= start_date
        ).group_by(Transaction.category).order_by(
            func.sum(Transaction.amount).desc()
        ).limit(5).all()
        
        top_expense_categories = db.session.query(
            Transaction.category,
            func.sum(Transaction.amount).label('total')
        ).filter(
            Transaction.type == 'expense',
            func.date(Transaction.date) >= start_date
        ).group_by(Transaction.category).order_by(
            func.sum(Transaction.amount).desc()
        ).limit(5).all()
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': days
            },
            'daily_trends': daily_data,
            'top_categories': {
                'income': [
                    {'category': cat, 'total': float(total)} 
                    for cat, total in top_income_categories
                ],
                'expenses': [
                    {'category': cat, 'total': float(total)} 
                    for cat, total in top_expense_categories
                ]
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Dashboard analytics API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500