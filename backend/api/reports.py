"""
Reports API Endpoints for Railway Backend
REST API for business reports and analytics
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from sqlalchemy import func
import logging

# Import from parent directory
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Transaction, ZakatCalculation
from app import db
from supabase_auth import get_current_user

reports_api_bp = Blueprint('reports_api', __name__)

@reports_api_bp.route('/monthly', methods=['GET'])
def api_monthly_report():
    """API endpoint for monthly reports"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get month and year from query params
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        
        # Calculate start and end dates
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date()
        else:
            end_date = datetime(year, month + 1, 1).date()
        
        # Get monthly income and expenses
        monthly_income = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.type == 'income',
            func.date(Transaction.date) >= start_date,
            func.date(Transaction.date) < end_date
        ).scalar() or 0
        
        monthly_expenses = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.type == 'expense',
            func.date(Transaction.date) >= start_date,
            func.date(Transaction.date) < end_date
        ).scalar() or 0
        
        # Channel breakdown
        channels = ['shopee', 'tiktok', 'walkin', 'agent']
        channel_breakdown = {}
        
        for channel in channels:
            channel_income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.type == 'income',
                Transaction.channel == channel,
                func.date(Transaction.date) >= start_date,
                func.date(Transaction.date) < end_date
            ).scalar() or 0
            
            channel_breakdown[channel] = float(channel_income)
        
        # Category breakdown
        expense_categories = db.session.query(
            Transaction.category,
            func.sum(Transaction.amount).label('total')
        ).filter(
            Transaction.type == 'expense',
            func.date(Transaction.date) >= start_date,
            func.date(Transaction.date) < end_date,
            Transaction.category.isnot(None)
        ).group_by(Transaction.category).all()
        
        return jsonify({
            'period': {
                'year': year,
                'month': month,
                'start_date': start_date.isoformat(),
                'end_date': (end_date - timedelta(days=1)).isoformat()
            },
            'summary': {
                'total_income': float(monthly_income),
                'total_expenses': float(monthly_expenses),
                'net_profit': float(monthly_income - monthly_expenses)
            },
            'channel_breakdown': channel_breakdown,
            'expense_categories': [
                {'category': cat, 'amount': float(total)} 
                for cat, total in expense_categories
            ]
        }), 200
        
    except Exception as e:
        logging.error(f"Monthly report API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@reports_api_bp.route('/zakat', methods=['GET'])
def api_zakat_report():
    """API endpoint for zakat calculation report"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        year = request.args.get('year', datetime.now().year, type=int)
        
        # Get or create zakat calculation for the year
        zakat_calc = ZakatCalculation.query.filter_by(year=year).first()
        
        if not zakat_calc:
            # Auto-calculate zakat for the year
            start_date = datetime(year, 1, 1).date()
            end_date = datetime(year + 1, 1, 1).date()
            
            annual_income = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.type == 'income',
                func.date(Transaction.date) >= start_date,
                func.date(Transaction.date) < end_date
            ).scalar() or 0
            
            annual_expenses = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.type == 'expense',
                func.date(Transaction.date) >= start_date,
                func.date(Transaction.date) < end_date
            ).scalar() or 0
            
            net_profit = annual_income - annual_expenses
            zakatable_amount = max(0, net_profit)  # Simplified calculation
            zakat_amount = zakatable_amount * 0.025  # 2.5%
            
            zakat_calc = ZakatCalculation(
                year=year,
                total_income=annual_income,
                total_expenses=annual_expenses,
                net_profit=net_profit,
                zakatable_amount=zakatable_amount,
                zakat_amount=zakat_amount,
                zakat_rate=2.5
            )
            
            db.session.add(zakat_calc)
            db.session.commit()
        
        return jsonify({
            'year': zakat_calc.year,
            'total_income': float(zakat_calc.total_income),
            'total_expenses': float(zakat_calc.total_expenses),
            'net_profit': float(zakat_calc.net_profit),
            'zakatable_amount': float(zakat_calc.zakatable_amount),
            'zakat_amount': float(zakat_calc.zakat_amount),
            'zakat_rate': float(zakat_calc.zakat_rate),
            'is_paid': zakat_calc.is_paid,
            'paid_date': zakat_calc.paid_date.isoformat() if zakat_calc.paid_date else None,
            'calculated_at': zakat_calc.calculated_at.isoformat()
        }), 200
        
    except Exception as e:
        logging.error(f"Zakat report API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@reports_api_bp.route('/export/<format>', methods=['GET'])
def api_export_report(format):
    """API endpoint for report export"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        if format not in ['csv', 'pdf']:
            return jsonify({'error': 'Unsupported format'}), 400
        
        # Get date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({'error': 'start_date and end_date are required'}), 400
        
        start_date = datetime.fromisoformat(start_date).date()
        end_date = datetime.fromisoformat(end_date).date()
        
        # Get transactions for the period
        transactions = Transaction.query.filter(
            func.date(Transaction.date) >= start_date,
            func.date(Transaction.date) <= end_date
        ).order_by(Transaction.date.desc()).all()
        
        if format == 'csv':
            # Return data for CSV generation on frontend
            return jsonify({
                'format': 'csv',
                'data': [
                    {
                        'date': t.date.isoformat(),
                        'type': t.type,
                        'amount': float(t.amount),
                        'description': t.description,
                        'channel': t.channel,
                        'category': t.category or ''
                    } for t in transactions
                ],
                'filename': f'transactions_{start_date}_{end_date}.csv'
            }), 200
        
        elif format == 'pdf':
            # Return data for PDF generation
            return jsonify({
                'format': 'pdf',
                'data': [t.to_dict() for t in transactions],
                'summary': {
                    'total_income': sum(t.amount for t in transactions if t.type == 'income'),
                    'total_expenses': sum(t.amount for t in transactions if t.type == 'expense'),
                    'period': f"{start_date} to {end_date}"
                },
                'filename': f'report_{start_date}_{end_date}.pdf'
            }), 200
        
    except Exception as e:
        logging.error(f"Export report API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500