import {
  debounce,
  disableElementScroll,
  EventAction,
  enableElementScroll,
  type GenerateData,
  getElementBoundaries,
} from '@mustib/utils/browser';
import { css, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { MuElement, type MuElementComponent } from '../mu-element';
import { MuTransparent } from '../mu-transparent';
import { MuSelectItem } from './mu-select-item';

export type MuSelectItemsComponent = {
  attributes: MuElementComponent['attributes'] & {
    opened: MuSelectItems['opened'];
    multiple: MuSelectItems['multiple'];
    value: MuSelectItems['value'];
    'no-clear-active-on-close': MuSelectItems['noClearActiveOnClose'];
    'default-value': MuSelectItems['defaultValue'];
    position: MuSelectItems['position'];
    'open-mode': MuSelectItems['openMode'];
  };

  events: Events;
};

type SelectItem = {
  element: MuSelectItem;
  value: string;
  selected: boolean;
  active: boolean;
  index: number;
};

export type Events = {
  /**
   * this event is dispatched whenever the user selects an item
   */
  'mu-select-items-change': CustomEvent<{
    /**
     * selected values
     */
    values: string[];

    /**
     * a boolean indicating if the dispatched values are the current selected values of the component,
     *
     * if the component is controlled, this will be false, and the dispatched values are the ones applied by the user.
     *
     * if the component is uncontrolled, this will be true, and the dispatched values are the current selected values of the component.
     */
    isCurrentSelection: boolean;
  }>;

  /**
   * this event is dispatched whenever a slot items change and there are selected items that are no longer in the slot
   */
  'mu-select-items-change-orphans': CustomEvent<{
    /**
     * selected values that are no longer in the slot
     */
    orphanValues: string[];

    /**
     * selected values that are still in the slot
     */
    values: string[];
  }>;

  /**
   * This event is dispatched when the selected items change without user interaction.
   *
   * This happens when the `value` attribute changes or the `defaultValue` attribute is set for the first time.
   *
   * This event is intended for internal usage, so dependent mu elements can update their values.
   *
   * The normal `mu-select-items-change` event is not dispatched in this case, as the controller is already aware of the change.
   *
   * In the default value case, the normal event should not be dispatched either, because the user didn't interact with the select, and the value is forced initially.
   */
  'mu-select-items-change-forced': CustomEvent<{
    /**
     * selected values that are forced
     */
    values: string[];
  }>;

  /**
   * this event is dispatched whenever the active item changes
   */
  'mu-select-items-active-item-change': CustomEvent<{
    id: string | undefined;
  }>;
};

type SwitchActiveItemOptions = Partial<{
  /**
   * A `boolean` indicates if the selection should wrap around to the start/end
   */
  switchBack: boolean;
}>;

export class MuSelectItems extends MuElement {
  static override styles = [
    MuElement.cssBase,
    css`
    #container {
      --select-items-background-color: var(--mu-select-items-background-color, var(--mu-color-800));
      --select-items-border-color: var(--mu-select-items-border-color, var(--mu-color-500));
      --items-margin: var(--mu-base-rem);
      position: var(--items-position);
      top: var(--items-top);
      bottom: var(--items-bottom);
      left: var(--items-left);
      right: var(--items-right);
      width: var(--items-width);
      margin-block: var(--items-margin);
      transform-origin: var(--items-transform-origin);
      overflow: auto;
      max-height: min(calc(var(--items-max-height, 75vh) - (var(--items-margin) * 2)), 75vh);
      scrollbar-width: thin;
      display: grid;
      gap: calc(var(--mu-base-rem) * 1);
      padding: calc(var(--mu-base-rem));
      background-color: var(--select-items-background-color);
      transition-duration: .2s;
      transition-timing-function: ease-in-out;
      transition-property: opacity scale translate;
      border-radius: calc(var(--mu-base-rem) * 1.5);
      border: 1px solid var(--select-items-border-color);
    }

    :host([opened][position='fixed']) #container {
      transition-property: opacity;
    }

    :host(:not([opened])) #container {
      visibility: hidden;
      opacity: 0;
      scale: 1 .25;
      translate: 0 -10%;
    }

    @media (prefers-color-scheme: light) {
      #container {
        --select-items-background-color: var(--mu-select-items-background-color, var(--mu-color-100));
        --select-items-border-color: var(--mu-select-items-border-color, var(--mu-color-300));
      }
    }
  `,
  ];

  static eventAction = new EventAction<GenerateData<MuSelectItems>>({
    currTargetSelector: 'mu-select-item',

    getEventAttributeName(eventName) {
      return `data-items-${eventName}`;
    },

    switches: {
      opened({ event }) {
        return (event.currentTarget as MuSelectItems).opened;
      },

      closed({ event }) {
        return !(event.currentTarget as MuSelectItems).opened;
      },
    },

    actions: {
      'toggle-select'(data) {
        const items = data.event.currentTarget;
        if (!items.interactable) return;
        const item = items._itemsValuesMap.get(data.actionParam as string);
        items._changeSelectState('toggle', item);
      },

      select(data) {
        const items = data.event.currentTarget;
        if (!items.interactable) return;
        const item = items._itemsValuesMap.get(data.actionParam as string);
        items._changeSelectState('add', item);
      },

      unselect(data) {
        const items = data.event.currentTarget;
        if (!items.interactable) return;
        const item = items._itemsValuesMap.get(data.actionParam as string);
        items._changeSelectState('remove', item);
      },

      'set-active'(data) {
        const items = data.event.currentTarget;
        if (!items.interactable) return;
        const item = items._itemsValuesMap.get(data.actionParam as string);
        items._addActiveItemState(item);
      },
    },
  });

  @property({
    reflect: true,
    type: Boolean,
  })
  opened = false;

  @property({
    type: Boolean,
  })
  multiple = false;

  @property({
    reflect: true,
    type: Array,
    converter: {
      toAttribute(value, _type) {
        return Array.isArray(value) ? value.join(',') : value;
      },
      fromAttribute(value, _type) {
        return value?.split(',');
      },
    },
  })
  value?: string[];

  @property({
    type: Boolean,
    attribute: 'no-clear-active-on-close',
  })
  noClearActiveOnClose = false;

  @property({
    attribute: 'default-value',
  })
  defaultValue?: string;

  @property()
  position: 'absolute' | 'fixed' = 'fixed';

  /**
   * Controls how the items container behaves when opened.
   *
   * - `'static'`: Position is calculated once when opened or closed.
   * - `'no-scroll'`: Like static, but page scroll is disabled.
   * - `'dynamic'`: Position is recalculated on scroll.
   *
   * @default 'no-scroll'
   */
  @property({ attribute: 'open-mode' })
  openMode: 'static' | 'no-scroll' | 'dynamic' = 'no-scroll';

  override eventActionData = {
    eventAction: MuSelectItems.eventAction,
    events: ['click', 'pointerover', 'pointerdown'],
  };

  _addEventActionAttributes: undefined;

  get isControlled() {
    return this.value && this.value.length > 0;
  }

  override get parentElement() {
    const selector = this.getAttribute('parent-selector');
    const element = selector
      ? this.closestPierce(selector)
      : super.parentElement;
    if (!element) {
      throw new Error(
        `no parent element found for (${this.tagName.toLowerCase()}) element ${selector === null ? '' : `with the selector ${selector}`}`,
      );
    }
    return element;
  }

  protected _resizeObserver?: ResizeObserver;
  protected _isReady = this.generateIsReadyPromise();
  protected _items = [] as SelectItem[];
  protected _itemsValuesMap = new Map<string, SelectItem>();
  protected _itemsElementsMap = new Map<MuSelectItem, SelectItem>();
  protected _activeItem?: SelectItem;
  protected _selectedValues = new Set<string>();

  get activeValue() {
    return this._activeItem?.value;
  }

  getValue(): string[] {
    return Array.from(this._selectedValues);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.role = 'listbox';
    this.addEventListener('mu-transparent-slotchange', this._slotChangeHandler);

    if (this.position === 'fixed') {
      this._resizeObserver = new ResizeObserver(this._calculateSizes);
    }
  }

  /**
   *
   */
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('scroll', this._calculateSizes);
    this._resizeObserver?.disconnect();
  }

  unselect(values: string[]) {
    values.forEach((value) => {
      this._changeSelectState('remove', value);
    });
  }

  unselectAll() {
    this.unselect(this.getValue());
  }

  unselectLatestItem() {
    this._changeSelectState('remove', this.getValue().pop());
  }

  toggleActiveItemSelect() {
    this._changeSelectState('toggle', this._activeItem);
  }

  /**
   * Calculates the position of the items container.
   */
  protected _calculateSizes = () => {
    const boundaries = getElementBoundaries(this.parentElement);
    const yAxisPosition =
      boundaries.elementTop >= boundaries.elementBottom ? 'top' : 'bottom';
    this.setAttribute('items-y-axis', yAxisPosition);
    this.style.setProperty(
      '--items-max-height',
      `${Math.max(boundaries.elementTop, boundaries.elementBottom)}px`,
    );
    if (this.position === 'fixed') {
      this.style.setProperty('--items-position', 'fixed');
      this.style.setProperty('--items-width', `${boundaries.width}px`);
      if (yAxisPosition === 'top') {
        this.style.setProperty(
          '--items-bottom',
          `${boundaries.elementBottom + boundaries.height}px`,
        );
        this.style.setProperty('--items-top', 'unset');
        this.style.setProperty('--items-transform-origin', 'bottom');
      } else {
        this.style.setProperty(
          '--items-top',
          `${boundaries.elementTop + boundaries.height}px`,
        );
        this.style.setProperty('--items-bottom', 'unset');
        this.style.setProperty('--items-transform-origin', 'top');
      }
      this.style.setProperty('--items-left', `${boundaries.elementLeft}px`);
      this.style.setProperty('--items-right', `${boundaries.elementRight}px`);
    } else {
      this.style.setProperty('--items-position', 'absolute');
      this.style.setProperty('--items-width', '100%');
      if (yAxisPosition === 'top') {
        this.style.setProperty('--items-bottom', '100%');
        this.style.setProperty('--items-top', 'unset');
        this.style.setProperty('--items-transform-origin', 'bottom');
      } else {
        this.style.setProperty('--items-top', '100%');
        this.style.setProperty('--items-bottom', 'unset');
        this.style.setProperty('--items-transform-origin', 'top');
      }
      this.style.setProperty('--items-left', '0');
      this.style.setProperty('--items-right', '0');
    }
  };

  /**
   * Focuses the first navigable item in the given direction.
   *
   * If an active item already exists, it will be focused.
   *
   * Used by parent to focus the first or last navigable item when opened
   */
  focusFirstNavigableItem(direction: 'next' | 'prev') {
    this.updateComplete.then(() => {
      const item =
        this._activeItem ||
        this._getNavigationItem({ direction, switchBack: true });
      this._addActiveItemState(item);
    });
  }

  protected _getNavigationItem({
    direction,
    switchBack = false,
    fromIndex = direction === 'next' ? -1 : this._items.length,
  }: {
    fromIndex?: number;
    direction: 'next' | 'prev';
    switchBack: boolean;
  }) {
    return this.getNavigationItem({
      fromIndex,
      direction,
      switchBack,
      items: this._items,
      isNavigable: (item) =>
        !(
          item.element.disabled ||
          item.element.readonly ||
          item.element.filteredOut
        ),
    });
  }

  /**
   * Add active state to the next or previous item from the current active item.
   */
  switchActiveItem(
    direction: 'next' | 'prev',
    options?: SwitchActiveItemOptions,
  ) {
    const { switchBack = true } = options ?? {};
    const activeIndex = this._activeItem?.index;
    const newActiveItem = this._getNavigationItem({
      direction,
      switchBack,
      fromIndex: activeIndex,
    });
    return this._addActiveItemState(newActiveItem);
  }

  protected _addActiveItemState(item: SelectItem | undefined) {
    if (
      !item ||
      item.element.disabled ||
      item.element.readonly ||
      item.element.filteredOut
    )
      return;

    this.clearActiveItem();
    item.element.active = item.active = true;
    this._activeItem = item;
    item.element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    });
    this._dispatchActiveItemChange({ id: item.element.id });

    return true;
  }

  clearFilteredOutItems() {
    this._items.forEach((item) => {
      item.element.filteredOut = false;
    });
  }

  filterOutItems(value: string) {
    this._items.forEach((item) => {
      const isFilteredOut = !item.value
        .toLowerCase()
        .includes(value.toLowerCase());
      item.element.filteredOut = isFilteredOut;
      if (isFilteredOut && this._activeItem === item) this.clearActiveItem();
    });
  }

  /**
   * Dispatches an event with the active item id, so parent can update aria-activedescendant
   */
  protected _dispatchActiveItemChange({ id }: { id: string | undefined }) {
    const eventName = 'mu-select-items-active-item-change';
    this.dispatchEvent(
      new CustomEvent<Events[typeof eventName]['detail']>(eventName, {
        bubbles: true,
        composed: true,
        detail: { id },
      }),
    );
  }

  /**
   *
   */
  clearActiveItem() {
    if (this._activeItem) {
      this._activeItem.element.active = false;
      this._activeItem = undefined;
      this._dispatchActiveItemChange({ id: undefined });
    }
  }

  /**
   *
   */
  protected getMuSelectItemFromEvent(e: Event) {
    const item =
      e.target instanceof HTMLElement
        ? e.target.closest('mu-select-item')
        : null;
    if (item && !(item.disabled || item.readonly || item.filteredOut))
      return this._itemsElementsMap.get(item);
  }

  /**
   *
   */
  protected _slotChangeHandler = () => {
    const previouslySelectedValues = new Set(this._selectedValues);
    const previouslyActiveItem = this._activeItem;

    this._items = [];
    this._activeItem = undefined;
    this._itemsValuesMap.clear();
    this._itemsElementsMap.clear();

    const newSelectedValues = new Set<string>();

    const addItem = (element: MuSelectItem) => {
      const { value } = element;
      if (this._itemsValuesMap.has(value)) {
        console.warn(
          `Item with value ${value} already exists in mu-select-items, it will be ignored`,
          element,
        );
        return;
      }
      const item: SelectItem = {
        element,
        value,
        selected: false,
        active: false,
        index: this._items.length,
      };

      this._itemsValuesMap.set(value, item);
      this._itemsElementsMap.set(element, item);
      this._items.push(item);

      if (previouslySelectedValues.has(value)) newSelectedValues.add(value);
      if (previouslyActiveItem?.value === value) this._addActiveItemState(item);
    };

    (this.renderRoot.querySelector('slot#items-slot') as HTMLSlotElement)
      .assignedElements({ flatten: true })
      .forEach((child) => {
        if (child instanceof MuTransparent) {
          const contents = (child as MuTransparent).contents;
          contents.forEach((content) => {
            if (!(content instanceof MuSelectItem)) return;
            addItem(content);
          });
          return;
        }

        if (!(child instanceof MuSelectItem)) return;
        addItem(child);
      });

    const removedSelected =
      previouslySelectedValues.difference(newSelectedValues);

    if (removedSelected.size > 0) {
      if (!this.isControlled) {
        this._selectedValues.clear();
        newSelectedValues.forEach((value) => {
          this._addSelectState(this._itemsValuesMap.get(value));
        });
      }

      const eventName = 'mu-select-items-change-orphans';
      this.dispatchEvent(
        new CustomEvent<Events[typeof eventName]['detail']>(eventName, {
          bubbles: true,
          composed: true,
          detail: {
            orphanValues: Array.from(removedSelected),
            values: Array.from(newSelectedValues),
          },
        }),
      );
    }

    if (!this._isReady.resolved) this._isReady.resolve();
  };

  /**
   *
   */
  protected _addSelectState(item: SelectItem | undefined) {
    if (!item) return;
    item.element.selected = item.selected = true;
    this._selectedValues.add(item.value);
  }

  /**
   *
   */
  protected _removeSelectState(item: SelectItem | undefined) {
    if (!item) return;
    item.element.selected = item.selected = false;
    this._selectedValues.delete(item.value);
  }

  /**
   *
   */
  protected _clearSelectState() {
    for (const value of this._selectedValues) {
      const item = this._itemsValuesMap.get(value);
      this._removeSelectState(item);
    }
  }

  _dispatchChangeEvent(detail: Events['mu-select-items-change']['detail']) {
    const event = new CustomEvent<Events['mu-select-items-change']['detail']>(
      'mu-select-items-change',
      {
        detail,
        bubbles: true,
        composed: true,
        cancelable: true,
      },
    );
    this.dispatchEvent(event);
  }

  _debounceDispatchChangeEvent = debounce(
    this._dispatchChangeEvent.bind(this),
    50,
  );

  /**
   * Modifies the selection state of a specified item.
   * @param type Specifies the operation to perform:
   *
   * `'add'` - Adds the item to the selection.
   *
   * `'add-only'` - Clears previous selections and adds the item.
   *
   * `'remove'` - Removes the item from the selection.
   *
   * `'toggle'` - Toggles the item's selection state.
   *
   * Upon completion, a 'muSelectItemsValueChange' event is dispatched.
   */
  protected _changeSelectState(
    type: 'add' | 'add-only' | 'remove' | 'toggle',
    _item: SelectItem | string | undefined,
  ) {
    const item =
      typeof _item === 'string' ? this._itemsValuesMap.get(_item) : _item;
    if (!item || !item.element.interactable) return;

    let operation = type;
    if (operation === 'toggle') {
      operation = this._selectedValues.has(item.value) ? 'remove' : 'add';
    }

    const { isControlled } = this;

    switch (operation) {
      case 'add-only':
      case 'add':
        if (!this.multiple || operation === 'add-only') {
          this._debounceDispatchChangeEvent({
            values: [item.value],
            isCurrentSelection: !isControlled,
          });
          if (!isControlled) {
            this._clearSelectState();
            this._addSelectState(item);
          }
          return;
        }
        this._debounceDispatchChangeEvent({
          values: [...this._selectedValues, item.value],
          isCurrentSelection: !isControlled,
        });
        if (!isControlled) {
          this._addSelectState(item);
        }
        return;
      case 'remove':
        this._debounceDispatchChangeEvent({
          values: [...this._selectedValues].filter(
            (value) => value !== item.value,
          ),
          isCurrentSelection: !isControlled,
        });
        if (!isControlled) {
          this._removeSelectState(item);
        }
        break;
      default:
        operation satisfies never;
        break;
    }
  }

  /**
   * This method is called when the 'value' attribute changes or the first time 'defaultValue' is set.
   *
   * It does not fire the 'mu-select-items-change' event but instead fires the 'mu-select-items-change-forced' event.
   */
  protected _changeSelectStateFromAttributeValue(
    value: string | undefined | null | string[],
  ) {
    if (!value) return;
    const validValues = (
      Array.isArray(value) ? value : value.split(',')
    ).filter((value) => {
      if (value === '') return false;
      const isValid = this._itemsValuesMap.has(value);
      if (!isValid)
        console.warn(
          `No item found for value (${value}) in select items`,
          this,
        );
      return isValid;
    });
    if (validValues.length > 1 && !this.multiple) {
      console.warn(
        `Trying to select ${validValues.length} items in a non-multiple select. Only the first one will be selected. If you want to allow multiple selection, please add the 'multiple' attribute to the element.`,
        this,
      );
      validValues.splice(0, validValues.length - 1);
    }
    const newSelectedValues = new Set(validValues);
    const removedValues = this._selectedValues.difference(newSelectedValues);
    removedValues.forEach((value) => {
      this._removeSelectState(this._itemsValuesMap.get(value));
    });

    validValues.forEach((value) => {
      const item = this._itemsValuesMap.get(value);
      this._addSelectState(item);
    });

    const eventName = 'mu-select-items-change-forced';
    this.dispatchEvent(
      new CustomEvent<Events[typeof eventName]['detail']>(eventName, {
        bubbles: true,
        composed: true,
        detail: { values: validValues },
      }),
    );
  }

  /**
   * This method handles open state changes
   */
  protected _openChangeHandler() {
    this._calculateSizes();

    if (!this.opened && !this.noClearActiveOnClose) {
      this.clearActiveItem();
    }

    switch (this.openMode) {
      case 'static':
        break;
      case 'no-scroll':
        this.opened ? disableElementScroll() : enableElementScroll();
        break;
      case 'dynamic':
        this.opened
          ? window.addEventListener('scroll', this._calculateSizes)
          : window.removeEventListener('scroll', this._calculateSizes);
        break;
      default:
        this.openMode satisfies never;
        break;
    }

    if (this._resizeObserver) {
      this._resizeObserver[this.opened ? 'observe' : 'unobserve'](
        this.parentElement,
      );
      this._resizeObserver[this.opened ? 'observe' : 'unobserve'](
        document.body,
      );
    }
  }

  protected override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete();
    await this._isReady.promise;
    return result;
  }

  protected override async firstUpdated(
    _changedProperties: PropertyValues<this>,
  ): Promise<void> {
    await this._isReady.promise;

    if (this.defaultValue !== undefined) {
      if (this.value) {
        console.warn(
          `Both 'value' and 'defaultValue' attributes are set. 'defaultValue' will be ignored.`,
          this,
        );
      } else {
        this._changeSelectStateFromAttributeValue(this.defaultValue);
      }
    }
  }

  protected override async updated(
    changedProperties: PropertyValues<this>,
  ): Promise<void> {
    await this.updateComplete;

    if (changedProperties.has('multiple')) {
      this.setAttribute(
        'aria-multiselectable',
        this.multiple ? 'true' : 'false',
      );
    }

    if (changedProperties.has('disabled')) {
      if (this.disabled) {
        this.clearActiveItem();
        this.ariaDisabled = 'true';
      } else {
        this.ariaDisabled = 'false';
      }
    }

    if (changedProperties.has('opened')) {
      this._openChangeHandler();
    }

    if (changedProperties.has('value')) {
      this._changeSelectStateFromAttributeValue(this.value);
    }
  }

  protected override render(): unknown {
    return html`
      <div id='container' part='container'>
        <slot id='items-slot' @slotchange=${this._slotChangeHandler}></slot>
      </div>
    `;
  }
}

MuSelectItems.register('mu-select-items');

declare global {
  interface HTMLElementTagNameMap {
    'mu-select-items': MuSelectItems;
  }

  interface GlobalEventHandlersEventMap extends Events {}
}
