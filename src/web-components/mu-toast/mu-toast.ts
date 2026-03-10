import { type CSSResultGroup, css, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { MuElement, type MuElementComponent } from '../mu-element';
import './mu-toast-item';
import { ToastController } from './ToastController';

export type MuToastComponent = {
  attributes: Attributes;
  events: Events;
};

type Events = object;

type Attributes = MuElementComponent['attributes'] & {
  /**
   * The position of the toast
   */
  position?:
    | 'top-center'
    | 'bottom-center'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end';

  /**
   * Automatically re-parent the toast container to top-layer elements such as
   * open `<dialog>`s or the fullscreen element. This is useful when the toast
   * must appear above modals, dialogs or fullscreen content without requiring
   * manual re-parenting.
   *
   * ⚠️ **Performance note:** enabling this feature causes the component to
   * observe the entire document for attribute and child‑list mutations. It
   * tracks changes to determine when dialogs are opened or closed, which can
   * be expensive in applications with frequent DOM modifications. Use only when
   * necessary and test performance impact in your target environment.
   */
  'auto-re-parent'?: boolean;

  /**
   * Indicates if the toast is empty
   * must not be set directly, it is managed internally
   */
  empty?: boolean;
};

export class MuToast extends MuElement {
  static override styles?: CSSResultGroup | undefined = [
    MuElement.cssBase,
    css`
      #container {
        display: grid;
        justify-content: center;
        position: fixed;
        inset: 5%;
        height: fit-content;
        gap: var(--mu-base-rem);
        width: fit-content;
        font-weight: normal;
      }

      .toast {
        transition: translate 150ms;
      }

      #container:hover :where(.toast) {
        translate: 0;
      }

      :host([position^="top"]) :where(#container) {
        align-content: start;
        margin-bottom: auto;
      }

      :host([position^="bottom"]) :where(#container) {
        align-content: end;
        margin-top: auto;
      }

      :host([position="bottom-center"]) :where(#container),
      :host([position="top-center"]) :where(#container) {
        margin-inline: auto;
      }

      :host([position="bottom-end"]) :where(#container),
      :host([position="top-end"]) :where(#container) {
        margin-inline-start: auto;
      }

      :host([position="bottom-start"]) :where(#container),
      :host([position="top-start"]) :where(#container) {
        margin-inline-end: auto;
      }

      /* for reversed toasts array to work on top positions */
      :host([position^="top"]) :where(.toast) {
        z-index: var(--bottom-index);
      }

      /* Stacking */
      :host([position^="top"])
        :where(
          #container[stack-toasts] .toast:nth-of-type(n + 2)
        ) {
        translate: 0 calc(-100% * (var(--top-index) - 1));
      }

      :host([position^="bottom"])
        :where(
          #container[stack-toasts] .toast:not(:last-of-type)
        ) {
        translate: 0 calc(100% * (var(--bottom-index) - 1));
      }

      @media (prefers-reduced-motion: reduce) {
        .toast {
          transition: none;
        }
      }
    `,
  ];

  protected _addEventActionAttributes: undefined;

  eventActionData: undefined;

  controller = new ToastController(this);

  @property({ type: String, attribute: 'position', reflect: true })
  position: Exclude<Attributes['position'], undefined> = 'top-center';

  @property({ type: Boolean, attribute: 'auto-re-parent' })
  autoReParent = false;

  private setIsEmpty(status: boolean) {
    if (status) this.setAttribute('empty', '');
    else this.removeAttribute('empty');
  }

  private _topLayerElements = new Set<Element>();
  private _fullscreenElement: Element | null = null;

  private autoReParentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'open' &&
        mutation.target instanceof HTMLDialogElement
      ) {
        if (mutation.target.open) this.addTopLayerElement(mutation.target);
        else this.removeTopLayerElement(mutation.target);
      }
      if (mutation.removedNodes.length) {
        mutation.removedNodes.forEach((node) => {
          if (this._topLayerElements.has(node as Element))
            this.removeTopLayerElement(node as Element);
        });
      }
    }
  });

  private addTopLayerElement(element: Element) {
    this._topLayerElements.add(element);
    this.controller.reParent(element);
    this.controller.popover();
  }

  private removeTopLayerElement(element: Element | null) {
    element && this._topLayerElements.delete(element);
    const nextLayer = [...this._topLayerElements].pop() || document.body;
    this.controller.reParent(nextLayer);
    this.controller.popover();
  }

  fullscreenReParentHandler = () => {
    if (document.fullscreenElement) {
      if (this._fullscreenElement)
        this._topLayerElements.delete(this._fullscreenElement);
      this._fullscreenElement = document.fullscreenElement;
      this.addTopLayerElement(document.fullscreenElement);
    } else {
      this.removeTopLayerElement(this._fullscreenElement);
      this._fullscreenElement = null;
    }
  };

  protected override willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    this.setIsEmpty(this.controller.toastsQueue.length === 0);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.autoReParent) {
      document.addEventListener(
        'fullscreenchange',
        this.fullscreenReParentHandler,
      );
      this.autoReParentObserver.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['open'],
      });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener(
      'fullscreenchange',
      this.fullscreenReParentHandler,
    );
    this.autoReParentObserver.disconnect();
  }

  protected override render(): unknown {
    const toastsArray = [...this.controller.toastsQueue];

    /**
     * reverse for top position so new toasts stack on top
     */
    if (this.position.startsWith('top')) toastsArray.reverse();

    const toasts = repeat(
      toastsArray,
      (toast) => toast.id,
      (toast, i) => {
        return html`
          <mu-toast-item
            class="toast"
            style="
              --bottom-index: ${toastsArray.length - i};
              --top-index: ${i + 1};
              direction:${toast.direction};
            "
            exportparts='
              container: toast-item-container,
              label-icon: toast-item-label-icon,
              content: toast-item-content,
              label: toast-item-label,
              message: toast-item-message,
              spinner: toast-item-spinner,
              action-btn: toast-item-action-btn,
              close-btn: toast-item-close-btn,
              progress: toast-item-progress,
            '
            .toast=${toast}
          ></mu-toast-item>
        `;
      },
    );
    return html`
      <div
        id="container"
        part="container"
        ?stack-toasts=${this.controller.stackToasts}
      > 
        <slot name="before"></slot>
        ${toasts}
        <slot name="after"></slot>
      </div>
    `;
  }
}

MuToast.register('mu-toast');

declare global {
  interface HTMLElementTagNameMap {
    'mu-toast': MuToast;
  }

  interface GlobalEventHandlersEventMap extends Events {}
}
