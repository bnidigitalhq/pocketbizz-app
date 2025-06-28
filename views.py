import csv
import io
import os
from datetime import datetime, timedelta
from flask import render_template, request, redirect, url_for, flash, jsonify, make_response
from werkzeug.utils import secure_filename
from app import app, db
from models import Transaction, BusinessSettings

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'csv', 'png', 'jpg', 'jpeg', 'gif'}

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Dashboard showing today's summary and recent transactions"""
    today = datetime.now().date()
    
    # Get today's transactions
    today_transactions = Transaction.query.filter(
        db.func.date(Transaction.date) == today
    ).all()
    
    # Calculate today's totals
    today_income = sum(t.amount for t in today_transactions if t.type == 'income')
    today_expenses = sum(t.amount for t in today_transactions if t.type == 'expense')
    today_profit = today_income - today_expenses
    
    # Get recent transactions (last 5)
    recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(5).all()
    
    # Channel performance for today
    channel_stats = {}
    for transaction in today_transactions:
        if transaction.type == 'income':
            if transaction.channel not in channel_stats:
                channel_stats[transaction.channel] = 0
            channel_stats[transaction.channel] += transaction.amount
    
    return render_template('index.html',
                         today_income=today_income,
                         today_expenses=today_expenses,
                         today_profit=today_profit,
                         recent_transactions=recent_transactions,
                         channel_stats=channel_stats)

@app.route('/add_transaction')
def add_transaction():
    """Add transaction page"""
    # Get pre-filled data from query parameters (from Quick Add)
    transaction_type = request.args.get('type', '')
    channel = request.args.get('channel', '')
    category = request.args.get('category', '')
    
    return render_template('add_transaction.html', 
                         prefill_type=transaction_type,
                         prefill_channel=channel,
                         prefill_category=category)

@app.route('/add_transaction', methods=['POST'])
def add_transaction_post():
    """Handle transaction addition"""
    try:
        transaction_type = request.form.get('type')
        amount = float(request.form.get('amount'))
        description = request.form.get('description')
        channel = request.form.get('channel')
        category = request.form.get('category', '')
        date_str = request.form.get('date')
        
        # Parse date
        if date_str:
            transaction_date = datetime.strptime(date_str, '%Y-%m-%d')
        else:
            transaction_date = datetime.now()
        
        # Create new transaction
        transaction = Transaction(
            type=transaction_type,
            amount=amount,
            description=description,
            channel=channel,
            category=category,
            date=transaction_date
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        flash('Transaksi berjaya ditambah!', 'success')
        return redirect(url_for('index'))
        
    except Exception as e:
        flash(f'Ralat: {str(e)}', 'error')
        return redirect(url_for('add_transaction'))

@app.route('/scan_receipt')
def scan_receipt():
    """OCR receipt scanning page"""
    return render_template('scan_receipt.html')

@app.route('/upload_receipt', methods=['POST'])
def upload_receipt():
    """Handle receipt image upload"""
    if 'receipt' not in request.files:
        return jsonify({'error': 'Tiada fail dipilih'}), 400
    
    file = request.files['receipt']
    if file.filename == '':
        return jsonify({'error': 'Tiada fail dipilih'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename = timestamp + filename
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'filepath': filepath
        })
    
    return jsonify({'error': 'Format fail tidak disokong'}), 400

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    """Handle CSV upload from Shopee/TikTok"""
    if 'csv_file' not in request.files:
        return jsonify({'error': 'Tiada fail CSV dipilih'}), 400
    
    file = request.files['csv_file']
    if file.filename == '':
        return jsonify({'error': 'Tiada fail CSV dipilih'}), 400
    
    if file and file.filename.lower().endswith('.csv'):
        try:
            # Read CSV content
            stream = io.StringIO(file.stream.read().decode("UTF-8"), newline=None)
            csv_input = csv.DictReader(stream)
            
            transactions_added = 0
            source = request.form.get('source', 'shopee')
            
            for row in csv_input:
                try:
                    # Map CSV columns based on source
                    if source == 'shopee':
                        # Shopee CSV format mapping
                        description = row.get('Order ID', '') + ' - ' + row.get('Product Name', '')
                        amount = float(row.get('Order Amount', 0))
                        date_str = row.get('Order Date', '')
                    elif source == 'tiktok':
                        # TikTok Shop CSV format mapping
                        description = row.get('Order ID', '') + ' - ' + row.get('Product', '')
                        amount = float(row.get('Total Amount', 0))
                        date_str = row.get('Created Time', '')
                    else:
                        continue
                    
                    if amount > 0:
                        # Parse date
                        transaction_date = datetime.now()
                        if date_str:
                            try:
                                transaction_date = datetime.strptime(date_str.split()[0], '%Y-%m-%d')
                            except:
                                pass
                        
                        transaction = Transaction(
                            type='income',
                            amount=amount,
                            description=description,
                            channel=source,
                            category='Online Sales',
                            date=transaction_date
                        )
                        
                        db.session.add(transaction)
                        transactions_added += 1
                        
                except Exception as e:
                    app.logger.error(f"Error processing CSV row: {e}")
                    continue
            
            db.session.commit()
            return jsonify({
                'success': True,
                'message': f'{transactions_added} transaksi berjaya diimport'
            })
            
        except Exception as e:
            return jsonify({'error': f'Ralat memproses CSV: {str(e)}'}), 400
    
    return jsonify({'error': 'Format fail bukan CSV'}), 400

@app.route('/reports')
def reports():
    """Reports and analytics page"""
    # Get current month data
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)
    
    monthly_transactions = Transaction.query.filter(
        Transaction.date >= start_of_month
    ).all()
    
    # Calculate monthly totals
    monthly_income = sum(t.amount for t in monthly_transactions if t.type == 'income')
    monthly_expenses = sum(t.amount for t in monthly_transactions if t.type == 'expense')
    monthly_profit = monthly_income - monthly_expenses
    
    # Channel breakdown
    channel_income = {}
    for transaction in monthly_transactions:
        if transaction.type == 'income':
            if transaction.channel not in channel_income:
                channel_income[transaction.channel] = 0
            channel_income[transaction.channel] += transaction.amount
    
    # Category breakdown for expenses
    expense_categories = {}
    for transaction in monthly_transactions:
        if transaction.type == 'expense':
            category = transaction.category or 'Lain-lain'
            if category not in expense_categories:
                expense_categories[category] = 0
            expense_categories[category] += transaction.amount
    
    return render_template('reports.html',
                         monthly_income=monthly_income,
                         monthly_expenses=monthly_expenses,
                         monthly_profit=monthly_profit,
                         channel_income=channel_income,
                         expense_categories=expense_categories,
                         current_month=now.strftime('%B %Y'))

