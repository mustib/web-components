import { CustomEventEmitter } from '@mustib/utils';
import { TOAST_LOCK_SYMBOL } from './constants';
import type { MuToast } from './mu-toast';
import { Toast } from './Toast';
import type { LockedEvent, ToastData } from './types';

type Events = {
  'state.request.remove.toast': LockedEvent<{ toast: Toast }>;
};

export class ToastController {
  private toastsIdMap = new Map<string, Toast>();

  private queuedToastsQueue: Toast[] = [];

  toastsQueue: Toast[] = [];

  private _maxVisibleToastsCount = 3;

  private _stackToasts = true;

  interactingBehavior: Toast['interactingBehavior'] = 'pause-progress';

  colorHue = {
    success: 120,
    error: 0,
    warning: 60,
    info: 200,
  };

  defaultDuration = 10000;

  defaultLeaveAnimationDuration = 300;

  defaultEnterAnimationDuration = 300;

  defaultDirection = getComputedStyle(this.portal).direction as 'ltr' | 'rtl';

  get maxVisibleToastsCount() {
    return this._maxVisibleToastsCount;
  }

  set maxVisibleToastsCount(value: number) {
    this._maxVisibleToastsCount = value;
    this.rolloverQueuedToasts();
  }

  get position() {
    return this.portal.position;
  }

  set position(value: MuToast['position']) {
    this.portal.position = value;
  }

  set stackToasts(value: boolean) {
    this._stackToasts = value;
    this.portal.requestUpdate();
  }

  /**
   * Indicates if toast notifications should stack atop each other,
   * such that only the latest is fully visible while older toasts
   * are partially hidden beneath it. This enhances focus and reduces clutter.
   */
  get stackToasts() {
    return this._stackToasts;
  }

  constructor(private portal: MuToast) {}

  gracefulRemoveVisible() {
    this.toastsQueue.forEach((t) => {
      t.gracefulRemove();
    });
  }

  gracefulRemoveAll() {
    this.gracefulRemoveVisible();
    this.queuedToastsQueue.forEach((t) => {
      t.remove();
    });
  }

  /**
   * Re-parents the toast portal to the specified node.
   *
   * Useful for ensuring toasts appear correctly when top-layer elements like fullscreen containers
   * or dialogs are active. The specified node should be a valid container element (not void elements like <img />).
   *
   * @param node - The new parent node for the toast portal.
   */
  reParent(node: Node = document.body) {
    if (node === this.portal.parentNode) return;
    node.appendChild(this.portal);
  }

  /**
   * Makes the toast portal a popover,
   * ensuring that toasts appear above all other elements
   * (e.g., dialogs, fullscreen content) in the top-layer.
   * This is useful for proper overlay stacking and visibility.
   */
  popover() {
    const { portal } = this;
    portal.popover = 'manual';
    portal.hidePopover();
    portal.showPopover();
  }

  success(message: string) {
    return this.create({
      message,
      label: 'Success:',
      labelIcon: 'checkMark',
      role: 'status',
      colorHue: this.colorHue.success,
    });
  }

  error(message: string) {
    return this.create({
      message,
      label: 'Error:',
      labelIcon: 'error',
      role: 'alert',
      colorHue: this.colorHue.error,
      priority: 'important',
    });
  }

  warning(message: string) {
    return this.create({
      message,
      label: 'Warning:',
      labelIcon: 'warning',
      role: 'alert',
      colorHue: this.colorHue.warning,
      priority: 'important',
    });
  }

  info(message: string) {
    return this.create({
      message,
      label: 'Info:',
      role: 'status',
      labelIcon: 'info',
      colorHue: this.colorHue.info,
    });
  }

  create(toastData: ToastData | string): Toast {
    const toast = new Toast({
      toastData:
        typeof toastData === 'string' ? { message: toastData } : toastData,
      controller: this,
    });
    this.toastsIdMap.set(toast.id, toast);

    switch (toast.priority) {
      case 'immediate':
        this.queuedToastsQueue.unshift(toast);
        if (this.toastsQueue.length >= this._maxVisibleToastsCount) {
          (
            this.toastsQueue.find((t) => t.priority === 'normal') ||
            this.toastsQueue[0]
          )?.remove();
        }
        break;

      case 'important':
        this.queuedToastsQueue.unshift(toast);
        if (this.toastsQueue.length >= this._maxVisibleToastsCount) {
          (
            this.toastsQueue.find((t) => t.priority === 'normal') ||
            this.toastsQueue[0]
          )?.gracefulRemove();
        }
        break;
      case 'normal':
        this.queuedToastsQueue.push(toast);
        break;
      default:
        break;
    }

    this.rolloverQueuedToasts();

    return toast;
  }

  private rolloverQueuedToasts() {
    if (this.toastsQueue.length >= this.maxVisibleToastsCount) {
      return;
    }

    const rolloverToastsCount =
      this.maxVisibleToastsCount - this.toastsQueue.length;
    const rolloverToasts = this.queuedToastsQueue.splice(
      0,
      rolloverToastsCount,
    );

    if (rolloverToasts.length === 0) {
      return;
    }

    rolloverToasts.forEach((t) => {
      t.emitter.dispatch('state.await.rendering', undefined, {
        lockSymbol: TOAST_LOCK_SYMBOL,
      });
    });
    this.toastsQueue.push(...rolloverToasts);
    this.portal.requestUpdate();
  }

  emitter = new CustomEventEmitter<Events>({
    'state.request.remove.toast': {
      runningBehavior: 'async-sequential',
      dispatchable: false,
      lockSymbol: TOAST_LOCK_SYMBOL,
      beforeAll: (data) => {
        const toast = data.listenerValue.toast;

        this.toastsIdMap.delete(toast.id);

        if (toast.status === 'queued') {
          this.queuedToastsQueue = this.queuedToastsQueue.filter(
            (t) => t.id !== toast.id,
          );
          return;
        }

        this.toastsQueue = this.toastsQueue.filter((t) => t.id !== toast.id);

        this.rolloverQueuedToasts();
        this.portal.requestUpdate();
      },
    },
  });
}
