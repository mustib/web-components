import { css, html, type CSSResultGroup, type PropertyValues } from "lit";
import { MUElement } from "../mu-element";
import { property, query, state } from "lit/decorators.js";
import { getElementBoundaries } from "@mustib/utils/browser";
import { MuRangeThumbValue } from "./mu-range-thumb-value";
import { MuTransparent } from "../mu-transparent";

export class MuRangeThumb extends MUElement {
  static override styles?: CSSResultGroup | undefined = [MUElement.cssBase, css`
    #container {
      --thumb-size: var(--mu-range-thumb-size, calc(var(--range-thickness) * 3));
      --range-thumb-background-color: var(--mu-range-thumb-background-color, var(--mu-color-500));
      --range-thumb-shadow: var(--mu-range-thumb-shadow, 0 0 calc(var(--thumb-size) * .2) hsl(from var(--range-thumb-background-color) h s calc(l * .25)));
      --position: clamp(0px, calc(var(--mu-range-thumb-percentage) - (var(--thumb-size) / 2)) , calc(100% - var(--thumb-size))) !important;
      position: absolute;
      border-radius: 9999px;
      transition: all 50ms ease-in;
      width: var(--thumb-size);
      aspect-ratio: 1;
      background-color: var(--range-thumb-background-color);
      user-select: none;
      box-shadow: var(--range-thumb-shadow);
      z-index: 1;
    }


    :host([focused]) #container {
      ${MUElement.css.focus};
    }

    #container[axis='x'] {
      left: var(--position);
      top: 50%;
      transform: translateY(-50%);
    }
    
    #container[axis='-x'] {
      left: unset;
      top: 50%;
      right: var(--position);
      transform: translateY(-50%);
    }

    #container[axis='y'] {
      top: unset;
      bottom: var(--position);
      left: 50%;
      transform: translateX(-50%);
    }
    
    #container[axis='-y'] {
      bottom: unset;
      top: var(--position);
      left: 50%;
      transform: translateX(-50%);
    }
  `];

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined

  /**
   * A set of related mu-range-thumb-value elements
   */
  _valueElements = new Set<MuRangeThumbValue>()

  _isRangeReady = this.generateIsReadyPromise({
    onTimeout: () => {
      console.warn('range not set for mu-range-thumb, switching to default value [0, 100]', this)
      this.range = [0, 100]
    },
  })

  @state()
  axis: 'x' | 'y' | '-x' | '-y' = 'x'

  /**
   * The minimum value that the thumb can have.
   */
  @property({
    reflect: true,
    type: Number,
    attribute: 'min-value'
  })
  minValue!: number


  /**
   * The maximum value that the thumb can have.
   */
  @property({
    reflect: true,
    type: Number,
    attribute: 'max-value'
  })
  maxValue!: number

  /**
   * The current value of the thumb.
   */
  @property({
    reflect: true,
    type: Number,
    attribute: 'value'
  })
  value = 0

  @property({ reflect: true, type: Number, })
  step = 1

  @property()
  name?: string

  /**
   * A boolean indicates if the thumb is focused.
   * 
   * for internal use only by mu-range
   */
  @property({ type: Boolean, reflect: true })
  focused = false


  /**
   * A string indicates how range handles other thumbs intersecting with with thumb.
   * 
   * `prevent` is the default behavior, and it means do not allow other thumbs intersecting this thumb to pass.
   * 
   * `pass-over` means allow other thumbs to pass over this thumb so they can have a free movement.
   */
  @property({ attribute: 'intersect-behavior' })
  intersectBehavior: 'prevent' | 'pass-over' = 'prevent';

  /**
   * A boolean indicates if the thumb should be completely ignored when interacting with the range.
   * 
   * When `true`, the thumb will not be active when the user interacts with the range, and other non-transparent thumbs will be active instead.
   * 
   * It's like setting `readonly` or `disabled` on the thumb, but instead of nothing being active, other thumbs will be active.
   */
  @property()
  transparent = false;

  /**
   * A boolean indicates if the thumb should force the step when interacting with the range.
   */
  @property({ attribute: 'force-step', type: Boolean })
  forceStep = false

  @query('#container', true)
  container?: HTMLElement

  /**
   * The minimum and maximum value of the closest mu-range element.
   * 
   * Which is used to calculate the percentage of the thumb position correctly.
   * 
   * for internal use only by mu-range
   */
  _range!: [minValue: number, maxValue: number]

  get range(): [number, number] {
    return this._range
  }

  set range(value: [number, number]) {
    if (this._isRangeReady.resolved && (value[0] > this.minValue || value[1] < this.maxValue)) {
      console.warn(`range must not be less than max value (${this.maxValue}) or greater than min value (${this.minValue}), but got (${value})`, this)
      return
    }
    if (!this._isRangeReady.resolved) this._isRangeReady.resolve()
    this._range = value

  }