@app.route('/export_csv')
def export_csv():
    """Export transactions to CSV"""
    # Get date range from query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = Transaction.query
    
    if start_date:
        query = query.filter(Transaction.date >= datetime.strptime(start_date, '%Y-%m-%d'))
    if end_date:
        query = query.filter(Transaction.date <= datetime.strptime(end_date, '%Y-%m-%d'))
    
    transactions = query.order_by(Transaction.date.desc()).all()
    
    # Create CSV output
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['Tarikh', 'Jenis', 'Jumlah (RM)', 'Keterangan', 'Saluran', 'Kategori'])
    
    # Write data
    for transaction in transactions:
        writer.writerow([
            transaction.date.strftime('%Y-%m-%d'),
            'Pendapatan' if transaction.type == 'income' else 'Perbelanjaan',
            f'{transaction.amount:.2f}',
            transaction.description,
            transaction.channel.title(),
            transaction.category or ''
        ])
    
    # Create response
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename=laporan_akaun_{datetime.now().strftime("%Y%m%d")}.csv'
    
    return response

@app.route('/api/transactions')
def api_transactions():
    """API endpoint for transactions data"""
    transactions = Transaction.query.order_by(Transaction.date.desc()).limit(10).all()
    return jsonify([t.to_dict() for t in transactions])

@app.route('/delete_transaction/<int:transaction_id>', methods=['POST'])
def delete_transaction(transaction_id):
    """Delete a transaction"""
    transaction = Transaction.query.get_or_404(transaction_id)
    db.session.delete(transaction)
    db.session.commit()
    flash('Transaksi berjaya dipadam!', 'success')
    return redirect(url_for('index'))

@app.route('/settings')
def settings():
    """Business settings page"""
    business_settings = BusinessSettings.query.first()
    if not business_settings:
        # Create default settings if none exist
        business_settings = BusinessSettings(
            business_name='Perniagaan Saya',
            monthly_expense_limit=5000.0,
            default_currency='RM'
        )
        db.session.add(business_settings)
        db.session.commit()
    
    return render_template('settings.html', settings=business_settings)

@app.route('/settings', methods=['POST'])
def update_settings():
    """Update business settings"""
    try:
        business_settings = BusinessSettings.query.first()
        if not business_settings:
            business_settings = BusinessSettings()
            db.session.add(business_settings)
        
        business_settings.business_name = request.form.get('business_name')
        business_settings.monthly_expense_limit = float(request.form.get('monthly_expense_limit', 5000))
        business_settings.default_currency = request.form.get('default_currency', 'RM')
        business_settings.updated_at = datetime.utcnow()
        
        db.session.commit()
        flash('Tetapan berjaya dikemaskini!', 'success')
        
    except Exception as e:
        flash(f'Ralat: {str(e)}', 'error')
    
    return redirect(url_for('settings'))
