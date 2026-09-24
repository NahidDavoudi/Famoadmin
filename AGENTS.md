# Famo Admin Panel - Agent Instructions

## Project Overview
Static frontend SPA (Persian/Farsi, RTL) for the Famo admin panel. `index.html` holds all views; navigation is hash-free, driven by `navigateTo(page)`. There is no local backend — everything talks to the unified API at `http://localhost:8080/api/v1`.

## Stack
- **Frontend**: Tailwind CSS v4 (shared build), Vanilla JS ES modules
- **Backend**: unified API project at `../api` (Slim + JWT), served at `/api/v1`
- **Auth**: unified login page at `../login/index.php` (JWT in `localStorage.famo_jwt`)

## Architecture
| Path | Purpose |
|------|---------|
| `index.html` | Single entry point, all views + modals inline |
| `assets/js/index.js` | Module entry point |
| `assets/js/auth.js` | Auth guard; redirects unauthenticated users to shared login |
| `assets/js/students.js` / `supporters.js` / `courses.js` / `instructors.js` | CRUD modules |
| `assets/js/exams.js` / `exam-entry.js` | Exam results + entry |
| `assets/js/files.js` / `blog.js` | File uploads + blog CRUD |
| `assets/js/dashboard.js` / `reports.js` | Overview stats + reports chart |
| `assets/js/chart-theme.js` | Shared ApexCharts theme for admin charts |
| `assets/css/admin.css` | Admin-specific styles |

## Shared Assets
- API client: `../../../shared/js/api.js` (imported from `assets/js/*.js`)
- Libraries: `../shared/js/libs/` (ApexCharts, Lucide)
- Icons: Lucide via `../shared/js/libs/lucide.min.js` + `../shared/js/lucide-adapter.js`. Static markup uses `data-lucide="..."`; dynamic markup uses the `icon(name)` helper in `assets/js/utils.js`.
- Styles/fonts: `../shared/css/output.css`, `../shared/css/fonts.css`
- Images/SVG: `../shared/images/`, `../shared/svg/`

## API Conventions
- All calls go through the shared `API` client (`API.get/post/put/del/upload`).
- Endpoints: `/students`, `/students/list`, `/courses`, `/instructors`, `/supporters`, `/exams/*`, `/files/*`, `/blog/posts`, `/reports/*`, `/dashboard/stats`.
- Response envelope: `{ success, data, pagination, error }`.
- File uploads use `API.upload(path, formData)` (multipart); the API merges `$_POST` for multipart fields.
- `admin` and `supporter` roles may access the panel; others are redirected to login.

## CSS Build
- Tailwind source: `../shared/css/input.css` (scans `admin/**/*.html` and `admin/**/*.js`).
- Build from `../shared`: `npm run build:css`. Never edit `output.css` directly.

## Gotchas
- No test/lint/typecheck tooling configured; validate JS with `node --input-type=module --check < file.js`.
- The old local API (`admin/api/`) and its `api-client.js`/sprite assets were removed — do not recreate them.
