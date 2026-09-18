# Famo Admin Panel - Agent Instructions

## Project Overview
PHP + Vanilla JS admin panel (Persian/Farsi, RTL). Single-page `index.html` with SPA-like navigation via hash routing.

## Stack
- **Backend**: PHP 8+ (PDO MySQL), Composer (`vlucas/phpdotenv`)
- **Frontend**: Tailwind CSS v4 (`@tailwindcss/cli`), Vanilla JS modules
- **Database**: MySQL (auto-migration on first API call)

## Key Commands
```bash
# Frontend (run from repo root)
npm run build:css    # Build Tailwind CSS once
npm run watch        # Watch & rebuild CSS

# Backend
composer install     # Install PHP deps
```

## Architecture
| Path | Purpose |
|------|---------|
| `index.html` | Single entry point, all views inline |
| `api/api.php` | Main API router (switch on `action` param), auth, DB |
| `api/config.php` | DB connection singleton, constants, upload paths |
| `api/Env.php` | Lightweight `.env` loader |
| `assets/css/input.css` | Tailwind v4 entry + custom theme |
| `assets/js/*.js` | Feature modules (students, exams, supporters, etc.) |
| `uploads/` | File uploads (gitignored) |

## Environment
- Copy `api/.env.example` → `api/.env` (not in repo)
- Required vars: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
- Timezone: `Asia/Tehran`

## API Conventions
- All endpoints: `api/api.php?action=<name>` (GET or POST)
- Auth: `requireAuth()` checks `$_SESSION['admin_id']`
- Roles: `admin` | `supporter` (check via `$_SESSION['admin_role']`)
- Response: `jsonResponse($data, $status)` → `application/json; charset=utf-8`
- Tables auto-created on first request (see `ensureWeeklyPlanTablesExist`)

## Frontend Conventions
- JS modules in `assets/js/` imported in `assets/js/index.js`
- Functions exposed on `window` for inline `onclick` handlers
- Hash-based navigation: `navigateTo('students')` → `#students`
- RTL, Persian labels throughout

## Gotchas
- No test/lint/typecheck tooling configured
- `.env` is gitignored — must exist locally
- `api/api.php` is monolithic (~1600 lines); routes are a giant `switch`
- DB errors logged to `error.log` in repo root
- File uploads go to `uploads/exams/` (10MB max, pdf/jpg/png/doc/docx)

## Dev Workflow
1. `composer install` once
2. `npm run watch` for CSS during development
3. Serve via Apache/Nginx (PHP required) — no dev server
4. Edit `api/api.php` for new endpoints; add JS module in `assets/js/` for frontend