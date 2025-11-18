import {
  debounce,
  getElementBoundaries,
  throttle,
  wait,
} from '@mustib/utils/browser';
import { type CSSResultGroup, css, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { MuElement, type MuElementComponent } from '../mu-element';
import { MuTransparent } from '../mu-transparent';
import { MuRangeFill } from './mu-range-fill';
import { MuRangeThumb } from './mu-range-thumb';

export type MuRangeComponent = {
  attributes: MuElementComponent['attributes'] & {
    axis: MuRange['axis'];
    min: MuRange['min'];
    max: MuRange['max'];
    value: MuRange['value'];
    'default-value': MuRange['defaultValue'];
    'empty-area': MuRange['emptyArea'];
  };

  events: Events;
};

type RangeThumb = {
  element: MuRangeThumb;
  linkedFillElements: RangeFill[] | undefined;
  value: number;
  index: number;
  name: string;
};

type RangeFill = {
  element: MuRangeFill;
  linkedThumbs: RangeThumb[];
};

type ChangeEventSrc =
  | 'pointerdown'
  | 'pointerup'
  | 'pointermove'
  | 'keydown'
  | 'insert';

type Events = {
  /**
   * Emitted when pointerdown on a non-thumb element and empty-area attribute has a value of "dispatch".
   *
   * This can be used to dynamically add thumbs.
   */
  'mu-range-empty-area': CustomEvent<{
    values: ReturnType<MuRange['_getValuesFromEvent']>;
  }>;

  /**
   * Emitted when the value of the range changes.
   */
  'mu-range-change': CustomEvent<{
    data: { name: string; value: number }[];
    src: ChangeEventSrc;
  }>;

  /**
   * Emitted when new thumbs are added after the initial render.
   */
  'mu-range-added-thumbs': CustomEvent<{
    data: { name: string; value: number }[];
  }>;

  /**
   * Emitted when thumbs are removed after the initial render.
   */
  'mu-range-removed-thumbs': CustomEvent<{
    data: { name: string; value: number }[];
  }>;
};

export class MuRange extends MuElement {
  static override styles?: CSSResultGroup | undefined = [
    MuElement.cssBase,
    css`
    #container {
      --range-background-color: var(--mu-range-background-color, var(--mu-color-100));
      --range-thickness: var(--mu-range-thickness, calc(var(--mu-base-rem) * .7));
      position: relative;
      border-radius: 9999px;
      background-color: var(--range-background-color);
    }
    
    :host(:focus-visible) #container::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: inherit;
      ${MuElement.css.focus}
    }

    :host([axis='x']) #container,
    :host([axis='-x']) #container
    {
      height: var(--range-thickness);
      width: var(--range-distance, 100%);
    }

    :host([axis='y']) #container,
    :host([axis='-y']) #container
    {
      width: var(--range-thickness);
      height: var(--range-distance, 150px);
      max-height: 100%;
    }

    @media (prefers-color-scheme: light) {
      #container {
        --range-background-color: var(--mu-range-background-color, var(--mu-color-200));
        color: red;
      }
    }
    
  `,
  ];

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined;

  /**
   * The axis of the range.
   *
   * `x` - horizontal axis auto matching the direction
   *
   * `-x` - horizontal axis reversed
   *
   * `y` - vertical axis
   *
   * `-y` - vertical axis reversed
   */
  @property({ reflect: true, type: String })
  axis: 'x' | 'y' | '-x' | '-y' = 'x';

  /**
   * The minimum value of the range.
   */
  @property({ reflect: true, type: Number })
  min = 0;

  /**
   * The maximum value of the range.
   */
  @property({ reflect: true, type: Number })
  max = 100;

  /**
   * The value of the range for the controlled mode.
   *
   * @see {@link MuRange.setValueFromString}
   *
   * @default undefined
   */
  @property()
  value?: string;

  /**
   * The initial render value of the range for the uncontrolled mode.
   *
   * @see {@link MuRange.setValueFromString}
   *
   * @default undefined
   */
  @property({ attribute: 'default-value' })
  defaultValue?: string;

  /**
   * Thumb behavior when pointerdown on a non-thumb element.
   *
   * - `prevent` - don't do anything
   *
   * - `dispatch` - dispatch the {@link Events['mu-range-empty-area']} event
   *
   * - `nearest` - move the nearest thumb to the pointer position
   *
   * @default `nearest`
   */
  @property({ reflect: true, type: String, attribute: 'empty-area' })
  emptyArea: 'prevent' | 'dispatch' | 'nearest' = 'nearest';

  protected _isReadyPromise = this.generateIsReadyPromise();

  get isControlled() {
    return this.value !== undefined;
  }

  _thumbs: RangeThumb[] = [];

  _thumbsElementsMap = new Map<MuRangeThumb, RangeThumb>();

  _thumbsNamesMap = new Map<string, RangeThumb>();

  _activeThumb: RangeThumb | undefined;

  /**
   * this is used to prevent focus listener from running when the pointer is down otherwise active thumb will gain focus when the pointer is down
   */
  protected _isPointerDown = false;

  set activeThumb(thumb: RangeThumb | undefined) {
    if (
      thumb &&
      (thumb.element.transparent ||
        thumb.element.disabled ||
        thumb.element.readonly)
    )
      return;
    const prev = this._activeThumb;
    if (prev) prev.element.focused = false;

    this._activeThumb = thumb;
  }

  get activeThumb() {
    return this._activeThumb;
  }

  constructor() {
    super();
    this.addEventListener('keydown', this._keydownHandler);

    this.updateComplete.then(() => {
      this.addEventListener('blur', () => {
        if (this._activeThumb) {
          this._activeThumb.element.focused = false;
        }
      });

      this.addEventListener('focus', (e) => {
        if (
          this._isPointerDown ||
          this.disabled ||
          this.readonly ||
          e.defaultPrevented
        )
          return;
        if (this._activeThumb) {
          e.preventDefault();
          this._activeThumb.element.focused = true;
        } else {
          this.switchNavigationActiveItem('next') && e.preventDefault();
        }
      });

      this.renderRoot.addEventListener('slotchange', this._slotChangeHandler);
      this.addEventListener(
        'mu-transparent-slotchange',
        this._slotChangeHandler,
      );
    });
  }

  override disconnectedCallback(): void {
    document.removeEventListener(
      'pointermove',
      this._documentPointermoveHandler,
    );
    document.removeEventListener('pointerup', this._documentPointerupHandler);
  }

  /**
   *
   * @returns an array of objects containing the name and value of each thumb
   */
  getValue() {
    return this._thumbs.map((thumb) => ({
      name: thumb.name,
      value: thumb.value,
    }));
  }

  /**
   * Programmatically insert a thumb element
   */
  async insertThumbElement(thumbEl: MuRangeThumb) {
    this.appendChild(thumbEl);
    await wait();
    await this.updateComplete;
    const thumb = this._thumbsElementsMap.get(thumbEl);
    if (!thumb) return;
    this._setThumbValue({ thumb, value: thumb.value, src: 'insert' });
    this.activeThumb = thumb;
  }

  /**
   * Switches the active thumb for keyboard navigation
   */
  switchNavigationActiveItem(direction: 'next' | 'prev'): boolean {
    const navigationThumb = this.getNavigationItem({
      direction,
      items: this._thumbs,
      fromIndex: this._activeThumb?.index,
      isNavigable(item) {
        return !(
          item.element.transparent ||
          item.element.disabled ||
          item.element.readonly
        );
      },
    });

    if (!navigationThumb) return false;
    this.activeThumb = navigationThumb;
    this.focus();
    navigationThumb.element.focused = true;
    return true;
  }

  dispatchChangeEvent(
    thumbs = this._thumbs as { name: string; value: number }[],
    src: ChangeEventSrc,
  ) {
    const eventName = 'mu-range-change';
    const data = thumbs.map<Events[typeof eventName]['detail']['data'][number]>(
      (thumb) => ({ name: thumb.name, value: thumb.value }),
    );

    this.dispatchEvent(
      new CustomEvent<Events[typeof eventName]['detail']>(eventName, {
        bubbles: true,
        composed: true,
        detail: { data: data, src },
        cancelable: true,
      }),
    );
  }

  _setThumbValue({
    src,
    thumb,
    value,
  }: {
    thumb: RangeThumb;
    value: number;
    src: ChangeEventSrc;
  }) {
    const stepValue = this._getThumbStepValue(thumb, value);

    if (stepValue === thumb.value) return;

    if (this.isControlled) {
      this.sortThumbs();
      const sortedThumbs = this._thumbs.map((_thumb) => ({
        name: _thumb.name,
        value: _thumb.name === thumb.name ? stepValue : thumb.value,
      }));

      this.dispatchChangeEvent(sortedThumbs, src);
      return;
    }

    const success = thumb.element.setValue(stepValue);
    if (success) {
      thumb.value = stepValue;
      this.sortThumbs();
      thumb.linkedFillElements?.forEach(this.updateRangeFill);
      this.dispatchChangeEvent(undefined, src);
    }
  }

  /**
   * Updates the range fill element
   */
  async updateRangeFill(range: RangeFill) {
    const { element: rangeFillEl, linkedThumbs } = range;
    const [firstThumb, secondThumb] = linkedThumbs;
    if (firstThumb && !secondThumb) {
      await firstThumb.element.updateComplete;
      let start = 0;
      let end = 0;

      switch (rangeFillEl.type) {
        case 'start':
          start = firstThumb.element.minValue;
          end = firstThumb.element.value;
          break;
        case 'end':
          start = firstThumb.element.value;
          end = firstThumb.element.maxValue;
          break;
        case 'both':
          start = firstThumb.element.minValue;
          end = firstThumb.element.maxValue;
          break;
        default:
          rangeFillEl.type satisfies never;
          break;
      }

      rangeFillEl.setPercentage([
        firstThumb.element.getPercentageFromValue(start),
        firstThumb.element.getPercentageFromValue(end),
      ]);
    } else if (firstThumb && secondThumb) {
      await firstThumb.element.updateComplete;
      await secondThumb.element.updateComplete;
      rangeFillEl.setPercentage([
        firstThumb.element.getPercentageFromValue(firstThumb.element.value),
        secondThumb.element.getPercentageFromValue(secondThumb.element.value),
      ]);
    }
  }

  /**
   * Takes a thumb and a value and returns the step value to be set
   */
  _getThumbStepValue(thumb: RangeThumb, value: number): number {
    const isAdd = value > thumb.value;
    const step = thumb.element.step;
    const numOfSteps = Math.round(value / step);
    let stepValue: number;
    if (isAdd) {
      stepValue = Math.min(
        thumb.element.maxValue,
        Math.max(thumb.element.minValue, numOfSteps * step),
      );
    } else {
      stepValue = Math.min(
        thumb.element.maxValue,
        Math.max(thumb.element.minValue, numOfSteps * step),
      );
    }

    const nextThumb = this.getNavigationItem({
      direction: 'next',
      items: this._thumbs,
      fromIndex: thumb.index,
      isNavigable(item) {
        return !(
          item.element.transparent ||
          item.element.intersectBehavior === 'pass-over'
        );
      },
    });

    const prevThumb = this.getNavigationItem({
      direction: 'prev',
      items: this._thumbs,
      fromIndex: thumb.index,
      isNavigable(item) {
        return !(
          item.element.transparent ||
          item.element.intersectBehavior === 'pass-over'
        );
      },
    });

    if (
      isAdd &&
      nextThumb &&
      nextThumb.element.intersectBehavior === 'prevent'
    ) {
      const nextRemainder = nextThumb.value % step;
      if (
        thumb.element.forceStep &&
        stepValue > nextThumb.value &&
        nextRemainder !== 0
      ) {
        const newStep = nextThumb.value - nextRemainder;
        const newStepRemainder = newStep % step;
        stepValue = newStep - newStepRemainder;
      } else stepValue = Math.min(nextThumb.value, stepValue);
    } else if (
      !isAdd &&
      prevThumb &&
      prevThumb.element.intersectBehavior === 'prevent'
    ) {
      const prevRemainder = prevThumb.value % step;
      if (
        thumb.element.forceStep &&
        stepValue < prevThumb.value &&
        prevRemainder !== 0
      ) {
        const newStep = prevRemainder + prevThumb.value;
        const newStepRemainder = newStep % step;
        stepValue = newStep - newStepRemainder;
      } else stepValue = Math.max(prevThumb.value, stepValue);
    }

    return thumb.element.isValidValue(stepValue) ? stepValue : thumb.value;
  }

  /**
   * gets the value and percentage from pointer event
   */
  _getValuesFromEvent(e: { clientX: number; clientY: number }) {
    const direction = getComputedStyle(this).direction;
    const boundaries = getElementBoundaries(this);
    const xPoint = e.clientX - boundaries.elementLeft;
    const yPoint = e.clientY - boundaries.elementTop;
    const mousePoint =
      this.axis === 'x'
        ? xPoint
        : this.axis === '-x'
          ? boundaries.width - xPoint
          : this.axis === 'y'
            ? yPoint
            : boundaries.height - yPoint;
    const elementSize =
      this.axis === 'x' || this.axis === '-x'
        ? boundaries.width
        : boundaries.height;
    const rawPercentage = Math.max(
      0,
      Math.min((mousePoint / elementSize) * 100, 100),
    );
    const percentage =
      direction === 'rtl' || this.axis === 'y' || this.axis === '-y'
        ? 100 - rawPercentage
        : rawPercentage;
    const minValue = this.min;
    const maxValue = this.max;
    const roundedPercentage = Math.round(percentage * 100) / 100;
    const value = (percentage / 100) * (maxValue - minValue) + minValue;
    return { roundedPercentage, value, percentage, rawPercentage };
  }

  /**
   * sorts the thumbs
   */
  sortThumbs() {
    this._thumbs
      .sort((a, b) => a.value - b.value)
      .forEach((thumb, i) => {
        thumb.index = i;
      });
  }

  _slotChangeHandler = async () => {
    const previousThumbsElementsMap = new Map(this._thumbsElementsMap);
    this._thumbs = [];
    this._thumbsElementsMap.clear();
    this._thumbsNamesMap.clear();
    const previousActiveThumb = this.activeThumb;
    this.activeThumb = undefined;

    const fillElements: MuRangeFill[] = [];

    const assignElement = (element: Element) => {
      if (element instanceof MuRangeThumb) {
        element.range = [this.min, this.max];
        element.axis = this.axis;
        const previousThumb = previousThumbsElementsMap.get(element);
        const thumb: RangeThumb = previousThumb ?? {
          element,
          name: element.name ?? element.id,
          linkedFillElements: undefined,
          value: element.value,
          index: this._thumbs.length,
        };

        this._thumbs.push(thumb);
        this._thumbsElementsMap.set(element, thumb);
        this._thumbsNamesMap.set(thumb.name, thumb);

        if (previousActiveThumb?.element === element) this.activeThumb = thumb;
      } else if (element instanceof MuRangeFill) {
        fillElements.push(element);
      }
    };

    this.renderRoot
      .querySelector('slot')
      ?.assignedElements({ flatten: true })
      .forEach((el) => {
        if (el instanceof MuTransparent) {
          el.contents.forEach(assignElement);
        } else {
          assignElement(el);
        }
      });

    if (this._thumbs.length === 0) {
      console.warn('mu-range should have at least one mu-range-thumb', this);
    } else {
      this.sortThumbs();
    }

    fillElements.forEach((element, i) => {
      const thumbsNames = element.for
        ? element.for.split(',')
        : [this._thumbs[i]?.name];
      if (thumbsNames.length === 0) {
        console.warn(`mu-range-fill has no thumb names`, element);
        return;
      }
      element.setAxis(this.axis);
      const thumbs = thumbsNames.reduce((thumbs, name) => {
        const thumb = this._thumbsNamesMap.get(name || '');
        if (!thumb) {
          console.warn(
            `no thumb found with name (${name}) for mu-range-fill`,
            element,
          );
        } else {
          thumbs.push(thumb);
        }
        return thumbs;
      }, [] as RangeThumb[]);

      const rangeFill: RangeFill = {
        element,
        linkedThumbs: thumbs,
      };

      thumbs.forEach((thumb) => {
        if (thumb.linkedFillElements) thumb.linkedFillElements.push(rangeFill);
        else thumb.linkedFillElements = [rangeFill];
        this.updateRangeFill(rangeFill);
      });
    });

    if (!this._isReadyPromise.resolved) {
      this._isReadyPromise.resolve();
    } else {
      const deletedThumbs = [...previousThumbsElementsMap.values()].filter(
        (thumb) => !this._thumbsElementsMap.has(thumb.element),
      );
      const newThumbs = this._thumbs.filter(
        (thumb) => !previousThumbsElementsMap.has(thumb.element),
      );
      if (newThumbs.length) {
        const eventName = 'mu-range-added-thumbs';
        const event: Events[typeof eventName] = new CustomEvent(eventName, {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {
            data: newThumbs.map((thumb) => ({
              name: thumb.name,
              value: thumb.value,
            })),
          },
        });
        this.dispatchEvent(event);
      }

      if (deletedThumbs.length) {
        const eventName = 'mu-range-removed-thumbs';
        const event: Events[typeof eventName] = new CustomEvent(eventName, {
          bubbles: true,
          cancelable: true,
          composed: true,
          detail: {
            data: deletedThumbs.map((thumb) => ({
              name: thumb.name,
              value: thumb.value,
            })),
          },
        });
        this.dispatchEvent(event);
      }
    }
  };

  /**
   * @param valueString
   *
   * a comma separated string without spaces of (thumb values) or (an optional thumb name followed by a colon then the value) or a mix of both
   *
   * make sure to only use one format where all has names or no names, because if there is no names, the order of the values will be the same as the order of the thumbs.
   * so you might end up with a thumb with a different value (named and not named).
   *
   * @example "0,50,100"
   * @example "thumb1:0,thumb2:50,thumb3:100"
   * @example "0,thumb2:50,100"
   *
   */
  async setValueFromString(valueString: string) {
    await this.updateComplete;
    if (!valueString) return;
    const separator = ',';
    const values = valueString.split(separator);
    const valuesNames = new Set<string>();
    let usedCharacterIndexInValueString = -1;
    values.forEach((_value, i) => {
      const arr = _value.split(':');
      const thumbName = arr.length > 1 ? arr[0] : this._thumbs[i]?.name;
      const valueNumber = Number(arr.length > 1 ? arr[1] : arr[0]);
      usedCharacterIndexInValueString += _value.length;
      if (!thumbName) return;
      if (valuesNames.has(thumbName)) {
        console.warn(
          `The thumb named (${thumbName}) repeated multiple times in the value string (${valueString}), when trying to set range value from string, you can find that duplication with the value (${_value}) in that string from index (${usedCharacterIndexInValueString - i + 1}) to index (${usedCharacterIndexInValueString + i})`,
          this,
        );
        return;
      }
      valuesNames.add(thumbName);
      if (Number.isNaN(valueNumber)) return;
      const thumb = this._thumbsNamesMap.get(thumbName);
      if (!thumb) return;
      const isValid = thumb.element.isValidValue(valueNumber);
      if (!isValid) {
        console.warn(
          `Trying to set invalid value (${valueNumber}) for the thumb named (${thumb.name}) from the string (${valueString})`,
          thumb.element,
          this,
        );
        return;
      }
      const success = thumb.element.setValue(valueNumber);
      if (success) {
        thumb.value = valueNumber;
        thumb.linkedFillElements?.forEach(this.updateRangeFill);
      }
    });

    this.sortThumbs();
  }

  _keydownHandler = (e: KeyboardEvent) => {
    const thumb = this.activeThumb;
    if (this.disabled || this.readonly || !thumb || e.defaultPrevented) return;

    let increaseKey = 'ArrowRight';
    let decreaseKey = 'ArrowLeft';

    switch (this.axis) {
      case 'x':
        increaseKey = 'ArrowRight';
        decreaseKey = 'ArrowLeft';
        break;
      case '-x':
        decreaseKey = 'ArrowRight';
        increaseKey = 'ArrowLeft';
        break;
      case 'y':
        decreaseKey = 'ArrowDown';
        increaseKey = 'ArrowUp';
        break;
      case '-y':
        decreaseKey = 'ArrowUp';
        increaseKey = 'ArrowDown';
        break;
      default:
        this.axis satisfies never;
        break;
    }

    const setValue = (value: number) => {
      e.preventDefault();
      this.focus();
      thumb.element.focused = true;
      this._setThumbValue({ thumb, value, src: 'keydown' });
    };

    const jumpPercentage = 10;
    const jumpStepValue =
      (thumb.element.maxValue - thumb.element.minValue) / jumpPercentage;

    switch (e.key) {
      case increaseKey:
        setValue(thumb.value + thumb.element.step);
        break;
      case decreaseKey:
        setValue(thumb.value - thumb.element.step);
        break;
      case 'Home':
        setValue(thumb.element.minValue);
        break;
      case 'End':
        setValue(thumb.element.maxValue);
        break;
      case 'PageUp':
        setValue(thumb.value + jumpStepValue);
        break;
      case 'PageDown':
        setValue(thumb.value - jumpStepValue);
        break;
      case 'Tab':
        {
          this.switchNavigationActiveItem(e.shiftKey ? 'prev' : 'next') &&
            e.preventDefault();
        }
        break;
      default:
        break;
    }
  };

  _pointerdownHandler = (e: PointerEvent) => {
    if (this.disabled || this.readonly || e.defaultPrevented) return;

    this._isPointerDown = true;
    document.addEventListener('pointermove', this._documentPointermoveHandler);
    document.addEventListener('pointerup', this._documentPointerupHandler);

    const thumbEl = MuElement.closestPierce(
      'mu-range-thumb',
      e.target as HTMLElement,
    ) as MuRangeThumb | null;

    if (
      (thumbEl && (thumbEl.disabled || thumbEl.readonly)) ||
      this.emptyArea === 'prevent'
    )
      return;

    if (thumbEl && !thumbEl.transparent) {
      const activeThumb = this._thumbsElementsMap.get(thumbEl);
      this.activeThumb = activeThumb;
      return;
    }

    if (this.emptyArea === 'dispatch') {
      const eventName = 'mu-range-empty-area';
      const event: Events[typeof eventName] = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: { values: this._getValuesFromEvent(e as PointerEvent) },
      });
      this.dispatchEvent(event);
      return;
    }

    this.emptyArea satisfies 'nearest';

    const { value } = this._getValuesFromEvent(e as PointerEvent);

    const shouldBreak = (item: RangeThumb) => {
      return (
        (item.element.disabled || item.element.readonly) &&
        !(
          item.element.intersectBehavior === 'pass-over' ||
          item.element.transparent
        )
      );
    };

    const isNavigable = (item: RangeThumb) => {
      return !(
        item.element.transparent ||
        item.element.disabled ||
        item.element.readonly
      );
    };

    const leftThumb = this.getNavigationItem({
      direction: 'next',
      items: this._thumbs,
      shouldBreak(item) {
        return item.value > value && shouldBreak(item);
      },
      isNavigable: (item) => {
        return item.value > value && isNavigable(item);
      },
    });

    const rightThumb = this.getNavigationItem({
      direction: 'prev',
      items: this._thumbs,
      fromIndex: leftThumb?.index || this._thumbs.length,

      shouldBreak(item) {
        return item.value < value && shouldBreak(item);
      },
      isNavigable: (item) => {
        return item.value < value && isNavigable(item);
      },
    });

    let candidateThumb: RangeThumb | undefined;

    if (!rightThumb) candidateThumb = leftThumb;
    else if (!leftThumb) candidateThumb = rightThumb;
    else {
      candidateThumb =
        value - rightThumb.value > leftThumb.value - value
          ? leftThumb
          : rightThumb;
    }

    if (candidateThumb) {
      this._setThumbValue({ thumb: candidateThumb, value, src: 'pointerdown' });
      this.activeThumb = candidateThumb;
    }
  };

  _documentPointerupHandler = (e: PointerEvent) => {
    this._isPointerDown = false;
    document.removeEventListener(
      'pointermove',
      this._documentPointermoveHandler,
    );
    document.removeEventListener('pointerup', this._documentPointerupHandler);
    if (!this.activeThumb) return;
    const { value } = this._getValuesFromEvent(e);
    this._setThumbValue({ thumb: this.activeThumb, value, src: 'pointerup' });
  };

  _pointermoveHandler = (e: PointerEvent) => {
    if (!this.activeThumb) return;
    const { value } = this._getValuesFromEvent(e);
    this._setThumbValue({ thumb: this.activeThumb, value, src: 'pointermove' });
  };

  _documentPointermoveHandler = throttle((e: PointerEvent) => {
    this._pointermoveHandler(e);
    this._debouncedPointermoveHandler(e);
  }, 50);

  _debouncedPointermoveHandler = debounce(this._pointermoveHandler, 50);

  protected override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    await this._isReadyPromise.promise;
    return result;
  }

  protected override async firstUpdated(
    _changedProperties: PropertyValues<this>,
  ): Promise<void> {
    this._slotChangeHandler();
    await this.updateComplete;
    if (_changedProperties.has('defaultValue') && !this.isControlled)
      this.setValueFromString(this.defaultValue || '');
  }

  protected override async updated(
    _changedProperties: PropertyValues<this>,
  ): Promise<void> {
    await this.updateComplete;
    this.tabIndex = this.disabled || this.readonly ? -1 : 0;
    if (_changedProperties.has('value')) {
      this.setValueFromString(this.value || '');
    }
  }

  override render(): unknown {
    return html`
      <div tabindex='-1' id='container' part='container' @pointerdown='${this._pointerdownHandler}'>
        <slot>
        </slot>
      </div>
    `;
  }
}

MuRange.register('mu-range');

declare global {
  interface HTMLElementTagNameMap {
    'mu-range': MuRange;
  }

  interface GlobalEventHandlersEventMap extends Events {}
}
