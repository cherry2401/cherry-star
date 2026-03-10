# Full Security & Code Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Thực hiện full security + code audit theo risk-first, có xác minh runtime an toàn, và xuất báo cáo ưu tiên kèm patch gợi ý.

**Architecture:** Kế hoạch chia thành các vòng nhỏ: (1) baseline + endpoint map, (2) static audit theo authz/authn/input/business logic/migrations, (3) runtime-safe verification cho API chính, (4) tổng hợp findings theo mức độ và remediations theo thứ tự ưu tiên. Mỗi task tạo artifact rõ ràng để truy vết coverage.

**Tech Stack:** Node.js/Express, React/Vite, SQLite (better-sqlite3), JWT/bcrypt, curl/PowerShell for runtime verification.

---

### Task 1: Baseline & audit workspace setup

**Files:**
- Create: `docs/reports/audit_2026-02-27_full.md`
- Modify: `docs/reports/audit_2026-02-27_full.md:1-80`

**Step 1: Create report skeleton (failing placeholder)**

```md
# Full Security & Code Audit — 2026-02-27

## Scope
- [ ] Backend auth/admin/services/orders
- [ ] Frontend trust boundary
- [ ] DB migrations
- [ ] Runtime-safe verification

## Findings
_TODO_
```

**Step 2: Verify report file exists**

Run: `test -f docs/reports/audit_2026-02-27_full.md && echo OK`
Expected: `OK`

**Step 3: Add baseline section**

```md
## Baseline
- Environment: local dev
- Method: static review + non-destructive runtime checks
- Severity rubric: Critical/High/Medium/Low
```

**Step 4: Verify markdown structure**

