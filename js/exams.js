/**
 * Admin Panel - Exams List, Students per Exam, Details
 * Enhanced with Jalali (Shamsi) date display
 * Now using ApexCharts Radial Bar Stroked Gauge for each lesson result
 */

import { api } from '../../../shared/js/api-client.js';
import { showAlert, escapeHtml, icon } from './utils.js';
import * as config from './config.js';
import { formatGregorianToJalali, formatJalaliLong } from '../../../shared/js/jalali.js';
import { setupTableResponsive } from './ui.js';

// ApexCharts will be loaded globally (make sure it's included in page)

export async function loadExams() {
    config.setCurrentExamView('dates');
    config.setCurrentExamDate(null);
    config.setCurrentExamStudentId(null);

    try {
        const data = await api('get_exam_dates');
        updateExamsTitle('آزمون‌های برگزار شده', icon('clipboard', 'icon ml-2'));

        const container = document.getElementById('examsContainer');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="text-center py-8 text-gray-500">${icon('file', 'icon icon--3xl text-gray-400 mb-3')}<p>آزمونی ثبت نشده است</p></div>`;
            return;
        }

        container.innerHTML = `
            <div class="table-wrap overflow-x-auto">
                <table class="w-full responsive-table">
                    <thead class="bg-primary text-white">
                        <tr>
                            <th class="px-5 py-4 text-right">تاریخ آزمون</th>
                            <th class="px-5 py-4 text-right">تعداد شرکت‌کنندگان</th>
                            <th class="px-5 py-4 text-right">تعداد دروس</th>
                            <th class="px-5 py-4 text-right">میانگین درصد</th>
                            <th class="px-5 py-4 text-right">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(exam => `
                            <tr class="hover:bg-gray-50 cursor-pointer" onclick="window.loadExamStudents('${exam.exam_date}')">
                                <td class="px-5 py-4 font-medium" dir="ltr" style="text-align: right;">
                                    ${icon('calendar', 'icon icon--lg ml-2 text-primary')}
                                    ${formatJalaliLong(exam.exam_date)}
                                </td>
                                <td class="px-5 py-4">
                                    <span class="bg-primaryLight text-primary px-2.5 py-1.5 rounded-full text-sm font-bold">
                                        ${exam.student_count} نفر
                                    </span>
                                </td>
                                <td class="px-5 py-4">${exam.subject_count} درس</td>
                                <td class="px-5 py-4">
                                    <span class="font-medium ${parseFloat(exam.avg_percentage) >= 50 ? 'text-green-600' : 'text-red-600'}">
                                        ${parseFloat(exam.avg_percentage || 0).toFixed(1)}%
                                    </span>
                                </td>
                                <td class="px-5 py-4">
                                    <button onclick="event.stopPropagation(); window.loadExamStudents('${exam.exam_date}')" class="inline-flex items-center gap-2 p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                        ${icon('users', 'icon icon--lg ml-1')} مشاهده
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        // Apply responsive data-labels to the dynamically created table
        setupTableResponsive();
    } catch (error) {
        console.error('Error loading exams:', error);
        showAlert('خطا در بارگذاری آزمون‌ها', 'error');
    }
}

export async function loadExamStudents(examDate) {
    config.setCurrentExamView('students');
    config.setCurrentExamDate(examDate);

    try {
        const data = await api('get_exam_students', { exam_date: examDate });
        updateExamsTitle(`شرکت‌کنندگان آزمون ${formatJalaliLong(examDate)}`, icon('users', 'icon ml-2'), true);

        const container = document.getElementById('examsContainer');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">دانش‌آموزی یافت نشد</div>';
            return;
        }

        container.innerHTML = `
            <div class="table-wrap overflow-x-auto">
                <table class="w-full responsive-table">
                    <thead class="bg-primary text-white">
                        <tr>
                            <th class="px-5 py-4 text-right">دانش‌آموز</th>
                            <th class="px-5 py-4 text-right">پایه</th>
                            <th class="px-5 py-4 text-right">رشته</th>
                            <th class="px-5 py-4 text-right">تعداد دروس</th>
                            <th class="px-5 py-4 text-right">میانگین درصد</th>
                            <th class="px-5 py-4 text-right">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(s => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-5 py-4 font-medium">${escapeHtml(s.name)}</td>
                                <td class="px-5 py-4">${s.grade}</td>
                                <td class="px-5 py-4">${escapeHtml(s.field)}</td>
                                <td class="px-5 py-4">${s.subject_count}</td>
                                <td class="px-5 py-4">
                                    <span class="px-2.5 py-1.5 rounded-lg ${parseFloat(s.avg_percentage) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                        ${parseFloat(s.avg_percentage || 0).toFixed(1)}%
                                    </span>
                                </td>
                                <td class="px-5 py-4">
                                    <button onclick="window.loadExamDetails('${examDate}', ${s.student_id})" class="inline-flex items-center gap-2 p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                        ${icon('eye', 'icon icon--lg ml-1')} جزئیات
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        // Apply responsive data-labels
        setupTableResponsive();
    } catch (error) {
        console.error('Error in loadExamStudents:', error);
        showAlert('خطا در بارگذاری لیست دانش‌آموزان', 'error');
    }
}

export async function loadExamDetails(examDate, studentId) {
    config.setCurrentExamView('details');
    config.setCurrentExamStudentId(studentId);

    try {
        const data = await api('get_exam_details', { exam_date: examDate, student_id: studentId });

        if (!data || !data.student) {
            showAlert('اطلاعات یافت نشد', 'error');
            return;
        }

        updateExamsTitle(`نتایج ${escapeHtml(data.student.name)} - آزمون ${formatJalaliLong(examDate)}`, icon('chart-bar', 'icon ml-2'), true);

        const container = document.getElementById('examsContainer');
        if (!container) return;

        let subjectsTableRows = '';
        if (data.subjects && data.subjects.length > 0) {
            subjectsTableRows = data.subjects.map((sub, idx) => {
                const percentNumber = Math.max(0, Math.min(100, parseFloat(sub.percentage || 0)));
                const chartId = `apxLessonChart-${idx}`;
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-5 py-4 font-medium">${escapeHtml(sub.subject)}</td>
                        <td class="px-5 py-4 text-gray-600">${sub.chapter ? escapeHtml(sub.chapter) : '-'}</td>
                        <td class="px-5 py-4">${sub.total_q}</td>
                        <td class="px-5 py-4 text-green-600 font-bold">${sub.correct}</td>
                        <td class="px-5 py-4 text-red-600 font-bold">${sub.wrong}</td>
                        <td class="px-5 py-4 text-gray-500">${sub.skipped}</td>
                        <td class="px-5 py-4">
                            <div id="${chartId}" style="min-width:80px;max-width:110px;min-height:90px;display:inline-block;vertical-align:middle"></div>
                            <span class="block font-bold mt-1 text-center ${percentNumber >= 50 ? 'text-green-600' : 'text-red-600'}">
                                ${percentNumber.toFixed(1)}%
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            subjectsTableRows = '<tr><td colspan="7" class="px-5 py-8 text-center text-gray-500">درسی یافت نشد</td></tr>';
        }

        container.innerHTML = `
            <div class="chart-card mb-6">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div class="bg-blue-50 rounded-xl p-3 text-center">
                        <p class="text-gray-500 text-xs mb-1">دانش‌آموز</p>
                        <p class="font-bold text-sm md:text-base">${escapeHtml(data.student.name)}</p>
                    </div>
                    <div class="bg-blue-50 rounded-xl p-3 text-center">
                        <p class="text-gray-500 text-xs mb-1">پایه</p>
                        <p class="font-bold text-sm md:text-base">${data.student.grade}</p>
                    </div>
                    <div class="bg-blue-50 rounded-xl p-3 text-center">
                        <p class="text-gray-500 text-xs mb-1">رشته</p>
                        <p class="font-bold text-sm md:text-base">${escapeHtml(data.student.field)}</p>
                    </div>
                    <div class="bg-blue-50 rounded-xl p-3 text-center">
                        <p class="text-gray-500 text-xs mb-1">میانگین کل</p>
                        <p class="font-bold text-sm md:text-base ${parseFloat(data.avg_percentage) >= 50 ? 'text-green-600' : 'text-red-600'}">
                            ${parseFloat(data.avg_percentage || 0).toFixed(1)}%
                        </p>
                    </div>
                </div>

                <h3 class="font-bold text-base mb-4 text-primary">نتایج درس به درس:</h3>
                <div class="table-wrap overflow-x-auto">
                    <table class="w-full text-sm responsive-table">
                        <thead class="bg-primary text-white">
                            <tr>
                                <th class="px-5 py-4 text-right">درس</th>
                                <th class="px-5 py-4 text-right">مبحث</th>
                                <th class="px-5 py-4 text-right">کل سوالات</th>
                                <th class="px-5 py-4 text-right">صحیح</th>
                                <th class="px-5 py-4 text-right">غلط</th>
                                <th class="px-5 py-4 text-right">نزده</th>
                                <th class="px-5 py-4 text-right">درصد</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjectsTableRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // After rendering, create the ApexCharts strokes for each chart
        if (data.subjects && data.subjects.length > 0 && window.ApexCharts) {
            data.subjects.forEach((sub, idx) => {
                const percentNumber = Math.max(0, Math.min(100, parseFloat(sub.percentage || 0)));
                const chartId = `apxLessonChart-${idx}`;
                const el = document.getElementById(chartId);

                if (el) {
                    const color = percentNumber >= 50 ? "#34D399" : "#F87171";
                    const trackColor = "#F1F5F9";
                    const labelText = '';
                    const options = {
                        chart: {
                            height: 90,
                            type: "radialBar",
                            sparkline: { enabled: true }
                        },
                        series: [percentNumber],
                        colors: [color],
                        plotOptions: {
                            radialBar: {
                                startAngle: -120,
                                endAngle: 120,
                                hollow: {
                                    size: "52%",
                                },
                                track: {
                                    background: trackColor,
                                    strokeWidth: "97%",
                                },
                                dataLabels: {
                                    name: {
                                        show: false
                                    },
                                    value: {
                                        show: true,
                                        fontSize: "20px",
                                        fontWeight: "bold",
                                        color: color,
                                        offsetY: 6,
                                        formatter: function (val) {
                                            return val.toFixed(0) + "%";
                                        }
                                    }
                                }
                            }
                        },
                        stroke: {
                            lineCap: "round"
                        },
                        labels: [labelText]
                    };
                    const chart = new window.ApexCharts(el, options);
                    chart.render();
                }
            });
        }

        // Apply responsive data-labels
        setupTableResponsive();
    } catch (error) {
        console.error('Error in loadExamDetails:', error);
        showAlert('خطا در بارگذاری جزئیات', 'error');
    }
}

export function updateExamsTitle(title, iconStr = '', showBackButton = false) {
    const examsTitle = document.getElementById('examsTitle');
    const examsBreadcrumb = document.getElementById('examsBreadcrumb');

    if (examsTitle) examsTitle.innerHTML = iconStr ? `${iconStr} ${title}` : title;

    if (examsBreadcrumb) {
        if (showBackButton) {
            const view = config.currentExamView;
            const date = config.currentExamDate;
            const backAction = view === 'students' ? 'window.loadExams()' : `window.loadExamStudents('${date}')`;
            const backLabel = view === 'students' ? 'بازگشت به لیست آزمون‌ها' : 'بازگشت به شرکت‌کنندگان';
            examsBreadcrumb.innerHTML = `
                <button onclick="${backAction}"
                        class="bg-[#445D84] text-white px-4 py-2 rounded-lg hover:bg-[#374a6b] transition-colors flex items-center gap-2">
                    ${icon('chevron-right', 'icon')}
                    <span>${backLabel}</span>
                </button>
            `;
        } else {
            examsBreadcrumb.innerHTML = '';
        }
    }
}

/** برای دکمه بازگشت در HTML (examsBackBtn) */
export function goBackFromExamDetails() {
    const view = config.currentExamView;
    const date = config.currentExamDate;
    if (view === 'students') loadExams();
    else if (date) loadExamStudents(date);
}

/** برای دکمه پاک کردن فیلتر */
export function clearExamsFilter() {
    loadExams();
}
