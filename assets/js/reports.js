/**
 * Admin Panel - Reports & Chart (unified API)
 */

const { default: API } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);
import { showAlert, updateStatElement } from './utils.js';
import * as config from './config.js';
import { getBaseChartOptions, CHART_COLORS } from './chart-theme.js';

const ApexCharts = window.ApexCharts;

export async function loadReports() {
    try {
        const res = await API.get('/reports/stats');
        const reports = (res.data?.stats || []).map(r => ({
            report_date: r.date,
            replied: Number(r.replied || 0),
            pending: Number(r.pending || 0),
            total: Number(r.replied || 0) + Number(r.pending || 0),
        }));

        const total = reports.reduce((sum, r) => sum + r.total, 0);
        const pending = reports.reduce((sum, r) => sum + r.pending, 0);
        const replied = reports.reduce((sum, r) => sum + r.replied, 0);

        updateStatElement('report-total', total);
        updateStatElement('report-pending', pending);
        updateStatElement('report-replied', replied);

        updateReportsChart(reports);
    } catch (error) {
        console.error('Error loading reports:', error);
        showAlert('خطا در بارگذاری گزارش‌ها', 'error');
    }
}

function updateReportsChart(reports) {
    const container = document.getElementById('reportsChart');
    if (!reports || reports.length === 0 || !container) return;

    const prev = config.getReportsChart();
    if (prev) prev.destroy();

    const categories = reports.map(r => r.report_date);
    const pendingData = reports.map(r => r.pending);
    const repliedData = reports.map(r => r.replied);

    const options = {
        ...getBaseChartOptions(),
        chart: {
            ...getBaseChartOptions().chart,
            type: 'area',
            height: 280,
            stacked: false
        },
        series: [
            { name: 'در انتظار', data: pendingData },
            { name: 'پاسخ داده', data: repliedData }
        ],
        colors: [CHART_COLORS.warning, CHART_COLORS.success],
        stroke: { curve: 'smooth', width: 2.5 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 0.4,
                opacityFrom: 0.35,
                opacityTo: 0.05
            }
        },
        xaxis: {
            categories,
            labels: {
                style: { colors: CHART_COLORS.textMuted, fontSize: '10px' },
                rotate: -45
            }
        },
        yaxis: {
            min: 0,
            labels: {
                style: { colors: CHART_COLORS.textMuted }
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            fontSize: '12px',
            fontFamily: 'Vazirmatn',
            labels: { colors: CHART_COLORS.text }
        },
        tooltip: {
            shared: true,
            intersect: false
        }
    };

    const chart = new ApexCharts(container, options);
    chart.render();
    config.setReportsChart(chart);
}
