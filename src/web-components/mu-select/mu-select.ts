import { EventAction, type GenerateData } from '@mustib/utils/browser';
import { type CSSResultGroup, css, html, type PropertyValues } from 'lit';
import { property, queryAssignedElements } from 'lit/decorators.js';
import { MuElement, type MuElementComponent } from '../mu-element';
import { MuTransparent } from '../mu-transparent';
import { MuSelectItems, type MuSelectItemsComponent } from './mu-select-items';
import { MuSelectLabel } from './mu-select-label';

export type MuSelectComponent = {
  attributes: MuElementComponent['attributes'] & {
    opened: MuSelect['opened'];
    'no-close-after-select': MuSelect['noCloseAfterSelect'];
    'no-close-after-blur': MuSelect['noCloseAfterBlur'];
  };

  events: Events;
};

type Events = {
  'mu-select-opened': CustomEvent;

  'mu-select-closed': CustomEvent;
};

export class MuSelect extends MuElement {
  static override styles: CSSResultGroup = [
    MuElement.cssBase,
    css`
    :host([opened]) #container {
      z-index: 100;
    }

    #container {
      position: relative;
      min-width: fit-content;
      max-width: 100%;
      margin: auto;
    }
    `,
  ];

  static eventAction = new EventAction<GenerateData<MuSelect>>({
    getEventAttributeName(eventName) {
      return `data-select-${eventName}`;
    },

    currTargetSelector: 'mu-select',

    actions: {
      toggle(data) {
        const select = data.event.currentTarget;
        if (!select.interactable) return;
        select.opened = !select.opened;
      },

      open(data) {
        const select = data.event.currentTarget;
        if (!select.interactable) return;
        select.opened = true;
      },

      close(data) {
        const select = data.event.currentTarget;
        if (!select.interactable) return;
        select.opened = false;
      },

      'remove-value'(data) {
        const select = data.event.currentTarget;
        const value = data.actionParam;
        if (!select.interactable || typeof value !== 'string') return;
        select._canCloseAfterChange = false;
        select._itemsElement?.unselect([value]);
      },

      'remove-last-value'(data) {
        const select = data.event.currentTarget;
        if (!select.interactable) return;
        select._canCloseAfterChange = false;
        let type: 'template' | 'item';

        if (data.actionParam === 'template') type = 'template';
        else if (data.actionParam === 'item') type = 'item';
        else {
          type = select._labelElement?.activeTemplateValue
            ? 'template'
            : 'item';
        }

        if (type === 'template') {
          const value = select._labelElement?.activeTemplateValue;
          value && select._itemsElement?.unselect([value]);
        } else if (type === 'item') select._itemsElement?.unselectLatestItem();
      },

      'remove-all'(data) {
        const select = data.event.currentTarget;
        if (!select.interactable) return;
        select._canCloseAfterChange = false;
        select._itemsElement?.unselectAll();
      },

      'switch-active-item'({ event, actionParam }) {
        if (typeof actionParam !== 'string') return;
        const [dir, switchBack] = actionParam.split('-');
        if (dir === 'next')
          event.currentTarget._itemsElement?.switchActiveItem('next', {
            switchBack: switchBack === 'true',
          });
        else if (dir === 'prev')
          event.currentTarget._itemsElement?.switchActiveItem('prev', {
            switchBack: switchBack === 'true',
          });
      },

      'toggle-active-select'(data) {
        data.event.currentTarget._itemsElement?.toggleActiveItemSelect();
      },

      'switch-active-template'({ event, actionParam }) {
        if (actionParam === 'next')
          event.currentTarget._labelElement?.switchActiveTemplate('next');
        else if (actionParam === 'prev')
          event.currentTarget._labelElement?.switchActiveTemplate('prev');
      },

      filter(data) {
        const select = data.event.currentTarget;
        if (!select.interactable) return;
        // biome-ignore lint/suspicious/noExplicitAny: <>
        const hasValue = (el: any): el is { value: string } =>
          typeof el?.value === 'string';
        const value =
          typeof data.actionParam === 'string' && data.actionParam
            ? data.actionParam
            : hasValue(data.matchedTarget)
              ? data.matchedTarget.value
              : '';

        select._itemsElement?.filterOutItems(value);
      },
    },

    switches: {
      opened(data) {
        return (data.event.currentTarget as MuSelect).opened;
      },

      closed(data) {
        return !(data.event.currentTarget as MuSelect).opened;
      },

      empty(data) {
        return (data.event.currentTarget as MuSelect)._value.length === 0;
      },

      'not-empty'(data) {
        return (data.event.currentTarget as MuSelect)._value.length > 0;
      },

      'has-active-item'(data) {
        return (
          (data.event.currentTarget as MuSelect)._itemsElement?.activeValue !==
          undefined
        );
      },

      'no-active-item'(data) {
        return (
          (data.event.currentTarget as MuSelect)._itemsElement?.activeValue ===
          undefined
        );
      },

      template(data) {
        return (
          (data.event.currentTarget as MuSelect)._labelElement?.hasTemplate ===
          true
        );
      },

      'no-template'(data) {
        return (
          (data.event.currentTarget as MuSelect)._labelElement?.hasTemplate !==
          true
        );
      },

      'has-active-template'(data) {
        return !!(data.event.currentTarget as MuSelect)._labelElement
          ?.activeTemplateValue;
      },

      'no-active-template'(data) {
        return !(data.event.currentTarget as MuSelect)._labelElement
          ?.activeTemplateValue;
      },

      autocomplete(data) {
        const select = data.event.currentTarget as MuSelect;
        if (data.switchParam === 'both')
          return select._labelElement?.hasAutocompleteBoth === true;
        return select._labelElement?.hasAutocomplete === true;
      },

      'no-autocomplete'(data) {
        return (
          (data.event.currentTarget as MuSelect)._labelElement
            ?.hasAutocomplete !== true
        );
      },

      'has-autocomplete-value'(data) {
        return !!(data.event.currentTarget as MuSelect)._labelElement
          ?.autocompleteValue;
      },

      'no-autocomplete-value'(data) {
        return !(data.event.currentTarget as MuSelect)._labelElement
          ?.autocompleteValue;
      },
    },
  });

