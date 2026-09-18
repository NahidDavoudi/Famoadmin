/**
 * Jalali (Shamsi/Persian) Date Conversion Utility
 * Based on the jalaali-js algorithm by Jalaali (https://github.com/jalaali/jalaali-js)
 */

const JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد',
    'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر',
    'دی', 'بهمن', 'اسفند'
];

/**
 * Convert Gregorian date to Jalali
 * @param {number} gy - Gregorian year
 * @param {number} gm - Gregorian month (1-12)
 * @param {number} gd - Gregorian day
 * @returns {[number, number, number]} [jy, jm, jd]
 */
export function toJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4)
        - Math.floor((gy2 + 99) / 100)
        + Math.floor((gy2 + 399) / 400)
        + gd + g_d_m[gm - 1];
    let jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let jm, jd;
    if (days < 186) {
        jm = 1 + Math.floor(days / 31);
        jd = 1 + (days % 31);
    } else {
        jm = 7 + Math.floor((days - 186) / 30);
        jd = 1 + ((days - 186) % 30);
    }
    return [jy, jm, jd];
}

/**
 * Convert Jalali date to Gregorian
 * @param {number} jy - Jalali year
 * @param {number} jm - Jalali month (1-12)
 * @param {number} jd - Jalali day
 * @returns {[number, number, number]} [gy, gm, gd]
 */
export function toGregorian(jy, jm, jd) {
    let jy2 = jy - 979;
    let jm2 = jm - 1;
    let jd2 = jd - 1;

    let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8
        + Math.floor((jy2 % 33 + 3) / 4);
    for (let i = 0; i < jm2; i++) j_day_no += (i < 6) ? 31 : 30;
    j_day_no += jd2;

    let g_day_no = j_day_no + 79;
    let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
    g_day_no %= 146097;

    let leap = true;
    if (g_day_no >= 36525) {
        g_day_no--;
        gy += 100 * Math.floor(g_day_no / 36524);
        g_day_no %= 36524;
        if (g_day_no >= 365) g_day_no++;
        else leap = false;
    }

    gy += 4 * Math.floor(g_day_no / 1461);
    g_day_no %= 1461;

    if (g_day_no >= 366) {
        leap = false;
        g_day_no--;
        gy += Math.floor(g_day_no / 365);
        g_day_no %= 365;
    }

    const g_d_m = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 12 && g_day_no >= g_d_m[gm]; gm++) {
        g_day_no -= g_d_m[gm];
    }

    return [gy, gm + 1, g_day_no + 1];
}

/**
 * Check if a Jalali year is a leap year
 * @param {number} jy - Jalali year
 * @returns {boolean}
 */
export function isJalaliLeap(jy) {
    const breaks = [1, 5, 9, 13, 17, 22, 26, 30];
    return breaks.includes(jy % 33);
}

/**
 * Get number of days in a Jalali month
 * @param {number} jm - month (1-12)
 * @param {number} jy - year (for leap check in month 12)
 * @returns {number}
 */
export function jalaliMonthDays(jm, jy) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeap(jy) ? 30 : 29;
}

/**
 * Format a Gregorian date string (YYYY-MM-DD) to Jalali (YYYY/MM/DD)
 * @param {string} dateStr - e.g. "2025-02-06"
 * @returns {string} e.g. "1403/11/18"
 */
export function formatGregorianToJalali(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [gy, gm, gd] = parts.map(Number);
    const [jy, jm, jd] = toJalali(gy, gm, gd);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/**
 * Format a Gregorian date string to human-readable Jalali with month name
 * @param {string} dateStr - e.g. "2025-02-06"
 * @returns {string} e.g. "18 بهمن 1403"
 */
export function formatJalaliLong(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [gy, gm, gd] = parts.map(Number);
    const [jy, jm, jd] = toJalali(gy, gm, gd);
    return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`;
}

/**
 * Get today's date as Jalali [jy, jm, jd]
 * @returns {[number, number, number]}
 */
export function getTodayJalali() {
    const now = new Date();
    return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Get Jalali month names array
 * @returns {string[]}
 */
export function getJalaliMonths() {
    return [...JALALI_MONTHS];
}
