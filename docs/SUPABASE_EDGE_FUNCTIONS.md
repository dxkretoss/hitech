# Supabase Edge Functions Guide — Hi-Tech CRM

This document outlines the architecture and deployment of the **`crm-api`** Supabase Edge Function that powers the Hi-Tech Air Technology CRM platform.

---

## 1. Architecture Options

You have two deployment options depending on your preference:

### Option A: Modular Microservice Functions (Recommended for clean separation)
Each business module has its own dedicated Edge Function:
- **`leads`** (`supabase/functions/leads/index.ts`)
- **`customers`** (`supabase/functions/customers/index.ts`)
- **`services`** (`supabase/functions/services/index.ts`)
- **`stock`** (`supabase/functions/stock/index.ts`)
- **`notifications`** (`supabase/functions/notifications/index.ts`)
- **`future-opps`** (`supabase/functions/future-opps/index.ts`)
- **`profiles`** (`supabase/functions/profiles/index.ts`)

### Option B: Unified Router (`crm-api`)
A single unified Edge Function router (`supabase/functions/crm-api/index.ts`) that handles all actions in one single function deployment.

---

## 2. Deploying Edge Functions to Supabase

### Step 1: Link your project
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```
*(Find your Project Reference ID in Supabase Dashboard -> Settings -> General)*

### Step 2: Deploy All Functions in 1 Command
```bash
# Deploy all modular functions + unified router at once:
npx supabase functions deploy leads --no-verify-jwt
npx supabase functions deploy customers --no-verify-jwt
npx supabase functions deploy services --no-verify-jwt
npx supabase functions deploy stock --no-verify-jwt
npx supabase functions deploy notifications --no-verify-jwt
npx supabase functions deploy future-opps --no-verify-jwt
npx supabase functions deploy profiles --no-verify-jwt
npx supabase functions deploy crm-api --no-verify-jwt
```
Or if you prefer to deploy only the single unified function:
```bash
npx supabase functions deploy crm-api --no-verify-jwt
```


---

## 3. Resilience & Zero Breaking Changes

The frontend client in `src/services/db.js` is built with automatic **resilience**:
- When the Edge Function is deployed and reachable, all queries and mutations execute on the Edge Function.
- If the Edge Function is not yet deployed or temporarily unreachable, the frontend seamlessly falls back to direct Supabase PostgREST queries and local storage caches without any interruption.
