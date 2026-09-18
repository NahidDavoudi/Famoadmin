// confirm-modal.js — Accessible confirmation dialog replacement for native confirm()

/**
 * Creates and shows an accessible confirmation modal.
 * Replaces native window.confirm() with a fully styled, keyboard-accessible modal.
 *
 * @param {Object} options
 *   - message: string — The confirmation message to display
 *   - confirmText: string — Text for the confirm button (default: 'بله' / 'Confirm')
 *   - cancelText: string — Text for the cancel button (default: 'خیر' / 'Cancel')
 *   - onConfirm: function — Callback when user confirms
 *   - onCancel: function — Callback when user cancels
 *   - title: string — Optional title for the modal
 *   - ariaRole: string — ARIA role (default: 'dialog')
 *   - ariaLabel: string — ARIA label for the modal
 *   - focusConfirm: boolean — Whether to focus the confirm button after opening (default: true)
 *   - focusCancel: boolean — Whether to focus the cancel button after opening (default: true)
 *   - escapeToClose: boolean — Whether Esc key closes the modal (default: true)
 *   - clickOutsideToClose: boolean — Whether clicking outside closes the modal (default: true)
 *   - confirmAriaLabel: string — ARIA label for confirm button
 *   - cancelAriaLabel: string — ARIA label for cancel button
 *
 * @returns {Promise<boolean>} Resolves with true if confirmed, false if cancelled
 */
