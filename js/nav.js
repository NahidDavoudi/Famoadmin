/**
 * Admin Panel - Navigation & Page Loaders
 */

import * as config from './config.js';
import { loadStats } from './dashboard.js';
import { loadStudents } from './students.js';
import { loadCourses } from './courses.js';
import { loadInstructors } from './instructors.js';
import { loadExams, loadExamStudents } from './exams.js';
import { loadExamEntryPage } from './exam-entry.js';
import { loadFiles } from './files.js';
import { loadStudentList } from './ui.js';
import { loadSupporters } from './supporters.js';
import { loadReports } from './reports.js';

const pageLoaders = {
    overview: loadStats,
    students: loadStudents,
    courses: loadCourses,
    instructors: loadInstructors,
    exams: loadExams,
    exam_entry: loadExamEntryPage,
    files: () => {
        loadFiles();
        loadStudentList('uploadStudentSelect');
    },
    supporters: loadSupporters,
    reports: loadReports,
    weekly_plans: loadWeeklyPlans
};

export async function loadWeeklyPlans() {
    try {
        await loadStudentList('weeklyPlanStudentSelect');
        const sel = document.getElementById('weeklyPlanStudentSelect');
        if (sel && sel.value && typeof window.loadStudentPlan === 'function') {
            window.loadStudentPlan();
        }
    } catch (err) {
        console.error('Error loading weekly plans:', err);
    }
}

export function navigateTo(page) {
    config.setCurrentPage(page);

    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    const pageElement = document.getElementById(`page-${page}`);
    if (pageElement) {
        pageElement.classList.remove('hidden');
    } else {
        console.warn(`Page element not found: page-${page}`);
    }

    if (pageLoaders[page]) {
        pageLoaders[page]();
    }
}
