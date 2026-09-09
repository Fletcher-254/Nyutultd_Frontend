# NYUTU LIMITED ERP — Frontend

## Next.js Web Application

The frontend for the **NYUTU LIMITED ERP System**, a modern enterprise management platform built to centralize and simplify day-to-day business operations.

The application provides role-based dashboards and interfaces for managing employees, attendance, payroll, vehicles, fuel, vendors, expenses, reports, and other business operations.

The frontend is built with **Next.js, React, TypeScript, and Tailwind CSS** and communicates with a separate Django REST API backend.

---

# Overview

The NYUTU LIMITED ERP frontend is responsible for the application's user-facing experience.

It provides:

* Authentication screens
* Role-based dashboards
* Responsive navigation
* Employee management interfaces
* Attendance interfaces
* Payroll interfaces
* Vehicle management
* Fuel management
* Vendor management
* Expense management
* Reports
* User management
* Role-based navigation
* API integration
* Form handling
* Loading and error states
* Responsive desktop and mobile layouts

The frontend does not directly communicate with the database.

All business data is retrieved and modified through the Django REST API.

---

# Architecture

```text id="f7k4j2"
                    ┌──────────────────────────┐
                    │      NYUTU ERP Frontend  │
                    │                          │
                    │ Next.js + React + TS     │
                    │                          │
                    │        Vercel            │
                    └────────────┬─────────────┘
                                 │
                                 │ HTTPS
                                 │ REST API
                                 ▼
                    ┌──────────────────────────┐
                    │      Django REST API      │
                    │                          │
                    │        Render            │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │        PostgreSQL         │
                    │                          │
                    │        Render             │
                    └──────────────────────────┘
```

---

# Technology Stack

| Technology   | Purpose               |
| ------------ | --------------------- |
| Next.js      | React framework       |
| React        | User interface        |
| TypeScript   | Type-safe development |
| Tailwind CSS | Styling               |
| Lucide React | Icons                 |
| Fetch API    | Backend communication |
| App Router   | Application routing   |
| Vercel       | Production deployment |
| GitHub       | Source control        |

---

# Application Features

## Authentication

The application provides a secure login system using:

* Email authentication
* Password authentication
* HTTP-only authentication cookies
* Server-side authentication through the Django API
* Role-based redirection
* Logout functionality
* Protected application routes

Authentication tokens are **not stored in `localStorage`**.

The backend manages JWT authentication using HTTP-only cookies.

---

# Authentication Flow

```text id="s6q9y8"
Login Page
     │
     │ Email + Password
     ▼
POST /api/login/
     │
     ▼
Django Backend
     │
     │ Valid credentials
     ▼
HTTP-only authentication cookies
     │
     ▼
Frontend requests /api/me/
     │
     ▼
User role determined
     │
     ├───────────────┐
     │               │
     ▼               ▼
   Admin           Manager
     │               │
     ▼               ▼
/admin/dashboard  /manager/dashboard

                 Director
                    │
                    ▼
            /director/dashboard
```

Authenticated API requests use credentials so that the browser includes the authentication cookies.

Example:

```typescript id="4h0n2p"
fetch(`${API_URL}/me/`, {
  credentials: "include",
});
```

---

# Role-Based Access

The system currently supports three primary roles:

```text id="z7b5x9"
admin
manager
director
```

Each role receives a different level of access.

## Admin

Administrative and operational access to permitted business modules.

## Manager

Operational management access, including the modules assigned to managers.

## Director

Highest-level access to management, financial, reporting, and administrative functionality.

---

# Role-Based Routing

After authentication, users are redirected according to their role.

```text id="8z8o9n"
Admin
   └── /admin/dashboard

Manager
   └── /manager/dashboard

Director
   └── /director/dashboard
```

The frontend uses role information returned by the backend to determine the appropriate dashboard.

However, frontend routing is **not treated as a security boundary**.

The Django backend independently verifies authentication and authorization for protected API endpoints.

---

# Module Access

