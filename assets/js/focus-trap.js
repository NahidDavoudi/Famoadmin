// focus-trap.js — Accessible focus trap for modals

/**
 * Creates a focus trap for a modal element.
 * Ensures keyboard users cannot tab out of the modal.
 * Manages focus restoration when the modal is closed.
 *
 * @param {HTMLElement} modalElement - The modal element to trap focus within
 * @param {Object} options - Configuration options
 *   - allowOutsideFocus: boolean — Whether focus can leave the modal (default: false)
 *   - escapeToClose: boolean — Whether Esc key closes the modal (default: true)
 *   - onClose: function — Callback when focus is restored/restored
 *
 * @returns {Object} Cleanup function to remove the event listeners
 */
export function createFocusTrap(modalElement, options = {}) {
    let allowOutsideFocus = options.allowOutsideFocus || false;
    let escapeToClose = options.escapeToClose !== false;
    let onClose = options.onClose || (() => { });

    const focusableSelectors = 'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () => {
        return Array.from(modalElement.querySelectorAll(focusableSelectors)).filter(
            el => el.offsetParent !== null
        );
    };

    let initiallyFocused = null;

    const handleKeydown = (e) => {
        // Escape key to close
        if (e.key === 'Escape' && escapeToClose) {
            onClose();
            return;
        }

        const focusable = getFocusableElements();
        const currentlyFocused = document.activeElement;

        if (!focusable.includes(currentlyFocused)) {
            // Focus is outside focusable elements inside modal; return to first
            initiallyFocused = focusable[0];
            initiallyFocused.focus();
            return;
        }

        const currentlyFocusedIndex = focusable.indexOf(currentlyFocused);

        if (e.key === 'Tab') {
            // Shift + Tab
            if (e.shiftKey) {
                if (currentlyFocusedIndex === 0) {
                    e.preventDefault();
                    if (allowOutsideFocus) return;
                    focusable[focusable.length - 1].focus();
                }
            } else {
                // Tab key
                if (currentlyFocusedIndex === focusable.length - 1) {
                    e.preventDefault();
                    if (allowOutsideFocus) return;
                    focusable[0].focus();
                }
            }
        } else if (e.key === 'Home') {
            e.preventDefault();
            focusable[0].focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            focusable[focusable.length - 1].focus();
        }
    };

    // Set initial focus to first focusable element
    initiallyFocused = getFocusableElements()[0];
    if (initiallyFocused) {
        initiallyFocused.focus();
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeydown);

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleKeydown);
        // Optionally restore focus to the element that triggered the modal
        onClose();
    };
}

/**
 * Initialize focus trap for a modal by its ID
 * @param {string} modalId - The ID of the modal element
 * @param {Object} options - Focus trap options
 * @returns {function} Cleanup function
 */
export function initFocusTrap(modalId, options = {}) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return () => { };

    return createFocusTrap(modalElement, options);
}