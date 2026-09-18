/**
 * Admin Panel - Overview / Dashboard Stats
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert } from './utils.js';
import { updateStatElement } from './utils.js';
import * as config from './config.js';
import { getBaseChartOptions, CHART_COLORS } from '../../../shared/js/chart-theme.js';

const ApexCharts = window.ApexCharts;

export async function loadStats() {
    try {
        const stats = await api('get_stats');

        updateStatElement('stat-students', stats.students_count);
        updateStatElement('stat-exams', stats.exams_this_week);
        updateStatElement('stat-noexam', stats.students_no_exam);
        updateStatElement('stat-pending', stats.pending_reports);

        updateAvgChart(stats.avg_by_field);
    } catch (error) {
        console.error('Error loading stats:', error);
        showAlert('خطا در بارگذاری آمار', 'error');
    }
}

export function updateAvgChart(data) {
    const container = document.getElementById('avgChart');
    if (!data || data.length === 0 || !container) return;

    const prev = config.getAvgChart();
    if (prev) prev.destroy();

    const categories = data.map(d => `${d.field} (${d.student_count} نفر)`);
    const seriesData = data.map(d => d.avg_percentage || 0);
    const barColors = data.map((_, i) => {
        const shades = [CHART_COLORS.primary, CHART_COLORS.primaryLight, CHART_COLORS.secondary, CHART_COLORS.accent];
        return shades[i % shades.length];
    });

    const options = {
        ...getBaseChartOptions(),
        chart: {
            ...getBaseChartOptions().chart,
            type: 'bar',
            height: 280
        },
        series: [{
            name: 'میانگین درصد',
            data: seriesData
        }],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '62%',
                borderRadius: 6,
                distributed: true,
                dataLabels: { position: 'top' }
            }
        },
        colors: barColors,
        xaxis: {
            categories,
            labels: {
                style: { colors: CHART_COLORS.textMuted, fontSize: '11px' },
                maxWidth: 120,
                rotate: -25
            }
        },
        yaxis: {
            min: 0,
            max: 100,
            tickAmount: 5,
            labels: {
                formatter: val => val + '%'
            }
        },
        legend: { show: false },
        tooltip: {
            y: {
                formatter: val => `میانگین: ${Number(val).toFixed(1)}%`
            }
        }
    };

    const chart = new ApexCharts(container, options);
    chart.render();
    config.setAvgChart(chart);
}
