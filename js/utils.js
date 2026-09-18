/**
 * Admin Panel - Utilities (re-export ui-helpers + form helpers)
 */

export { showModal, hideModal, showAlert, escapeHtml, formatDate } from '../../../shared/js/ui-helpers.js';

export function getElementValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

export function setFormValues(form, values) {
    Object.entries(values).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    });
}

export function setElementValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.value = value;
}

export function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || 0;
}

export function toggleElement(id, show) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.toggle('hidden', !show);
    }
}

export function icon(name, className = 'icon') {
    return `<svg class="${className}" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-${name}"/></svg>`;
}

/**
 * Set loading state on a button
 * @param {HTMLElement|string} button - Button element or selector
 * @param {boolean} isLoading - Whether to show loading state
 * @param {string} loadingText - Text to show during loading
 * @returns {Function} Cleanup function to restore button state
 */
export function setButtonLoading(button, isLoading = true, loadingText = 'در حال انجام...') {
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (!btn) return () => {};
    
    if (isLoading) {
        // Store original state
        btn.dataset.originalText = btn.innerHTML;
        btn.dataset.originalDisabled = btn.disabled;
        
        // Set loading state
        btn.disabled = true;
        btn.innerHTML = `<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></span>${loadingText}`;
        
        // Return cleanup function
        return () => {
            btn.disabled = btn.dataset.originalDisabled === 'true';
            btn.innerHTML = btn.dataset.originalText;
            delete btn.dataset.originalText;
            delete btn.dataset.originalDisabled;
        };
    } else {
        // Restore original state
        if (btn.dataset.originalText) {
            btn.disabled = btn.dataset.originalDisabled === 'true';
            btn.innerHTML = btn.dataset.originalText;
            delete btn.dataset.originalText;
            delete btn.dataset.originalDisabled;
        }
        return () => {};
    }
}

/**
 * Wrap an async operation with loading state
 * @param {HTMLElement|string} button - Button element or selector
 * @param {Function} operation - Async operation to perform
 * @param {string} loadingText - Text to show during loading
 * @returns {Promise} Result of the operation
 */
export async function withButtonLoading(button, operation, loadingText = 'در حال انجام...') {
    const cleanup = setButtonLoading(button, true, loadingText);
    
    try {
        const result = await operation();
        return result;
    } finally {
        cleanup();
    }
}
