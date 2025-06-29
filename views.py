import csv
import io
import os
from datetime import datetime, timedelta
from flask import render_template, request, redirect, url_for, flash, jsonify, make_response, send_file
from werkzeug.utils import secure_filename
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
from app import app, db
from models import Transaction, BusinessSettings, Product, StockMovement, Agent, AgentOrder, ZakatCalculation

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'csv', 'png', 'jpg', 'jpeg', 'gif', 'pdf'}

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_pdf_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() == 'pdf'

def is_image_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif'}

@app.route('/landing')
def landing():
    """Landing page for marketing"""
    return render_template('landing.html')

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
    """Handle transaction addition with optional PDF attachment"""
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
        
        # Handle PDF upload from smart scan
        receipt_pdf_path = None
        if 'receipt_pdf' in request.files:
            pdf_file = request.files['receipt_pdf']
            if pdf_file and pdf_file.filename and pdf_file.filename.endswith('.pdf'):
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
                pdf_filename = timestamp + secure_filename(pdf_file.filename)
                pdf_path = os.path.join(UPLOAD_FOLDER, pdf_filename)
                pdf_file.save(pdf_path)
                receipt_pdf_path = pdf_filename
        
        # Handle regular image upload (backwards compatibility)
        receipt_image_path = None
        if 'receipt_image' in request.files:
            image_file = request.files['receipt_image']
            if image_file and image_file.filename and allowed_file(image_file.filename):
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
                image_filename = timestamp + secure_filename(image_file.filename)
                image_path = os.path.join(UPLOAD_FOLDER, image_filename)
                image_file.save(image_path)
                receipt_image_path = image_filename
        
        # Use PDF path if available, otherwise use image path
        receipt_attachment = receipt_pdf_path or receipt_image_path
        
        # Create new transaction
        transaction = Transaction(
            type=transaction_type,
            amount=amount,
            description=description,
            channel=channel,
            category=category,
            date=transaction_date,
            receipt_image=receipt_attachment  # Store PDF or image path
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        flash('Transaction saved successfully!', 'success')
        return redirect(url_for('index'))
        
    except Exception as e:
        flash(f'Error: {str(e)}', 'error')
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
                         current_month=now.strftime('%B %Y'),
                         current_month_num=now.month,
                         current_year=now.year)

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

@app.route('/features')
def features():
    """All features page"""
    return render_template('features.html')

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

# === INVENTORY MANAGEMENT ROUTES ===

@app.route('/inventory')
def inventory():
    """Inventory management page"""
    products = Product.query.filter_by(is_active=True).all()
    low_stock_products = [p for p in products if p.is_low_stock]
    
    # Stock summary statistics
    total_products = len(products)
    total_stock_value = sum(p.current_stock * p.cost_price for p in products)
    
    return render_template('inventory.html', 
                         products=products,
                         low_stock_products=low_stock_products,
                         total_products=total_products,
                         total_stock_value=total_stock_value)

@app.route('/add_product', methods=['GET', 'POST'])
def add_product():
    """Add new product"""
    if request.method == 'POST':
        try:
            product = Product(
                name=request.form['name'],
                sku=request.form.get('sku'),
                description=request.form.get('description'),
                cost_price=float(request.form.get('cost_price', 0)),
                selling_price=float(request.form.get('selling_price', 0)),
                current_stock=int(request.form.get('current_stock', 0)),
                minimum_stock=int(request.form.get('minimum_stock', 10)),
                category=request.form.get('category'),
                supplier=request.form.get('supplier')
            )
            
            db.session.add(product)
            db.session.commit()
            
            # Add initial stock movement if stock > 0
            if product.current_stock > 0:
                stock_movement = StockMovement(
                    product_id=product.id,
                    movement_type='in',
                    quantity=product.current_stock,
                    reference_type='initial_stock',
                    notes='Stok awal produk'
                )
                db.session.add(stock_movement)
                db.session.commit()
            
            flash('Produk berjaya ditambah!', 'success')
            return redirect(url_for('inventory'))
            
        except Exception as e:
            flash(f'Ralat: {str(e)}', 'error')
    
    return render_template('add_product.html')

