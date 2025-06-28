# SME Accounting App

## Overview

This is a mobile-first accounting application specifically designed for busy Malaysian SME business owners who are always on the move. The app focuses on "On-The-Go Accounting" with a simple, mobile-friendly interface that allows users to record sales and expenses in under 10 seconds directly from their phones.

The application is built with Flask backend and designed with a user experience similar to familiar Malaysian e-commerce platforms like Shopee Seller Center and TikTok Shop.

## System Architecture

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Database**: SQLAlchemy ORM with SQLite as default (configurable via DATABASE_URL environment variable)
- **Session Management**: Flask sessions with configurable secret key
- **Proxy Support**: Werkzeug ProxyFix for deployment behind reverse proxies

### Frontend Architecture
- **CSS Framework**: Tailwind CSS for responsive design
- **Icons**: Feather Icons for consistent iconography
- **Typography**: Inter font family for modern, readable text
- **Mobile-First**: Responsive design optimized for mobile devices
- **Color Scheme**: Custom color palette inspired by Shopee (orange/red primary, blue secondary)

### File Upload System
- **Storage**: Local file system in `static/uploads` directory
- **Supported Formats**: CSV, PNG, JPG, JPEG, GIF
- **Security**: Werkzeug secure_filename for safe file handling

## Key Components

### Data Models
1. **Transaction Model**
   - Tracks income and expense transactions
   - Fields: type, amount, description, channel, category, date, receipt_image
   - Supports multiple sales channels: Shopee, TikTok, Walk-in, Agent

2. **BusinessSettings Model**
   - Stores business configuration
   - Fields: business_name, monthly_expense_limit, default_currency
   - Includes audit timestamps (created_at, updated_at)

### Core Views/Pages
1. **Dashboard (index.html)** - Today's summary with income, expenses, and profit cards
2. **Add Transaction (add_transaction.html)** - Form for manual transaction entry with type toggle
3. **Reports (reports.html)** - Monthly summaries and export functionality
4. **Scan Receipt (scan_receipt.html)** - OCR-based receipt scanning interface

### JavaScript Modules
1. **app.js** - Core application initialization and utilities
2. **ocr.js** - Receipt scanning and OCR processing using Tesseract.js
3. **csv_upload.js** - CSV file upload and processing functionality

## Data Flow

1. **Transaction Entry Flow**:
   - User selects transaction type (income/expense)
   - Enters amount, description, and channel
   - Transaction saved to database with timestamp
   - Dashboard automatically updates with new totals

2. **Receipt Scanning Flow**:
   - User uploads image via camera or file selection
   - Image processed through Tesseract.js OCR
   - Extracted data auto-fills transaction form
   - User reviews and confirms transaction details

3. **CSV Import Flow**:
   - User uploads CSV from e-commerce platforms
   - File validated and parsed server-side
   - Transactions bulk-imported to database
   - Summary report generated

## External Dependencies

### Frontend Libraries
- **Tailwind CSS**: Utility-first CSS framework via CDN
- **Feather Icons**: Lightweight icon library via CDN
- **Google Fonts**: Inter font family for typography
- **Tesseract.js**: Client-side OCR processing (referenced but not yet implemented)

### Python Packages
- **Flask**: Web framework
- **Flask-SQLAlchemy**: Database ORM
- **Werkzeug**: WSGI utilities and security helpers

### Development Tools
- **Logging**: Python logging module for debugging
- **Environment Variables**: Configuration via os.environ

## Deployment Strategy

### Environment Configuration
- **SESSION_SECRET**: Session encryption key (defaults to dev key)
- **DATABASE_URL**: Database connection string (defaults to SQLite)
- **Host/Port**: Configurable via app.run() parameters (default: 0.0.0.0:5000)

### Database Strategy
- **Development**: SQLite for easy local development
- **Production**: Configurable via DATABASE_URL for PostgreSQL/MySQL
- **Connection Pooling**: Enabled with pool_recycle and pool_pre_ping
- **Auto-Migration**: Database tables created automatically on startup

### Static File Handling
- **Uploads**: Local storage in static/uploads directory
- **CSS/JS**: Served via Flask static file handling
- **Security**: File type validation and secure filename processing

## Changelog

Changelog:
- June 28, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.