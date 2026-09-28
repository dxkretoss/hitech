---
name: hitech-crm
description: >
  Comprehensive reference skill for the Hi-Tech Air Technology Pvt Ltd CRM (hi-tech-v2).
  Covers project architecture, all modules, DB layer, auth patterns, UI conventions,
  routing structure, and important rules for adding features or debugging.
  Activate this skill when working on any task in the hi-tech-v2 workspace.
---

# Hi-Tech Air Technology CRM — Project Skill Reference

## 1. Project Overview

**Hi-Tech Air Technology Pvt Ltd CRM MVP** is a multi-branch, role-based CRM for a Gujarat-based industrial air compressor company.

| Attribute | Value |
|---|---|
| App Name | Hi-Tech Air Technology CRM |
| Framework | React 19 + Vite 6 |
| Styling | TailwindCSS v3 (brand color `#3B318A`) |
| Backend | Supabase (PostgreSQL + Auth) |
| Deployment | Netlify |
| Dev Command | `npm run dev` |
| Build Command | `npm run build` |

**Branches operated:** Surat · Morbi · Rajkot

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 (JSX) |
| Bundler | Vite 6 |
| Styling | TailwindCSS 3 + `clsx` |
| Backend/DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth + custom cookie token |
| Icons | `lucide-react` |
| Toast Notifications | `sonner` |
| Phone Input | `react-phone-input-2` |
| Routing | `react-router-dom` v7 |
| Cookie Management | `js-cookie` |

### Key Environment Variables (`.env`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> If env vars are missing or set to placeholder values, the app runs in **local mode** with localStorage fallback and mock data. Check `isSupabaseConfigured()` in `src/services/supabase.js`.

---

## 3. Directory Structure

```
d:\hi-tech-v2\
├── .env                        # Real Supabase credentials (gitignored)
├── .env.example                # Template for credentials
├── index.html                  # HTML entry (Inter font, brand color body)
├── vite.config.js
├── tailwind.config.js          # Brand color tokens: brand.500 = #3B318A
├── netlify.toml                # Netlify SPA redirect config
├── supabase_setup.sql          # Full DB schema + RLS + seed data — run in Supabase SQL editor
├── seed.js                     # Node.js seed script for initial DB data
└── src/
    ├── main.jsx                # ReactDOM.createRoot entry
    ├── App.jsx                 # BrowserRouter -> AuthProvider -> AppRoutes -> Toaster
    ├── index.css               # Tailwind directives + Inter font + phone input overrides
    ├── assets/
    │   └── logo.png            # Company logo used in sidebar
    ├── contexts/
    │   └── AuthContext.jsx     # Global auth state, useAuth() hook
    ├── routes/
    │   ├── AppRoutes.jsx       # All route definitions
    │   ├── ProtectedRoute.jsx  # Requires cookie + currentUser
    │   └── AdminRoute.jsx      # Requires Owner/SuperAdmin/Admin role
    ├── services/
    │   ├── supabase.js         # Supabase client + isSupabaseConfigured()
    │   ├── authService.js      # registerUser, loginUser, loginAdmin, logoutUser, getCurrentSessionUser
    │   ├── cookieService.js    # setAuthCookie, getAuthCookie, removeAuthCookie
    │   └── db.js               # SupabaseDatabase class — ALL CRUD operations (exported as `db`)
    ├── utils/
    │   └── sanitize.js         # sanitizeEmail, sanitizePassword, sanitizeText
    ├── mock/
    │   └── mockData.js         # Static mock data (used in some pages for fallback)
    ├── pages/
    │   ├── LoginPage.jsx       # Sales/Engineer login + signup
    │   ├── AdminLoginPage.jsx  # Owner/Admin login
    │   ├── DashboardPage.jsx   # Sales/Engineer dashboard
    │   ├── AdminDashboardPage.jsx  # Owner analytics dashboard
    │   ├── LeadsPage.jsx       # Lead management (CRUD, convert, mark lost)
    │   ├── FutureOpportunitiesPage.jsx  # Deferred lead vault (Admin only)
    │   ├── CustomersPage.jsx   # Customer list (Admin only)
    │   ├── CustomerDetailPage.jsx  # Individual customer + service history
    │   ├── TeamPage.jsx        # Team Members & Staff Directory (Engineers & Sales tabs, Admin only)
    │   ├── ServicesPage.jsx    # Field engineer service management
    │   ├── StockPage.jsx       # Branch-wise inventory management
    │   ├── NotificationsPage.jsx
    │   └── ProfilePage.jsx
    └── components/
        ├── layout/
        │   ├── AppLayout.jsx   # Sidebar + Header shell wrapper (uses Outlet)
        │   ├── Sidebar.jsx     # Collapsible nav sidebar with role-filtered items
        │   └── Header.jsx      # Top bar with hamburger menu, notifications, user avatar
        ├── admin/
        │   └── AdminAnalyticsCharts.jsx  # Charts for admin dashboard
        ├── common/
        │   └── DataPrivacyShield.jsx     # Data masking for sensitive info
        ├── services/
        │   ├── CompleteServiceModal.jsx  # Engineer service completion form
        │   ├── NewInstallationModal.jsx  # Add new customer/installation
        │   └── ScheduleServiceModal.jsx  # Schedule upcoming service
        ├── stock/
        │   ├── AddStockItemModal.jsx
        │   ├── AdjustStockModal.jsx
        │   └── TransferStockModal.jsx
        └── ui/
            ├── Badge.jsx       # Status/category badges
            ├── Button.jsx      # Reusable button with variants
            ├── Card.jsx        # Simple card wrapper
            ├── ConfirmModal.jsx
            ├── CustomSelect.jsx
            ├── Input.jsx       # Input + Textarea components
            ├── Modal.jsx       # Portal-based modal with backdrop
            └── Table.jsx
```