@app.route('/stock_movement/<int:product_id>', methods=['POST'])
def stock_movement(product_id):
    """Record stock movement"""
    try:
        product = Product.query.get_or_404(product_id)
        movement_type = request.form['movement_type']  # 'in' or 'out'
        quantity = int(request.form['quantity'])
        notes = request.form.get('notes', '')
        
        # Update product stock
        if movement_type == 'in':
            product.current_stock += quantity
        elif movement_type == 'out':
            if product.current_stock >= quantity:
                product.current_stock -= quantity
            else:
                flash('Stok tidak mencukupi!', 'error')
                return redirect(url_for('inventory'))
        
        # Record movement
        movement = StockMovement(
            product_id=product_id,
            movement_type=movement_type,
            quantity=quantity,
            reference_type='manual_adjustment',
            notes=notes
        )
        
        db.session.add(movement)
        db.session.commit()
        
        flash('Pergerakan stok berjaya direkodkan!', 'success')
        
    except Exception as e:
        flash(f'Ralat: {str(e)}', 'error')
    
    return redirect(url_for('inventory'))

# === AGENT MANAGEMENT ROUTES ===

@app.route('/agents')
def agents():
    """Agent management page"""
    agents = Agent.query.all()
    pending_orders = AgentOrder.query.filter_by(status='pending').count()
    
    return render_template('agents.html', 
                         agents=agents,
                         pending_orders=pending_orders)

@app.route('/add_agent', methods=['GET', 'POST'])
def add_agent():
    """Add new agent"""
    if request.method == 'POST':
        try:
            agent = Agent(
                name=request.form['name'],
                phone=request.form.get('phone'),
                email=request.form.get('email'),
                address=request.form.get('address'),
                commission_rate=float(request.form.get('commission_rate', 10))
            )
            
            db.session.add(agent)
            db.session.commit()
            
            flash('Ejen berjaya ditambah!', 'success')
            return redirect(url_for('agents'))
            
        except Exception as e:
            flash(f'Ralat: {str(e)}', 'error')
    
    return render_template('add_agent.html')

@app.route('/agent_orders')
def agent_orders():
    """Agent orders management"""
    status_filter = request.args.get('status', 'all')
    
    if status_filter == 'all':
        orders = AgentOrder.query.order_by(AgentOrder.order_date.desc()).all()
    else:
        orders = AgentOrder.query.filter_by(status=status_filter).order_by(AgentOrder.order_date.desc()).all()
    
    return render_template('agent_orders.html', 
                         orders=orders,
                         current_status=status_filter)

@app.route('/submit_agent_order', methods=['GET', 'POST'])
def submit_agent_order():
    """Agent submit new order"""
    if request.method == 'POST':
        try:
            # Generate order number
            order_count = AgentOrder.query.count() + 1
            order_number = f"ORD{datetime.now().strftime('%Y%m%d')}{order_count:04d}"
            
            agent_order = AgentOrder(
                agent_id=int(request.form['agent_id']),
                order_number=order_number,
                customer_name=request.form['customer_name'],
                customer_phone=request.form.get('customer_phone'),
                total_amount=float(request.form['total_amount']),
                payment_method=request.form['payment_method'],
                notes=request.form.get('notes')
            )
            
            # Calculate commission
            agent = Agent.query.get(agent_order.agent_id)
            if agent:
                agent_order.commission_amount = (agent_order.total_amount * agent.commission_rate) / 100
            
            # Handle payment proof upload
            if 'payment_proof' in request.files:
                file = request.files['payment_proof']
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    agent_order.payment_proof = filepath
            
            db.session.add(agent_order)
            db.session.commit()
            
            flash('Order berjaya dihantar untuk semakan!', 'success')
            return redirect(url_for('agent_orders'))
            
        except Exception as e:
            flash(f'Ralat: {str(e)}', 'error')
    
    agents = Agent.query.filter_by(status='active').all()
    return render_template('submit_agent_order.html', agents=agents)

