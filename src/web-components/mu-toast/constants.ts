/**
 * Symbol used to lock internal toast events.
 * Prevents external code from dispatching state-changing events,
 * ensuring only the Toast and ToastController can manage lifecycle.
 */
export const TOAST_LOCK_SYMBOL = Symbol('toast-lock');
