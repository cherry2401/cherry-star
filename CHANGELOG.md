# Changelog

## [2026-02-14] TikTok Services Integration

### Added
- **TikTok Platform Support**
  - 8 TikTok services: Like, Follow, View, Save, Comment, Share, Live, VIP Mắt
  - Service configuration in `src/config/services.ts` with appropriate field definitions
  - Backend serviceMap entries in `server/routes/services.ts` and `server/routes/admin.ts`
  - Route `/tiktok/:serviceId` in `App.tsx` reusing ServicePage component

- **Collapsible Sidebar Navigation**
  - ServiceSection component with expand/collapse functionality
  - Facebook section expanded by default, TikTok collapsed
  - ChevronDown icon with rotation animation
  - Auto-expand when navigating to service within collapsed section

- **Admin Panel Platform Filtering**
  - Platform sub-tabs in pricing config (Tất cả, Facebook, TikTok)
  - Service grouping with section headers in "Tất cả" view
  - Count badges showing services per platform

- **Per-Service Order History**
  - Order history tab in ServicePage showing service-specific orders
  - Server-side filtering by `service_id` query parameter
  - Auto-refresh after successful purchase

### Changed
- `ServicePage.tsx` now supports both Facebook and TikTok via combined service lookup
- Sidebar refactored to use reusable `ServiceSection` component
- Admin pricing uses pill-style tabs with `--accent-blue` color

### Fixed
- **Browser Tool Environment** — Set `HOME=%USERPROFILE%` via `setx` for Windows Playwright compatibility
- **Invisible Active Tab** — Replaced undefined `--accent-primary` with `--accent-blue` in pricing platform tabs CSS

---

## [2026-02-09]

### Added
- **Account Management Page** — 3 tabs: Profile (edit display name, email, phone), Change Password, Statistics
- **Service Page Sidebar** — 2-column layout with account info card and package notes
- **Total Deposits** — Shown in service sidebar account card (fetched from `/api/orders/stats`)
- **API Endpoints:**
  - `PUT /auth/profile` — Update user profile
  - `PUT /auth/password` — Change password
  - `GET /api/orders/stats` — User statistics (orders, deposits, refunds)

### Changed
- **Service Page Layout** — From single column to 2-column grid (form 1fr + sidebar 380px)
- **Package Notes** — Now rendered as HTML (`dangerouslySetInnerHTML`) instead of plain text
- **Mobile Responsive Overhaul:**
  - Dashboard stats: 2-column grid with compact card sizes
  - Service cards: hidden descriptions, 2-col grid, smaller icons
  - Header subtitle hidden on mobile
  - Service page reordered on mobile (form → notes → account)
  - Smaller headers (56px height), reduced page padding (14px)
- **JWT Config** — Changed `expiresIn` from string `'24h'` to numeric `86400` (seconds)

### Fixed
- **Layout Width** — Added `width: calc(100% - sidebar-width)` to `.main-content` to prevent content from being too narrow
- **Form Card Styling** — Added explicit `.order-form` CSS (background, border, padding, width)
- **Service Layout** — Added `max-width: 1100px` to prevent over-stretching on wide screens