---

## 4. Authentication & Roles

### User Roles
| Role | Access |
|---|---|
| `Sales` | Dashboard, Leads, Stock, Notifications, Profile |
| `Engineer` | Dashboard, Services, Stock, Notifications, Profile |
| `Owner` / `SuperAdmin` / `Admin` | All routes including Admin Dashboard, Future Opportunities, Customers |

### Auth Flow
1. User logs in via `LoginPage` (Sales/Engineer) or `AdminLoginPage` (Owner).
2. `authService.loginUser()` / `authService.loginAdmin()` calls Supabase Auth.
3. JWT token stored in a **cookie** (`hitech_auth_token`, 7 days) via `cookieService.js`.
4. User object stored in **localStorage** (`hitech_v2_user`).
5. `AuthContext` initializes from localStorage on mount, then re-validates with Supabase session.
6. `ProtectedRoute` checks for cookie + `currentUser` before rendering.
7. `AdminRoute` additionally checks `isSuperAdminUser(currentUser)` (Owner/SuperAdmin/Admin roles).

### `useAuth()` Hook — available values
```js
const {
  currentUser,  // { id, name, email, role, branch, avatar }
  role,         // 'Sales' | 'Engineer' | 'Owner' | 'SuperAdmin' | 'Admin'
  branch,       // 'Surat' | 'Morbi' | 'Rajkot'
  loading,
  isConfigured, // boolean — is Supabase configured?
  signup, login, adminLogin,
  switchRole,   // for dev/testing role switching
  switchBranch, // for dev/testing branch switching
  logout
} = useAuth();
```

### Super Admin Fallback Credentials (hardcoded for dev/demo)
- Email: `admin@hitechair.in`
- Password: `ur0zEmoHAapzu4D9l`

---

## 5. Database Layer (`src/services/db.js`)

All database operations go through the **singleton `db` object** exported from `db.js`.

```js
import { db } from '../services/db.js';
```

The `SupabaseDatabase` class always:
1. **Tries Supabase first** (if configured).
2. **Falls back to localStorage** with hardcoded fallback data.
3. **Writes to both** localStorage and Supabase on mutations.

### Available Methods

#### Leads
```js
db.getLeads()                         // Lead[]
db.addLead(lead, currentUser)         // Lead
db.updateLead(id, updated)            // void
db.deleteLead(id)                     // void
db.markLeadAsLost(id, {lossReason, lossRemark}) // void
db.convertLeadToCustomer(leadId, assignedEngineer) // Customer (creates initial service)
db.saveLeadToFutureOpportunity(leadId, expectedMonth, reminderDate) // FutureOpp
```

#### Future Opportunities
```js
db.getFutureOpportunities()           // FutureOpp[]
db.addFutureOpportunity(opp, currentUser) // FutureOpp
db.deleteFutureOpportunity(id)        // void
```

#### Customers
```js
db.getCustomers()                     // Customer[]
db.getCustomerById(id)                // Customer | null
db.deleteCustomer(id)                 // void (also deletes linked services)
db.addCustomerSale(saleData, currentUser) // Customer (creates initial service)
```

#### Services
```js
db.getServices()                      // Service[]
db.getServicesByCustomer(customerId)  // Service[]
db.completeService(serviceId, report) // Service (auto-creates next service if nextServiceDate set)
db.addService(serviceData)            // Service
db.updateServiceStatus(serviceId, newStatus) // void
db.generateInitialServiceForCustomer(customer, customServiceDate) // Service[]
```

