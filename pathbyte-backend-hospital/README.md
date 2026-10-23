# Hospital Management System - Backend

Node.js + Express + MongoDB backend for the Hospital Management System (HMS).
Covers OPD visits, IPD admissions, daycare, dialysis, X-ray, pharmacy tokens, billing, doctor management, and more.

---

## Table of Contents

1. Prerequisites
2. Project Structure
3. Environment Setup
4. Install and Run Locally
5. Restore the MongoDB Dump
6. Create the First Admin User
7. Production Deployment (Ubuntu / EC2)
8. Nginx Reverse Proxy
9. Taking a New MongoDB Backup
10. Environment Variables Reference


---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18 LTS or 20 LTS | Use nvm to manage versions |
| Yarn | 1.x | npm install -g yarn |
| MongoDB | 6.0+ | Local or Atlas |
| MongoDB Database Tools | latest | Provides mongodump / mongorestore |
| PM2 | latest | npm install -g pm2 |

---

## 2. Project Structure

`
src/
  app.ts                    App bootstrap
  server.ts                 Entry point
  loaders/                  Express and Mongoose setup
  middlewares/              Auth, error, sanitize
  libs/                     JWT, password, S3, utils
  routes/v1/
    index.ts                Mounts /hospital and /upload
    hospital.routes.ts      All hospital sub-routes
  modules/
    hospital-auth/          Login, users, roles
    hospital-patient/       Patient records (MRD)
    hospital-doctor/        Doctor profiles
    hospital-visit/         OPD visits and token queue
    hospital-ipd/           Inpatient admissions
    hospital-daycare-appointment/
    hospital-dialysis-session/
    hospital-xray-session/
    hospital-procedure/
    hospital-procedure-package/
    hospital-transaction/   Billing
    hospital-pharma-token/
    hospital-bed/
    hospital-ward/
    hospital-dashboard/
    hospital-master-export/
    constants/
    icd/                    ICD-11 diagnosis search
    medicine/
    upload/                 S3 file uploads

config/environments/
  .env.example              Template -- copy and fill
  .env.development          Local dev (git-ignored)
  .env.production           Production (git-ignored)

scripts/
  create-hospital-admin.js  Create first admin user
  backupMongoDB.js          MongoDB backup to S3

mongodb-hospital-dump.tar.gz    Full database dump
`

All API routes are prefixed: /api/v1/hospital/

---

## 3. Environment Setup

`ash
cp config/environments/.env.example config/environments/.env.development
`

Open .env.development and fill in every value.
Minimum required to start:

`
DATABASE_URL=mongodb://localhost:27017/hospital_db
PORT=3000
JWT_ACCESS_SECRET=<random 64-char string>
JWT_REFRESH_SECRET=<random 64-char string>
`

---

## 4. Install and Run Locally

`ash
# Install dependencies
yarn install

# Development (watch mode)
yarn serve

# Or build and start once
yarn build
yarn start
`

Health check: GET http://localhost:3000/status


---

## 5. Restore the MongoDB Dump

The file included in the root of this project is a full MongoDB dump:

`
mongodb-hospital-dump.tar.gz
`

### Database inside the dump

The dump contains a single database: **hospital_db**

| Collection | Description |
|------------|-------------|
| hospitalpatients | Patient records |
| hospitalusers | Hospital staff / admin users |
| hospitaldoctors | Doctor profiles |
| hospitalvisits | OPD visits |
| hospitalipds | IPD admissions |
| hospitaltransactions | Billing records |
| hospitalprocedures | Procedure definitions |
| hospitalprocedurepackages | Procedure packages |
| hospitalpharmatokens | Pharmacy tokens |
| hospitalwards | Ward definitions |
| hospitalbeds | Bed records |
| daycareappointments | Daycare sessions |
| dialysissessions | Dialysis sessions |
| xraysessions | X-ray sessions |
| medicines | Medicine master data |
| constants | System constants / lookup data |
| counters | Auto-increment counters (MRD, visit IDs) |
| whatsapplogs | WhatsApp notification logs |

### Restore steps

**Step 1 - Extract the archive**

`ash
tar -xzf mongodb-hospital-dump.tar.gz
# Creates a dump/ folder
`

**Step 2 - Restore a specific database**

Restore the hospital_db into your MongoDB:

`ash
mongorestore --uri="mongodb://localhost:27017" \
  --db=hospital_db \
  dump/hospital_db
`

With authentication:

`ash
mongorestore --uri="mongodb://user:password@localhost:27017/hospital_db?authSource=admin" \
  --db=hospital_db \
  dump/hospital_db
`

With MongoDB Atlas:

`ash
mongorestore --uri="mongodb+srv://user:password@cluster.mongodb.net" \
  --db=hospital_db \
  dump/hospital_db
`

**Step 3 - Drop and re-restore (clean slate)**

Add --drop to wipe existing collections before restoring:

`ash
mongorestore --uri="mongodb://localhost:27017" \
  --db=hospital_db \
  --drop \
  dump/hospital_db
`

**Step 4 - Update your env**

`
DATABASE_URL=mongodb://localhost:27017/hospital_db
`

---

## 6. Create the First Admin User

Admin users from the source system are already inside the dump.
To create a fresh admin on a new database:

`ash
node scripts/create-hospital-admin.js
`

Follow the prompts to set email, password, and name.


---

## 7. Production Deployment (Ubuntu / EC2)

### 7.1 - Server setup

`ash
# Install Node via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Yarn and PM2
npm install -g yarn pm2

# MongoDB 6.0
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org mongodb-database-tools
sudo systemctl enable mongod
sudo systemctl start mongod
`

