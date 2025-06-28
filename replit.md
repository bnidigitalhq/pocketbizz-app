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

## Recent Changes

### June 28, 2025 - Major UI/UX Enhancements
- ✅ **Floating Action Button (FAB)**: TikTok-style floating "+" button with animated quick actions menu
- ✅ **Enhanced Dashboard**: Added expense limit progress bars, channel performance with icons and percentages  
- ✅ **Pull-to-Refresh**: Mobile-friendly gesture to refresh dashboard data
- ✅ **Smart Alerts**: Expense limit notifications at 80% and 100% of daily budget
- ✅ **Dark Mode Toggle**: User preference saving with localStorage
- ✅ **Settings Page**: Complete business settings management interface
- ✅ **Quick Add Integration**: Pre-filled transaction forms from FAB actions
- ✅ **Enhanced Channel Display**: Emoji icons, color coding, and performance percentages
- ✅ **PostgreSQL Migration**: Upgraded from SQLite to production-ready PostgreSQL database

### June 28, 2025 - Advanced Business Features Release
- ✅ **Inventory Management**: Complete stock tracking with low stock alerts and movement history
- ✅ **Zakat Calculator**: Automatic Islamic business zakat calculation with Malaysian compliance
- ✅ **Agent/Reseller System**: Order submission, approval workflow, and commission tracking
- ✅ **Enhanced OCR**: Improved receipt scanning with better error handling and fallbacks
- ✅ **Premium Navigation**: Fixed 5-item navigation bar with consistent spacing across all pages
- ✅ **Premium Touch Effects**: Haptic feedback, scale animations, ripple effects, and glassmorphism UI
- ✅ **PDF Export & Print**: Professional report generation with ReportLab for download and printing

### June 28, 2025 - Smart Import Tools & Dashboard Enhancements
- ✅ **Smart Import Tools**: Multi-platform CSV import for Shopee, TikTok Shop, Lazada with auto-mapping
- ✅ **Platform Templates**: Sample CSV downloads and format validation for each platform
- ✅ **Intelligent Field Mapping**: Auto-detect CSV columns and map to transaction fields
- ✅ **Enhanced Dashboard**: New features section with quick access to all business tools
- ✅ **Advanced CSV Processing**: Support for multiple date formats and currency symbols
- ✅ **Template System**: Complete agent, product, and order management templates

### June 28, 2025 - Smart Scan Receipt System (CamScanner-style)
- ✅ **Document Border Detection**: Auto-detect receipt/document borders using OpenCV.js
- ✅ **Auto-Crop & Straighten**: Perspective correction like CamScanner with real-time overlay
- ✅ **PDF Generation**: Convert scanned images to professional PDF documents using jsPDF
- ✅ **Advanced OCR**: Extract amount, date, vendor info using Tesseract.js with intelligent parsing
- ✅ **PDF Attachment System**: Save PDF files alongside transaction data (no more JPEG storage)
- ✅ **Mobile-First Interface**: CamScanner-inspired UI with real-time document detection
- ✅ **Smart Data Extraction**: Parse Malaysian RM currency, various date formats, vendor names
- ✅ **Enhanced File Handling**: Support PDF uploads in transaction system

### System Architecture Updates
- **Database**: Now using PostgreSQL with connection pooling and health checks
- **UI Framework**: Enhanced Tailwind CSS implementation with custom Shopee-inspired color scheme
- **JavaScript**: Modular app.js with FAB, pull-to-refresh, and dark mode functionality
- **Templates**: Responsive mobile-first design with Bahasa Malaysia throughout

## Changelog

- June 28, 2025: Initial setup and core features
- June 28, 2025: Major UI/UX enhancement release with FAB, alerts, and settings

## User Preferences

Preferred communication style: Simple, everyday language.