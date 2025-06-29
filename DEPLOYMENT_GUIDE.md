# PocketBizz Deployment Guide
## Vercel Frontend + Railway Backend + Replit Development

## Phase 1: Setup GitHub Repository

### 1. Create GitHub Repository
```bash
# Create new repo on GitHub: pocketbizz-deployment
# Clone to local machine or connect Replit to GitHub
```

### 2. Repository Structure
```
pocketbizz-deployment/
├── backend/                 # Railway deployment
│   ├── api/
│   ├── app.py
│   ├── models.py
│   ├── supabase_auth.py
│   ├── requirements.txt
│   └── Procfile
├── frontend/                # Vercel deployment
│   ├── public/
│   ├── static/
│   ├── package.json
│   └── vercel.json
└── README.md
```

## Phase 2: Deploy Backend to Railway

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub account
- Connect GitHub repository

### 2. Deploy Backend Service
- Create new project in Railway
- Connect to GitHub repo
- Set root directory to `backend/`
- Railway will auto-detect Python app

### 3. Configure Environment Variables
Add these secrets in Railway dashboard:
```
DATABASE_URL=postgresql://postgres.xxx...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SESSION_SECRET=your-secret-key-here
PORT=5000
```

### 4. Test Backend Deployment
- Railway will provide a URL: `https://your-app.railway.app`
- Test endpoints:
  - `GET /api/health` - Should return health status
  - `GET /api/docs` - Should return API documentation

## Phase 3: Deploy Frontend to Vercel

### 1. Create Vercel Account
- Go to [vercel.com](https://vercel.com)
- Sign up with GitHub account
- Import GitHub repository

### 2. Configure Vercel Deployment
- Set root directory to `frontend/`
- Set build command: `npm run build`
- Set output directory: `public/`

### 3. Update vercel.json
Replace `your-railway-backend.railway.app` with actual Railway URL:
```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-actual-railway-url.railway.app/api/$1"
    }
  ]
}
```

### 4. Configure Environment Variables
Add in Vercel dashboard:
```
API_BASE_URL=https://your-railway-backend.railway.app
NODE_ENV=production
```

## Phase 4: Update Frontend for API Integration

### 1. Create API Client
Create `frontend/static/js/api-client.js`:
```javascript
class PocketBizzAPI {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'https://your-railway-backend.railway.app';
  }

  async post(endpoint, data) {
    const response = await fetch(`${this.baseURL}/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    return response.json();
  }

  async get(endpoint) {
    const response = await fetch(`${this.baseURL}/api${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      },
      credentials: 'include'
    });
    return response.json();
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }
}

const api = new PocketBizzAPI();
```

### 2. Update Templates
Replace Flask template variables with JavaScript API calls:
- Dashboard data: `GET /api/dashboard/summary`
- Transactions: `GET /api/transactions/`
- Reports: `GET /api/reports/monthly`

## Phase 5: Development Workflow

### 1. Replit Development Setup
- Keep current Replit setup for development
- Use for testing new features
- Push changes to GitHub when ready

### 2. Manual Deployment Pipeline (Recommended)
```
Replit Development → Manual Git Push → GitHub → Auto-deploy to Vercel/Railway
```

**Deployment Commands in Replit:**
```bash
git add .
git commit -m "Update: describe your changes"
git push origin main
```

### 3. Environment Management
- **Development**: Replit with demo/test data
- **Staging**: Railway backend + Vercel frontend (test domain)
- **Production**: Railway backend + Vercel frontend (custom domain)

## Phase 6: Custom Domain Setup

### 1. Frontend Domain (Vercel)
- Add custom domain in Vercel dashboard
- Configure DNS records
- SSL automatically handled by Vercel

### 2. Backend Domain (Railway)
- Optional: Add custom domain for API
- Configure CORS for new frontend domain

## Benefits of This Setup

### Performance
- **Frontend**: Global CDN via Vercel
- **Backend**: Fast Railway infrastructure
- **Database**: Supabase edge network

### Scalability
- **Frontend**: Unlimited static hosting
- **Backend**: Auto-scaling on Railway
- **Database**: Supabase connection pooling

### Cost Optimization
- **Vercel**: Free for personal projects
- **Railway**: $5/month for backend
- **Supabase**: Free tier up to 500MB database

### Development Efficiency
- **Replit**: Instant development environment
- **Git**: Version control and deployment triggers
- **Separation**: Frontend/backend independent scaling

## Next Steps After Reading This Guide

1. Create GitHub repository
2. Push backend folder to Railway
3. Push frontend folder to Vercel
4. Update environment variables
5. Test full deployment
6. Continue using Replit for feature development

## Support & Maintenance

- Monitor Railway logs for backend issues
- Use Vercel analytics for frontend performance
- Continue development in Replit
- Deploy updates via GitHub pushes