  @property({ reflect: true, type: Boolean })
  opened = false;

  @property({
    type: Boolean,
    attribute: 'no-close-after-select',
  })
  noCloseAfterSelect = false;

  @property({
    type: Boolean,
    attribute: 'no-close-after-blur',
  })
  noCloseAfterBlur = false;

  /**
   * for internal usage
   *
   * this is used to prevent closing the select when a value change is dispatched through a way that shouldn't require select to close after receiving a value change event fired by select items like pressing Backspace to remove a value in autocomplete mode
   */
  _canCloseAfterChange = true;

  _value: string[] = [];

  @queryAssignedElements({ flatten: true })
  protected _assignedElements!: Element[];

  protected _itemsElement?: MuSelectItems;
  protected _labelElement?: MuSelectLabel;
  protected _isReady = this.generateIsReadyPromise();

  override eventActionData:
    | { eventAction: EventAction; events: string[] }
    | undefined = {
    eventAction: MuSelect.eventAction,
    events: ['click', 'pointerdown', 'pointerup', 'keydown', 'input'],
  };

  protected override _addEventActionAttributes(): void {
    this.setAttribute(
      'data-select-keydown',
      JSON.stringify(
        [
          // open and switch active item on ArrowUp and ArrowDown keys
          '#key:ArrowDown? #prevent',
          '#key:ArrowDown? open',
          '#key:ArrowDown? ||switch-active-item:next-true',
          '#key:ArrowUp? #prevent',
          '#key:ArrowUp? open',
          '#key:ArrowUp? ||switch-active-item:prev-true',

          // switch active template value on ArrowLeft and ArrowRight keys
          '#key:ArrowLeft? template? no-autocomplete-value? #prevent',
          '#key:ArrowLeft? template? no-autocomplete-value? ||switch-active-template:prev',
          '#key:ArrowRight? template? no-autocomplete-value? #prevent',
          '#key:ArrowRight? template? no-autocomplete-value? ||switch-active-template:next',

          '#key:Escape? ||close',

          // toggle active select if opened and has active item on Enter
          '#key:Enter? opened? has-active-item? #prevent',
          '#key:Enter? opened? has-active-item? ||toggle-active-select',
          // close if opened and no active item on Enter
          '#key:Enter? opened? no-active-item? #prevent',
          '#key:Enter? opened? no-active-item? ||close',
          // open if closed on Enter
          '#key:Enter? closed? #prevent',
          '#key:Enter? closed? ||open',

          // open if closed and not autocomplete on space
          `#key:Space? closed? no-autocomplete? #prevent`,
          `#key:Space? closed? no-autocomplete? ||open`,
          // close if opened and not autocomplete and not active item on space
          `#key:Space? opened? no-autocomplete? no-active-item? #prevent`,
          `#key:Space? opened? no-autocomplete? no-active-item? ||close`,
          // toggle active select if opened and not autocomplete and has active item on space
          `#key:Space? opened? no-autocomplete? has-active-item? #prevent`,
          `#key:Space? opened? no-autocomplete? has-active-item? ||toggle-active-select`,

          // remove last value if no autocomplete on Backspace
          '#key:Backspace? no-autocomplete? #prevent',
          '#key:Backspace? no-autocomplete? ||remove-last-value',
          // remove last value if autocomplete both and not empty on Backspace
          '#key:Backspace? autocomplete:both? not-empty? #prevent',
          '#key:Backspace? autocomplete:both? not-empty? ||remove-last-value',
          // remove last value if autocomplete and has active template value on Backspace
          '#key:Backspace? autocomplete? has-active-template? #prevent',
          '#key:Backspace? autocomplete? has-active-template? ||remove-last-value:template',
          // remove last value if autocomplete and no active template value on Backspace
          '#key:Backspace? autocomplete? no-autocomplete-value? #prevent',
          '#key:Backspace? autocomplete? no-autocomplete-value? ||remove-last-value',
        ],
        undefined,
        0,
      ),
    );
  }

