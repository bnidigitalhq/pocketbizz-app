"""
Transactions API Endpoints for Railway Backend
REST API for transaction management
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging

# Import from parent directory
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Transaction
from app import db
from supabase_auth import get_current_user

transactions_api_bp = Blueprint('transactions_api', __name__)

@transactions_api_bp.route('/', methods=['GET'])
def api_get_transactions():
    """API endpoint to get all transactions"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        transaction_type = request.args.get('type')
        channel = request.args.get('channel')
        
        # Build query
        query = Transaction.query
        
        if transaction_type:
            query = query.filter(Transaction.type == transaction_type)
        
        if channel:
            query = query.filter(Transaction.channel == channel)
        
        # Order by date desc and paginate
        transactions = query.order_by(Transaction.date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'transactions': [
                {
                    'id': t.id,
                    'type': t.type,
                    'amount': float(t.amount),
                    'description': t.description,
                    'channel': t.channel,
                    'category': t.category,
                    'date': t.date.isoformat(),
                    'receipt_image': t.receipt_image,
                    'created_at': t.created_at.isoformat()
                } for t in transactions.items
            ],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transactions.total,
                'pages': transactions.pages,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Get transactions API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@transactions_api_bp.route('/', methods=['POST'])
def api_create_transaction():
    """API endpoint to create new transaction"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['type', 'amount', 'description', 'channel']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create new transaction
        transaction = Transaction(
            type=data['type'],
            amount=float(data['amount']),
            description=data['description'],
            channel=data['channel'],
            category=data.get('category'),
            date=datetime.fromisoformat(data['date']) if data.get('date') else datetime.utcnow(),
            receipt_image=data.get('receipt_image')
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Transaction created successfully',
            'transaction': {
                'id': transaction.id,
                'type': transaction.type,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'channel': transaction.channel,
                'category': transaction.category,
                'date': transaction.date.isoformat(),
                'receipt_image': transaction.receipt_image,
                'created_at': transaction.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        logging.error(f"Create transaction API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@transactions_api_bp.route('/<int:transaction_id>', methods=['PUT'])
def api_update_transaction(transaction_id):
    """API endpoint to update transaction"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        transaction = Transaction.query.get_or_404(transaction_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update transaction fields
        if 'type' in data:
            transaction.type = data['type']
        if 'amount' in data:
            transaction.amount = float(data['amount'])
        if 'description' in data:
            transaction.description = data['description']
        if 'channel' in data:
            transaction.channel = data['channel']
        if 'category' in data:
            transaction.category = data['category']
        if 'date' in data:
            transaction.date = datetime.fromisoformat(data['date'])
        if 'receipt_image' in data:
            transaction.receipt_image = data['receipt_image']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Transaction updated successfully',
            'transaction': {
                'id': transaction.id,
                'type': transaction.type,
                'amount': float(transaction.amount),
                'description': transaction.description,
                'channel': transaction.channel,
                'category': transaction.category,
                'date': transaction.date.isoformat(),
                'receipt_image': transaction.receipt_image,
                'created_at': transaction.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Update transaction API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@transactions_api_bp.route('/<int:transaction_id>', methods=['DELETE'])
def api_delete_transaction(transaction_id):
    """API endpoint to delete transaction"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        transaction = Transaction.query.get_or_404(transaction_id)
        
        db.session.delete(transaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Transaction deleted successfully'
        }), 200
        
    except Exception as e:
        logging.error(f"Delete transaction API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500