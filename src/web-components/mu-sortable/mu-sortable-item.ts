import { type CSSResultGroup, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { MuElement, type MuElementComponent } from '../mu-element';
import { MuTransparent } from '../mu-transparent';
import { MuSortableTrigger } from './mu-sortable-trigger';

export type MuSortableItemComponent = MuElementComponent['attributes'] & {
  attributes: {
    name: string;
  };
};

export class MuSortableItem extends MuElement {
  static override styles?: CSSResultGroup | undefined = [
    MuElement.cssBase,
    css`
    :host([added]) {
      outline: 1px dashed;
    }

    :host([moving]) {
      user-select: none;
      cursor: grabbing;
      opacity: 0.5;
    }
    
    :host {
      animation: flip 150ms 100ms ease-out forwards;
      transform: scaleY(-0.75);
      transition: opacity 150ms;
    }

    @keyframes flip {
      100% {
        transform: none;
      }
    }
  `,
  ];

  _addEventActionAttributes: undefined;
  eventActionData: undefined;

  @property()
  name!: string;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('mu-transparent-slotchange', this._slotChangeHandler);
    this.renderRoot.addEventListener('slotchange', this._slotChangeHandler);

    if (!this.name) {
      this.updateComplete.then(() => {
        console.warn(
          `mu-sortable-item does not has a name, it will be assigned this default one (${this.muId})`,
          this,
        );
      });
      this.name = this.muId;
    }
  }

  /**
   * Used to notify the item whether or not it is being sorted and is moving
   */
  setIsMoving(value: boolean) {
    value ? this.setAttribute('moving', '') : this.removeAttribute('moving');
  }

  /**
   * Used to notify the item whether or not it is added to be sorted
   */
  setAdded(value: boolean) {
    value ? this.setAttribute('added', '') : this.removeAttribute('added');
  }

  protected _slotChangeHandler = () => {
    const triggers: MuSortableTrigger[] = [];

    const addElement = (element: Element) => {
      if (element instanceof MuSortableTrigger) {
        triggers.push(element);
      }
    };

    this.renderRoot
      .querySelector('slot')
      ?.assignedElements({ flatten: true })
      .forEach((el) => {
        if (el instanceof MuTransparent) el.contents.forEach(addElement);
        else addElement(el);
      });

    if (!triggers.length) {
      console.warn(`mu-sortable-item does not have any triggers`, this);
    }

    triggers.forEach((trigger) => {
      trigger.for = this.name;
    });
  };

  protected override render(): unknown {
    return html`
      <slot></slot>
    `;
  }
}

MuSortableItem.register('mu-sortable-item');

declare global {
  interface HTMLElementTagNameMap {
    'mu-sortable-item': MuSortableItem;
  }
}
