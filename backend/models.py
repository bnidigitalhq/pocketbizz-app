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
    welcome_name = db.Column(db.String(100))  # Personal name for welcome badge
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
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'))  # Link to supplier table
    
    # Product details
    brand = db.Column(db.String(100))
    model = db.Column(db.String(100))
    barcode = db.Column(db.String(100))
    has_variants = db.Column(db.Boolean, default=False)
    
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stock_movements = db.relationship('StockMovement', backref='product', lazy=True)
    supplier = db.relationship('Supplier', backref='products')
    variants = db.relationship('ProductVariant', backref='parent_product', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Product {self.name}: {self.current_stock} units>'
    
    @property
    def is_low_stock(self):
        if self.has_variants:
            # Check if any variant is low stock
            return any(variant.is_low_stock for variant in self.variants if variant.is_active)
        return self.current_stock <= self.minimum_stock
    
    def total_stock(self):
        if self.has_variants:
            return sum(variant.current_stock for variant in self.variants if variant.is_active)
        return self.current_stock
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'sku': self.sku,
            'description': self.description,
            'current_stock': self.current_stock,
            'minimum_stock': self.minimum_stock,
            'selling_price': self.selling_price,
            'cost_price': self.cost_price,
            'category': self.category,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'brand': self.brand,
            'model': self.model,
            'barcode': self.barcode,
            'has_variants': self.has_variants,
            'is_active': self.is_active,
            'is_low_stock': self.is_low_stock,
            'total_stock': self.total_stock(),
            'variant_count': len(self.variants),
            'created_at': self.created_at.isoformat() if self.created_at else None
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

# ===== SUPPLIER & PRODUCT VARIANT SYSTEM =====

class Supplier(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    company_name = db.Column(db.String(200))
    contact_person = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    address = db.Column(db.Text)
    payment_terms = db.Column(db.String(100))  # 'cash', '30_days', '60_days', etc.
    tax_id = db.Column(db.String(50))  # SSM number or tax ID
    status = db.Column(db.String(20), default='active')  # 'active', 'inactive', 'blacklisted'
    rating = db.Column(db.Float, default=0.0)  # Supplier rating out of 5
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Supplier {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'company_name': self.company_name,
            'contact_person': self.contact_person,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'payment_terms': self.payment_terms,
            'tax_id': self.tax_id,
            'status': self.status,
            'rating': self.rating,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProductVariant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    variant_name = db.Column(db.String(200), nullable=False)  # e.g., "Merah - Size L"
    sku = db.Column(db.String(100), unique=True)
    
    # Variant attributes
    color = db.Column(db.String(50))
    size = db.Column(db.String(50))
    weight = db.Column(db.Float)
    material = db.Column(db.String(100))
    
    # Pricing and stock
    cost_price = db.Column(db.Float, default=0.0)
    selling_price = db.Column(db.Float, default=0.0)
    current_stock = db.Column(db.Integer, default=0)
    minimum_stock = db.Column(db.Integer, default=5)
    
    # Additional info
    barcode = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ProductVariant {self.variant_name}>'
    
    @property
    def is_low_stock(self):
        return self.current_stock <= self.minimum_stock
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'variant_name': self.variant_name,
            'sku': self.sku,
            'color': self.color,
            'size': self.size,
            'weight': self.weight,
            'material': self.material,
            'cost_price': self.cost_price,
            'selling_price': self.selling_price,
            'current_stock': self.current_stock,
            'minimum_stock': self.minimum_stock,
            'barcode': self.barcode,
            'is_active': self.is_active,
            'is_low_stock': self.is_low_stock,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PurchaseOrder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    po_number = db.Column(db.String(100), unique=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=False)
    
    # Order details
    order_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expected_delivery = db.Column(db.DateTime)
    actual_delivery = db.Column(db.DateTime)
    
    # Financial
    subtotal = db.Column(db.Float, default=0.0)
    tax_amount = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, nullable=False)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'ordered', 'received', 'cancelled'
    payment_status = db.Column(db.String(20), default='unpaid')  # 'unpaid', 'partial', 'paid'
    
    # Additional info
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier = db.relationship('Supplier', backref='purchase_orders')
    items = db.relationship('PurchaseOrderItem', backref='purchase_order', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<PurchaseOrder {self.po_number}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'po_number': self.po_number,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'expected_delivery': self.expected_delivery.isoformat() if self.expected_delivery else None,
            'actual_delivery': self.actual_delivery.isoformat() if self.actual_delivery else None,
            'subtotal': self.subtotal,
            'tax_amount': self.tax_amount,
            'total_amount': self.total_amount,
            'status': self.status,
            'payment_status': self.payment_status,
            'notes': self.notes,
            'created_by': self.created_by,
            'item_count': len(self.items),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PurchaseOrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    po_id = db.Column(db.Integer, db.ForeignKey('purchase_order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey('product_variant.id'))  # Optional for variants
    
    quantity_ordered = db.Column(db.Integer, nullable=False)
    quantity_received = db.Column(db.Integer, default=0)
    unit_cost = db.Column(db.Float, nullable=False)
    total_cost = db.Column(db.Float, nullable=False)
    
    # Relationships
    product = db.relationship('Product', backref='purchase_items')
    variant = db.relationship('ProductVariant', backref='purchase_items')
    
    def __repr__(self):
        return f'<PurchaseOrderItem {self.product.name if self.product else "Unknown"}>'

class NotificationSettings(db.Model):
    """Notification control settings for admin"""
    id = db.Column(db.Integer, primary_key=True)
    
    # Backup reminder settings
    backup_reminder_enabled = db.Column(db.Boolean, default=True)
    backup_reminder_interval_hours = db.Column(db.Integer, default=24)  # Every 24 hours
    last_backup_reminder = db.Column(db.DateTime)
    
    # WhatsApp support settings
    whatsapp_support_enabled = db.Column(db.Boolean, default=True)
    whatsapp_support_interval_hours = db.Column(db.Integer, default=72)  # Every 3 days
    last_whatsapp_reminder = db.Column(db.DateTime)
    
    # Low stock alert settings
    low_stock_alerts_enabled = db.Column(db.Boolean, default=True)
    low_stock_check_interval_hours = db.Column(db.Integer, default=12)  # Every 12 hours
    last_low_stock_check = db.Column(db.DateTime)
    
    # Expense limit warning settings
    expense_limit_warnings_enabled = db.Column(db.Boolean, default=True)
    expense_warning_threshold = db.Column(db.Float, default=80.0)  # 80% of limit
    
    # System settings
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<NotificationSettings {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'backup_reminder_enabled': self.backup_reminder_enabled,
            'backup_reminder_interval_hours': self.backup_reminder_interval_hours,
            'whatsapp_support_enabled': self.whatsapp_support_enabled,
            'whatsapp_support_interval_hours': self.whatsapp_support_interval_hours,
            'low_stock_alerts_enabled': self.low_stock_alerts_enabled,
            'expense_limit_warnings_enabled': self.expense_limit_warnings_enabled,
            'expense_warning_threshold': self.expense_warning_threshold
        }
    
    @staticmethod
    def get_settings():
        """Get notification settings (create default if none exists)"""
        settings = NotificationSettings.query.first()
        if not settings:
            settings = NotificationSettings()
            db.session.add(settings)
            db.session.commit()
        return settings