  constructor() {
    super();
    this.updateComplete.then(() => {
      this.setAttribute('role', 'slider');
      this.addEventListener('mu-transparent-slotchange', this._slotChangeHandler)
    })
  }

  /**
   * returns an object containing the width and height of the thumb
   */
  get size(): { width: number, height: number } {
    const { container } = this
    let width = 0;
    let height = 0
    if (container) {
      const boundaries = getElementBoundaries(container);
      width = boundaries.width
      height = boundaries.height
    }
    return { width, height }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this._isRangeReady.promise.then(() => {
      if (this.minValue === undefined) {
        this.minValue = this.range[0]
      }
      if (this.maxValue === undefined) {
        this.maxValue = this.range[1]
      }
      if (this.value === undefined) {
        this.setValueFromPercentage(50)
      }
    })
  }

  _slotChangeHandler = () => {
    this._valueElements.clear()
    const addElement = (el: Element) => {
      if (el instanceof MuRangeThumbValue) {
        this._valueElements.add(el)
      }
    }

    this.renderRoot.querySelector('slot')?.assignedElements({ flatten: true }).forEach(el => {
      if (el instanceof MuTransparent) {
        el.contents.forEach(addElement)
      } else {
        addElement(el)
      }
    })

    this._updateValueElements()
    this.updateValueElementsAxis()
  }

  /**
   * Updates the value of related mu-range-thumb-value elements
   */
  _updateValueElements() {
    if (this._valueElements.size === 0) return
    this._valueElements.forEach(el => {
      el.setValue({
        value: this.value,
        percentage: this.getPercentageFromValue(this.value)
      })
    })
  }

  override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete()
    await this._isRangeReady.promise
    return result
  }

  /**
   * Returns a boolean indicating if the value is valid to be set.
   */
  isValidValue(value: number): boolean {
    const isValid = value <= this.maxValue && value >= this.minValue
    return isValid
  }

  /**
   * Sets the value of the thumb and returns a boolean indicating if the value was changed.
   * @param value The value to set
   * @returns A boolean indicating if the value was changed
   */
  setValue(value: number): boolean {
    if (this.isValidValue(value)) {
      this.value = value
      return true
    }

    return false
  }

  /**
   * Sets the value of the thumb from a percentage and returns a boolean indicating if the value was changed.
   * @param percentage The percentage to set
   * @returns A boolean indicating if the value was changed
   */
  setValueFromPercentage(percentage: number): boolean {
    const value = ((percentage / 100) * (this.range[1] - this.range[0])) + this.range[0]
    return this.setValue(value)
  }

  /**
   * Converts a given value to a percentage based on the current range and returns it.
   */
  getPercentageFromValue(value: number): number {
    return ((value) / (this.range[1] - this.range[0])) * 100
  }

  /**
   * Updates the axis of related mu-range-thumb-value elements
   */
  updateValueElementsAxis() {
    this._valueElements.forEach(el => el.setAxis(this.axis === 'x' || this.axis === '-x' ? 'x' : 'y'))
  }

  override async updated(_changedProperties: PropertyValues<this>): Promise<void> {
    await this.updateComplete

    if (_changedProperties.has('axis')) {
      this.updateValueElementsAxis()
      this.ariaOrientation = this.axis === '-y' || this.axis === 'y' ? 'vertical' : 'horizontal'
    }

    if (_changedProperties.has('value')) {
      if (!this.isValidValue(this.value)) {
        console.warn(`value attribute must not be greater than max value (${this.maxValue}) or less than min value (${this.minValue}), but got (${this.value})`, this)
      }
      this.style.setProperty('--mu-range-thumb-percentage', `${this.getPercentageFromValue(this.value)}%`)
      this.setAttribute('aria-valuenow', `${this.value}`)
      this._updateValueElements()
    }

    if (_changedProperties.has('minValue') || _changedProperties.has('maxValue')) {
      this.setAttribute('aria-valuemin', `${this.minValue}`)
      this.setAttribute('aria-valuemax', `${this.maxValue}`)

      if (this.minValue > this.maxValue) {
        console.warn(`minValue attribute must not be greater than maxValue attribute, but got (${this.minValue}, ${this.maxValue})`, this)
      } else if (this.minValue < this.range[0] || this.maxValue > this.range[1]) {
        console.warn(`minValue (${this.minValue}) and maxValue (${this.maxValue}) attributes must be equal to or in the range of range property (${this.range})`, this)
      }
    }
  }

  override render(): unknown {
    return html`
      <div id='container' part='container' axis='${this.axis}'>
        <slot @slotchange=${this._slotChangeHandler}></slot>
      </div>
    `
  }
}


MuRangeThumb.register('mu-range-thumb')

declare global {
  interface HTMLElementTagNameMap {
    'mu-range-thumb': MuRangeThumb
  }
}