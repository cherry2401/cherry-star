# Auto-Like System Architecture

## Overview
Auto-Like là nền tảng mua dịch vụ **Facebook & TikTok** (like, comment, follow, views...) thông qua BaoStar API. Xây dựng bằng React + Node.js + SQLite.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (Dark theme, glassmorphism) |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| External API | BaoStar API (proxy qua backend) |

## Architecture Diagram
```mermaid
graph TB
    subgraph Frontend["Frontend (Vite + React)"]
        App[App.tsx] --> Layout[Layout.tsx]
        Layout --> Header[Header.tsx]
        Layout --> Sidebar[Sidebar.tsx - Collapsible]
        Layout --> Pages[Pages]
        Pages --> Dashboard[Dashboard]
        Pages --> ServicePage[ServicePage - FB/TikTok]
        Pages --> OrderHistory[OrderHistory]
        Pages --> AccountPage[AccountPage]
        Pages --> DepositPage[DepositPage]
        Pages --> AdminPage[AdminPage]
    end

    subgraph Backend["Backend (Express)"]
        Server[index.ts] --> AuthRoutes[/auth/*]
        Server --> APIRoutes[/api/*]
        Server --> AdminRoutes[/admin/*]
        AuthRoutes --> JWT[JWT Middleware]
        APIRoutes --> BaoStarProxy[BaoStar Proxy]
    end

    subgraph External["External"]
        BaoStar[BaoStar API]
    end

    Frontend -->|HTTP/REST| Backend
    BaoStarProxy -->|HTTPS| BaoStar
    Backend -->|SQLite| DB[(database.db)]
```

## Key Modules

### Frontend (`src/`)
- **`contexts/AuthContext.tsx`** — JWT auth state, login/logout/register
- **`services/api.ts`** — Axios instance with JWT interceptor
- **`pages/ServicePage.tsx`** — 2-column layout: order form + sidebar (account info + package notes). Supports both Facebook and TikTok services with tabbed order history.
- **`pages/Dashboard.tsx`** — Stats grid + services grid
- **`pages/AccountPage.tsx`** — 3 tabs: Profile, Change Password, Statistics
- **`pages/AdminPage.tsx`** — Admin panel with platform-specific pricing configuration (Facebook, TikTok, All)
- **`components/Sidebar.tsx`** — Collapsible service sections with expand/collapse functionality
- **`config/services.ts`** — Service configuration for **Facebook (10 services)** and **TikTok (8 services)** with field definitions and endpoints

### Backend (`server/`)
- **`routes/auth.ts`** — Register, login, /me, profile update, password change
- **`routes/orders.ts`** — Buy service (balance check), order logs, stats
- **`routes/admin.ts`** — Admin user management, balance adjustment
- **`middleware/auth.ts`** — JWT verification middleware
- **`config.ts`** — Environment config (JWT, DB path, API domain)

### Database (SQLite)
- **`users`** — id, username, password, role, balance, display_name, email, phone
- **`transactions`** — id, user_id, type (deposit/purchase/refund/admin), amount, balance_after
- **`orders`** — id, user_id, service_id, package_name, quantity, amount, status, baostar_order_id

## Responsive Design
- **Desktop (>1024px):** Fixed sidebar 280px + main content with service page 2-col grid (form + 380px sidebar)
- **Tablet (≤1024px):** Sidebar collapses (hamburger menu), service layout single column
- **Mobile (≤640px):** Compact stats 2-col, hidden descriptions, smaller headers, service page reordered (form → notes → account)