#### Stock / Inventory
```js
db.getStockItems()                    // StockItem[]
db.addStockItem(item)                 // StockItem
db.updateStockItem(id, updated)       // void
db.adjustStockQuantity(id, {adjustmentType, quantity, reason, notes}) // StockItem
  // adjustmentType: 'ADD' | 'DEDUCT' | 'SET'
db.transferStock(id, {fromBranch, toBranch, quantity, notes}) // boolean
db.deleteStockItem(id)                // void
```

#### Profiles & Admin Analytics
```js
db.getProfiles()                      // Profile[]
db.getSalesPerformanceSummary()       // SalesRepSummary[]
```

#### Notifications
```js
db.getNotifications()                 // Notification[]
db.deleteNotification(id)             // void
db.clearAllNotifications()            // void
```

### localStorage Keys
| Key | Purpose |
|---|---|
| `hitech_v2_user` | Persisted current user object |
| `hitech_v2_leads` | Leads cache |
| `hitech_v2_customers` | Customers cache |
| `hitech_v2_future_opps` | Future opportunities cache |
| `hitech_v2_services` | Services cache |
| `hitech_v2_stock_items` | Stock items cache |
| `hitech_v2_notifications` | Notifications cache |

---

## 6. Database Schema (Supabase Tables)

Run `supabase_setup.sql` in the Supabase SQL Editor to initialize.

| Table | Key Columns |
|---|---|
| `profiles` | id (UUID), name, email, role (Sales/Engineer/Owner/Admin), branch, can_view_stock (BOOLEAN) |
| `leads` | id (TEXT), customer_name, company, phone, branch, lead_type, interested_product, requirement, status, loss_reason, loss_remark, loss_date, follow_up_date, sales_person_id, sales_person_name |
| `future_opportunities` | id (TEXT), customer_name, company, phone, branch, requirement, expected_purchase_month, reminder_date, notes, sales_person_id, sales_person_name |
| `customers` | id (TEXT), customer_name, company, phone, branch, purchased_product, installation_date, assigned_engineer, address, sales_person_id, sales_person_name |
| `services` | id (TEXT), customer_id (FK->customers), customer_name, company, branch, product, service_name, scheduled_date, status (Upcoming/Completed), assigned_engineer, work_done, parts_replaced, completion_date, next_service_date, engineer_notes |
| `stock_items` | id (TEXT), item_name, category (Machine/Spare Part), part_number, branch, quantity, unit, min_alert_level, annual_consumption, unit_price, compatible_models, last_restocked_date |

### RLS Policy
All tables use `USING (true)` public access policies (suitable for internal company-only app).

### Auto-trigger
`handle_new_user()` trigger fires on `auth.users` insert -> auto-inserts into `profiles`.

---

## 7. Data Flow Patterns

### Lead -> Customer Conversion
```
Lead (status: 'New'/'In Progress')
  -> db.convertLeadToCustomer(leadId, engineerName)
  -> Lead status set to 'Won'
  -> New Customer created
  -> Initial Service (#1 Commissioning) auto-created
```

### Lead -> Future Opportunity
```
Lead (status: 'Future Requirement')
  -> db.saveLeadToFutureOpportunity(leadId, month, date)
  -> Lead status set to 'Future Requirement'
  -> New FutureOpportunity created
  -> Also triggered automatically on addLead() if status === 'Future Requirement'
```

### Service Completion Chain
```
Engineer completes service via CompleteServiceModal
  -> db.completeService(serviceId, { workDone, partsReplaced, completionDate, nextServiceDate, engineerNotes })
  -> Current service status -> 'Completed'
  -> If nextServiceDate set: new 'Upcoming' service auto-created (Service #N+1)
```

---

## 8. Routing

```
/               -> redirect -> /login
/login          -> LoginPage (Sales/Engineer)
/admin          -> AdminLoginPage (Owner)

Protected Routes (require cookie + currentUser):
  /dashboard              -> DashboardPage
  /leads                  -> LeadsPage
  /services               -> ServicesPage
  /stock                  -> StockPage
  /notifications          -> NotificationsPage
  /profile                -> ProfilePage

Admin-Only Routes (require Owner/SuperAdmin/Admin role):
  /admin/dashboard        -> AdminDashboardPage
  /admin/team             -> TeamPage (Engineers & Sales directory)
  /admin/leads            -> LeadsPage (Admin view)
  /admin/future-opportunities -> FutureOpportunitiesPage
  /admin/customers        -> CustomersPage
  /admin/customers/:id    -> CustomerDetailPage
  /admin/services         -> ServicesPage (Admin view)
  /admin/stock            -> StockPage (Admin view)
  /admin/notifications    -> NotificationsPage (Admin view)
  /admin/profile          -> ProfilePage (Admin view)

* -> redirect -> /login
```