### 7.2 - Deploy the app

`ash
# Copy project to server
scp -r pathbyte-backend-hospital user@your-server:/var/www/hospital-backend

# On the server
cd /var/www/hospital-backend
yarn install --frozen-lockfile

cp config/environments/.env.example config/environments/.env.production
nano config/environments/.env.production   # fill in all values

yarn build

pm2 start dist/server.js --name hospital-api
pm2 save
pm2 startup   # run the printed command to survive reboots
`

### 7.3 - Restore dump on the server

`ash
scp mongodb-hospital-dump.tar.gz user@your-server:/tmp/

# On the server
cd /tmp
tar -xzf mongodb-hospital-dump.tar.gz
mongorestore --uri="mongodb://localhost:27017" --db=hospital_db --drop dump/hospital_db
`

### 7.4 - Useful PM2 commands

`ash
pm2 status                  # Show all processes
pm2 logs hospital-api       # Tail logs
pm2 restart hospital-api    # Restart after a config change
pm2 stop hospital-api       # Stop
pm2 delete hospital-api     # Remove from PM2
`

---

## 8. Nginx Reverse Proxy

`ash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/hospital-api
`

Paste this config (replace api.yourdomain.com with your actual domain):

`
ginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`

`ash
sudo ln -s /etc/nginx/sites-available/hospital-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Free SSL via Certbot
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
`

After SSL is active update .env.production:

`
COOKIE_SECURE=true
COOKIE_DOMAIN=.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
`

Then: pm2 restart hospital-api


---

## 9. Taking a New MongoDB Backup

`ash
# Development
node scripts/backupMongoDB.js

# Production
node scripts/backupMongoDB.js --env=production

# Keep local copy after upload
node scripts/backupMongoDB.js --no-cleanup

# Custom signed URL expiry (seconds)
node scripts/backupMongoDB.js --expiry=3600
`

Requires mongodump in PATH and these env vars set:
DATABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_NAME

---

## 10. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| NODE_ENV | Yes | development or production |
| PORT | Yes | Port the server listens on, e.g. 3000 |
| DATABASE_URL | Yes | MongoDB connection string |
| JWT_ACCESS_SECRET | Yes | Secret for signing access tokens |
| JWT_REFRESH_SECRET | Yes | Secret for signing refresh tokens |
| JWT_ACCESS_TTL | No | Access token lifetime, default 15m |
| JWT_REFRESH_TTL | No | Refresh token lifetime, default 7d |
| ALLOWED_ORIGINS | Yes | Comma-separated allowed CORS origins |
| COOKIE_SECURE | No | Set true in production (requires HTTPS) |
| COOKIE_DOMAIN | No | Cookie domain, e.g. .yourdomain.com |
| HOSPITAL_NAME | No | Display name used in PDFs and WhatsApp |
| HOSPITAL_VISIT_PREFIX | No | Prefix for OPD visit IDs, e.g. OPD |
| HOSPITAL_DAYCARE_PREFIX | No | Prefix for daycare IDs, e.g. DC |
| HOSPITAL_IPD_PREFIX | No | Prefix for IPD IDs, e.g. IPD |
| HOSPITAL_LOGO_PATH | No | Absolute path to hospital logo file |
| HOSPITAL_LOGO_EXT | No | png or jpeg |
| SYSTEM | No | Set to pagia for Pagia-specific behaviour |
| AWS_REGION | No | AWS region for S3, e.g. ap-south-1 |
| AWS_ACCESS_KEY_ID | No | AWS access key (for file uploads) |
| AWS_SECRET_ACCESS_KEY | No | AWS secret key (for file uploads) |
| S3_BUCKET_NAME | No | S3 bucket for patient document uploads |
| S3_SIGNED_URL_EXPIRES | No | Signed URL expiry in seconds, default 3600 |
| ICD_CLIENT_ID | No | WHO ICD-11 API client ID |
| ICD_CLIENT_SECRET | No | WHO ICD-11 API client secret |
| KYI_SMS_API_KEY | No | SMS gateway API key |
| KYI_SMS_API_URL | No | SMS gateway endpoint URL |
| KYI_SMS_SENDER_ID | No | SMS sender ID |
| WHATSAPP_MESSAGING | No | Set false to disable WhatsApp notifications |
| phoneNumberId | No | Meta WhatsApp Cloud API phone number ID |
| accessToken | No | Meta WhatsApp Cloud API access token |
| PAGIA_WHATSAPP_API_KEY | No | Pagia-specific WhatsApp API key |

---

## API Base URL

All hospital endpoints: /api/v1/hospital/

| Route | Description |
|-------|-------------|
| POST /api/v1/hospital/auth/login | Hospital user login |
| POST /api/v1/hospital/auth/refresh | Refresh access token |
| GET  /api/v1/hospital/patients | List patients |
| GET  /api/v1/hospital/visits | OPD visits |
| GET  /api/v1/hospital/ipd | IPD admissions |
| GET  /api/v1/hospital/daycare-appointments | Daycare |
| GET  /api/v1/hospital/dialysis-sessions | Dialysis |
| GET  /api/v1/hospital/xray-sessions | X-ray |
| GET  /api/v1/hospital/transactions | Billing |
| GET  /api/v1/hospital/dashboard | Dashboard stats |
| GET  /api/v1/hospital/medicines | Medicine search |
| GET  /api/v1/hospital/icd | ICD-11 diagnosis codes |
| GET  /status | Health check |

---
