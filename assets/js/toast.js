// toast.js — Toast notification stack replacement for single alertBox

/**
 * Toast notification types with their styling
 * @enum {string}
 */
const ToastType = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

/**
 * Default toast options
 * @typedef {Object} ToastOptions
 * @property {string} type - Toast type (success, error, warning, info)
 * @property {string} message - The toast message
 * @property {number} duration - Auto-dismiss duration in ms (default: 5000)
 * @property {boolean} showCloseButton - Whether to show close button (default: false)
 * @property {string} actionText - Text for action button (default: null)
 * @property {Function} onAction - Callback when action button is clicked
 */

/**
 * Toast container management
 * Creates a persistent toast container at the bottom-right of the screen
 */
class ToastContainer {
    constructor() {
        this.toasts = [];
        this.maxToasts = 4; // Maximum number of toasts in the stack
        this.container = null;
        this.init();
    }

    init() {
        // Check if container already exists
        if (document.getElementById('toast-container')) {
            this.container = document.getElementById('toast-container');
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.position = 'fixed';
        this.container.style.bottom = 'var(--space-4)'; /* 16px */
        this.container.style.right = 'var(--space-4)'; /* 16px */
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.gap = 'var(--space-3)'; /* 12px */
        this.container.style.zIndex = '9999';
        this.container.style.alignItems = 'flex-end';
        this.container.style.fontFamily = '"Vazirmatn", sans-serif';
        this.container.style.direction = 'rtl';
        document.body.appendChild(this.container);
    }

    /**
     * Show a toast notification
     * @param {string} message - The toast message
     * @param {ToastOptions} options - Toast options
     * @returns {HTMLElement} The toast element
     */
    show(message, options = {}) {
        const {
            type = ToastType.INFO,
            duration = 5000,
            showCloseButton = false,
            actionText,
            onAction,
        } = options;

        const toast = document.createElement('div');
        toast.style.background = this.getBackgroundColor(type);
        toast.style.color = this.getTextColor(type);
        toast.style.padding = 'var(--space-4) var(--space-5)'; /* 16px vertical, 20px horizontal */
        toast.style.borderRadius = 'var(--radius-md)'; /* 8px */
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.minWidth = '200px';
        toast.style.maxWidth = '80vw';
        toast.style.width = 'fit-content';
        toast.style.zIndex = '9999';
        toast.style.direction = 'rtl';
        toast.style.fontSize = 'var(--text-sm)';
        toast.style.fontWeight = 'var(--font-medium)';
        toast.style.lineHeight = '1.5';
        toast.style.position = 'relative';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

        // Icon
        const iconSpan = document.createElement('span');
        iconSpan.style.marginRight = 'var(--space-3)'; /* 12px */
        iconSpan.style.fontSize = 'var(--text-lg)';
        iconSpan.innerHTML = this.getIcon(type);
        toast.appendChild(iconSpan);

        // Message
        const messageSpan = document.createElement('span');
        messageSpan.style.wordBreak = 'break-word';
        messageSpan.innerHTML = message;
        toast.appendChild(messageSpan);

        // Close button
        if (showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.style.position = 'absolute';
            closeBtn.style.top = 'var(--space-1)'; /* 4px */
            closeBtn.style.right = 'var(--space-1)'; /* 4px */
            closeBtn.style.width = 'var(--space-3)'; /* 12px */
            closeBtn.style.height = 'var(--space-3)'; /* 12px */
            closeBtn.style.border = 'none';
            closeBtn.style.background = 'transparent';
            closeBtn.style.color = 'currentColor';
            closeBtn.style.fontSize = '1rem';
            closeBtn.style.cursor = 'pointer';
            closeBtn.setAttribute('aria-label', 'بستن toast');
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => this.remove(toast));
            toast.appendChild(closeBtn);
        }

        // Action button
        if (actionText && onAction) {
            const actionBtn = document.createElement('button');
            actionBtn.style.marginTop = 'var(--space-2)'; /* 8px */
            actionBtn.style.padding = 'var(--space-2) var(--space-3)'; /* 8px vertical, 12px horizontal */
            actionBtn.style.borderRadius = 'var(--radius-sm)'; /* 6px */
            actionBtn.style.background = 'transparent';
            actionBtn.style.color = this.getTextColor(type);
            actionBtn.style.border = '1px solid currentColor';
            actionBtn.style.fontSize = 'var(--text-xs)';
            actionBtn.style.cursor = 'pointer';
            actionBtn.setAttribute('aria-label', 'عملیات additional');
            actionBtn.innerHTML = actionText;
            actionBtn.addEventListener('click', () => {
                onAction();
                this.remove(toast);
            });
            toast.appendChild(actionBtn);
        }

        // Add to container
        this.container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
        }, 10);

        // Auto-dismiss
        const timer = setTimeout(() => {
            this.remove(toast);
        }, duration);

        this.toasts.push({ element: toast, timer });

        // Enforce max toasts
        if (this.toasts.length > this.maxToasts) {
            this.remove(this.toasts[0].element);
        }

        return toast;
    }

    /**
     * Remove a toast from the container
     * @param {HTMLElement} toastElement - The toast element to remove
     */
    remove(toastElement) {
        const toast = this.toasts.find(t => t.element === toastElement);
        if (toast) {
            clearTimeout(toast.timer);
        }

        if (toastElement && toastElement.parentNode) {
            toastElement.style.transform = 'translateY(100%)';
            toastElement.style.transition = 'transform 0.3s ease';

            setTimeout(() => {
                if (toastElement.parentNode) {
                    toastElement.parentNode.removeChild(toastElement);
                }
            }, 300);
        }

        // Remove from array
        this.toasts = this.toasts.filter(t => t.element !== toastElement);
    }

    /**
     * Get background color for toast type
     * @param {string} type - Toast type
     * @returns {string}
     */
    getBackgroundColor(type) {
        switch (type) {
            case ToastType.SUCCESS:
                return 'color-mix(in srgb, var(--color-success), var(--color-gray-50))';
            case ToastType.ERROR:
                return 'color-mix(in srgb, var(--color-danger), var(--color-gray-50))';
            case ToastType.WARNING:
                return 'color-mix(in srgb, var(--color-warning), var(--color-gray-50))';
            case ToastType.INFO:
            default:
                return 'var(--color-gray-100)';
        }
    }

    /**
     * Get text color for toast type
     * @param {string} type - Toast type
     * @returns {string}
     */
    getTextColor(type) {
        switch (type) {
            case ToastType.SUCCESS:
                return 'var(--color-success)';
            case ToastType.ERROR:
                return 'var(--color-danger)';
            case ToastType.WARNING:
                return 'var(--color-warning)';
            case ToastType.INFO:
            default:
                return 'var(--color-gray-700)';
        }
    }

    /**
     * Get icon for toast type
     * @param {string} type - Toast type
     * @returns {string} SVG HTML
     */
    getIcon(type) {
        switch (type) {
            case ToastType.SUCCESS:
                return '<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-check"/></svg>';
            case ToastType.ERROR:
                return '<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-x"/></svg>';
            case ToastType.WARNING:
                return '<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-alert"/></svg>';
            case ToastType.INFO:
            default:
                return '<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-info"/></svg>';
        }
    }

    /**
     * Success toast
     * @param {string} message - The message
     * @param {Object} options - Additional options
     * @returns {HTMLElement}
     */
    success(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.SUCCESS });
    }

    /**
     * Error toast
     * @param {string} message - The message
     * @param {Object} options - Additional options
     * @returns {HTMLElement}
     */
    error(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.ERROR });
    }

    /**
     * Warning toast
     * @param {string} message - The message
     * @param {Object} options - Additional options
     * @returns {HTMLElement}
     */
    warning(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.WARNING });
    }

    /**
     * Info toast
     * @param {string} message - The message
     * @param {Object} options - Additional options
     * @returns {HTMLElement}
     */
    info(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.INFO });
    }
}

// Create and export singleton instance
const toastContainer = new ToastContainer();
export default toastContainer;

/**
 * Convenience functions for common use cases
 */

export function showToast(message, type = ToastType.INFO, duration = 5000) {
    return toastContainer.show(message, { type, duration });
}

export function showSuccessToast(message, duration = 5000) {
    return toastContainer.success(message, { duration });
}

export function showErrorToast(message, duration = 5000) {
    return toastContainer.error(message, { duration });
}

export function showWarningToast(message, duration = 5000) {
    return toastContainer.warning(message, { duration });
}

export function showInfoToast(message, duration = 5000) {
    return toastContainer.info(message, { duration });
}