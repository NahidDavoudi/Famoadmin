/**
 * Admin Panel - Event Listeners & Init
 */

import * as config from './config.js';
import { hideModal } from './utils.js';
import { checkAuth, handleLogout } from './auth.js';
import { navigateTo } from './nav.js';
import { loadStudents } from './students.js';
import { handleAddStudent, handleEditStudent } from './students.js';
import { handleAddSupporter, handleEditSupporter } from './supporters.js';
import { handleFileUpload } from './files.js';
import { handleAddCourse, handleEditCourse } from './courses.js';
import { handleAddInstructor, handleEditInstructor } from './instructors.js';
import { handleExamEntry, addSubjectRow } from './exam-entry.js';
import { handleBlogSubmit } from './blog.js';
import { addNoSpinnerStyles, initMobileMenu, setupTableResponsive, setDefaultDates } from './ui.js';

const forms = {
    addStudentForm: handleAddStudent,
    editStudentForm: handleEditStudent,
    addSupporterForm: handleAddSupporter,
    editSupporterForm: handleEditSupporter,
    uploadForm: handleFileUpload,
    addFileForm: handleFileUpload,
    addCourseForm: handleAddCourse,
    editCourseForm: handleEditCourse,
    addInstructorForm: handleAddInstructor,
    editInstructorForm: handleEditInstructor,
    blogPostForm: handleBlogSubmit
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
        // Ctrl+S for exam entry save
        if (e.ctrlKey && e.key === 's' && config.currentPage === 'exam_entry') {
            e.preventDefault();
            const form = document.getElementById('examEntryForm');
            if (form && form.checkValidity()) {
                form.dispatchEvent(new Event('submit'));
            }
        }

        // Enter in subject row adds new row
        if (e.key === 'Enter' && e.target.closest('.subject-row')) {
            e.preventDefault();
            addSubjectRow();
        }

        // Escape closes modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                hideModal(modal.id);
            });
        }

        // / key focuses search input
        if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const active = document.activeElement;
            const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
            if (!isInput) {
                e.preventDefault();
                const searchInput = document.getElementById('filterSearch');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        }

        // ? key opens keyboard shortcuts help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const active = document.activeElement;
            const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable);
            if (!isInput) {
                e.preventDefault();
                showModal('keyboardShortcutsModal');
            }
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
            if (e.key === 'Enter') loadStudents(1);
        });
    }

    const filterField = document.getElementById('filterField');
    if (filterField) {
        filterField.addEventListener('change', () => loadStudents(1));
    }

    const filterGrade = document.getElementById('filterGrade');
    if (filterGrade) {
        filterGrade.addEventListener('change', () => loadStudents(1));
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
