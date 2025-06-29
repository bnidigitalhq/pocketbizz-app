"""
Inventory API Endpoints for Railway Backend
REST API for inventory and product management
"""

from flask import Blueprint, request, jsonify
import logging

# Import from parent directory
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import Product, StockMovement
from app import db
from supabase_auth import get_current_user

inventory_api_bp = Blueprint('inventory_api', __name__)

@inventory_api_bp.route('/products', methods=['GET'])
def api_get_products():
    """API endpoint to get all products"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        products = Product.query.filter_by(is_active=True).all()
        
        return jsonify({
            'products': [
                {
                    'id': p.id,
                    'name': p.name,
                    'sku': p.sku,
                    'description': p.description,
                    'cost_price': float(p.cost_price or 0),
                    'selling_price': float(p.selling_price or 0),
                    'current_stock': p.current_stock,
                    'minimum_stock': p.minimum_stock,
                    'category': p.category,
                    'brand': p.brand,
                    'is_low_stock': p.is_low_stock(),
                    'created_at': p.created_at.isoformat()
                } for p in products
            ]
        }), 200
        
    except Exception as e:
        logging.error(f"Get products API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@inventory_api_bp.route('/products', methods=['POST'])
def api_create_product():
    """API endpoint to create new product"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        if not data.get('name'):
            return jsonify({'error': 'Product name is required'}), 400
        
        product = Product(
            name=data['name'],
            sku=data.get('sku'),
            description=data.get('description'),
            cost_price=float(data.get('cost_price', 0)),
            selling_price=float(data.get('selling_price', 0)),
            current_stock=int(data.get('current_stock', 0)),
            minimum_stock=int(data.get('minimum_stock', 10)),
            category=data.get('category'),
            brand=data.get('brand')
        )
        
        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product created successfully',
            'product': {
                'id': product.id,
                'name': product.name,
                'sku': product.sku,
                'current_stock': product.current_stock,
                'minimum_stock': product.minimum_stock
            }
        }), 201
        
    except Exception as e:
        logging.error(f"Create product API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@inventory_api_bp.route('/low-stock', methods=['GET'])
def api_low_stock_alerts():
    """API endpoint for low stock alerts"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        
        low_stock_products = Product.query.filter(
            Product.current_stock <= Product.minimum_stock,
            Product.is_active == True
        ).all()
        
        return jsonify({
            'low_stock_products': [
                {
                    'id': p.id,
                    'name': p.name,
                    'sku': p.sku,
                    'current_stock': p.current_stock,
                    'minimum_stock': p.minimum_stock,
                    'shortage': p.minimum_stock - p.current_stock
                } for p in low_stock_products
            ],
            'total_alerts': len(low_stock_products)
        }), 200
        
    except Exception as e:
        logging.error(f"Low stock alerts API error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500