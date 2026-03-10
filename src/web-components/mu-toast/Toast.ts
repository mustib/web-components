import { CustomEventEmitter, DeferredValue } from '@mustib/utils';
import type { TemplateResult } from 'lit';
import type { MuIcon } from '../mu-icon';
import { TOAST_LOCK_SYMBOL } from './constants';
import type { MuToastItem } from './mu-toast-item';
import type { ToastController } from './ToastController';
import type { AnimationKeyframes, LockedEvent, ToastData } from './types';

type InternalToastData = {
  id: string;

  message: string | TemplateResult;

  spinner: boolean | TemplateResult;

  status: 'queued' | 'await-rendering' | 'enter' | 'progress' | 'leave';

  direction: 'rtl' | 'ltr';

  label: string | TemplateResult | undefined;

  host: DeferredValue<MuToastItem>;

  enterAnimation: DeferredValue<Animation>;

  progressAnimation: DeferredValue<Animation>;

  leaveAnimation: DeferredValue<Animation>;

  enterAnimationKeyframes: AnimationKeyframes;

  progressAnimationKeyframes: AnimationKeyframes;

  leaveAnimationKeyframes: AnimationKeyframes;

  role: 'alert' | 'status';

  leaveAnimationDuration: number;

  enterAnimationDuration: number;

  interactingBehavior: 'reset-progress' | 'pause-progress' | 'nothing';

  maxRenderWaitTimeTimeoutId: ReturnType<typeof setTimeout> | undefined;

  priority: 'immediate' | 'normal' | 'important';

  action:
    | undefined
    | ((toast: Toast) => TemplateResult)
    | {
        label: string;
        onClick: (toast: Toast) => void;
      };

  duration: number;

  colorHue: number;

  closeBtn: boolean | TemplateResult;

  labelIcon: undefined | keyof typeof MuIcon.icons | TemplateResult;
};

type Events = {
  'state.toast-item.first.rendered': LockedEvent<{
    element: MuToastItem;
  }>;
  'state.await.rendering': LockedEvent;
  'internal.status.enter': LockedEvent;
  'internal.status.progress': LockedEvent;
  'internal.status.leave': LockedEvent;
};

const internalLockKey = Symbol('internal-toast');

export class Toast {
  private controller: ToastController;

  private internalToast: InternalToastData;

  get id() {
    return this.internalToast.id;
  }

  get action() {
    return this.internalToast.action;
  }

  get message() {
    return this.internalToast.message;
  }

  get label() {
    return this.internalToast.label;
  }

  get role() {
    return this.internalToast.role;
  }

  get duration() {
    return this.internalToast.duration;
  }

  get colorHue() {
    return this.internalToast.colorHue;
  }

  get spinner() {
    return this.internalToast.spinner;
  }

  get labelIcon() {
    return this.internalToast.labelIcon;
  }

  get closeBtn() {
    return this.internalToast.closeBtn;
  }

  get leaveAnimationDuration() {
    return this.internalToast.leaveAnimationDuration;
  }

  get enterAnimationDuration() {
    return this.internalToast.enterAnimationDuration;
  }

  get direction() {
    return this.internalToast.direction;
  }

  get interactingBehavior() {
    return this.internalToast.interactingBehavior;
  }

  get status() {
    return this.internalToast.status;
  }

  get priority() {
    return this.internalToast.priority;
  }

  set colorHue(value: number) {
    this.internalToast.colorHue = value;
    if (this.internalToast.host.isResolved)
      this.internalToast.host.resolvedValue.requestUpdate();
  }

  set spinner(value: boolean | TemplateResult) {
    this.internalToast.spinner = value;
    if (this.internalToast.host.isResolved)
      this.internalToast.host.resolvedValue.requestUpdate();
  }

  set labelIcon(value: keyof typeof MuIcon.icons | TemplateResult | undefined) {
    this.internalToast.labelIcon = value;
    if (this.internalToast.host.isResolved)
      this.internalToast.host.resolvedValue.requestUpdate();
  }

  set message(value: string | TemplateResult) {
    this.internalToast.message = value;
    if (this.internalToast.host.isResolved)
      this.internalToast.host.resolvedValue.requestUpdate();
  }

  set label(value: string | TemplateResult | undefined) {
    this.internalToast.label = value;
    if (this.internalToast.host.isResolved)
      this.internalToast.host.resolvedValue.requestUpdate();
  }

