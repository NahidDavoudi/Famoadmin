/**
 * Admin Panel - State & Constants
 * وضعیت و ثابت‌های مشترک پنل ادمین
 */

export const SUBMISSION_COOLDOWN = 3000; // 3 ثانیه تاخیر بین ثبت‌ها

export let currentPage = 'overview';
export let avgChart = null;
export let reportsChart = null;
export let isSubmitting = false;
export let lastSubmissionTime = 0;
export let currentExamView = 'dates';
export let currentExamDate = null;
export let currentExamStudentId = null;

export function setCurrentPage(page) {
    currentPage = page;
}

export function setAvgChart(chart) {
    avgChart = chart;
}

export function setReportsChart(chart) {
    reportsChart = chart;
}

export function setIsSubmitting(value) {
    isSubmitting = value;
}

export function setLastSubmissionTime(value) {
    lastSubmissionTime = value;
}

export function setCurrentExamView(view) {
    currentExamView = view;
}

export function setCurrentExamDate(date) {
    currentExamDate = date;
}

export function setCurrentExamStudentId(id) {
    currentExamStudentId = id;
}

export function getAvgChart() {
    return avgChart;
}

export function getReportsChart() {
    return reportsChart;
}
