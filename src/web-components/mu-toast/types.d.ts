import type { EventData } from '@mustib/utils';
import type { TemplateResult } from 'lit';
import type { MuIcon } from '../mu-icon';

export type LockedEvent<T = undefined> = EventData<T, T, false, false>;

export type AnimationKeyframes = Keyframe[] | PropertyIndexedKeyframes;

export type ToastData = {
  /**
   * The message to display in the toast
   */
  message: string | TemplateResult;

  spinner?: boolean | TemplateResult;

  direction?: 'ltr' | 'rtl';

  /**
   * The label of the toast
   */
  label?: undefined | string | TemplateResult;

  role?: 'alert' | 'status';

  leaveAnimationDuration?: number;

  enterAnimationDuration?: number;

  priority?: 'immediate' | 'normal' | 'important';

  enterAnimationKeyframes?: AnimationKeyframes;

  progressAnimationKeyframes?: AnimationKeyframes;

  leaveAnimationKeyframes?: AnimationKeyframes;

  interactingBehavior?: 'reset-progress' | 'pause-progress' | 'nothing';

  /**
   * Remove the toast if it is not rendered within the specified time (in ms).
   * If the toast fails to render in this time, it will be discarded.
   * If not set, the toast will wait indefinitely to render if queued.
   */
  maxRenderWaitTime?: undefined | number;

  /**
   * The action of the toast
   */
  action?:
    | undefined
    | ((toast: Toast) => TemplateResult)
    | {
        label: string;
        onClick: (toast: Toast) => void;
      };

  /**
   * The duration of the toast
   */
  duration?: undefined | number;

  /**
   * The hue of the toast color
   */
  colorHue?: undefined | number;

  closeBtn?: boolean | TemplateResult;

  /**
   * The name of the icon to display in the toast. This is the name of the icon from the {@link MuIcon} component
   * @see {@link MuIcon.icons} or a custom lit {@link TemplateResult}
   */
  labelIcon?: undefined | keyof typeof MuIcon.icons | TemplateResult;
};
