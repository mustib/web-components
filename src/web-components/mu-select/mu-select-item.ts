import { css, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { MUElement } from '../mu-element';

/**
 * This element is designed to be stateless, its purpose is to provide a means of adding custom markup and attributes
 * without the need for controlling its state externally. It should not be modified by other parties, and its state is
 * solely controlled by its controller.
 */
export class MuSelectItem extends MUElement {
  static override styles = [
    MUElement.cssBase,
    css`
    :host {
      overflow: hidden;
    }
    
    :host([filtered-out]) {
      display: none;
    }

    :host(:focus-visible) #container {
      ${MUElement.css.focus}
    }

    :host([active]) #container {
      --select-items-background-color: var(--mu-color-500);
    }

    :host([selected]) #container {
      --select-items-background-color: var(--mu-color-700);
    }

    :host([selected][active]) #container {
      --select-items-background-color: var(--mu-color-600);
    }

    #container {
      --select-items-background-color: var(--mu-select-items-background-color, unset);
      cursor: pointer;
      user-select: none;
      padding: calc(var(--mu-base-rem) * .5) calc(var(--mu-base-rem) * 1.2);
      border-radius: calc(var(--mu-base-rem) * 1);
      transition: all 0.1s ease-in-out;
      background-color: var(--select-items-background-color);
    }

    @media (prefers-color-scheme: light) {
      :host([active]) #container {
        --select-items-background-color: var(--mu-color-200);
      }

      :host([selected]) #container {
        --select-items-background-color: var(--mu-color-400);
      }

      :host([selected][active]) #container {
        --select-items-background-color: var(--mu-color-300);
      }
    }
  `,
  ];

  override eventActionData = undefined;

  @property()
  value = this.innerText;

  @property({
    reflect: true,
    type: Boolean,
  })
  selected = false;

  @property({
    reflect: true,
    type: Boolean,
  })
  active = false;

  @property({
    reflect: true,
    type: Boolean,
    attribute: 'filtered-out',
  })
  filteredOut = false;

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    if (this.selected) {
      console.warn(
        'selected attribute should not be set on mu-select-item, please follow the proper way to add it through the controller',
        this,
      );
    }

    if (this.active) {
      console.warn(
        'active attribute should not be set on mu-select-item, please follow the proper way to add it through the controller',
        this,
      );
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'option');
    this.setAttribute('aria-label', this.value);
  }

  protected override _addEventActionAttributes(): void {
    this.setAttribute('data-items-pointerdown', `#prevent`);
    this.setAttribute(
      'data-items-click',
      `opened? toggle-select:${this.value}`,
    );
    this.setAttribute(
      'data-items-pointerover',
      `#prevent && opened? set-active:${this.value}`,
    );
  }

  override updated(changed: PropertyValues<this>) {
    if (changed.has('selected')) {
      this.ariaSelected = `${!!this.selected}`;
    }
    if (changed.has('disabled')) {
      this.ariaDisabled = `${!!this.disabled}`;
    }
  }

  protected override render(): unknown {
    return html`
      <div id='container' part='container'>
        <slot></slot>
      </div>
    `;
  }
}

MuSelectItem.register('mu-select-item');

declare global {
  interface HTMLElementTagNameMap {
    'mu-select-item': MuSelectItem;
  }
}
