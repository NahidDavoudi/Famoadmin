# پنل ادمین – ساختار ماژولار

ورود از طریق `index.js` است. در `pages/admin.html` این فایل با `type="module"` لود می‌شود.

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

## وابستگی‌های خارج از پوشه

- `../api-client.js` – تابع `api()`
- `../ui-helpers.js` – `showModal`, `hideModal`, `showAlert`, `escapeHtml`, `formatDate`

نسخهٔ قدیمی تک‌فایلی: `admin.legacy.js` (در صورت نیاز به مقایسه یا بازگشت).