export function showConfirm(options = {}) {
    return new Promise((resolve) => {
        const {
            message,
            confirmText = 'بله',
            cancelText = 'خیر',
            onConfirm,
            onCancel,
            title,
            ariaRole = 'dialog',
            ariaLabel,
            focusConfirm = true,
            focusCancel = true,
            escapeToClose = true,
            clickOutsideToClose = true,
            confirmAriaLabel = 'تؤکید',
            cancelAriaLabel = 'انصراف',
        } = options;

        // Clean up any existing modal
        const existingModal = document.getElementById('confirm-modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'confirm-modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontFamily = '"Vazirmatn", sans-serif';
        overlay.style.direction = 'rtl';

        // Create modal container
        const modal = document.createElement('div');
        modal.style.background = 'white';
        modal.style.borderRadius = 'var(--radius-lg)'; /* 16px */
        modal.style.padding = 'var(--space-6)'; /* 24px */
        modal.style.maxWidth = '90%';
        modal.style.width = '400px';
        modal.style.boxShadow = 'var(--shadow-xl)';
        modal.style.position = 'relative';
        modal.style.direction = 'rtl';
        modal.style.zIndex = '10001';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = 'var(--space-4)'; /* 16px */
        closeBtn.style.right = 'var(--space-4)'; /* 16px */
        closeBtn.style.width = 'var(--space-4)'; /* 16px */
        closeBtn.style.height = 'var(--space-4)'; /* 16px */
        closeBtn.style.border = 'none';
        closeBtn.style.background = 'transparent';
        closeBtn.style.color = 'var(--color-gray-500)';
        closeBtn.style.fontSize = '1.25rem';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '10';
        closeBtn.setAttribute('aria-label', 'بستن modal');
        closeBtn.addEventListener('click', closeModal);
        modal.appendChild(closeBtn);

        // Title
        const modalTitle = document.createElement('h2');
        modalTitle.style.margin = '0 0 var(--space-3)'; /* 0 vertical, 12px horizontal */
        modalTitle.style.fontSize = 'var(--text-lg)'; /* 18px */
        modalTitle.style.fontWeight = 'var(--font-semibold)';
        modalTitle.style.color = 'var(--color-primary-dark)';
        modalTitle.style.textAlign = 'center';
        modalTitle.innerHTML = title || 'تأیید_action';
        modal.appendChild(modalTitle);

        // Message
        const modalMessage = document.createElement('p');
        modalMessage.style.margin = '0 0 var(--space-4)'; /* 0 vertical, 16px horizontal */
        modalMessage.style.fontSize = 'var(--text-sm)'; /* 14px */
        modalMessage.style.color = 'var(--color-gray-600)';
        modalMessage.style.textAlign = 'center';
        modalMessage.innerHTML = message;
        modal.appendChild(modalMessage);

        // Buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.gap = 'var(--space-3)'; /* 12px */
        buttonsContainer.style.justifyContent = 'center';
        buttonsContainer.style.marginTop = 'var(--space-4)'; /* 16px */
        modal.appendChild(buttonsContainer);

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.style.flex = '1';
        cancelBtn.style.padding = 'var(--space-3) var(--space-4)'; /* 12px vertical, 16px horizontal */
        cancelBtn.style.borderRadius = 'var(--radius-md)'; /* 8px */
        cancelBtn.style.border = '1px solid var(--color-gray-200)';
        cancelBtn.style.background = 'var(--color-gray-50)';
        cancelBtn.style.color = 'var(--color-gray-700)';
        cancelBtn.style.fontSize = 'var(--text-sm)';
        cancelBtn.style.fontWeight = 'var(--font-medium)';
        cancelBtn.style.cursor = 'pointer';
        cancelBtn.style.transition = 'background 0.2s ease';
        cancelBtn.setAttribute('aria-label', cancelAriaLabel);
        cancelBtn.setAttribute('role', 'button');
        cancelBtn.innerHTML = cancelText;
        cancelBtn.addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
            resolve(false);
        });
        buttonsContainer.appendChild(cancelBtn);

        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.style.flex = '1';
        confirmBtn.style.padding = 'var(--space-3) var(--space-4)'; /* 12px vertical, 16px horizontal */
        confirmBtn.style.borderRadius = 'var(--radius-md)'; /* 8px */
        confirmBtn.style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))';
        confirmBtn.style.color = 'var(--color-primary-dark)';
        confirmBtn.style.fontSize = 'var(--text-sm)';
        confirmBtn.style.fontWeight = 'var(--font-medium)';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.transition = 'background 0.2s ease, transform 0.1s ease';
        confirmBtn.setAttribute('aria-label', confirmAriaLabel);
        confirmBtn.setAttribute('role', 'button');
        confirmBtn.innerHTML = confirmText;
        confirmBtn.addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
            resolve(true);
        });
        buttonsContainer.appendChild(confirmBtn);

        // Append to DOM
        document.body.appendChild(overlay);
        overlay.appendChild(modal);

        // Initialize focus
        if (focusConfirm) {
            setTimeout(() => {
                confirmBtn.focus();
            }, 100);
        } else if (focusCancel) {
            setTimeout(() => {
                cancelBtn.focus();
            }, 100);
        }

        // Keyboard navigation
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                if (escapeToClose) {
                    closeModal();
                    if (onCancel) onCancel();
                    resolve(false);
                }
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                // Cycle between buttons
                e.preventDefault();
                if (confirmBtn === document.activeElement) {
                    cancelBtn.focus();
                } else {
                    confirmBtn.focus();
                }
            } else if (e.key === 'Enter') {
                if (document.activeElement === confirmBtn) {
                    confirmBtn.click();
                } else if (document.activeElement === cancelBtn) {
                    cancelBtn.click();
                }
            }
        };

        modal.addEventListener('keydown', handleKeydown);

        // Click outside to close
        if (clickOutsideToClose) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeModal();
                    if (onCancel) onCancel();
                    resolve(false);
                }
            });
        }

        // Focus trap: trap focus within modal
        let focusableElements = [];
        let currentFocusIndex = 0;

        function getFocusableElements() {
            const selectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
            focusableElements = modal.querySelectorAll(selectors);
            // Remove duplicates and sort
            const uniqueElements = [...new Set(focusableElements)];
            focusableElements = uniqueElements.filter(el => el.offsetParent !== null);
            currentFocusIndex = focusableElements.indexOf(document.activeElement) || 0;
        }

        function trapFocus(e) {
            getFocusableElements();

            // If no focusable elements, allow tab out
            if (focusableElements.length === 0) return;

            // If focus is outside the modal, return focus to first element
            if (!focusableElements.includes(document.activeElement) && document.activeElement !== overlay) {
                focusableElements[0].focus();
                return;
            }

            // Wrap around: first element after last, last before first
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === focusableElements[0]) {
                        e.preventDefault();
                        focusableElements[focusableElements.length - 1].focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === focusableElements[focusableElements.length - 1]) {
                        e.preventDefault();
                        focusableElements[0].focus();
                    }
                }
            }
        }

        modal.addEventListener('keydown', trapFocus);

        // Close function
        function closeModal() {
            overlay.remove();
            document.body.removeEventListener('keydown', handleKeydown);
            document.body.removeEventListener('keydown', trapFocus);
        }
    });
}

/**
 * Convenience wrapper for destructive action confirmations
 * @param {string} message - The confirmation message
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>}
 */
export function confirmDelete(message, options = {}) {
    return showConfirm({
        ...options,
        message,
        confirmText: 'حذف',
        cancelText: 'انصراف',
        confirmAriaLabel: 'حذف',
        cancelAriaLabel: 'انصراف',
        onConfirm: () => true,
    });
}

/**
   Convenience wrapper for generic yes/no confirmations
   @param {string} message - The confirmation message
   * @param {Object} options - Additional options
   * @returns {Promise<boolean>}
   */
export function confirmAction(message, options = {}) {
    return showConfirm({
        ...options,
        message,
        confirmText: 'تایید',
        cancelText: 'انصراف',
        confirmAriaLabel: 'تایید',
        cancelAriaLabel: 'انصراف',
    });
}