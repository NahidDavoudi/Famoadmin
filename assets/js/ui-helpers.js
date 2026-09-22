// ui-helpers.js
import toastContainer from './toast.js';

import { createFocusTrap, initFocusTrap } from './focus-trap.js';

export function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Initialize focus trap
        initFocusTrap(id, {
            escapeToClose: true,
        });
    } else {
        console.warn(`Modal with id "${id}" not found`);
    }
}

export function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

export function showAlert(message, type = 'success', duration = 5000) {
    const typeMap = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info',
    };

    const toastType = typeMap[type] || ToastType.INFO;
    return toastContainer.show(message, { type: toastType, duration });
}

export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}