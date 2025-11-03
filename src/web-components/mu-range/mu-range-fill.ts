import { css, html, type CSSResultGroup } from "lit";
import { MUElement } from "../mu-element";
import { property, query } from "lit/decorators.js";

export class MuRangeFill extends MUElement {
  static override styles: CSSResultGroup = [MUElement.cssBase, css`
    #container {
      --range-fill-background-color: var(--mu-range-fill-background-color, var(--mu-color-500));
      --start: 25%;
      --end: 50%;
      position: absolute;
      background-color: var(--range-fill-background-color);
      inset: 0;
      transition: all 50ms ease-in;
      border-radius: 9999px;
    }

    #container[axis='x'] {
      left: var(--start);
      right: calc(100% - var(--end));
    }
    
    #container[axis='-x'] {
      right: var(--start);
      left: calc(100% - var(--end));
    }
    
    #container[axis='y'] {
      bottom: var(--start);
      top: calc(100% - var(--end));
    }
    
    #container[axis='-y'] {
      top: var(--start);
      bottom: calc(100% - var(--end));
    }
  `];

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined

  /**
   * A string represents the name of the thumb element that this fill is related to.
   * 
   * it can be linked to two thumbs at the same time by adding a comma with no space between the two names.
   * 
   * if no mane, it will be linked to the thumb that has the same index
   * 
   * @example 'thumb1'
   * @example 'thumb1,thumb2'
   */
  @property()
  for?: string

  /**
   * The type of the fill.
   * 
   * `start` fill from the minimum value of the thumb to the value of the thumb.
   * 
   * `end` fill from the value of the thumb to the maximum value of the thumb.
   * 
   * `both` fill from the minimum value of the thumb to the maximum value of the thumb.
   * 
   * @default 'start'
   */
  @property()
  type: 'start' | 'end' | 'both' = 'start';

  @query('#container', true)
  readonly container!: HTMLDivElement

  /**
   * Sets the percentage value of the fill.
   * 
   * it takes a percentage array of two numbers, where the minimum number is the start percentage and the maximum number is the end percentage
   */
  setPercentage(percentage: [number, number]) {
    const start = Math.min(...percentage)
    const end = Math.max(...percentage)
    this.container.style.setProperty('--start', `${start}%`)
    this.container.style.setProperty('--end', `${end}%`)
  }

  /**
   * Sets the axis of the fill.
   * 
   * for internal use only by mu-range
   */
  setAxis(axis: 'x' | '-x' | 'y' | '-y') {
    this.updateComplete.then(() => {
      this.container.setAttribute('axis', axis)
    })
  }

  override render(): unknown {
    return html`
      <div id='container' part='container'></div>
      `
  }
}

MuRangeFill.register('mu-range-fill')