The application uses role-based module permissions to control which areas are displayed to each user.

Example permission structure:

| Module      | Admin | Manager | Director |
| ----------- | :---: | :-----: | :------: |
| Employees   |   ✓   |    ✓    |     ✓    |
| Attendance  |   ✓   |    ✓    |     ✓    |
| Payroll     |   —   |    —    |     ✓    |
| Expenses    |   ✓   |    —    |     ✓    |
| Vehicles    |   ✓   |    ✓    |     ✓    |
| Fuel        |   ✓   |    ✓    |     ✓    |
| Vendors     |   —   |    ✓    |     ✓    |
| Reports     |   —   |    —    |     ✓    |
| Users       |   —   |    —    |     ✓    |
| Daily Wages |   —   |    ✓    |     —    |

The exact permissions are enforced by the backend as well as reflected in the frontend interface.

---

# Dashboard Design

The application provides separate dashboards for each major role.

### Admin Dashboard

Provides administrative and operational visibility appropriate to administrators.

### Manager Dashboard

Provides operational information and tools relevant to managers.

### Director Dashboard

Provides broader business oversight, including higher-level management, financial, and reporting functionality.

The dashboards are designed to avoid unnecessary duplication and keep frequently used functionality accessible through the primary navigation.

---

# Application Modules

The frontend provides interfaces for several ERP modules.

### Employees

Manage employee information and employment records.

### Attendance

View and manage employee attendance.

### Payroll

Access payroll functionality and wage-related information according to user permissions.

### Vehicles

Manage company vehicles and fleet information.

### Fuel

Manage fuel transactions and fuel reports.

### Vendors

Manage vendor information.

### Expenses

Manage business expenses.

### Reports

Provide business reporting functionality for authorized users.

### Users

Manage system users and roles where authorized.

### Daily Wages

Provide daily wage functionality for authorized managers.

---

# Project Structure

```text id="p9u4b1"
frontend/
│
├── app/
│   │
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   └── ...
│   │
│   ├── manager/
│   │   ├── dashboard/
│   │   └── ...
│   │
│   ├── director/
│   │   ├── dashboard/
│   │   └── ...
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── ...
│
├── components/
│   ├── ui/
│   └── ...
│
├── public/
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── .gitignore
└── README.md
```

The exact structure may evolve as additional modules and shared components are introduced.

---

# Environment Variables

The frontend communicates with the Django API using an environment variable.

```env id="d0k7w5"
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production, this should point to the deployed backend API.

Example:

```env id="n4y8o2"
NEXT_PUBLIC_API_URL=<production-api-url>/api
```

Environment-specific values should be configured through the deployment platform rather than committed to Git.

---

# Local Development

## 1. Clone the repository

```bash id="w0z1xb"
git clone <repository-url>
cd <frontend-directory>
```

---

## 2. Install dependencies

```bash id="x6k3v8"
npm install
```

---

## 3. Configure the API

Create a local environment file:

```text id="b6j9q3"
.env.local
```

Add:

```env id="5n7w1z"
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 4. Start the development server

```bash id="q2t6h8"
npm run dev
```

The application will normally be available at:

```text id="c4p7y1"
http://localhost:3000
```

---

# Production Build

Before deploying, verify that the production build succeeds.

```bash id="v9m3k5"
npm run build
```

To start the production application locally:

```bash id="j8r2w6"
npm start
```

---

# Code Quality

The project uses TypeScript to reduce runtime errors and improve development reliability.

When making changes:

* Keep components focused
* Avoid unnecessary duplication
* Use TypeScript interfaces/types where appropriate
* Reuse shared UI components
* Keep API calls consistent
* Handle loading states
* Handle API errors
* Protect authenticated pages
* Respect role permissions
* Avoid storing sensitive authentication data in browser storage

---

# API Integration

The frontend communicates with the Django backend through REST endpoints.

The base API URL is controlled through:

```text id="k5r0y7"
NEXT_PUBLIC_API_URL
```

Example request:

```typescript id="q1e6w3"
const response = await fetch(`${API_URL}/employees/list/`, {
  credentials: "include",
});
```

For authenticated requests, `credentials: "include"` is important because authentication is handled through HTTP-only cookies.

---

# Handling Authentication

The frontend should not attempt to read the JWT directly from JavaScript.

Instead, authentication is determined by communicating with the backend.

Typical authentication check:

```text id="m8v2s4"
Frontend
   │
   ▼
GET /api/me/
   │
   ├── 200 → User authenticated
   │
   └── 401 → User not authenticated
```

This allows the backend to remain responsible for authentication validation.

---

# Logout

Logout is performed through the backend rather than simply deleting a token from browser storage.

```text id="h7p4c1"
Frontend
   │
   ▼
POST /api/logout/
   │
   ▼
Backend clears authentication cookies
   │
   ▼
Frontend redirects to login
```

---

# Error Handling

The frontend should handle common API responses appropriately.

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| 200    | Successful request                       |
| 201    | Resource created                         |
| 204    | Successful request with no response body |
| 400    | Invalid request                          |
| 401    | Authentication required/expired          |
| 403    | Insufficient permissions                 |
| 404    | Resource not found                       |
| 500    | Backend/server error                     |

For example, a `401` response should normally result in the application treating the session as unauthenticated rather than displaying protected content.

---

# Responsive Design

The application is designed to work across:

* Desktop
* Laptop
* Tablet
* Mobile devices

The dashboard layout uses responsive navigation and adaptive content areas to maintain usability across screen sizes.

---

# UI Design Principles

The application follows a clean business-oriented interface.

Key principles include:

* Clear visual hierarchy
* Consistent spacing
* Minimal unnecessary cards
* Avoidance of duplicated information
* Role-specific navigation
* Responsive layouts
* Clear status indicators
* Accessible interactive controls
* Consistent iconography
* Focused dashboards

The goal is to present operational information without unnecessarily cluttering the interface.

---

# Routing

The application uses the Next.js App Router.

Examples:

```text id="x4k8p2"
/                         → Login
/admin/dashboard          → Admin dashboard
/manager/dashboard        → Manager dashboard
/director/dashboard       → Director dashboard
```

Additional routes are organized within their respective role and module directories.

---

# Deployment

The frontend is deployed using **Vercel**.

The deployment flow is:

```text id="r7v2n9"
Developer
   │
   │ git push
   ▼
GitHub
   │
   ▼
Vercel
   │
   ├── Install dependencies
   ├── Build Next.js application
   └── Deploy
   │
   ▼
Production Frontend
   │
   │ HTTPS
   ▼
Django REST API
```

---

# Vercel Environment Configuration

The following environment variable must be configured in the Vercel project:

```text id="e5w1z6"
NEXT_PUBLIC_API_URL
```

The value should point to the production Django API.

After changing environment variables, a new deployment may be required for the updated value to be included in the application build.

---

# Deployment Checklist

Before deploying:

### Frontend

* [ ] `npm install` succeeds
* [ ] TypeScript errors resolved
* [ ] `npm run build` succeeds
* [ ] Production API URL configured
* [ ] Login works
* [ ] Logout works
* [ ] Role-based redirects work
* [ ] Protected routes behave correctly
* [ ] API requests include credentials
* [ ] No authentication tokens are stored in `localStorage`

### Backend

* [ ] Django API is running
* [ ] Database is available
* [ ] Migrations are applied
* [ ] CORS allows the frontend origin
* [ ] CSRF trusted origins are configured
* [ ] Authentication cookies are configured for production
* [ ] Required environment variables are present

---

# Development Workflow

Recommended workflow:

```text id="c8q5m2"
Create feature
     ↓
Develop locally
     ↓
Run npm run build
     ↓
Test against local API
     ↓
Commit changes
     ↓
Push to GitHub
     ↓
Vercel deployment
     ↓
Test production
```

Use descriptive commit messages.

Examples:

```bash id="u3f7n1"
git commit -m "Redesign manager dashboard"
```

```bash id="w6k2p8"
git commit -m "Add employee management interface"
```

```bash id="r4m9c5"
git commit -m "Fix production authentication flow"
```

```bash id="t8x1q6"
git commit -m "Improve admin dashboard layout"
```

---

# Security

The frontend follows several security principles.

### No JWT in localStorage

Authentication tokens are not intentionally stored in `localStorage`.

### HTTP-only cookies

Authentication is handled using HTTP-only cookies issued by the backend.

### Backend authorization

The frontend's role-based navigation is for user experience.

The backend independently validates permissions.

### HTTPS

Production communication should use HTTPS.

### Environment variables

Environment-specific configuration should not be hardcoded into application code.

### No secrets in source control

Never commit:

```text id="k9b3d7"
.env
.env.local
API keys
database credentials
private tokens
authentication secrets
```

---

# Troubleshooting

## "Your session has expired"

Check:

1. Whether the backend is reachable.
2. Whether `/api/me/` returns `401`.
3. Whether the browser received the authentication cookies.
4. Whether requests use:

```typescript id="s3n8v5"
credentials: "include"
```

5. Whether backend CORS allows the frontend origin.
6. Whether production cookies use HTTPS-compatible settings.

---

## API Returns 401

A `401` usually means the backend did not receive or accept the authentication credentials.

Check the browser's Network tab and inspect the request/response cookies.

Also verify the backend's authentication configuration.

---

## API Returns 403

A `403` generally means authentication succeeded but the current user does not have permission to access the requested resource.

Check:

* User role
* Backend permission class
* Frontend module permissions
* Requested API endpoint

---

## Page Takes Too Long to Load

Check:

* Browser Network tab
* `/api/me/` request
* Backend response time
* Render service status
* Database queries
* Console errors
* Failed API requests

Avoid repeatedly requesting `/api/me/` when a single authenticated user check can be reused.

---

# Performance Considerations

As the application grows, performance should be maintained through:

* Reusable components
* Efficient API requests
* Appropriate memoization
* Avoiding unnecessary re-renders
* Server/client component separation where appropriate
* Pagination for large datasets
* Lazy loading where beneficial
* Optimized images
* Minimal duplicated API calls

---

# Future Improvements

Potential frontend improvements include:

* Centralized API client
* Automatic access-token refresh
* Global authentication provider
* More granular permission handling
* Advanced data tables
* Search and filtering
* Pagination
* Export functionality
* Notifications
* Real-time dashboard updates
* Improved accessibility
* Progressive Web App support
* More advanced analytics
* Automated frontend testing
* End-to-end testing

---

# Related Backend

The frontend depends on the NYUTU LIMITED ERP Django REST API.

The backend is responsible for:

* Authentication
* Authorization
* Business logic
* Data validation
* Database operations
* Data integrity
* REST API responses

The frontend is responsible for:

* User interface
* Navigation
* Forms
* Dashboard presentation
* Client-side interaction
* API consumption

This separation allows the frontend and backend to be developed and deployed independently.

---

# Project Status

**Status:** Production Deployment / Active Development

The Next.js frontend is deployed as the user-facing application for the NYUTU LIMITED ERP system.

The application is actively being developed and expanded as additional ERP functionality is implemented.

---

# Ownership

**NYUTU LIMITED ERP**

Proprietary software developed for NYUTU LIMITED.

Unauthorized copying, redistribution, modification, or commercial use is prohibited without authorization from the software owner.

---

# Frontend Summary

```text id="y4n7c2"
Framework       Next.js
UI              React
Language        TypeScript
Styling         Tailwind CSS
Icons           Lucide React
Routing         Next.js App Router
Authentication  HTTP-only JWT cookies
API             Django REST Framework
Deployment      Vercel
Source Control  GitHub
```

**NYUTU LIMITED ERP — Frontend**

A modern, role-based enterprise interface for managing and monitoring business operations.