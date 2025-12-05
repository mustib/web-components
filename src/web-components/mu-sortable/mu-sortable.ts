import {
  EventAction,
  type GenerateData,
  throttle,
} from '@mustib/utils/browser';
import { type CSSResultGroup, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { MuElement, type MuElementComponent } from '../mu-element';
import { MuTransparent } from '../mu-transparent';
import { MuSortableItem } from './mu-sortable-item';
import { MuSortableTrigger } from './mu-sortable-trigger';

export type MuSortableComponent = {
  attributes: MuElementComponent['attributes'] & {
    multiple: MuSortable['multiple'];
    throttle: MuSortable['throttle'];
  };

  events: Events;
};

type Events = {
  'mu-sortable-change': CustomEvent<{
    /**
     * items names order before sorting
     */
    from: string[];

    /**
     * items names order after sorting
     */
    to: string[];

    /**
     * item name that started prepare action
     */
    startItem: string;

    /**
     * selected items names
     */
    selected: string[];
  }>;
};

type SortableItem = {
  element: MuSortableItem;
  index: number;
  name: string;
};

export class MuSortable extends MuElement {
  static override styles?: CSSResultGroup | undefined = [MuElement.cssBase];

  static globalEventActionEvents = ['pointermove', 'pointerup'];

  static eventAction = new EventAction<GenerateData<MuSortable>>({
    currTargetSelector: 'mu-sortable',

    getEventAttributeName(eventName) {
      return `mu-sortable-${eventName}`;
    },

    actions: {
      toggle(data) {
        data.event.currentTarget._changeSortState(data);
      },

      delete(data) {
        data.event.currentTarget._changeSortState(data);
      },

      add(data) {
        data.event.currentTarget._changeSortState(data);
      },

      prepare(data) {
        const sortable = data.event.currentTarget;

        if (sortable._prepareData) {
          console.warn(
            'cannot use prepare action for mu-sortable before current prepare ends',
            data,
          );
          return;
        }

        const movingItem = sortable._getItemFromEventAction(data);

        let type: 'pointer' | 'keyboard';
        if (data.actionParam === 'pointer' || data.actionParam === 'keyboard')
          type = data.actionParam;
        else if (data.event instanceof PointerEvent) type = 'pointer';
        else if (data.event instanceof KeyboardEvent) type = 'keyboard';
        else {
          console.warn('cannot get prepare action type for mu-sortable', data);
          return;
        }

        sortable._prepareData = {
          movingItem,
          initialItems: sortable._sortableItems,
          type,
        };
        // need to defer so events not fire immediately
        setTimeout(() => {
          if (type === 'pointer') {
            const handler = throttle(
              sortable._globalPointerMoveHandler.bind(sortable),
              sortable.throttle,
            );
            sortable._throttledGlobalPointerMoveHandler = handler;
            document.addEventListener('pointermove', handler);
            document.addEventListener(
              'pointerup',
              sortable._endSortingHandler,
              { once: true },
            );
          } else {
            document.addEventListener(
              'keydown',
              sortable._globalKeydownHandler,
            );
          }
        }, 0);
      },
    },

    switches: {
      prepared(data) {
        const sortable = data.event.currentTarget as MuSortable;
        return sortable._prepareData !== undefined;
      },
    },
  });

  _addEventActionAttributes: undefined;

  eventActionData = {
    eventAction: MuSortable.eventAction,
    events: ['pointerdown', 'click', 'keydown'],
  };

  /**
   * a boolean indicates if multiple items can be sorted at the same time
   *
   * @default false
   */
  @property({ type: Boolean })
  multiple = false;

  /**
   * pointer move throttle in ms
   *
   * @default 50
   */
  @property({ type: Number })
  throttle = 50;

  protected _sortableItemsNamesMap = new Map<string, SortableItem>();
  protected _sortableItemsElementsMap = new Map<MuSortableItem, SortableItem>();
  protected _sortableItems: SortableItem[] = [];
  protected _overSortableItem?: SortableItem;
  protected _toBeSortedItems = new Set<SortableItem>();
  protected _moveActionAnimationFrameId?: number;
  protected _hasStartedMovingItems = false;

  protected _prepareData?: {
    /**
     * The item that triggered prepare action regardless if there are multiple items to be sorted
     */
    movingItem: SortableItem;

    type: 'keyboard' | 'pointer';

    /**
     * Initial items order before any sorting
     */
    initialItems: SortableItem[];
  };

  protected _changeSortState(data: GenerateData<MuSortable>): void {
    const actionName = data._parsedAction.name;
    if (this._hasStartedMovingItems) {
      console.warn(
        `cannot use (${actionName}) action in mu-sortable when there is active sorting`,
        data,
      );
      return;
    }

    const item = this._getItemFromEventAction(data);

    let operation: string;

    if (actionName === 'toggle') {
      operation = this._toBeSortedItems.has(item) ? 'delete' : 'add';
    } else operation = actionName;

    switch (operation) {
      case 'add':
        if (!this.multiple) {
          this._toBeSortedItems.forEach((item) => {
            item.element.setAdded(false);
          });
          this._toBeSortedItems.clear();
        }
        item.element.setAdded(true);
        this._toBeSortedItems.add(item);
        break;
      case 'delete':
        item.element.setAdded(false);
        this._toBeSortedItems.delete(item);
        break;
      default:
        console.warn(
          `unsupported action name (${actionName}) cannot change select state for mu-sortable`,
          data,
        );
        break;
    }
  }

  protected _getItemFromEventAction(
    data: GenerateData<MuSortable>,
  ): SortableItem {
    const actionName = data._parsedAction.name;
    let itemName: string;

    if (typeof data.actionParam === 'string' && data.actionParam !== '')
      itemName = data.actionParam;
    else if (data.matchedTarget instanceof MuSortableItem)
      itemName = data.matchedTarget.name;
    else if (data.matchedTarget instanceof MuSortableTrigger)
      itemName = data.matchedTarget.for;
    else {
      throw new Error(
        `cannot get mu-sortable-item name for (${actionName}) action because it is not passed as action param or the element which dispatched the action is not the item itself or it's trigger`,
      );
    }

    const item = this._sortableItemsNamesMap.get(itemName);

    if (!item) {
      throw new Error(`(${itemName}) is not recognized mu-sortable-item name`);
    }

    return item;
  }

  protected _endSortingHandler = () => {
    if (this._moveActionAnimationFrameId) {
      cancelAnimationFrame(this._moveActionAnimationFrameId);
      this._moveActionAnimationFrameId = undefined;
    }

    const prepareData = this._prepareData;
    if (!prepareData) {
      throw new Error(
        'internal mu-sortable error (_prepareData) is undefined in end handler',
      );
    }

    const selected: string[] = [];
    const startItem = prepareData.movingItem.name;
    const from = prepareData.initialItems.map((item) => item.name);
    const to = this._sortableItems.map((item) => item.name);

    if (this._throttledGlobalPointerMoveHandler)
      document.removeEventListener(
        'pointermove',
        this._throttledGlobalPointerMoveHandler,
      );
    document.removeEventListener('keydown', this._globalKeydownHandler);
    document.removeEventListener('pointerup', this._endSortingHandler);

    const eventName = 'mu-sortable-change';
    const event: Events[typeof eventName] = new CustomEvent(eventName, {
      bubbles: true,
      composed: true,
      detail: { from, to, selected, startItem },
    });

    this._toBeSortedItems.forEach((item) => {
      selected.push(item.name);
      item.element.setAdded(false);
      item.element.setIsMoving(false);
    });

    this._toBeSortedItems.clear();
    this._hasStartedMovingItems = false;
    this._prepareData = undefined;
    this.dispatchEvent(event);
  };

  protected _throttledGlobalPointerMoveHandler?: typeof this._globalPointerMoveHandler;

  protected _moveItems(overItem: SortableItem | undefined) {
    if (!this._toBeSortedItems.size) return;
    const lastAnimationFrameId = this._moveActionAnimationFrameId;

    if (lastAnimationFrameId !== undefined)
      cancelAnimationFrame(lastAnimationFrameId);

    this._moveActionAnimationFrameId = requestAnimationFrame(() => {
      const prepareData = this._prepareData;
      if (!prepareData) {
        throw new Error(
          'internal mu-sortable error, (_prepareData) is undefined',
        );
      }

      /**
       * Notify sortable item of being moved
       */
      if (!this._hasStartedMovingItems) {
        this._toBeSortedItems.forEach((item) => {
          item.element.setIsMoving(true);
        });
        this._hasStartedMovingItems = true;
      }

      this._overSortableItem = overItem;

      if (overItem) {
        const preparedItem = prepareData.movingItem;

        const isMovingBackward = preparedItem.index > overItem.index;

        [...this._toBeSortedItems]
          .sort((a, b) =>
            isMovingBackward ? a.index - b.index : b.index - a.index,
          )
          .forEach((toBeSortedItem) => {
            overItem.element.parentElement?.insertBefore(
              toBeSortedItem.element,
              isMovingBackward
                ? overItem.element
                : overItem.element.nextElementSibling,
            );
          });
      }
    });
  }

  protected _globalKeydownHandler = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      this._endSortingHandler();
      return;
    }

    let direction: 'next' | 'prev' | undefined;
    if (event.key === 'ArrowUp') {
      direction = 'prev';
    } else if (event.key === 'ArrowDown') direction = 'next';

    if (!direction) return;

    const overItem = this.getNavigationItem({
      direction,
      items: this._sortableItems,
      fromIndex: this._prepareData?.movingItem.index,
      isNavigable: (item) => {
        return !this._toBeSortedItems.has(item);
      },
    });
    this._moveItems(overItem);
  };

  protected _globalPointerMoveHandler(event: PointerEvent) {
    const overItemElement = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((el) => {
        if (!(el instanceof MuSortableItem)) return false;
        const sortableItem = this._sortableItemsElementsMap.get(el);
        return sortableItem && !this._toBeSortedItems.has(sortableItem);
      }) as MuSortableItem | undefined;

    const overItem = overItemElement
      ? this._sortableItemsElementsMap.get(overItemElement)
      : undefined;
    this._moveItems(overItem);
  }

  protected _slotChangeHandler = async () => {
    const toBeSortedNames = new Set(
      [...this._toBeSortedItems].map((item) => item.name),
    );

    this._toBeSortedItems.clear();
    this._sortableItems = [];
    this._sortableItemsNamesMap.clear();
    this._sortableItemsElementsMap.clear();

    const addElement = (element: Element) => {
      if (element instanceof MuSortableItem) {
        const name = element.name;
        if (this._sortableItemsNamesMap.has(name)) {
          console.warn('duplicated mu-sortable-item name', element);
          return;
        }
        const item: SortableItem = {
          element,
          index: this._sortableItems.length,
          name,
        };
        this._sortableItems.push(item);
        this._sortableItemsElementsMap.set(element, item);
        this._sortableItemsNamesMap.set(name, item);
        if (this._prepareData?.movingItem.name === name) {
          this._prepareData.movingItem = item;
        }
        if (toBeSortedNames.has(name)) {
          this._toBeSortedItems.add(item);
        }
      }
    };

    this.renderRoot.querySelectorAll('slot').forEach((slot) => {
      slot.assignedElements({ flatten: true }).forEach((el) => {
        if (el instanceof MuTransparent) el.contents.forEach(addElement);
        else addElement(el);
      });
    });
  };

  protected override async firstUpdated(
    _changedProperties: PropertyValues,
  ): Promise<void> {
    this._slotChangeHandler();
    await this.updateComplete;
    this.addEventListener('mu-transparent-slotchange', this._slotChangeHandler);
    this.renderRoot.addEventListener('slotchange', this._slotChangeHandler);
  }

  protected override render(): unknown {
    return html`
      <slot></slot>
      `;
  }
}

MuSortable.register('mu-sortable');

declare global {
  interface HTMLElementTagNameMap {
    'mu-sortable': MuSortable;
  }

  interface GlobalEventHandlersEventMap extends Events {}
}