---

## 9. UI Component Library (`src/components/ui/`)

### `Button`
```jsx
import { Button } from '../components/ui/Button.jsx';

<Button variant="primary" size="md" icon={PlusIcon} onClick={fn}>Add Lead</Button>
// variants: primary | secondary | outline | danger | success | white | amber
// sizes: sm | md | lg
```

### `Input` & `Textarea`
```jsx
import { Input, Textarea } from '../components/ui/Input.jsx';

<Input label="Customer Name" name="customerName" value={val} onChange={fn} required />
<Textarea label="Notes" name="notes" value={val} onChange={fn} rows={3} />
// Date inputs auto-set min to today
```

### `Modal`
```jsx
import { Modal } from '../components/ui/Modal.jsx';

<Modal isOpen={show} onClose={fn} title="Add Lead" maxWidth="max-w-xl">
  {/* content */}
</Modal>
// Uses createPortal -> renders into document.body
```

### `Badge`
```jsx
import { Badge } from '../components/ui/Badge.jsx';

<Badge variant="success">Won</Badge>
// variants: default | primary | success | warning | danger | info
```

### `CustomSelect`
```jsx
import { CustomSelect } from '../components/ui/CustomSelect.jsx';
// Searchable dropdown component for select fields
```

### `ConfirmModal`
```jsx
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
// Confirmation dialog before destructive actions
```

---

## 10. Brand Design System

### Primary Color
- **Brand Purple:** `#3B318A` (used as `bg-[#3B318A]`, `text-[#3B318A]`, focus rings)
- Tailwind alias: `brand-500`

### Colors in Tailwind Config
```js
colors: {
  brand: {
    50: '#F4F3FA',
    100: '#E6E4F5',
    500: '#3B318A',
    600: '#322A77',
    700: '#2A2364',
    900: '#1D1845'
  }
}
```

### Font
- **Inter** (loaded from Google Fonts, applied globally)

### Common UI Patterns
- Rounded corners: `rounded-xl` (inputs, buttons, cards)
- Card shadow: `shadow-sm` or `shadow-lg`
- Hover transitions: `transition-all duration-150`
- Active sidebar item: `bg-[#3B318A] text-white`
- Focus ring: `focus:ring-2 focus:ring-[#3B318A]`
- Background: `#F8F9FC` (body/page bg)

---

## 11. Sidebar Navigation & Role Filtering

Nav items in `Sidebar.jsx`:
| Label | Path | Visible To |
|---|---|---|
| Dashboard | `/dashboard` or `/admin/dashboard` | All |
| Leads | `/leads` | Sales, Owner, Admin |
| Future Opportunities | `/future-opportunities` | Owner/Admin only (`ownerOnly: true`) |
| Customers | `/customers` | Owner/Admin only |
| Services | `/services` | Engineer, Owner, Admin |
| Stock & Inventory | `/stock` | All roles |
| Notifications | `/notifications` | All |
| Profile | `/profile` | All |

Admin badge shown inline for `ownerOnly` items. Sidebar is collapsible (icon-only mode) on desktop, drawer on mobile.

---

## 12. Lead Data Model

```js
{
  id: 'LD-XXXX',
  customerName: string,
  company: string,
  phone: string,              // with country code
  branch: 'Surat' | 'Morbi' | 'Rajkot',
  leadType: 'Hot Lead' | 'Cold Lead',
  interestedProduct: string,
  requirement: string,
  status: 'New' | 'In Progress' | 'Won' | 'Lost' | 'Future Requirement',
  lossReason: string,         // only when status = 'Lost'
  lossRemark: string,
  lossDate: 'YYYY-MM-DD',
  followUpDate: 'YYYY-MM-DD',
  notes: string,
  salesPersonId: string,
  salesPersonName: string
}
```

---

## 13. Stock Item Data Model

```js
{
  id: 'STK-XXX-XX',
  itemName: string,
  category: 'Machine' | 'Spare Part',
  partNumber: string,         // e.g. 'HT-CMP-50HP-DD'
  branch: 'Surat' | 'Morbi' | 'Rajkot',
  quantity: number,
  unit: string,               // 'Units' | 'Sets' | 'Pails (20L)' | etc.
  minAlertLevel: number,      // triggers low-stock warning
  annualConsumption: number,
  unitPrice: number,          // in INR
  compatibleModels: string,
  lastRestockedDate: 'YYYY-MM-DD',
  notes: string
}
```