Run: `grep -n "## Baseline" docs/reports/audit_2026-02-27_full.md`
Expected: one matching line

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: initialize full audit report skeleton"
```

---

### Task 2: Build endpoint + middleware map

**Files:**
- Modify: `docs/reports/audit_2026-02-27_full.md:81-170`
- Review: `server/index.ts`, `server/middleware/auth.ts`, `server/routes/auth.ts`, `server/routes/admin.ts`, `server/routes/services.ts`, `server/routes/orders.ts`

**Step 1: Write route inventory table in report**

```md
## Route Inventory
| Route | Auth | Admin | Notes |
|------|------|-------|------|
| /auth/login | No | No | Rate-limited |
```

**Step 2: Verify middleware mapping from code**

Run: `grep -n "app.use\|router\." server/index.ts server/routes/*.ts`
Expected: route declarations listed with line refs

**Step 3: Add trust-boundary notes**

```md
## Trust Boundaries
- Public: /auth/login, /api/prices, /api/convert-uid
- Auth-required: /api/orders/*, /api/user/*
- Admin-required: /admin/*
```

**Step 4: Validate no missing critical route group**

Run: `grep -n "Trust Boundaries" docs/reports/audit_2026-02-27_full.md`
Expected: section exists

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: add route inventory and trust boundaries"
```

---

### Task 3: Static audit — authn/authz and input validation

**Files:**
- Modify: `docs/reports/audit_2026-02-27_full.md:171-320`
- Review: `server/routes/auth.ts`, `server/middleware/auth.ts`, `server/routes/admin.ts`, `server/index.ts`

**Step 1: Add failing checklist placeholders**

```md
## Static Audit: Authn/Authz/Input
- [ ] JWT validation flow reviewed
- [ ] Role checks verified on admin routes
- [ ] Profile update validation reviewed
```

**Step 2: Collect concrete evidence lines**

Run: `grep -n "jwt\|authRequired\|admin\|validate\|identifier\|password" server/routes/auth.ts server/middleware/auth.ts server/routes/admin.ts`
Expected: line-level evidence candidates

**Step 3: Record findings with patch suggestions template**

```md
### Finding A-01 (High)
- Impact:
- Evidence: file:line
- Patch suggestion:
```

**Step 4: Ensure every finding has evidence + patch fields**

Run: `grep -n "Impact:\|Evidence:\|Patch suggestion:" docs/reports/audit_2026-02-27_full.md`
Expected: each finding includes all three fields

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: add static findings for auth and authorization"
```

---

### Task 4: Static audit — business logic, pricing integrity, migrations

**Files:**
- Modify: `docs/reports/audit_2026-02-27_full.md:321-520`
- Review: `server/routes/orders.ts`, `server/routes/services.ts`, `server/routes/admin.ts`, `server/database/index.ts`, `server/types.ts`

**Step 1: Add checklist for business integrity**

```md
## Static Audit: Business Logic & DB Safety
- [ ] Pricing consistency FE/BE
- [ ] Duplicate package key integrity
- [ ] Migration idempotency and data safety
```

**Step 2: Capture evidence for composite-key logic**

Run: `grep -n "original_price\|package_pricing\|hidden_packages\|ON CONFLICT" server/routes/admin.ts server/routes/services.ts server/database/index.ts`
Expected: evidence lines proving current behavior

**Step 3: Add findings for race/data consistency risks**

```md
### Finding B-01 (Medium)
- Impact:
- Evidence:
- Patch suggestion:
```

**Step 4: Verify migration risk notes present**

Run: `grep -n "Migration" docs/reports/audit_2026-02-27_full.md`
Expected: migration analysis section exists

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: add pricing and migration integrity findings"
```

---

### Task 5: Runtime-safe verification — auth and public API

**Files:**
- Modify: `docs/reports/audit_2026-02-27_full.md:521-680`
- Review: `server/index.ts`, `server/routes/auth.ts`, `server/routes/services.ts`

**Step 1: Add runtime test matrix (initially pending)**

```md
## Runtime Verification (Safe)
| Test ID | Endpoint | Expected | Result |
|--------|----------|----------|--------|
| R-01 | POST /auth/login invalid payload | 400 | PENDING |
```

**Step 2: Run safe auth/public endpoint tests**

Run:
- `curl -i -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"identifier":"","password":""}'`
- `curl -i http://localhost:3001/api/prices`
- `curl -i -X POST http://localhost:3001/api/convert-uid -H "Content-Type: application/json" -d '{"link":"   ","type":"like"}'`
Expected: proper 4xx/2xx handling, no stack trace leak

**Step 3: Record actual status/body summary in report**

```md
R-01: PASS (400, generic validation error)
```

**Step 4: Verify no sensitive response leakage documented**

Run: `grep -n "stack\|trace\|token\|secret" docs/reports/audit_2026-02-27_full.md`
Expected: mention only in analysis context, not leaked payloads

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: add runtime verification for auth and public APIs"
```

---

### Task 6: Runtime-safe verification — admin/pricing/order guards

**Files:**
- Modify: `docs/reports/audit_2026-02-27_full.md:681-860`
- Review: `server/routes/admin.ts`, `server/routes/orders.ts`

**Step 1: Add protected-route test cases**

```md
| R-10 | GET /admin/pricing-detail without token | 401/403 | PENDING |
| R-11 | POST /admin/toggle-package malformed payload | 400 | PENDING |
```

**Step 2: Run safe guard tests**

Run:
- `curl -i http://localhost:3001/admin/pricing-detail`
- `curl -i -X POST http://localhost:3001/admin/toggle-package -H "Content-Type: application/json" -d '{}'`
- `curl -i -X POST http://localhost:3001/api/orders/buy -H "Content-Type: application/json" -d '{}'`
Expected: auth/validation failures with controlled messages

**Step 3: Add exploitability notes**

```md
- Confirmed runtime exploitability: Yes/No
- Preconditions:
```

**Step 4: Mark each runtime row PASS/FAIL with evidence**

Run: `grep -n "R-10\|R-11\|R-12" docs/reports/audit_2026-02-27_full.md`
Expected: statuses updated from PENDING

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: add runtime verification for admin and order guards"
```

---

### Task 7: Prioritize findings and build remediation order

**Files:**
- Modify: `docs/reports/audit_2026-02-27_full.md:861-1020`

**Step 1: Create prioritized board**

```md
## Prioritized Findings
### Critical
### High
### Medium
### Low
```

**Step 2: Add remediation sequence (minimal-risk-first)**

```md
## Remediation Sequence
1) Fix authz bypasses
2) Fix pricing/order integrity
3) Harden input validation
```

**Step 3: Add patch snippets or pseudo-diff per High/Critical**

```md
Patch hint:
- File:
- Replace:
- With:
```

**Step 4: Validate every High/Critical has a patch hint**

Run: `grep -n "### Critical\|### High\|Patch hint" docs/reports/audit_2026-02-27_full.md`
Expected: complete mapping

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: prioritize findings and add remediation plan"
```

---

### Task 8: Final QA of report and handoff

**Files:**
- Modify: `docs/reports/audit_2026-02-27_full.md:1-EOF`

**Step 1: Run consistency check (headings + finding IDs)**

Run: `grep -n "^## \|^### Finding" docs/reports/audit_2026-02-27_full.md`
Expected: clean structure and unique finding IDs

**Step 2: Ensure no unresolved TODO/PENDING remains**

Run: `grep -n "TODO\|PENDING" docs/reports/audit_2026-02-27_full.md`
Expected: no matches

**Step 3: Add executive summary for stakeholders**

```md
## Executive Summary
- Total findings:
- Critical/High count:
- Immediate actions (24h):
```

**Step 4: Final proofread and markdown sanity**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('docs/reports/audit_2026-02-27_full.md','utf8');console.log(s.length>0?'OK':'EMPTY')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add docs/reports/audit_2026-02-27_full.md
git commit -m "docs: finalize full security and code audit report"
```

---

## Notes for execution
- Dùng @superpowers:verification-before-completion trước khi kết luận “audit xong”.
- Giữ non-destructive runtime tests; không gửi request thay đổi dữ liệu thật ngoài mục đích validate guard.
- Nếu workspace không phải git repository thì bỏ qua commit steps, nhưng vẫn hoàn tất đầy đủ artifact và log kiểm chứng.
