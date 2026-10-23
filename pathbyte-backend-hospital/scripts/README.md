# Scripts

This directory contains utility scripts for database maintenance, migrations, and administrative tasks.

## ABHA Patient Cleanup

### cleanup-duplicate-abha-patients.js

Cleans up duplicate ABHA patient records that may have been created due to inconsistent lookup methods in earlier versions.

**When to use:**
- After upgrading to the version with duplicate cleanup fixes
- If you suspect duplicate ABHA patient records exist
- As part of database maintenance

**Usage:**
```bash
# Build the TypeScript project first
npm run build

# Run the cleanup script
node scripts/cleanup-duplicate-abha-patients.js
```

**What it does:**
1. Scans for all ABHA numbers with duplicate records
2. Merges duplicates, keeping the oldest document as the "winner"
3. Updates all cross-references (HMS patients, Pathlab patients, care contexts)
4. Deletes stale duplicate documents
5. Verifies no duplicates remain

**See also:** `docs/ABHA_DUPLICATE_CLEANUP.md` for detailed documentation

## Other Scripts Documentation

This folder contains utility scripts for database management and admin user creation.

## Available Scripts

### 1. Create Pathlab Admin

Creates an admin user for the pathlab system with full permissions.

```bash
npm run create-pathlab-admin
# or
yarn create-pathlab-admin
```

The script will prompt you for:
- Admin email (required)
- Password (min 8 characters, required)
- Full name (required)
- First name (optional)
- Last name (optional)
- Phone number (optional)
- Gender (Male/Female/Other, optional)

**Login endpoint:** `POST /api/v1/auth/login`

### 2. Create Hospital Admin

Creates an admin user for the hospital management system.

```bash
npm run create-hospital-admin
# or
yarn create-hospital-admin
```

The script will prompt you for:
- Admin email (required)
- Password (min 8 characters, required)
- Full name (required)
- Phone number (optional)

**Login endpoint:** `POST /api/v1/hospital/auth/login`

### 3. Add Dashboard Indexes

Adds performance indexes to MongoDB collections for optimized dashboard queries.

```bash
npm run add-dashboard-indexes
# or
yarn add-dashboard-indexes
```

This script will:
- Create indexes on `casetests`, `cases`, `transactions`, and `patients` collections
- Improve dashboard API performance by 50-70%
- Reduce revenue statistics API response time from 7-13s to 2-4s

**Note:** This is a one-time operation. Safe to run multiple times (will skip existing indexes).

## Prerequisites

- MongoDB connection must be configured in `config/environments/.env.development`
- The `DATABASE_URL` environment variable must be set
- Node.js and npm/yarn installed

## Notes

- Both admin scripts will check if an admin already exists before creating a new one
- If an admin exists, the script will display their details and exit
- The pathlab admin script will automatically create an "Admin" role if it doesn't exist
- All passwords are hashed using bcrypt before storage
- The index script is safe to run on production databases (non-blocking operation)