ID conventions: `STK-SRT-XX` (Surat), `STK-MRB-XX` (Morbi), `STK-RJK-XX` (Rajkot)

---

## 14. Service Data Model

```js
{
  id: 'SRV-XXXX',
  customerId: string,
  customerName: string,
  company: string,
  branch: string,
  product: string,
  serviceName: 'Service #N (Description)',
  scheduledDate: 'YYYY-MM-DD',
  status: 'Upcoming' | 'Completed',
  assignedEngineer: string,
  workDone: string,
  partsReplaced: string,
  completionDate: 'YYYY-MM-DD',
  nextServiceDate: 'YYYY-MM-DD',
  engineerNotes: string,
  notes: string
}
```

---

## 15. Seed Data & Demo Accounts

Default demo employees:
| Name | Email | Role |
|---|---|---|
| Vikram Mehta | sales@hitechair.in | Sales |
| Anita Sharma | anita.sales@hitechair.in | Sales |
| Sanjay Patel | sanjay.engineer@hitechair.in | Engineer |
| Super Admin | admin@hitechair.in | Owner |

Run `npm run seed` to populate the Supabase database with mock data.

---

## 16. Important Patterns & Rules

### Always Do
- Use `db.*` for all data access — never call `supabase` directly from pages/components.
- Use `useAuth()` to get `currentUser`, `role`, `branch`.
- Pass `currentUser` to `db.addLead()`, `db.addCustomerSale()` etc. for sales attribution.
- Use `toast.success()` / `toast.error()` from `sonner` for user feedback.
- Use the `Modal` component (portal-based) for all dialogs.
- Add `await` to all `db.*` calls — they are all async.
- Branch filter: always filter by `currentUser.branch` for Sales/Engineer; show all for Owner.

### Never Do
- Don't import `supabase` directly into pages — use `db.js` methods.
- Don't bypass `AuthContext` — never manually read localStorage for auth.
- Don't use plain `<input>` or `<button>` — use `Input`, `Textarea`, `Button` components.
- Don't add new routes without adding them to `AppRoutes.jsx` and the sidebar `navItems`.
- Don't use placeholder data for new features — hook into `db.js` methods.

### Adding a New Page
1. Create `src/pages/NewPage.jsx`
2. Add route in `src/routes/AppRoutes.jsx` (wrap in `ProtectedRoute` or `AdminRoute`)
3. Add nav item in `src/components/layout/Sidebar.jsx` `navItems` array (with role filtering)
4. Add required `db.js` methods + matching Supabase table/columns if needed

### Adding a New DB Method
1. Add method to `SupabaseDatabase` class in `src/services/db.js`
2. Follow dual-write pattern: try Supabase first, then update localStorage
3. Map snake_case DB columns -> camelCase JS object in the return value
4. Always provide a localStorage fallback array

### Supabase Column Mapping Convention
DB column (snake_case) -> JS field (camelCase):
- `customer_name` -> `customerName`
- `sales_person_id` -> `salesPersonId`
- `follow_up_date` -> `followUpDate`
- `installation_date` -> `installationDate`
- `min_alert_level` -> `minAlertLevel`

---

## 17. Vite Config & Build Notes

Netlify redirect (`netlify.toml`):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

All assets go through Vite's bundler. Logo is imported as:
```js
import logoPng from '../../assets/logo.png';
```

---

## 18. File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Pages | PascalCase + `Page.jsx` | `LeadsPage.jsx` |
| Components | PascalCase + `.jsx` | `CompleteServiceModal.jsx` |
| Services | camelCase + `.js` | `authService.js`, `db.js` |
| Utils | camelCase + `.js` | `sanitize.js` |
| CSS | `index.css` (one global file) | — |

---

## 19. Quick Troubleshooting

| Issue | Solution |
|---|---|
| App shows mock data despite Supabase configured | Check `.env` for trailing spaces; verify `isSupabaseConfigured()` returns `true` |
| Auth fails in production | Check Supabase dashboard -> Authentication -> Email Confirmations (disable for dev) |
| Admin panel inaccessible | Verify user `role` in `profiles` table is `Owner`, `Admin`, or `SuperAdmin` |
| Low stock alerts not showing | Check `quantity <= minAlertLevel` on stock items |
| Next service not auto-created | Ensure `nextServiceDate` is provided in `completeService()` report |
| Cookie not persisting | `secure: true` on HTTPS; local `http://localhost` is fine |
| Phone input styling broken | Ensure `react-phone-input-2/lib/style.css` is imported in `index.css` |
