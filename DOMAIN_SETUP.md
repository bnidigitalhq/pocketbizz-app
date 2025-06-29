# Domain Setup Guide: pocketbizz.my

## Domain Architecture
```
pocketbizz.my           → Landing Page (Vercel)
app.pocketbizz.my       → Main App (Vercel Frontend)
api.pocketbizz.my       → Backend API (Railway) [Optional]
```

## Step 1: Purchase Domain
- Register `pocketbizz.my` from Malaysian domain registrar
- Examples: Exabytes, ServerFreak, or international (Namecheap, GoDaddy)

## Step 2: DNS Configuration

### Main Domain (Landing Page)
**At your domain registrar DNS settings:**
```
Type: A
Name: @
Value: 76.76.19.19 (Vercel IP)
TTL: 3600

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### App Subdomain  
**Add these records:**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com  
TTL: 3600
```

### API Subdomain (Optional)
**For clean API URLs:**
```
Type: CNAME
Name: api
Value: your-railway-app.up.railway.app
TTL: 3600
```

## Step 3: Vercel Configuration

### Landing Page Project
1. Deploy landing page to separate Vercel project
2. Add custom domain: `pocketbizz.my`
3. Vercel handles SSL automatically

### Main App Project  
1. Deploy frontend to main Vercel project
2. Add custom domain: `app.pocketbizz.my`
3. Update environment variables

## Step 4: Update Frontend Configuration

### Landing Page Environment
```javascript
// Landing page can have simple contact forms
const LANDING_CONFIG = {
  APP_URL: 'https://app.pocketbizz.my',
  API_URL: 'https://api.pocketbizz.my', // or Railway direct URL
  CONTACT_EMAIL: 'support@pocketbizz.my'
};
```

### Main App Environment  
```javascript
// Update frontend/static/js/config.js
const APP_CONFIG = {
  API_BASE_URL: 'https://api.pocketbizz.my', // or Railway URL
  DOMAIN: 'app.pocketbizz.my',
  LANDING_URL: 'https://pocketbizz.my'
};
```

## Step 5: Update vercel.json

### Landing Page vercel.json
```json
{
  "version": 2,
  "name": "pocketbizz-landing",
  "routes": [
    {
      "src": "/app",
      "status": 301,
      "headers": {
        "Location": "https://app.pocketbizz.my"
      }
    }
  ]
}
```

### Main App vercel.json
```json
{
  "version": 2,
  "name": "pocketbizz-app", 
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://api.pocketbizz.my/api/$1"
    }
  ]
}
```

## Step 6: Railway Domain Setup (Optional)

### Custom API Domain
1. Go to Railway project settings
2. Add custom domain: `api.pocketbizz.my`
3. Update DNS CNAME as shown above

### Environment Variables
```
CORS_ORIGINS=https://app.pocketbizz.my,https://pocketbizz.my
FRONTEND_URL=https://app.pocketbizz.my
```

## Step 7: SSL & Security

### Automatic SSL
- Vercel: Auto-generates SSL for both domains
- Railway: Auto-generates SSL for custom domain

### Security Headers
Add to vercel.json:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

## Step 8: Email Setup (Optional)

### Professional Email
Setup `support@pocketbizz.my` for customer support:
- Use Google Workspace or Microsoft 365
- Configure MX records at domain registrar

## Replit Role in Domain Setup

### What Replit CANNOT do:
❌ Configure DNS records (domain registrar only)
❌ Purchase domains
❌ Setup custom domains on Vercel/Railway

### What Replit CAN do:
✅ Prepare deployment files with correct domain references
✅ Update API endpoints to use custom domains
✅ Test configurations before deployment

## Timeline & Costs

### Setup Time
- Domain purchase: 5 minutes
- DNS configuration: 10 minutes  
- Vercel domain setup: 5 minutes per domain
- Propagation time: 15 minutes - 24 hours

### Costs
- `pocketbizz.my`: ~RM50/year
- Vercel Pro (for commercial use): $20/month
- Railway: $5/month
- **Total**: ~RM350/year (~RM30/month)

## Step-by-Step Deployment Order

1. **Purchase domain** `pocketbizz.my`
2. **Deploy to GitHub** (backend + frontend)
3. **Setup Vercel projects** (landing + app)
4. **Setup Railway project** (API)
5. **Configure DNS** at domain registrar
6. **Add custom domains** in Vercel/Railway
7. **Test all URLs** working properly

## After Domain Setup

Your users will access:
- **Marketing**: https://pocketbizz.my
- **App**: https://app.pocketbizz.my  
- **API**: https://api.pocketbizz.my (optional)

While you continue developing in Replit with manual deployment workflow!