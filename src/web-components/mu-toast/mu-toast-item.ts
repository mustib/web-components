import { css, html, nothing, type PropertyValues } from 'lit';
import { MuElement, type MuElementComponent } from '../mu-element';
import '../mu-icon';
import type { Func } from '@mustib/utils';
import { query } from 'lit/decorators.js';
import { isTemplateResult } from 'lit/directive-helpers.js';
import { TOAST_LOCK_SYMBOL } from './constants';
import type { Toast } from './Toast';

export type MuToastItemComponent = {
  attributes: Attributes;
  events: Events;
};

type Events = object;

type Attributes = MuElementComponent['attributes'];

export class MuToastItem extends MuElement {
  static override styles = [
    MuElement.cssBase,
    css`
      #container {
        --color: hsl(var(--hue), 100%, 75%);
        --bg: hsl(var(--hue), 50%, 20%);
        position: relative;
        box-shadow: 0 0 5px 0 var(--color);
        pointer-events: auto;
        padding: var(--mu-base-rem);
        display: flex;
        gap: var(--mu-base-rem);
        align-items: center;
        transition: all 0.3s;
        transform-origin: 100%;
        border-radius: var(--mu-base-rem);
        overflow: hidden;
        color: var(--color);
        --mu-icon-fill: var(--color);
        background-color: var(--bg);
      }

      #progress {
        position: absolute;
        pointer-events: none;
        visibility: hidden;
        inset: 0;
        top: unset;
        height: 2px;
        background-color: var(--color);
        user-select: none;
      }

      #action-btn {
        margin-inline: 0.5ch;
        background-color: transparent;
        outline: 1px solid var(--color);
        color: var(--color);
        padding: 0 0.5ch;
        border-radius: 0.5ch;
        transition: inherit;
        cursor: pointer;
      }

      #action-btn:hover,
      #action-btn:focus-visible {
        background-color: var(--color);
        color: var(--bg);
      }

      #close-btn {
        margin-inline-start: auto;
        background-color: transparent;
        display: grid;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      #close-btn:focus-visible {
        outline: 1px solid var(--color);
        outline-offset: 2px;
      }

      #label {
        font-weight: bold;
      }

      #spinner {
        animation: spin 1s linear infinite;
        display: inline-grid;
        border-top: 2px solid;
        border-left: 2px solid;
        width: 1rem;
        translate: 0 12.5%;
        aspect-ratio: 1;
        border-radius: 50%;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (prefers-color-scheme: light) {
        #container {
          --bg: hsl(var(--hue), 100%, 75%);
          --color: hsl(var(--hue), 50%, 20%);
        }
      }
    `,
  ];

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined;

  toast!: Toast;

  @query('#progress', true)
  progressElement?: HTMLElement;

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.toast.emitter.dispatch(
      'state.toast-item.first.rendered',
      {
        element: this,
      },
      {
        lockSymbol: TOAST_LOCK_SYMBOL,
      },
    );
  }

  private pausedByEvents = new Set<string>();

  override render(): unknown {
    const pauseHandler =
      this.toast.interactingBehavior === 'nothing'
        ? nothing
        : async (e: Event) => {
            this.pausedByEvents.add(e.type);
            await this.toast.pauseProgress();
            if (this.toast.interactingBehavior === 'reset-progress')
              await this.toast.resetProgress();
          };

    const resumeHandler =
      this.toast.interactingBehavior === 'nothing'
        ? nothing
        : (e: Event) => {
            if (e.type === 'pointerleave')
              this.pausedByEvents.delete('pointerenter');
            if (e.type === 'focusout') this.pausedByEvents.delete('focusin');
            if (this.pausedByEvents.size === 0) {
              this.toast.resumeProgress();
            }
          };

    let spinner: unknown = nothing;
    if (isTemplateResult(this.toast.spinner)) spinner = this.toast.spinner;
    else if (this.toast.spinner)
      spinner = html`<span id="spinner" part="spinner"></span>`;

    let labelIcon: unknown = nothing;
    if (isTemplateResult(this.toast.labelIcon))
      labelIcon = this.toast.labelIcon;
    else if (
      typeof this.toast.labelIcon === 'string' &&
      (this.toast.labelIcon as string) !== ''
    )
      labelIcon = html`
        <mu-icon
          id="label-icon"
          part="label-icon"
          name="${this.toast.labelIcon}"
        >
        </mu-icon>
      `;

    let label: unknown = nothing;
    if (isTemplateResult(this.toast.label)) label = this.toast.label;
    else if (this.toast.label)
      label = html`<span id="label" part="label">${this.toast.label}</span>`;

    let message: unknown = nothing;
    if (isTemplateResult(this.toast.message)) message = this.toast.message;
    else if (this.toast.message)
      message = html`<span id="message" part="message"
        >${this.toast.message}</span
      >`;

    let closeBtn: unknown = nothing;
    if (isTemplateResult(this.toast.closeBtn)) closeBtn = this.toast.closeBtn;
    else if (this.toast.closeBtn)
      closeBtn = html`
      <button 
        id="close-btn"
        part="close-btn"
        type="button"
        aria-label="Close notification"
        @click=${() => this.toast.gracefulRemove()}
        >
        <mu-icon name="close"></mu-icon>
      </button
    `;

    let action: unknown = nothing;
    if (typeof this.toast.action === 'function')
      action = this.toast.action(this.toast);
    else if (this.toast.action)
      action = html`
        <button
          id="action-btn"
          part="action-btn"
          type="button"
          @click=${() =>
            (
              this.toast.action as Exclude<Toast['action'], Func | undefined>
            ).onClick(this.toast)}
        >
          ${this.toast.action.label}
        </button>
      `;

    return html`
      <div
        id="container"
        part="container"
        style="
          --hue: ${this.toast.colorHue};
        "
        role=${this.toast.role}
        aria-atomic="true"
        aria-live=${this.toast.role === 'alert' ? 'assertive' : 'polite'}
        @pointerenter=${pauseHandler}
        @pointerleave=${resumeHandler}
        @focusin=${pauseHandler}
        @focusout=${resumeHandler}
      >
        ${labelIcon}

        <p id="content" part="content">
          ${label} ${message} ${spinner} ${action}
        </p>

        ${closeBtn}

        <div id="progress" part="progress"></div>
      </div>
    `;
  }
}

MuToastItem.register('mu-toast-item');

declare global {
  interface HTMLElementTagNameMap {
    'mu-toast-item': MuToastItem;
  }

  interface GlobalEventHandlersEventMap extends Events {}
}