  set action(value:
    | ((toast: Toast) => TemplateResult)
    | { label: string; onClick: (toast: Toast) => void }
    | undefined,) {
    this.internalToast.action = value;
    if (this.internalToast.host.isResolved)
      this.internalToast.host.resolvedValue.requestUpdate();
  }

  set closeBtn(value: boolean | TemplateResult) {
    this.internalToast.closeBtn = value;
    if (this.internalToast.host.isResolved)
      this.internalToast.host.resolvedValue.requestUpdate();
  }

  set duration(value: number) {
    this.internalToast.duration = value;
    if (this.internalToast.progressAnimation.isResolved) {
      const currTime =
        this.internalToast.progressAnimation.resolvedValue.currentTime || 0;
      this.internalToast.progressAnimation.resolvedValue.effect?.updateTiming({
        duration: +currTime + value,
      });
    }
  }

  constructor({
    toastData,
    controller,
  }: {
    toastData: ToastData;
    controller: ToastController;
  }) {
    this.controller = controller;
    this.internalToast = this._generateInternalToastData(toastData);
  }

  private _generateInternalToastData(toastData: ToastData): InternalToastData {
    const id = crypto.randomUUID();

    const duration =
      typeof toastData.duration === 'number'
        ? toastData.duration
        : this.controller.defaultDuration;

    const leaveAnimationDuration =
      typeof toastData.leaveAnimationDuration === 'number'
        ? toastData.leaveAnimationDuration
        : this.controller.defaultLeaveAnimationDuration;

    const enterAnimationDuration =
      typeof toastData.enterAnimationDuration === 'number'
        ? toastData.enterAnimationDuration
        : this.controller.defaultEnterAnimationDuration;

    const direction = toastData.direction ?? this.controller.defaultDirection;

    const transformOrigin = direction === 'rtl' ? 'right' : 'left';

    const internalToast: InternalToastData = {
      id,
      action: toastData.action,
      closeBtn: toastData.closeBtn ?? true,
      colorHue:
        typeof toastData.colorHue === 'number'
          ? toastData.colorHue
          : this.controller.colorHue.info,
      duration,
      enterAnimationDuration,
      direction,
      priority: toastData.priority ?? 'normal',
      host: new DeferredValue<MuToastItem>(),
      enterAnimation: new DeferredValue<Animation>(),
      progressAnimation: new DeferredValue<Animation>(),
      leaveAnimation: new DeferredValue<Animation>(),
      enterAnimationKeyframes: toastData.enterAnimationKeyframes ?? [
        { scale: '0' },
        { scale: '1' },
      ],
      progressAnimationKeyframes: toastData.progressAnimationKeyframes ?? [
        { scale: '0 1', visibility: 'visible', transformOrigin },
        { scale: '1 1', visibility: 'visible', transformOrigin },
      ],
      leaveAnimationKeyframes: toastData.leaveAnimationKeyframes ?? [
        { scale: '1' },
        { scale: '0' },
      ],
      interactingBehavior:
        toastData.interactingBehavior || this.controller.interactingBehavior,
      leaveAnimationDuration,
      label: toastData.label,
      labelIcon: toastData.labelIcon,
      maxRenderWaitTimeTimeoutId: undefined,
      message: toastData.message,
      role: toastData.role || 'status',
      spinner: toastData.spinner || false,
      status: 'queued',
    };

    if (
      typeof toastData.maxRenderWaitTime === 'number' &&
      toastData.maxRenderWaitTime > 0 &&
      toastData.maxRenderWaitTime !== Infinity
    ) {
      internalToast.maxRenderWaitTimeTimeoutId = setTimeout(() => {
        this.remove();
      }, toastData.maxRenderWaitTime);
    }

    return internalToast;
  }

  async gracefulRemove() {
    switch (this.internalToast.status) {
      case 'queued':
      case 'await-rendering':
        this.remove();
        break;
      case 'enter':
        {
          const enterAnimation =
            await this.internalToast.enterAnimation.current;
          enterAnimation.finish();
          await enterAnimation.finished;
          const progressAnimation =
            await this.internalToast.progressAnimation.current;
          progressAnimation.finish();
        }
        break;
      case 'progress':
        {
          const progressAnimation =
            await this.internalToast.progressAnimation.current;
          progressAnimation.finish();
        }
        break;
      case 'leave':
        break;
      default:
        this.internalToast.status satisfies never;
        break;
    }
  }