  override focus() {
    this._labelElement?.focus();
  }

  override connectedCallback(): void {
    super.connectedCallback();

    this.addEventListener('focusout', (_e: FocusEvent) => {
      if (!this.noCloseAfterBlur) this.opened = false;
    });

    this.addEventListener('mu-select-items-change-forced', (e) => {
      this._valueChanged(e.detail.values);
    });

    this.addEventListener('mu-transparent-slotchange', this._slotChangeHandler);
    this.addEventListener('mu-select-items-change', this.itemsChangeHandler);
  }

  itemsChangeHandler = (
    e: MuSelectItemsComponent['events']['mu-select-items-change'],
  ) => {
    e.detail.isCurrentSelection && this._valueChanged(e.detail.values);

    if (this._labelElement?.hasAutocomplete) {
      this._labelElement.clearAutocompleteValue();
      this._itemsElement?.clearFilteredOutItems();
    }

    if (!this.noCloseAfterSelect && this._canCloseAfterChange) {
      this.opened = false;
      this.focus();
    }

    this._canCloseAfterChange = true;
  };

  protected _valueChanged(value: string | string[] | undefined) {
    const valueArr = Array.isArray(value) ? value : (value?.split(',') ?? []);
    this._value = valueArr;
    if (this._labelElement) {
      this._labelElement.value = valueArr;
    }
  }

  protected _slotChangeHandler = () => {
    const assignElement = (element: Element) => {
      if (element instanceof MuSelectItems) {
        this._itemsElement = element;
      } else if (element instanceof MuSelectLabel) {
        this._labelElement = element;
      }
    };

    this._assignedElements.forEach((element) => {
      if (element instanceof MuTransparent) {
        element.contents.forEach(assignElement);
      } else {
        assignElement(element);
      }
    });

    if (this._labelElement) {
      this._labelElement.opened = this.opened;
      this._labelElement.disabled = this.disabled;
      this._labelElement.setListboxId(this._itemsElement?.id);
    }

    if (this._itemsElement) {
      this._itemsElement.opened = this.opened;
      this._itemsElement.disabled = this.disabled;
      this._valueChanged(this._itemsElement.getValue());
      this._itemsElement.setAttribute(
        'aria-label',
        this._labelElement?.legend ?? '',
      );
    }
    this._isReady.resolve();
  };

  protected _handleOpenChange() {
    if (this._itemsElement) this._itemsElement.opened = this.opened;
    if (this._labelElement) this._labelElement.opened = this.opened;

    if (this.opened) {
      this.focus();
      this.dispatchEvent(
        new CustomEvent('mu-select-opened', { bubbles: true, composed: true }),
      );
    } else {
      if (this._itemsElement) this._itemsElement.opened = false;
      this.dispatchEvent(
        new CustomEvent('mu-select-closed', { bubbles: true, composed: true }),
      );
    }
  }

  protected override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    await this._isReady.promise;
    return result;
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('opened')) {
      this._handleOpenChange();
    }

    if (_changedProperties.has('disabled')) {
      if (this._itemsElement) this._itemsElement.disabled = this.disabled;
      if (this._labelElement) this._labelElement.disabled = this.disabled;
    }
  }

  protected override async firstUpdated(
    _changedProperties: PropertyValues,
  ): Promise<void> {
    await this._isReady.promise;
    if (this.opened) this._itemsElement?.focusFirstNavigableItem('next');
    if (!this._itemsElement || !this._labelElement) {
      console.warn(
        'mu-select should have mu-select-items and mu-select-label as children',
        this,
      );
    }
  }

  protected override render(): unknown {
    return html`
      <div id='container' part='container'>
        <slot @slotchange=${this._slotChangeHandler}></slot>
      </div>
    `;
  }
}

MuSelect.register('mu-select');

declare global {
  interface HTMLElementTagNameMap {
    'mu-select': MuSelect;
  }

  interface GlobalEventHandlersEventMap extends Events {}
}
