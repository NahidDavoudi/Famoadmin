/**
 * تم مشترک ApexCharts برای آموزشگاه فامو
 * رنگ‌های موسسه و فضای آکادمیک/رسمی
 */
export const CHART_COLORS = {
    primary: '#445D84',
    primaryLight: '#5a779e',
    primaryDark: '#3a5170',
    accent: '#8B786D',
    secondary: '#6D8B9E',
    cream: '#E2D9C6',
    success: '#10b981',
    warning: '#f59e0b',
    grid: 'rgba(0,0,0,0.06)',
    text: '#374151',
    textMuted: '#6b7280'
};

/** پالت برای چند سری (نمودار خط/ناحیه) */
export const CHART_SERIES_COLORS = [
    CHART_COLORS.primary,
    CHART_COLORS.secondary,
    CHART_COLORS.accent,
    CHART_COLORS.success,
    CHART_COLORS.warning,
    CHART_COLORS.primaryLight
];

/** تنظیمات پایه همه نمودارها: فونت، راست‌به‌چپ، شبکه */
export function getBaseChartOptions(overrides = {}) {
    return {
        chart: {
            fontFamily: 'Vazir, Tahoma, sans-serif',
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 600
            },
            ...overrides.chart
        },
        theme: {
            mode: 'light',
            palette: 'palette2'
        },
        colors: CHART_SERIES_COLORS,
        grid: {
            borderColor: CHART_COLORS.grid,
            strokeDashArray: 4,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } }
        },
        xaxis: {
            labels: {
                style: { colors: CHART_COLORS.textMuted, fontSize: '11px' }
            }
        },
        yaxis: {
            labels: {
                style: { colors: CHART_COLORS.textMuted, fontSize: '11px' }
            }
        },
        legend: {
            fontFamily: 'Vazir',
            fontSize: '12px',
            labels: { colors: CHART_COLORS.text }
        },
        tooltip: {
            theme: 'light',
            style: { fontSize: '12px' },
            x: { format: 'dd/MM/yyyy' }
        },
        dataLabels: { enabled: false },
        ...overrides
    };
}
