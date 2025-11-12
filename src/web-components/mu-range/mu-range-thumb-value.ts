import { type CSSResultGroup, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { MUElement } from '../mu-element';

export class MuRangeThumbValue extends MUElement {
  static override styles: CSSResultGroup = [
    MUElement.cssBase,
    css`
    :host([reversed]) #container[axis='x'] {
      top: 100%;
      bottom: unset;
      margin-block-start: var(--gap, calc(var(--mu-base-rem) * .5));
    }
    
    :host(:not([reversed])) #container[axis='x'] {
      bottom: 100%;
      margin-block-end: var(--gap, calc(var(--mu-base-rem) * .5));
    }
    
    :host(:not([reversed])) #container[axis='y'] {
      left: 100%;
      right: unset;
      margin-inline-start: var(--gap, calc(var(--mu-base-rem) * .5));
    }
    
    :host([reversed]) #container[axis='y'] {
      left: unset;
      right: 100%;
      margin-inline-end: var(--gap, calc(var(--mu-base-rem) * .5));
    }

    #container[axis='x'] {
      left: 50%;
      transform: translateX(-50%);
    }
    
    #container[axis='y'] {
      top: 50%;
      transform: translateY(-50%);
    }

    #container {
      --range-thumb-value-background-color: var(--mu-range-thumb-value--background-color, var(--range-thumb-background-color, var(--mu-color-500)));
      position: absolute;
      display: flex;
      place-content: center;
      padding: .25ch .5ch;
      border-radius: var(--mu-base-rem);
      background-color: var(--range-thumb-value-background-color);
      box-shadow: var(--range-thumb-shadow);
    }

    @media (prefers-color-scheme: light) {
      :host {
        color: var(--mu-color-100);
      }
    }
  `,
  ];

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined;

  /**
   * A boolean that indicated if the position of the value should be on the opposite side.
   *
   * so if the default value position is left, it will be right
   * and the default is top, it will be bottom, etc
   */
  @property({ type: Boolean })
  reversed = false;

  /**
   * A string representing the type of the value to display.
   *
   * - unit: The value will be displayed as a number with one decimal place.
   * - percentage: The value will be displayed as a percentage with two decimal places.
   * - percentage:round: The value will be displayed as a rounded percentage.
   *
   * @default 'unit'
   */
  @property()
  type: 'unit' | 'percentage' | 'percentage:round' = 'unit';

  @query('#container', true)
  container!: HTMLElement;

  /**
   * A getter for the element that should contain the value.
   *
   * it can be any element that has the attribute `data-is="content"`.
   *
   * that element's text content will be replaced with the value.
   *
   * @default this
   */
  get contentEl(): Element {
    return this.querySelector('[data-is="content"]') || this;
  }

  async setValue(data: { percentage: number; value: number }) {
    await this.updateComplete;
    switch (this.type) {
      case 'percentage':
        // keep two decimal places
        this.contentEl.textContent = `${Math.trunc(data.percentage * 100) / 100}%`;
        break;
      case 'percentage:round':
        this.contentEl.textContent = `${Math.round(data.percentage)}%`;
        break;
      case 'unit':
        // keep one decimal place
        this.contentEl.textContent = `${Math.trunc(data.value * 10) / 10}`;
        break;
      default:
        this.type satisfies never;
        break;
    }
  }

  /**
   * Sets the axis of the value.
   */
  async setAxis(axis: 'x' | 'y') {
    await this.updateComplete;
    this.container.setAttribute('axis', axis);
  }

  override render(): unknown {
    return html`
      <div id='container' part='container'>
        <slot></slot>
      </div>
      `;
  }
}

MuRangeThumbValue.register('mu-range-thumb-value');
