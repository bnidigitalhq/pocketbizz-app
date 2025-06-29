import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Set up logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database - Supabase PostgreSQL or fallback
def get_database_uri():
    """Get database URI from Supabase or fallback to local"""
    supabase_url = os.environ.get("SUPABASE_URL")
    database_url = os.environ.get("DATABASE_URL")
    
    if supabase_url and not database_url:
        # Extract database connection from Supabase URL
        # Supabase URL format: https://[project-id].supabase.co
        # Database URL format: postgresql://[user]:[password]@[host]:[port]/[database]
        logging.info("⚠️ Using Supabase URL - you need to provide DATABASE_URL from Supabase dashboard")
        logging.info("💡 Go to Supabase Dashboard → Settings → Database → Connection string")
        return "sqlite:///fallback.db"  # Fallback while waiting for proper DATABASE_URL
    
    return database_url or "sqlite:///accounting.db"

app.config["SQLALCHEMY_DATABASE_URI"] = get_database_uri()
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the app with the extension
db.init_app(app)

with app.app_context():
    # Import models and views
    import models
    import views
    
    # Import and register authentication routes
    from auth_routes import auth_bp
    app.register_blueprint(auth_bp)
    
    # Create all tables
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