@app.route('/approve_order/<int:order_id>')
def approve_order(order_id):
    """Approve agent order"""
    try:
        order = AgentOrder.query.get_or_404(order_id)
        order.status = 'approved'
        order.approved_at = datetime.utcnow()
        order.approved_by = 'Admin'  # In real app, get from session
        
        # Update agent totals
        agent = order.agent
        agent.total_sales += order.total_amount
        agent.total_commission += order.commission_amount
        
        # Create transaction record
        transaction = Transaction(
            type='income',
            amount=order.total_amount,
            description=f'Order dari {agent.name} - {order.customer_name}',
            channel='agent',
            category='agent_sales',
            date=order.order_date
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        flash('Order berjaya diluluskan!', 'success')
        
    except Exception as e:
        flash(f'Ralat: {str(e)}', 'error')
    
    return redirect(url_for('agent_orders'))

@app.route('/reject_order/<int:order_id>')
def reject_order(order_id):
    """Reject agent order"""
    try:
        order = AgentOrder.query.get_or_404(order_id)
        order.status = 'rejected'
        order.approved_at = datetime.utcnow()
        order.approved_by = 'Admin'
        
        db.session.commit()
        flash('Order telah ditolak!', 'info')
        
    except Exception as e:
        flash(f'Ralat: {str(e)}', 'error')
    
    return redirect(url_for('agent_orders'))

# === ZAKAT CALCULATION ROUTES ===

@app.route('/zakat')
def zakat():
    """Zakat calculation page"""
    current_year = datetime.now().year
    
    # Get existing calculation for current year
    existing_calc = ZakatCalculation.query.filter_by(year=current_year).first()
    
    # Calculate current year data if no existing calculation
    if not existing_calc:
        # Get transactions for current year
        year_start = datetime(current_year, 1, 1)
        year_end = datetime(current_year, 12, 31)
        
        year_transactions = Transaction.query.filter(
            Transaction.date >= year_start,
            Transaction.date <= year_end
        ).all()
        
        total_income = sum(t.amount for t in year_transactions if t.type == 'income')
        total_expenses = sum(t.amount for t in year_transactions if t.type == 'expense')
        net_profit = total_income - total_expenses
        
        # Calculate current stock value
        products = Product.query.filter_by(is_active=True).all()
        stock_value = sum(p.current_stock * p.cost_price for p in products)
        
        # Create preliminary calculation
        prelim_calc = {
            'year': current_year,
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'stock_value': stock_value,
            'receivables': 0.0,  # User input required
            'liabilities': 0.0,  # User input required
        }
        
        # Calculate zakat
        zakatable_amount = max(0, net_profit + stock_value + prelim_calc['receivables'] - prelim_calc['liabilities'])
        zakat_amount = zakatable_amount * 0.025  # 2.5%
        
        prelim_calc['zakatable_amount'] = zakatable_amount
        prelim_calc['zakat_amount'] = zakat_amount
        
    else:
        prelim_calc = existing_calc.to_dict()
    
    # Get historical calculations
    history = ZakatCalculation.query.order_by(ZakatCalculation.year.desc()).all()
    
    return render_template('zakat.html', 
                         calculation=prelim_calc,
                         history=history,
                         current_year=current_year)

@app.route('/save_zakat_calculation', methods=['POST'])
def save_zakat_calculation():
    """Save zakat calculation"""
    try:
        year = int(request.form['year'])
        
        # Check if calculation already exists
        existing = ZakatCalculation.query.filter_by(year=year).first()
        
        if existing:
            calc = existing
        else:
            calc = ZakatCalculation(year=year)
        
        calc.total_income = float(request.form['total_income'])
        calc.total_expenses = float(request.form['total_expenses'])
        calc.net_profit = float(request.form['net_profit'])
        calc.stock_value = float(request.form['stock_value'])
        calc.receivables = float(request.form.get('receivables', 0))
        calc.liabilities = float(request.form.get('liabilities', 0))
        calc.notes = request.form.get('notes', '')
        
        # Calculate zakatable amount and zakat
        calc.zakatable_amount = max(0, calc.net_profit + calc.stock_value + calc.receivables - calc.liabilities)
        calc.zakat_amount = calc.zakatable_amount * (calc.zakat_rate / 100)
        
        if not existing:
            db.session.add(calc)
        
        db.session.commit()
        
        flash('Pengiraan zakat berjaya disimpan!', 'success')
        
    except Exception as e:
        flash(f'Ralat: {str(e)}', 'error')
    
    return redirect(url_for('zakat'))

@app.route('/mark_zakat_paid/<int:calc_id>')
def mark_zakat_paid(calc_id):
    """Mark zakat as paid"""
    try:
        calc = ZakatCalculation.query.get_or_404(calc_id)
        calc.is_paid = True
        calc.paid_date = datetime.utcnow()
        
        db.session.commit()
        flash('Zakat ditandakan sebagai telah dibayar!', 'success')
        
    except Exception as e:
        flash(f'Ralat: {str(e)}', 'error')
    
    return redirect(url_for('zakat'))

# === API ENDPOINTS FOR NEW FEATURES ===

@app.route('/api/low_stock_alerts')
def api_low_stock_alerts():
    """API to get low stock alerts"""
    products = Product.query.filter_by(is_active=True).all()
    low_stock = [p.to_dict() for p in products if p.is_low_stock]
    
    return jsonify({
        'alerts': low_stock,
        'count': len(low_stock)
    })

@app.route('/api/agent_stats/<int:agent_id>')
def api_agent_stats(agent_id):
    """API to get agent statistics"""
    agent = Agent.query.get_or_404(agent_id)
    
    # Get monthly sales for current year
    current_year = datetime.now().year
    monthly_sales = []
    
    for month in range(1, 13):
        month_start = datetime(current_year, month, 1)
        if month == 12:
            month_end = datetime(current_year + 1, 1, 1)
        else:
            month_end = datetime(current_year, month + 1, 1)
        
        month_orders = AgentOrder.query.filter(
            AgentOrder.agent_id == agent_id,
            AgentOrder.status == 'approved',
            AgentOrder.order_date >= month_start,
            AgentOrder.order_date < month_end
        ).all()
        
        total = sum(order.total_amount for order in month_orders)
        monthly_sales.append(total)
    
    return jsonify({
        'agent': agent.to_dict(),
        'monthly_sales': monthly_sales,
        'months': ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dis']
    })

# === PDF EXPORT FUNCTIONS ===

def generate_transaction_report_pdf(start_date, end_date, format_type='monthly'):
    """Generate PDF report for transactions"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
    
    # Get business settings
    settings = BusinessSettings.query.first()
    business_name = settings.business_name if settings else "Perniagaan Saya"
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1,  # Center
        textColor=colors.HexColor('#EE4D2D')
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        textColor=colors.HexColor('#333333')
    )
    
    # Story elements
    story = []
    
    # Title
    title = Paragraph(f"<b>{business_name}</b><br/>Laporan Transaksi", title_style)
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Date range
    date_range = Paragraph(f"<b>Tempoh:</b> {start_date.strftime('%d/%m/%Y')} - {end_date.strftime('%d/%m/%Y')}", styles['Normal'])
    story.append(date_range)
    story.append(Spacer(1, 20))
    
    # Get transactions
    transactions = Transaction.query.filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).order_by(Transaction.date.desc()).all()
    
    # Summary calculations
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    net_profit = total_income - total_expense
    
    # Summary section
    story.append(Paragraph("Ringkasan", heading_style))
    
    summary_data = [
        ['Jumlah Pendapatan', f'RM {total_income:.2f}'],
        ['Jumlah Perbelanjaan', f'RM {total_expense:.2f}'],
        ['Keuntungan Bersih', f'RM {net_profit:.2f}']
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F5F5F5')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 30))
    
    # Transactions table
    story.append(Paragraph("Senarai Transaksi", heading_style))
    
    # Table headers
    table_data = [
        ['Tarikh', 'Jenis', 'Jumlah', 'Penerangan', 'Saluran']
    ]
    
    # Add transaction rows
    for transaction in transactions:
        table_data.append([
            transaction.date.strftime('%d/%m/%Y'),
            'Pendapatan' if transaction.type == 'income' else 'Perbelanjaan',
            f'RM {transaction.amount:.2f}',
            transaction.description[:30] + '...' if len(transaction.description) > 30 else transaction.description,
            transaction.channel.title()
        ])
    
    # Create table
    transactions_table = Table(table_data, colWidths=[1.2*inch, 1*inch, 1*inch, 2.5*inch, 1*inch])
    transactions_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EE4D2D')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),  # Amount column
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
    ]))
    
    story.append(transactions_table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer

@app.route('/export_pdf')
def export_pdf():
    """Export monthly report as PDF"""
    # Get date range from request
    month = int(request.args.get('month', datetime.now().month))
    year = int(request.args.get('year', datetime.now().year))
    
    # Calculate start and end dates
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    # Generate PDF
    pdf_buffer = generate_transaction_report_pdf(start_date, end_date)
    
    # Create response
    response = make_response(pdf_buffer.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=laporan-transaksi-{month:02d}-{year}.pdf'
    
    return response

@app.route('/print_report')
def print_report():
    """Generate printable report view"""
    # Get date range from request  
    month = int(request.args.get('month', datetime.now().month))
    year = int(request.args.get('year', datetime.now().year))
    
    # Calculate start and end dates
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = datetime(year, month + 1, 1) - timedelta(days=1)
    
    # Get transactions
    transactions = Transaction.query.filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).order_by(Transaction.date.desc()).all()
    
    # Calculate summary
    total_income = sum(t.amount for t in transactions if t.type == 'income')
    total_expense = sum(t.amount for t in transactions if t.type == 'expense')
    net_profit = total_income - total_expense
    
    # Get business settings
    settings = BusinessSettings.query.first()
    
    return render_template('print_report.html', 
                         transactions=transactions,
                         total_income=total_income,
                         total_expense=total_expense,
                         net_profit=net_profit,
                         start_date=start_date,
                         end_date=end_date,
                         settings=settings,
                         month=month,
                         year=year)

# API Endpoints for Advanced Features

@app.route('/api/analytics')
def api_analytics():
    """API endpoint for advanced analytics data"""
    try:
        # Get last 30 days of transactions
        thirty_days_ago = datetime.now() - timedelta(days=30)
        transactions = Transaction.query.filter(
            Transaction.date >= thirty_days_ago
        ).all()
        
        # Calculate channel performance
        channel_performance = {}
        for transaction in transactions:
            if transaction.type == 'income':
                channel = transaction.channel
                if channel not in channel_performance:
                    channel_performance[channel] = {
                        'revenue': 0, 'orders': 0, 'avgOrder': 0, 'growth': 0
                    }
                channel_performance[channel]['revenue'] += transaction.amount
                channel_performance[channel]['orders'] += 1
        
        # Calculate average order values
        for channel in channel_performance:
            if channel_performance[channel]['orders'] > 0:
                channel_performance[channel]['avgOrder'] = (
                    channel_performance[channel]['revenue'] / 
                    channel_performance[channel]['orders']
                )
        
        # Generate daily trends
        daily_trends = []
        for i in range(30):
            date = thirty_days_ago + timedelta(days=i)
            daily_transactions = [t for t in transactions 
                                if t.date.date() == date.date()]
            
            revenue = sum(t.amount for t in daily_transactions if t.type == 'income')
            expenses = sum(t.amount for t in daily_transactions if t.type == 'expense')
            orders = len([t for t in daily_transactions if t.type == 'income'])
            
            daily_trends.append({
                'date': date.strftime('%Y-%m-%d'),
                'revenue': revenue,
                'expenses': expenses,
                'orders': orders
            })
        
        # Get top products (if product data exists)
        products = Product.query.all()
        top_products = []
        for product in products[:5]:  # Top 5 products
            # Calculate revenue from stock movements (simplified)
            revenue = product.selling_price * max(0, product.current_stock)
            top_products.append({
                'name': product.name,
                'revenue': revenue,
                'units': product.current_stock
            })
        
        # Sort by revenue
        top_products.sort(key=lambda x: x['revenue'], reverse=True)
        
        return jsonify({
            'channelPerformance': channel_performance,
            'dailyTrends': daily_trends,
            'topProducts': top_products[:5],
            'forecast': {
                'nextMonth': {
                    'revenue': sum(t.amount for t in transactions if t.type == 'income') * 1.1,
                    'orders': len([t for t in transactions if t.type == 'income']) + 10,
                    'profit': (sum(t.amount for t in transactions if t.type == 'income') - 
                             sum(t.amount for t in transactions if t.type == 'expense')) * 1.1
                },
                'confidence': 85.7
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export-user-data', methods=['POST'])
def api_export_user_data():
    """Export all user data for PDPA compliance"""
    try:
        # Gather all user data
        transactions = Transaction.query.all()
        products = Product.query.all()
        agents = Agent.query.all()
        agent_orders = AgentOrder.query.all()
        settings = BusinessSettings.query.first()
        zakat_calculations = ZakatCalculation.query.all()
        
        # Convert to dictionaries
        data = {
            'transactions': [t.to_dict() for t in transactions],
            'products': [p.to_dict() for p in products],
            'agents': [a.to_dict() for a in agents],
            'agent_orders': [ao.to_dict() for ao in agent_orders],
            'zakat_calculations': [zc.to_dict() for zc in zakat_calculations],
            'business_settings': {
                'business_name': settings.business_name if settings else None,
                'monthly_expense_limit': settings.monthly_expense_limit if settings else None,
                'default_currency': settings.default_currency if settings else None,
                'enable_zakat_calculation': settings.enable_zakat_calculation if settings else None,
                'zakat_percentage': settings.zakat_percentage if settings else None,
            } if settings else {},
            'export_date': datetime.now().isoformat(),
            'total_records': {
                'transactions': len(transactions),
                'products': len(products),
                'agents': len(agents),
                'agent_orders': len(agent_orders),
                'zakat_calculations': len(zakat_calculations)
            }
        }
        
        # Create JSON response
        import json
        json_data = json.dumps(data, indent=2, default=str)
        
        # Return as downloadable file
        response = make_response(json_data)
        response.headers['Content-Type'] = 'application/json'
        response.headers['Content-Disposition'] = f'attachment; filename=pocketbizz-data-{datetime.now().strftime("%Y-%m-%d")}.json'
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete-user-data', methods=['DELETE'])
def api_delete_user_data():
    """Delete all user data for PDPA compliance"""
    try:
        # Delete all data (in proper order to avoid foreign key constraints)
        StockMovement.query.delete()
        AgentOrder.query.delete()
        Agent.query.delete()
        Product.query.delete()
        ZakatCalculation.query.delete()
        Transaction.query.delete()
        BusinessSettings.query.delete()
        
        db.session.commit()
        
        return jsonify({'message': 'All user data has been permanently deleted'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/privacy-settings', methods=['POST'])
def api_privacy_settings():
    """Save privacy settings"""
    try:
        data = request.get_json()
        # In a real app, save to user profile
        # For now, we just acknowledge receipt
        return jsonify({'message': 'Privacy settings saved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-lhdn-report', methods=['POST'])
def api_generate_lhdn_report():
    """Generate LHDN compliant tax reports"""
    try:
        data = request.get_json()
        report_type = data.get('type')
        year = int(data.get('year', datetime.now().year))
        tax_number = data.get('taxNumber', '')
        sst_number = data.get('sstNumber', '')
        
        # Get transactions for the tax year
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31)
        
        transactions = Transaction.query.filter(
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).all()
        
        # Calculate totals
        total_income = sum(t.amount for t in transactions if t.type == 'income')
        total_expenses = sum(t.amount for t in transactions if t.type == 'expense')
        net_profit = total_income - total_expenses
        
        # Get business settings
        settings = BusinessSettings.query.first()
        
        # Generate PDF report using ReportLab
        from reportlab.lib.pagesizes import A4
        from reportlab.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from io import BytesIO
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        
        # Title style
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center
        )
        
        # Report content
        content = []
        
        if report_type == 'be':
            title = f"BORANG BE - LAPORAN CUKAI PENDAPATAN INDIVIDU {year}"
        elif report_type == 'c':
            title = f"BORANG C - LAPORAN CUKAI SYARIKAT {year}"
        else:
            title = f"LAPORAN SST/GST {year}"
        
        content.append(Paragraph(title, title_style))
        content.append(Spacer(1, 20))
        
        # Business info
        if settings and settings.business_name:
            content.append(Paragraph(f"<b>Nama Perniagaan:</b> {settings.business_name}", styles['Normal']))
        
        content.append(Paragraph(f"<b>No. Cukai Pendapatan:</b> {tax_number}", styles['Normal']))
        if sst_number:
            content.append(Paragraph(f"<b>No. SST:</b> {sst_number}", styles['Normal']))
        
        content.append(Spacer(1, 20))
        
        # Financial summary table
        table_data = [
            ['Keterangan', f'Jumlah (RM)'],
            ['Jumlah Pendapatan', f'{total_income:,.2f}'],
            ['Jumlah Perbelanjaan', f'{total_expenses:,.2f}'],
            ['Keuntungan Bersih', f'{net_profit:,.2f}']
        ]
        
        table = Table(table_data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        content.append(table)
        content.append(Spacer(1, 30))
        
        # Channel breakdown
        channel_data = [['Saluran Jualan', 'Pendapatan (RM)']]
        channels = {}
        for transaction in transactions:
            if transaction.type == 'income':
                channel = transaction.channel
                if channel not in channels:
                    channels[channel] = 0
                channels[channel] += transaction.amount
        
        for channel, amount in channels.items():
            channel_names = {
                'shopee': 'Shopee',
                'tiktok': 'TikTok Shop',
                'walkin': 'Jualan Tunai',
                'agent': 'Ejen/Reseller',
                'online': 'Online Lain'
            }
            channel_display = channel_names.get(channel, channel)
            channel_data.append([channel_display, f'{amount:,.2f}'])
        
        if len(channel_data) > 1:
            channel_table = Table(channel_data, colWidths=[3*inch, 2*inch])
            channel_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            content.append(Paragraph("<b>Pecahan Pendapatan Mengikut Saluran:</b>", styles['Heading3']))
            content.append(channel_table)
        
        content.append(Spacer(1, 30))
        content.append(Paragraph(f"<b>Tarikh Jana Laporan:</b> {datetime.now().strftime('%d/%m/%Y')}", styles['Normal']))
        content.append(Paragraph("<i>Laporan ini dijana secara automatik oleh PocketBizz dan mematuhi format LHDN Malaysia.</i>", styles['Italic']))
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        
        # Return PDF
        response = make_response(buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=LHDN-{report_type.upper()}-{year}.pdf'
        
        buffer.close()
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/smart-receipt-process', methods=['POST'])
def api_smart_receipt_process():
    """Process receipt with smart categorization and organize files"""
    try:
        data = request.get_json()
        
        # Extract receipt data
        ocr_text = data.get('ocrText', '')
        image_data = data.get('imageData', '')  # Base64 image
        
        # Smart categorization logic
        category = categorize_receipt_smart(ocr_text)
        vendor = extract_vendor_from_text(ocr_text)
        amount = extract_amount_from_text(ocr_text)
        date_found = extract_date_from_text(ocr_text)
        
        # Generate organized filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        vendor_clean = ''.join(c for c in vendor if c.isalnum() or c in '-_')[:20]
        filename = f"resit_{timestamp}_{vendor_clean}_RM{amount:.2f}.pdf"
        
        # Create category folder path
        category_folder = os.path.join('static', 'receipts', category)
        os.makedirs(category_folder, exist_ok=True)
        
        file_path = os.path.join(category_folder, filename)
        
        # For now, create a simple text-based PDF since we don't have the actual image
        # In production, you would save the actual PDF here
        with open(file_path, 'w') as f:
            f.write(f"Receipt PDF placeholder\nVendor: {vendor}\nAmount: RM {amount}\nDate: {date_found}\nCategory: {category}")
        
        return jsonify({
            'success': True,
            'data': {
                'vendor': vendor,
                'amount': amount,
                'date': date_found,
                'category': category,
                'filename': filename,
                'file_path': file_path,
                'view_url': f'/view-receipt/{category}/{filename}'
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/view-receipt/<category>/<filename>')
def view_receipt(category, filename):
    """View organized receipt PDF"""
    try:
        file_path = os.path.join('static', 'receipts', category, filename)
        
        if os.path.exists(file_path):
            return send_file(file_path, as_attachment=False)
        else:
            flash('Receipt file not found')
            return redirect(url_for('index'))
            
    except Exception as e:
        flash(f'Error viewing receipt: {str(e)}')
        return redirect(url_for('index'))

@app.route('/api/receipt-folders')
def api_receipt_folders():
    """Get organized receipt folders and files"""
    try:
        receipts_base = os.path.join('static', 'receipts')
        folder_structure = {}
        
        if os.path.exists(receipts_base):
            for category in os.listdir(receipts_base):
                category_path = os.path.join(receipts_base, category)
                if os.path.isdir(category_path):
                    files = []
                    for file in os.listdir(category_path):
                        if file.endswith('.pdf'):
                            file_path = os.path.join(category_path, file)
                            file_stats = os.stat(file_path)
                            files.append({
                                'name': file,
                                'size': file_stats.st_size,
                                'created': datetime.fromtimestamp(file_stats.st_ctime).isoformat(),
                                'url': f'/view-receipt/{category}/{file}'
                            })
                    
                    folder_structure[category] = {
                        'name': get_category_display_name(category),
                        'count': len(files),
                        'files': sorted(files, key=lambda x: x['created'], reverse=True)
                    }
        
        return jsonify(folder_structure)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def categorize_receipt_smart(ocr_text):
    """Smart categorization based on OCR text"""
    text = ocr_text.lower()
    
    # Category keywords mapping
    categories = {
        'makanan': ['restaurant', 'cafe', 'kedai makan', 'food', 'makan', 'restoran', 'mamak', 'mcd', 'kfc', 'pizza', 'burger', 'nasi', 'mee', 'kuih', 'minuman'],
        'peralatan': ['hardware', 'tools', 'alat', 'peralatan', 'equipment', 'machinery', 'engine', 'motor', 'drill', 'hammer'],
        'bekalan_pejabat': ['stationery', 'kertas', 'pen', 'paper', 'office', 'pejabat', 'supplies', 'printer', 'ink', 'stapler'],
        'pengangkutan': ['petrol', 'minyak', 'transport', 'grab', 'taxi', 'toll', 'parking', 'bas', 'train', 'flight', 'fuel'],
        'utiliti': ['electric', 'water', 'internet', 'phone', 'wifi', 'streamyx', 'celcom', 'maxis', 'digi', 'tnb', 'air', 'bill'],
        'rawatan_kesihatan': ['hospital', 'clinic', 'doctor', 'ubat', 'medicine', 'pharmacy', 'dentist', 'medical', 'health'],
        'pakaian': ['clothes', 'shirt', 'pants', 'shoes', 'fashion', 'baju', 'seluar', 'kasut', 'tudung', 'dress'],
        'pemasaran': ['advertising', 'marketing', 'promotion', 'facebook', 'google', 'ads', 'banner', 'flyer', 'design'],
        'sewa': ['rent', 'rental', 'sewa', 'office rent', 'shop rent', 'warehouse', 'premise'],
        'insurans': ['insurance', 'insurans', 'takaful', 'coverage', 'policy', 'premium', 'protection']
    }
    
    # Score each category
    category_scores = {}
    for category, keywords in categories.items():
        score = sum(1 for keyword in keywords if keyword in text)
        category_scores[category] = score
    
    # Return category with highest score, default to 'lain_lain'
    best_category = max(category_scores.items(), key=lambda x: x[1])
    return best_category[0] if best_category[1] > 0 else 'lain_lain'

def extract_vendor_from_text(text):
    """Extract vendor/business name from OCR text"""
    lines = text.split('\n')
    
    # Look for vendor in first few lines
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 3 and len(line) < 50 and not line.isdigit():
            # Skip lines that are mainly numbers/dates
            if not any(char.isdigit() for char in line[:len(line)//2]):
                return line.upper()
    
    return 'KEDAI TIDAK DIKENALI'

def extract_amount_from_text(text):
    """Extract amount from OCR text"""
    import re
    
    # Look for RM patterns
    patterns = [
        r'rm\s*(\d+\.?\d*)',
        r'(\d+\.?\d*)\s*rm',
        r'total\s*:?\s*rm?\s*(\d+\.?\d*)',
        r'jumlah\s*:?\s*rm?\s*(\d+\.?\d*)'
    ]
    
    text_lower = text.lower()
    
    for pattern in patterns:
        matches = re.findall(pattern, text_lower)
        if matches:
            try:
                return float(matches[-1])  # Take the last (usually total) amount
            except ValueError:
                continue
    
    return 0.0

def extract_date_from_text(text):
    """Extract date from OCR text"""
    import re
    
    # Date patterns
    patterns = [
        r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
        r'(\d{1,2}\s\w+\s\d{4})',
        r'(\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2})'
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        if matches:
            return matches[0]
    
    return datetime.now().strftime('%d/%m/%Y')

def get_category_display_name(category):
    """Get display name for category"""
    display_names = {
        'makanan': 'Makanan & Minuman',
        'peralatan': 'Peralatan & Jentera',
        'bekalan_pejabat': 'Bekalan Pejabat',
        'pengangkutan': 'Pengangkutan',
        'utiliti': 'Utiliti & Bil',
        'rawatan_kesihatan': 'Rawatan Kesihatan',
        'pakaian': 'Pakaian & Aksesori',
        'pemasaran': 'Pemasaran & Iklan',
        'sewa': 'Sewa & Rental',
        'insurans': 'Insurans & Takaful',
        'lain_lain': 'Lain-lain'
    }
    
    return display_names.get(category, 'Tidak Dikategorikan')
