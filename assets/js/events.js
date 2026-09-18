/**
 * Admin Panel - Event Listeners & Init
 */

import * as config from './config.js';
import { hideModal } from './utils.js';
import { checkAuth, handleLogin, handleLogout } from './auth.js';
import { navigateTo } from './nav.js';
import { loadStudents } from './students.js';
import { handleAddStudent, handleEditStudent } from './students.js';
import { handleAddSupporter, handleEditSupporter } from './supporters.js';
import { handleFileUpload } from './files.js';
import { handleAddCourse, handleEditCourse } from './courses.js';
import { handleAddInstructor, handleEditInstructor } from './instructors.js';
import { handleExamEntry, addSubjectRow } from './exam-entry.js';
import { addNoSpinnerStyles, initMobileMenu, setupTableResponsive, setDefaultDates } from './ui.js';

const forms = {
    addStudentForm: handleAddStudent,
    editStudentForm: handleEditStudent,
    addSupporterForm: handleAddSupporter,
    editSupporterForm: handleEditSupporter,
    uploadForm: handleFileUpload,
    addCourseForm: handleAddCourse,
    editCourseForm: handleEditCourse,
    addInstructorForm: handleAddInstructor,
    editInstructorForm: handleEditInstructor
};

function setupFormListeners() {
    Object.entries(forms).forEach(([formId, handler]) => {
        const form = document.getElementById(formId);
        if (form) form.addEventListener('submit', handler);
    });

    setupExamFormListener();
}

function setupExamFormListener() {
    const examEntryForm = document.getElementById('examEntryForm');
    if (examEntryForm) {
        const newForm = examEntryForm.cloneNode(true);
        examEntryForm.parentNode.replaceChild(newForm, examEntryForm);

        newForm.addEventListener('submit', function (e) {
            e.preventDefault();
            handleExamEntry(e);
        });
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's' && config.currentPage === 'exam_entry') {
            e.preventDefault();
            const form = document.getElementById('examEntryForm');
            if (form && form.checkValidity()) {
                form.dispatchEvent(new Event('submit'));
            }
        }

        if (e.key === 'Enter' && e.target.closest('.subject-row')) {
            e.preventDefault();
            addSubjectRow();
        }

        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                hideModal(modal.id);
            });
        }
    });
}

function setupModalClosers() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal(modal.id);
        });
    });

    document.querySelectorAll('[onclick*="hideModal"]').forEach(btn => {
        const match = btn.getAttribute('onclick')?.match(/hideModal\('([^']+)'\)/);
        const modalId = match?.[1];
        if (modalId) {
            btn.addEventListener('click', () => hideModal(modalId));
        }
    });
}

export function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });

    setupFormListeners();

    const filterSearch = document.getElementById('filterSearch');
    if (filterSearch) {
        filterSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loadStudents();
        });
    }

    setupKeyboardShortcuts();
    setupModalClosers();
}

export function init() {
    checkAuth();
    setupEventListeners();
    setDefaultDates();
    addNoSpinnerStyles();
    initMobileMenu();
    setupTableResponsive();
}
