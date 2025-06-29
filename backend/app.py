"""
PocketBizz Backend API for Railway Deployment
Flask REST API with CORS support for Vercel frontend
"""

import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Set up logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

def create_app():
    # Create the app
    app = Flask(__name__)
    
    # Enable CORS for all routes (Vercel frontend communication)
    CORS(app, 
         origins=[
             "https://*.vercel.app",  # Vercel domains
             "http://localhost:3000", # Local development
             "https://localhost:3000" # Local HTTPS
         ],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    )
    
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    
    # Configure the database - Supabase PostgreSQL
    def get_database_uri():
        """Get database URI from Supabase or fallback to local"""
        supabase_url = os.environ.get("SUPABASE_URL")
        database_url = os.environ.get("DATABASE_URL")
        
        if supabase_url and not database_url:
            logging.info("⚠️ Using Supabase URL - you need to provide DATABASE_URL from Supabase dashboard")
            logging.info("💡 Go to Supabase Dashboard → Settings → Database → Connection string")
            return "sqlite:///fallback.db"
        
        return database_url or "sqlite:///accounting.db"

    app.config["SQLALCHEMY_DATABASE_URI"] = get_database_uri()
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    
    # Initialize the app with the extension
    db.init_app(app)
    
    with app.app_context():
        # Import models and API routes
        import models
        
        # Import and register API blueprints
        from api.auth import auth_api_bp
        from api.transactions import transactions_api_bp
        from api.inventory import inventory_api_bp
        from api.reports import reports_api_bp
        from api.dashboard import dashboard_api_bp
        
        app.register_blueprint(auth_api_bp, url_prefix='/api/auth')
        app.register_blueprint(transactions_api_bp, url_prefix='/api/transactions')
        app.register_blueprint(inventory_api_bp, url_prefix='/api/inventory')
        app.register_blueprint(reports_api_bp, url_prefix='/api/reports')
        app.register_blueprint(dashboard_api_bp, url_prefix='/api/dashboard')
        
        # Create all tables
        db.create_all()
        
        # Health check endpoint
        @app.route('/api/health')
        def health_check():
            return {'status': 'healthy', 'message': 'PocketBizz API is running'}
        
        # API documentation endpoint
        @app.route('/api/docs')
        def api_docs():
            return {
                'name': 'PocketBizz API',
                'version': '1.0.0',
                'endpoints': {
                    'auth': '/api/auth/',
                    'transactions': '/api/transactions/',
                    'inventory': '/api/inventory/',
                    'reports': '/api/reports/',
                    'dashboard': '/api/dashboard/'
                }
            }
    
    return app

# Create app instance
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)