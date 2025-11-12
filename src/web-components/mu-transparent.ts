import { type CSSResultGroup, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { MuElement, type MuElementComponent } from './mu-element';

export type MuTransparentComponent = {
  attributes: MuElementComponent['attributes'] & {
    'content-selector': MuTransparent['contentSelector'];
  };

  events: Events;
};

type Events = {
  'mu-transparent-slotchange': CustomEvent<{
    source: MuTransparent;
  }>;
};

/**
 * A base class for "transparent" wrapper components.
 *
 * Transparent components introduce an extra DOM node,
 * but parent components treat them as if they were semantically invisible.
 *
 * Their purpose is to add behavior, context, or interaction forwarding
 * without changing how parents interact with child elements.
 *
 * It can be extended to add functionalities like context menus, scroll containers, triggering events, etc.
 *
 * Use the `content` property to access the underlying
 * meaningful child element, regardless of the wrapping.
 */
export class MuTransparent extends MuElement {
  static override styles?: CSSResultGroup = css`
    :host {
      display: contents !important;
    }
  `;

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined;

  /**
   * The selector of the elements that transparent wraps so that they can be queried when needed.
   *
   * it defaults to `& > *` which means all child elements
   */
  @property({ attribute: 'content-selector' })
  contentSelector = '& > *';

  /**
   * Returns the meaningful child elements of the transparent component.
   *
   * The contents are the child elements that are not part of the
   * transparent wrapper. If `contentSelector` is not set, any child
   * element is considered meaningful. If `contentSelector` is set,
   * only the child elements that match the selector are considered meaningful.
   */
  get contents() {
    const contents = this.querySelectorAll(this.contentSelector);

    if (!contents.length)
      throw new Error(`No contents found for ${this.tagName}`);

    return Array.from(contents);
  }

  constructor() {
    super();
    this.updateComplete.then(() => {
      /**
       * Forward slotchange events skipping the first event because the parent must handle it
       * a way to inform the parent that the contents have changed instead of using MutationObserver
       */
      this.renderRoot.addEventListener('slotchange', this._dispatchSlotChange);
    });
  }

  protected _dispatchSlotChange = () => {
    const eventName = 'mu-transparent-slotchange';
    const event = new CustomEvent<Events[typeof eventName]['detail']>(
      eventName,
      { bubbles: true, composed: true, detail: { source: this } },
    );
    this.dispatchEvent(event);
  };

  protected override render(): unknown {
    return html`
      <slot></slot>
    `;
  }
}

MuTransparent.register('mu-transparent');

declare global {
  interface HTMLElementTagNameMap {
    'mu-transparent': MuTransparent;
  }

  interface GlobalEventHandlersEventMap extends Events {}
}
