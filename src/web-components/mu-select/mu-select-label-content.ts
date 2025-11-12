import { type CSSResultGroup, css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { MUElement } from '../mu-element';

export type MuSelectLabelContentComponent = {
  attributes: {
    type: MuSelectLabelContent['type'];
    active: MuSelectLabelContent['active'];
  };
};

const types = ['label', 'value', 'autocomplete', 'template'] as const;

const contentSelector = '[data-is="content"]';

/**
 * Use this element to define custom markup for the label and value.
 *
 * To inject the selected value, add the `data-is="content"` attribute to one of its children.
 * The textContent of the element with this attribute will be replaced with the selected value.
 * If there is no element with this attribute, the textContent of this element itself will be replaced.
 *
 * You also need to set the `type` attribute to either `"label"` or `"value"` so the parent label knows which element to update.
 */
export class MuSelectLabelContent extends MUElement {
  static override styles: CSSResultGroup = [
    MUElement.cssBase,
    css`
    :host {
      overflow: hidden;
    }

    :host(:not([active])) {
      display: none;
    }

    #container {
      overflow: hidden;
      display: inline-flex;
      gap: calc(var(--mu-base-rem) * .5);
      flex-wrap: wrap;
    }

    #template {
      --select-label-template-background-color: var(--mu-select-label-template-background-color ,var(--mu-color-700));
      --select-label-template-remove-background-color: var(--mu-select-label-template-remove-background-color ,var(--mu-color-400));
      display: inline-flex;
      flex-wrap: wrap-reverse;
      gap: calc(var(--mu-base-rem) * .5);
      align-items: center;
      padding: calc(var(--mu-base-rem) * .5) var(--mu-base-rem);
      background-color: var(--select-label-template-background-color);
      border-radius: 9999px;
      user-select: none;
    }

    #template[active] {
      --select-label-template-background-color: var(--mu-select-label-template-background-color ,var(--mu-color-500));
    }

    #template-value {
      cursor: text;
    }

    #template-remove {
      cursor: pointer;
      --mu-icon-size: calc(var(--mu-base-rem) * 1);
      border-radius: 999px;
      background-color: var(--select-label-template-remove-background-color);
      padding: calc(var(--mu-base-rem) * .5);
      box-shadow: 0 0 2px var(--mu-color-900);
    }

    @media (prefers-color-scheme: light) {
      #template {
      --select-label-template-background-color: var(--mu-select-label-template-background-color ,var(--mu-color-200));
      }

      #template[active] {
        --select-label-template-background-color: var(--mu-select-label-template-background-color ,var(--mu-color-300));
      }

      #template-remove {
        --select-label-template-remove-background-color: var(--mu-select-label-template-remove-background-color ,var(--mu-color-100));
      }

      #template[active] #template-remove {
        --select-label-template-remove-background-color: var(--mu-select-label-template-remove-background-color ,var(--mu-color-200));
      }
    }
  `,
  ];

  /**
   * Generate template markup for the template type.
   */
  static generateTemplate(instance: MuSelectLabelContent) {
    const value = instance._value;
    return value.length
      ? repeat(
          value,
          (value) => value,
          (v) => html`
      <div id='template' ?active=${v === instance.activeTemplateValue} part='template' data-select-pointerdown='#nothing&&#prevent'>
        <span id='template-value' part='template-value'>${v}</span>
        <mu-icon name='closeLine' id='template-remove' part='template-remove' data-select-click='remove-value:${v}'></mu-icon>
      </div>
    `,
        )
      : nothing;
  }

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined;

  @property()
  type!: (typeof types)[number];

  @property({ reflect: true, type: Boolean })
  active = false;

  contentEl?: HTMLElement | null;

  @state()
  activeTemplateValue?: string;

  _value: string[] = [];

  async setValue(value: string[]) {
    await this.updateComplete;
    this._value = value;
    const { contentEl } = this;
    switch (this.type) {
      case 'label':
        console.warn(
          'mu-select-label-content with type="label" should not change the value',
          this,
        );
        break;
      case 'value':
        if (contentEl) contentEl.textContent = value.join(', ');
        else this.textContent = value.join(', ');
        break;
      case 'autocomplete':
        if (contentEl && contentEl instanceof HTMLInputElement)
          contentEl.value = value.join(', ');
        else
          console.warn(
            `mu-select-label-content with type="autocomplete" should have an input element with ${contentSelector} attribute to change the value`,
            this,
          );
        break;
      case 'template':
        if (
          this.activeTemplateValue &&
          !value.includes(this.activeTemplateValue)
        )
          this.activeTemplateValue = undefined;
        this.requestUpdate();
        break;
      default:
        this.type satisfies never;
        break;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.contentEl = this.querySelector(contentSelector);
    if (!types.includes(this.type)) {
      console.warn(
        `'type' attribute of mu-select-label-content must be one of ${types.join(', ')}, but got ${this.type}`,
        this,
      );
    }
  }

  protected override render(): unknown {
    return html`
      <div id='container' part='container'>
        <slot></slot>
        ${this.type === 'template' ? MuSelectLabelContent.generateTemplate(this) : ''}
      </div>
    `;
  }
}

MuSelectLabelContent.register('mu-select-label-content');

declare global {
  interface HTMLElementTagNameMap {
    'mu-select-label-content': MuSelectLabelContent;
  }
}
