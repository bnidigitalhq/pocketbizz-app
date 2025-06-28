from datetime import datetime
from app import db

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False)  # 'income' or 'expense'
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200), nullable=False)
    channel = db.Column(db.String(50), nullable=False)  # 'shopee', 'tiktok', 'walkin', 'agent'
    category = db.Column(db.String(100))
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    receipt_image = db.Column(db.String(200))  # Path to uploaded receipt image
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Transaction {self.type}: RM{self.amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'amount': self.amount,
            'description': self.description,
            'channel': self.channel,
            'category': self.category,
            'date': self.date.isoformat(),
            'receipt_image': self.receipt_image,
            'created_at': self.created_at.isoformat()
        }

class BusinessSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    business_name = db.Column(db.String(200))
    monthly_expense_limit = db.Column(db.Float, default=5000.0)
    default_currency = db.Column(db.String(10), default='RM')
    # Zakat settings
    enable_zakat_calculation = db.Column(db.Boolean, default=True)
    zakat_percentage = db.Column(db.Float, default=2.5)  # 2.5% standard zakat rate
    business_start_date = db.Column(db.DateTime)
    # Stock alert settings
    enable_stock_alerts = db.Column(db.Boolean, default=True)
    low_stock_threshold = db.Column(db.Integer, default=10)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Product/Inventory Management
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    sku = db.Column(db.String(100), unique=True)
    description = db.Column(db.Text)
    cost_price = db.Column(db.Float, default=0.0)
    selling_price = db.Column(db.Float, default=0.0)
    current_stock = db.Column(db.Integer, default=0)
    minimum_stock = db.Column(db.Integer, default=10)
    category = db.Column(db.String(100))
    supplier = db.Column(db.String(200))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stock_movements = db.relationship('StockMovement', backref='product', lazy=True)
    
    def __repr__(self):
        return f'<Product {self.name}: {self.current_stock} units>'
    
    @property
    def is_low_stock(self):
        return self.current_stock <= self.minimum_stock
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'sku': self.sku,
            'current_stock': self.current_stock,
            'minimum_stock': self.minimum_stock,
            'selling_price': self.selling_price,
            'cost_price': self.cost_price,
            'is_low_stock': self.is_low_stock,
            'category': self.category
        }

# Stock Movement Tracking
class StockMovement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    movement_type = db.Column(db.String(20), nullable=False)  # 'in', 'out', 'adjustment'
    quantity = db.Column(db.Integer, nullable=False)
    reference_type = db.Column(db.String(50))  # 'sale', 'purchase', 'return', 'adjustment'
    reference_id = db.Column(db.Integer)  # ID of related transaction/order
    notes = db.Column(db.Text)
    date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_by = db.Column(db.String(100))  # User who made the movement
    
    def __repr__(self):
        return f'<StockMovement {self.movement_type}: {self.quantity} units>'

# Agent/Reseller Management
class Agent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    commission_rate = db.Column(db.Float, default=10.0)  # Percentage
    status = db.Column(db.String(20), default='active')  # 'active', 'inactive', 'suspended'
    join_date = db.Column(db.DateTime, default=datetime.utcnow)
    total_sales = db.Column(db.Float, default=0.0)
    total_commission = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    orders = db.relationship('AgentOrder', backref='agent', lazy=True)
    
    def __repr__(self):
        return f'<Agent {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'commission_rate': self.commission_rate,
            'status': self.status,
            'total_sales': self.total_sales,
            'total_commission': self.total_commission
        }

# Agent Orders/Sales Submissions
class AgentOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('agent.id'), nullable=False)
    order_number = db.Column(db.String(100), unique=True)
    customer_name = db.Column(db.String(200))
    customer_phone = db.Column(db.String(20))
    total_amount = db.Column(db.Float, nullable=False)
    commission_amount = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(50))  # 'bank_transfer', 'cash', 'ewallet'
    payment_proof = db.Column(db.String(200))  # Path to payment proof image
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected', 'paid'
    notes = db.Column(db.Text)
    order_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    approved_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<AgentOrder {self.order_number}: RM{self.total_amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'agent_name': self.agent.name if self.agent else '',
            'customer_name': self.customer_name,
            'total_amount': self.total_amount,
            'commission_amount': self.commission_amount,
            'status': self.status,
            'order_date': self.order_date.isoformat(),
            'payment_method': self.payment_method
        }

# Zakat Calculation History
class ZakatCalculation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False)
    total_income = db.Column(db.Float, default=0.0)
    total_expenses = db.Column(db.Float, default=0.0)
    net_profit = db.Column(db.Float, default=0.0)
    stock_value = db.Column(db.Float, default=0.0)  # Current inventory value
    receivables = db.Column(db.Float, default=0.0)  # Money owed to business
    liabilities = db.Column(db.Float, default=0.0)  # Money owed by business
    zakatable_amount = db.Column(db.Float, default=0.0)  # Net assets subject to zakat
    zakat_amount = db.Column(db.Float, default=0.0)  # Final zakat payable
    zakat_rate = db.Column(db.Float, default=2.5)
    is_paid = db.Column(db.Boolean, default=False)
    paid_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ZakatCalculation {self.year}: RM{self.zakat_amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'year': self.year,
            'total_income': self.total_income,
            'total_expenses': self.total_expenses,
            'net_profit': self.net_profit,
            'zakatable_amount': self.zakatable_amount,
            'zakat_amount': self.zakat_amount,
            'is_paid': self.is_paid,
            'calculated_at': self.calculated_at.isoformat()
        }
