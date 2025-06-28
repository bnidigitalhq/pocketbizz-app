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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
