import { type CSSResultGroup, css, html } from 'lit';
import { MuElement } from '../mu-element';
import '../mu-icon';

export class MuSortableTrigger extends MuElement {
  static override styles?: CSSResultGroup | undefined = [
    MuElement.cssBase,
    css`
      #container {
        display: grid;
        cursor: grab;
        user-select: none;
      }
      
      #container:focus-visible {
        outline: 1px solid;
      }
    `,
  ];

  eventActionData: undefined;

  /**
   * The associated item name
   */
  for = '';

  protected override async _addEventActionAttributes(): Promise<void> {
    await this.updateComplete;
    /**
     * mouse events
     */
    this.setAttribute(
      'mu-sortable-pointerdown',
      JSON.stringify([
        'prepared? ||#prevent',
        '#modifier:Control? ||toggle',
        ['add', this.for],
        '||prepare',
      ]),
    );

    /**
     * keyboard events
     */
    this.setAttribute(
      'mu-sortable-keydown',
      JSON.stringify([
        'prepared? ||#prevent',
        '#key:Enter,Space?#modifier:Control? ||toggle',
        ['add', this.for, '#key:Enter,Space'],
        '#key:Enter,Space? ||prepare',
      ]),
    );
  }

  protected override render(): unknown {
    return html`
      <div id='container' tabindex='0' part='container'>
        <slot>
          <mu-icon name='dragVertical'></mu-icon>
        </slot>
      </div>
    `;
  }
}

MuSortableTrigger.register('mu-sortable-trigger');

declare global {
  interface HTMLElementTagNameMap {
    'mu-sortable-trigger': MuSortableTrigger;
  }
}
