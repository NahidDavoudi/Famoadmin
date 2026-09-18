/**
 * Admin Panel - UI Helpers, Mobile Menu, Dates, Student List
 */

import { api } from '../../../shared/js/api-client.js';
import { setElementValue } from './utils.js';

export function addNoSpinnerStyles() {
    if (document.getElementById('no-spinner-styles')) return;

    const style = document.createElement('style');
    style.id = 'no-spinner-styles';
    style.textContent = `
        input.no-spinner::-webkit-outer-spin-button,
        input.no-spinner::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input.no-spinner[type=number] {
            -moz-appearance: textfield;
        }
        button[disabled] {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }
        .fa-spinner {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

export function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (mobileMenuBtn && sidebar && sidebarOverlay) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
        sidebarOverlay.addEventListener('click', closeMobileSidebar);

        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                // Only close on mobile
                if (window.innerWidth < 768) {
                    closeMobileSidebar();
                }
            });
        });
    }
}

export function setupTableResponsive() {
    // Apply data-labels to all responsive tables
    document.querySelectorAll('table.responsive-table').forEach(table => {
        applyDataLabels(table);

        // Watch for dynamic content changes via MutationObserver
        const tbody = table.querySelector('tbody');
        if (tbody && !tbody._responsiveObserver) {
            const observer = new MutationObserver(() => {
                applyDataLabels(table);
            });
            observer.observe(tbody, { childList: true, subtree: false });
            tbody._responsiveObserver = observer;
        }
    });
}

function applyDataLabels(table) {
    const thead = table.querySelector('thead');
    if (!thead) return;

    const headers = [];
    thead.querySelectorAll('th').forEach(th => {
        headers.push(th.textContent.trim());
    });

    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.querySelectorAll('td').forEach((td, index) => {
            if (headers[index] && !td.hasAttribute('colspan')) {
                td.setAttribute('data-label', headers[index]);
            }
        });
    });
}

export function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.substring(0, 8) + '01';

    // Exam entry date is now handled by Jalali date picker in exam-entry.js
    setElementValue('#uploadForm input[name="exam_date"]', today);
    setElementValue('#reportDateFrom', firstOfMonth);
    setElementValue('#reportDateTo', today);
}

export async function loadStudentList(selectId) {
    try {
        const students = await api('get_student_list');
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        const firstOption = select.querySelector('option:first-child');
        select.innerHTML = '';
        if (firstOption) select.appendChild(firstOption);

        students.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = `${s.name} - ${s.grade} ${s.field}`;
            select.appendChild(option);
        });

        if (currentValue) select.value = currentValue;
    } catch (error) {
        console.error('Error loading student list:', error);
    }
}

export function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebar && sidebarOverlay) {
        const isOpen = sidebar.classList.contains('sidebar-open');
        if (isOpen) {
            closeMobileSidebar();
        } else {
            sidebar.classList.add('sidebar-open');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
}

export function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebar && sidebarOverlay) {
        sidebar.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}
