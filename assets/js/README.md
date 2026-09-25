# پنل ادمین – ساختار ماژولار

ورود از `admin/index.php` است؛ پیکربندی PHP را از `config.php` می‌گیرد و فایل `index.js` را با `type="module"` بارگذاری می‌کند.

## ماژول‌ها

| فایل | مسئولیت |
|------|---------|
| `config.js` | وضعیت مشترک (currentPage، نمودارها، cooldown و ...) |
| `utils.js` | توابع کمکی + re-export از `ui-helpers.js` |
| `auth.js` | ورود، خروج، نمایش صفحه لاگین/پنل |
| `nav.js` | تغییر صفحه و فراخوانی loader هر بخش |
| `dashboard.js` | آمار اولیه و نمودار میانگین |
| `students.js` | لیست و CRUD دانش‌آموزان |
| `supporters.js` | لیست و CRUD پشتیبان‌ها |
| `exams.js` | لیست آزمون‌ها، شرکت‌کنندگان، جزئیات |
| `exam-entry.js` | فرم ثبت نتایج و ردیف‌های دروس |
| `files.js` | لیست فایل‌ها و آپلود |
| `reports.js` | گزارش‌ها و نمودار |
| `courses.js` | CRUD دوره‌ها |
| `instructors.js` | CRUD اساتید |
| `ui.js` | منوی موبایل، تاریخ پیش‌فرض، لیست دانش‌آموز، استایل‌ها |
| `events.js` | بستن مودال، فرم‌ها، کیبورد، و init |
| `index.js` | اتصال به `window` برای `onclick` و اجرای `init` |

## وابستگی‌های مشترک

- کلاینت API مشترک از مسیر `ASSET_URL` در `.env` بارگذاری می‌شود (`API.get/post/put/del/upload`).
- برای اجرای کد پس از آماده‌شدن DOM از `onReady()` در `api.js` استفاده کنید؛ listener مستقیم `DOMContentLoaded` نگذارید.
- `ui-helpers.js` و سایر ماژول‌های کمکی – در همین پوشه `assets/js/` هستند.

دارایی‌های مشترک (CSS، کتابخانه‌ها، آیکون‌ها و تصاویر) از `ASSET_URL` در `.env` بارگذاری می‌شوند.
