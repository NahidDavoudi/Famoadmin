// modal.js — Unified reusable modal component

/**
 * Modal sizes
 * @enum {string}
 */
const ModalSize = {
    SM: 'sm',
    MD: 'md',
    LG: 'lg',
};

/**
 * Modal color variants
 * @enum {string}
 */
const ModalVariant = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    DANGER: 'danger',
};

/**
 * Create a standardized modal
 * @param {HTMLElement} triggerElement - The element that triggered the modal
 * @param {Object} options - Modal configuration
 *   - id: string — The modal element ID in the DOM
 *   - size: ModalSize — Small, medium, or large (default: ModalSize.MD)
 *   - variant: ModalVariant — Primary, secondary, or danger (default: ModalVariant.PRIMARY)
 *   - title: string — Modal title
 *   - onOpen: function — Called when modal opens
 *   - onClose: function — Called when modal closes
 *   - closeByEsc: boolean — Whether Esc key closes modal (default: true)
 *   - closeByClickOutside: boolean — Whether clicking outside closes modal (default: true)
 *   - focusTrap: boolean — Whether to enable focus trap (default: true)
 *
 * @returns {Object} Modal controller with open and close methods
 */
export function createModal(triggerElement, options = {}) {
    const {
        id,
        size = ModalSize.MD,
        variant = ModalVariant.PRIMARY,
        title,
        onOpen,
        onClose,
        closeByEsc = true,
        closeByClickOutside = true,
        focusTrap = true,
    } = options;

    if (!id) {
        console.error('Modal ID is required');
        return { open: () => {}, close: () => {} };
    }

    const modalElement = document.getElementById(id);
    if (!modalElement) {
        console.error(`Modal with ID "${id}" not found in DOM`);
        return { open: () => {}, close: () => {} };
    }

    // Get size-specific classes
    const sizeClasses = {
        [ModalSize.SM]: 'max-w-md',
        [ModalSize.MD]: 'max-w-md', // default
        [ModalSize.LG]: 'max-w-4xl',
    };

    // Get variant-specific styles
    const variantStyles = {
        [ModalVariant.PRIMARY]: {
            headerGradient: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            headerTextColor: 'var(--color-primary-dark)',
            iconBg: 'var(--color-primary)',
        },
        [ModalVariant.SECONDARY]: {
            headerGradient: 'linear-gradient(135deg, var(--color-gray-500), var(--color-gray-400))',
            headerTextColor: 'var(--color-gray-100)',
            iconBg: 'var(--color-gray-500)',
        },
        [ModalVariant.DANGER]: {
            headerGradient: 'linear-gradient(135deg, var(--color-danger), #f87171)',
            headerTextColor: 'var(--color-gray-100)',
            iconBg: 'var(--color-danger)',
        },
    };

    const sizeStyle = sizeClasses[size];
    const variantStyle = variantStyles[variant];

    // Initialize focus trap if enabled
    let focusTrapHandler = null;
    if (focusTrap) {
        focusTrapHandler = initFocusTrap(id, {
            escapeToClose: closeByEsc,
        });
    }

    // Modal open function
    const open = () => {
        // Remove hidden class
        modalElement.classList.remove('hidden');

        // Set body overflow
        document.body.style.overflow = 'hidden';

        // Re-initialize focus trap if needed
        if (focusTrap && focusTrapHandler) {
            focusTrapHandler = initFocusTrap(id, {
                escapeToClose: closeByEsc,
            });
        }

        // Call onOpen callback
        if (onOpen) onOpen();
    };

    // Modal close function
    const close = () => {
        // Add hidden class
        modalElement.classList.add('hidden');

        // Restore body overflow
        document.body.style.overflow = 'auto';

        // Call onClose callback
        if (onClose) onClose();

        // Clean up focus trap
        if (focusTrapHandler) {
            focusTrapHandler();
            focusTrapHandler = null;
        }
    };

    // Set up close button if modal has one
    const closeBtn = modalElement.querySelector('[aria-label="بستن modal"], [aria-label="Close"]');
    if (closeBtn) {
        closeBtn.addEventListener('click', close);
    }

    // Set up click outside to close
    if (closeByClickOutside) {
        const overlay = modalElement.parentElement;
        if (overlay && overlay.style.position === 'fixed' && overlay.style.inset === '0') {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    close();
                }
            });
        }
    }

    // Set up Esc key to close
    if (closeByEsc) {
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    // Trigger element click handler
    const handleTriggerClick = () => {
        open();
    };

    // If there's a trigger element, add click listener
    if (triggerElement) {
        triggerElement.addEventListener('click', handleTriggerClick);
    }

    // Return modal controller
    return {
        open,
        close,
        toggle: () => {
            if (modalElement.classList.contains('hidden')) {
                open();
            } else {
                close();
            }
        },
        destroy: () => {
            close();
            if (triggerElement) {
                triggerElement.removeEventListener('click', handleTriggerClick);
            }
            if (focusTrapHandler) {
                focusTrapHandler();
            }
        },
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

    const focusableSelectors = 'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () => {
        return Array.from(modalElement.querySelectorAll(focusableSelectors)).filter(
            el => el.offsetParent !== null
        );
    };

    let initiallyFocused = null;

    const handleKeydown = (e) => {
        // Escape key to close
        if (e.key === 'Escape') {
            // Close the modal - but we need access to the modal controller
            // This is a simplified version; in practice, the modal controller would need
            // to be accessible here. For now, just return.
            return;
        }

        const focusable = getFocusableElements();
        const currentlyFocused = document.activeElement;

        if (!focusable.includes(currentlyFocused)) {
            initiallyFocused = focusable[0];
            initiallyFocused.focus();
            return;
        }

        const currentlyFocusedIndex = focusable.indexOf(currentlyFocused);

        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (currentlyFocusedIndex === 0) {
                    e.preventDefault();
                    focusable[focusable.length - 1].focus();
                }
            } else {
                if (currentlyFocusedIndex === focusable.length - 1) {
                    e.preventDefault();
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
    };
}

/**
 * Standardized modal sizes using CSS variables
 * @type {Object}
 */
const modalSizes = {
    [ModalSize.SM]: {
        maxWidth: '24rem', /* 384px */
        padding: 'var(--space-4) var(--space-5)', /* 16px vertical, 20px horizontal */
    },
    [ModalSize.MD]: {
        maxWidth: '32rem', /* 512px */
        padding: 'var(--space-5) var(--space-6)', /* 20px vertical, 24px horizontal */
    },
    [ModalSize.LG]: {
        maxWidth: '48rem', /* 768px */
        padding: 'var(--space-8) var(--space-6)', /* 32px vertical, 24px horizontal */
    },
};

/**
 * Standardized modal variants using CSS variables
 * @type {Object}
 */
const modalVariants = {
    [ModalVariant.PRIMARY]: {
        headerGradient: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
        headerTextColor: 'var(--color-primary-dark)',
        borderColor: 'var(--color-primary)',
    },
    [ModalVariant.SECONDARY]: {
        headerGradient: 'linear-gradient(135deg, var(--color-gray-500), var(--color-gray-400))',
        headerTextColor: 'var(--color-gray-100)',
        borderColor: 'var(--color-gray-400)',
    },
    [ModalVariant.DANGER]: {
        headerGradient: 'linear-gradient(135deg, var(--color-danger), #f87171)',
        headerTextColor: 'var(--color-gray-100)',
        borderColor: 'var(--color-danger)',
    },
};