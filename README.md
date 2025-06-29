# PocketBizz - Malaysian SME Accounting App

A mobile-first Progressive Web App (PWA) designed specifically for busy Malaysian SME business owners who need quick, on-the-go accounting solutions.

## 🚀 Features

- **Smart Receipt Processing**: Scan receipts, auto-categorize, and convert to organized PDFs
- **Multi-Platform Support**: Shopee, TikTok Shop, Lazada integration
- **Voice Input**: Bahasa Malaysia speech recognition for quick transaction entry
- **Offline Mode**: Full offline functionality with automatic sync
- **Zakat Calculator**: Malaysian Islamic business compliance
- **Agent/Reseller System**: Complete order management and commission tracking
- **Inventory Management**: Stock tracking with low stock alerts
- **LHDN Reports**: Malaysian tax report generation (Borang BE, C, SST/GST)
- **PWA Ready**: Install as mobile app with offline capabilities

## 📱 Live Demo

- **Production App**: Coming soon
- **Development**: Available on Replit

## 🏗️ Architecture

- **Frontend**: Vercel (Static hosting with global CDN)
- **Backend**: Railway (Flask API with auto-scaling)
- **Database**: Supabase (PostgreSQL with real-time capabilities)
- **Authentication**: Supabase Auth with JWT tokens
- **Development**: Replit (Primary development environment)

## 🛠️ Technology Stack

### Backend
- Flask (Python web framework)
- SQLAlchemy (Database ORM)
- Supabase (PostgreSQL database)
- Flask-CORS (Cross-origin resource sharing)
- Gunicorn (WSGI HTTP Server)

### Frontend
- Tailwind CSS (Utility-first CSS framework)
- Vanilla JavaScript (No framework dependencies)
- PWA Manifest (Progressive Web App)
- Service Worker (Offline functionality)
- OpenCV.js (Document scanning)
- Tesseract.js (OCR processing)

### Deployment
- **Backend**: Railway (Auto-deploy from GitHub)
- **Frontend**: Vercel (Static site hosting)
- **Database**: Supabase (Managed PostgreSQL)
- **Domain**: Custom domain with SSL

## 🚦 Getting Started

### Prerequisites
- GitHub account
- Vercel account (connected to GitHub)
- Railway account (connected to GitHub)
- Supabase project with database configured

### Deployment

1. **Clone Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/pocketbizz-app.git
   cd pocketbizz-app
   ```

2. **Deploy Backend (Railway)**
   - Connect GitHub repository to Railway
   - Set root directory to `backend/`
   - Configure environment variables (see below)

3. **Deploy Frontend (Vercel)**
   - Import GitHub repository to Vercel
   - Set root directory to `frontend/`
   - Configure build settings

### Environment Variables

**Backend (Railway):**
```
DATABASE_URL=postgresql://postgres.xxx...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SESSION_SECRET=your-secure-random-key
PORT=5000
```

**Frontend (Vercel):**
```
API_BASE_URL=https://your-railway-app.railway.app
NODE_ENV=production
```

## 📚 Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Complete deployment instructions
- [Domain Setup](DOMAIN_SETUP.md) - Custom domain configuration
- [Architecture Overview](DEPLOYMENT_ARCHITECTURE.md) - Technical architecture details
- [Supabase Setup](SUPABASE_SETUP.md) - Database configuration guide

## 🎯 Target Market

Malaysian Small and Medium Enterprises (SMEs) who need:
- Quick transaction recording (under 10 seconds)
- Mobile-first accounting solution
- Multi-platform sales integration
- Islamic compliance (Zakat calculation)
- Bahasa Malaysia support
- Offline functionality for areas with poor connectivity

## 🔒 Security & Privacy

- All sensitive data encrypted in transit and at rest
- JWT-based authentication with secure session management
- PDPA compliance with data export/delete capabilities
- Regular security updates and monitoring
- Environment-based secret management

## 📈 Roadmap

- [x] Core accounting features
- [x] Multi-platform CSV import
- [x] Smart receipt processing
- [x] PWA implementation
- [x] Supabase integration
- [ ] Mobile app store deployment
- [ ] Advanced analytics dashboard
- [ ] WhatsApp Business integration
- [ ] Multi-language support (Chinese, Tamil)

## 🤝 Contributing

This is a commercial project. For feature requests or bug reports, please contact support.

## 📄 License

Proprietary software. All rights reserved.

## 📞 Support

- Email: support@pocketbizz.my
- WhatsApp: Available in app
- Documentation: [GitHub Wiki](../../wiki)

---

**Built with ❤️ for Malaysian entrepreneurs**