  remove() {
    this.controller.emitter.dispatch(
      'state.request.remove.toast',
      {
        toast: this,
      },
      {
        lockSymbol: TOAST_LOCK_SYMBOL,
      },
    );
  }

  async pauseProgress() {
    if (this.internalToast.status === 'leave') return;
    const animation = await this.internalToast.progressAnimation.current;
    animation.pause();
  }

  async resumeProgress() {
    if (this.internalToast.status === 'leave') return;
    const animation = await this.internalToast.progressAnimation.current;
    animation.play();
  }

  async resetProgress() {
    if (this.internalToast.status === 'leave') return;
    const animation = await this.internalToast.progressAnimation.current;
    animation.currentTime = 0;
  }

  emitter = new CustomEventEmitter<Events>({
    'state.await.rendering': {
      runningBehavior: 'async-sequential',
      dispatchable: false,
      lockSymbol: TOAST_LOCK_SYMBOL,
      beforeAll: () => {
        if (!this.internalToast.host.isPending) return;
        this.internalToast.status = 'await-rendering';
      },
    },

    'state.toast-item.first.rendered': {
      runningBehavior: 'async-sequential',
      dispatchable: false,
      lockSymbol: TOAST_LOCK_SYMBOL,
      beforeAll: (data) => {
        if (!this.internalToast.host.isPending) return;
        this.internalToast.host.resolve(data.listenerValue.element);
        clearTimeout(this.internalToast.maxRenderWaitTimeTimeoutId);
        this.emitter.dispatch('internal.status.enter', undefined, {
          lockSymbol: internalLockKey,
        });
      },
    },

    'internal.status.enter': {
      runningBehavior: 'async-sequential',
      dispatchable: false,
      lockSymbol: internalLockKey,
      beforeAll: () => {
        if (this.internalToast.status !== 'await-rendering') return;
        let animation: Animation;
        if (this.internalToast.enterAnimation.isPending) {
          animation = new Animation(
            new KeyframeEffect(
              this.internalToast.host.resolvedValue,
              this.internalToast.enterAnimationKeyframes,
              {
                duration: this.internalToast.enterAnimationDuration,
                easing: 'ease-in-out',
              },
            ),
          );

          this.internalToast.enterAnimation.resolve(animation);
        } else {
          animation = this.internalToast.enterAnimation.resolvedValue;
        }
        animation.play();
        this.internalToast.status = 'enter';
        animation.onfinish = () => {
          this.emitter.dispatch('internal.status.progress', undefined, {
            lockSymbol: internalLockKey,
          });
        };
      },
    },

    'internal.status.progress': {
      runningBehavior: 'async-sequential',
      dispatchable: false,
      lockSymbol: internalLockKey,
      beforeAll: () => {
        if (this.internalToast.status !== 'enter') return;
        let animation: Animation;
        if (this.internalToast.progressAnimation.isPending) {
          animation = new Animation(
            new KeyframeEffect(
              this.internalToast.host.resolvedValue.progressElement || null,
              this.internalToast.progressAnimationKeyframes,
              {
                duration: this.internalToast.duration,
                easing: 'linear',
              },
            ),
          );

          this.internalToast.progressAnimation.resolve(animation);
        } else {
          animation = this.internalToast.progressAnimation.resolvedValue;
        }

        animation.play();
        this.internalToast.status = 'progress';
        animation.onfinish = () => {
          this.emitter.dispatch('internal.status.leave', undefined, {
            lockSymbol: internalLockKey,
          });
        };
      },
    },

    'internal.status.leave': {
      runningBehavior: 'async-sequential',
      dispatchable: false,
      lockSymbol: internalLockKey,
      beforeAll: () => {
        if (this.internalToast.status !== 'progress') return;
        let animation: Animation;
        if (this.internalToast.leaveAnimation.isPending) {
          animation = new Animation(
            new KeyframeEffect(
              this.internalToast.host.resolvedValue,
              this.internalToast.leaveAnimationKeyframes,
              {
                duration: this.internalToast.leaveAnimationDuration,
                easing: 'ease-in-out',
              },
            ),
          );

          this.internalToast.leaveAnimation.resolve(animation);
        } else {
          animation = this.internalToast.leaveAnimation.resolvedValue;
        }

        animation.play();
        this.internalToast.status = 'leave';
        animation.onfinish = () => {
          this.remove();
        };
      },
    },
  });
}
