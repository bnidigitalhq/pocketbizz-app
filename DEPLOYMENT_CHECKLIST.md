# PocketBizz Deployment Checklist

## Phase 1: Account Setup (15 minutes)

### ✅ Step 1: GitHub Account
1. Go to [github.com](https://github.com)
2. Sign up with your email
3. Verify email address
4. Choose username (suggestion: your business name)

### ✅ Step 2: Create Repository
1. Click "New repository"
2. Repository name: `pocketbizz-deployment`
3. Set to Public (required for free Vercel)
4. Add README.md
5. Click "Create repository"

### ✅ Step 3: Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub

### ✅ Step 4: Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Login"
3. Choose "Login with GitHub"
4. Authorize Railway to access your GitHub

## Phase 2: Repository Setup (10 minutes)

### ✅ Step 5: Push Code to GitHub
**From Replit terminal:**
```bash
# Initialize git if not done
git init
git remote add origin https://github.com/YOUR_USERNAME/pocketbizz-deployment.git

# Push current code
git add .
git commit -m "Initial PocketBizz deployment ready"
git push -u origin main
```

## Phase 3: Backend Deployment (Railway)

### ✅ Step 6: Deploy Backend
1. Login to Railway dashboard
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select `pocketbizz-deployment`
5. Set **Root Directory**: `backend`

### ✅ Step 7: Configure Environment Variables
**In Railway project settings → Variables:**
```
DATABASE_URL=postgresql://postgres.xxx... (from Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
SESSION_SECRET=your-secure-random-key-here
PORT=5000
```

### ✅ Step 8: Test Backend
- Railway will provide URL: `https://your-app.up.railway.app`
- Test: `https://your-app.up.railway.app/api/health`
- Should return: `{"status": "healthy"}`

## Phase 4: Frontend Deployment (Vercel)

### ✅ Step 9: Deploy Frontend
1. Login to Vercel dashboard
2. Click "Add New..." → "Project"
3. Import `pocketbizz-deployment` repository
4. Set **Root Directory**: `frontend`
5. **Build Command**: `npm run build`
6. **Output Directory**: `public`

### ✅ Step 10: Configure Frontend Environment
**In Vercel project settings → Environment Variables:**
```
API_BASE_URL=https://your-railway-app.up.railway.app
NODE_ENV=production
```

### ✅ Step 11: Update API URLs
**Update vercel.json with actual Railway URL:**
```json
{
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-actual-railway-url.up.railway.app/api/$1"
    }
  ]
}
```

### ✅ Step 12: Test Full App
- Vercel will provide URL: `https://your-app.vercel.app`
- Test registration, login, add transaction
- Verify data saves to Supabase

## Phase 5: Domain Setup (Optional)

### ✅ Step 13: Purchase Domain
- Register `pocketbizz.my` (or your preferred domain)

### ✅ Step 14: Configure DNS
**At domain registrar:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com

Type: CNAME  
Name: api
Value: your-railway-app.up.railway.app
```

### ✅ Step 15: Add Custom Domains
- **Vercel**: Add `app.pocketbizz.my`
- **Railway**: Add `api.pocketbizz.my`

## Post-Deployment Workflow

### Development Process:
1. **Code** new features in Replit
2. **Test** locally with demo data
3. **Push** to GitHub when ready:
   ```bash
   git add .
   git commit -m "Add feature: expense categories"
   git push origin main
   ```
4. **Auto-deploy** happens on Vercel/Railway

### Monitoring:
- **Vercel Analytics**: Frontend performance
- **Railway Logs**: Backend errors
- **Supabase Dashboard**: Database usage

## Success Criteria ✅

When deployment is complete, you should have:
- ✅ Working app at `https://your-app.vercel.app`
- ✅ API responding at `https://your-railway-app.up.railway.app/api/health`
- ✅ User registration/login working
- ✅ Transactions saving to Supabase
- ✅ All features working in production

## Estimated Timeline
- Account setup: 15 minutes
- Repository setup: 10 minutes  
- Backend deployment: 20 minutes
- Frontend deployment: 15 minutes
- Testing: 15 minutes
- **Total: ~75 minutes**

## Need Help?
If stuck at any step:
1. Check logs in Railway/Vercel dashboards
2. Verify environment variables are correct
3. Test API endpoints individually
4. Return to Replit for local debugging