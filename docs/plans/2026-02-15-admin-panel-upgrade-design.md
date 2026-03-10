# Admin Panel Upgrade Design

## 1. Pricing: Multiplier/Percentage Toggle + Per-Package Override

**DB**: Add `package_pricing(service_id, package_name, markup)` table for per-package overrides.
`pricing_config` unchanged (still stores multiplier).

**Logic**: `sell_price = cost × (package_markup ?? service_markup ?? 1.5)`

**Frontend**: Toggle between `×1.5` and `+50%` display. Convert in frontend before API call.
Per-package: inline input in expanded package table, blank = use service default.

## 2. Chart Statistics

**Backend**: `GET /admin/stats/chart?range=7d|30d|90d` returns daily aggregated revenue, orders, deposits.

**Frontend**: `recharts` AreaChart on Stats tab. Range selector (7d/30d/90d).

## 3. Advanced Filters

Orders/Deposits tabs get filter bar: date range, status (orders), user search.
Backend accepts `?status=&from=&to=&user=` query params.

## 4. User Detail

Add `last_login_at` column to users. Update on login.
Users table shows: last login, total orders, total spent (computed via subquery).

## 5. CSV Export

`GET /admin/export/:type?format=csv` (type = users|orders|transactions).
Returns `text/csv` with BOM for Excel compatibility. Frontend: download button per tab.
