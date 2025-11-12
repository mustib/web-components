import {
  closestPierce,
  type EventAction,
  parseJson,
} from '@mustib/utils/browser';
import { css, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

type Elements = [
  'mu-select-item',
  'mu-select-items',
  'mu-transparent',
  'mu-trigger',
  'mu-select',
  'mu-select-label',
  'mu-select-label-content',
  'mu-keyboard-trigger',
  'mu-keyboard-trigger-key',
  'mu-range',
  'mu-range-fill',
  'mu-range-thumb',
  'mu-range-thumb-value',
  'mu-icon',
];

let count = 0;
export abstract class MUElement extends LitElement {
  static #muElements = new Map<string, { element: MUElement }>();
  static closestPierce = closestPierce;

  static register(this: { new (): MUElement }, tagName: Elements[number]) {
    if (customElements.get(tagName)) return;
    // biome-ignore lint/complexity/noThisInStatic: <>
    customElements.define(tagName, this as CustomElementConstructor);
  }

  static css = {
    focus: css`
    --focus-color: oklch(from currentColor l c h / 0.5);
    box-shadow: 0 0 0 var(--focus-width, 2px) var(--mu-focus-color, var(--focus-color)) inset;
  `,
  };

  static cssColors = css`
  --mu-color-100: hsl(var(--mu-hue), 20%, 95%);
  --mu-color-200: hsl(var(--mu-hue), 30%, 85%);
  --mu-color-300: hsl(var(--mu-hue), 40%, 75%);
  --mu-color-400: hsl(var(--mu-hue), 50%, 65%);
  --mu-color-500: hsl(var(--mu-hue), 60%, 55%);
  --mu-color-600: hsl(var(--mu-hue), 70%, 45%);
  --mu-color-700: hsl(var(--mu-hue), 80%, 35%);
  --mu-color-800: hsl(var(--mu-hue), 90%, 25%);
  --mu-color-900: hsl(var(--mu-hue), 100%, 15%);
`;

  static cssBase = css`
    *, *::before, *::after, :where(:host) {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font: inherit;
      border: none;
      outline: none;
    }

    .truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :where(:host) {
      ${MUElement.cssColors}
      --mu-base-rem: 10px;
      --mu-hue: 240;
      display: block;
      font-size: calc(var(--mu-base-rem) * 1.6);
      color: var(--mu-color-100);
      font-family: sans-serif;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      max-width: 100%;
    }

    @media (prefers-color-scheme: light) {
      :where(:host) {
        color: var(--mu-color-900);
      }
    }

    :where(:host([readonly]), :host([disabled])) {
      user-select: none;
      cursor: not-allowed;
    }
  `;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  /**
   * If true, do not add {@link https://mustib.github.io/mustib-utils/v2/utilities/browser/eventaction/ event action} attributes
   *
   * By default mu-element will call `_addEventActionAttributes` in connectedCallback if it is not undefined and `noEventActionAttributes` is false
   */
  @property({
    type: Boolean,
    attribute: 'no-event-action-attributes',
  })
  private noEventActionAttributes = false;

  /**
   * This function is used to add {@link https://mustib.github.io/mustib-utils/v2/utilities/browser/eventaction/ event action} attributes for all related elements belongs to this element
   *
   * It is called in connectedCallback if `noEventActionAttributes` is false
   */
  protected abstract _addEventActionAttributes?(): void;

  /**
   * This object should be used if the element supports {@link https://mustib.github.io/mustib-utils/v2/utilities/browser/eventaction/ event action}.
   *
   * `mu-element` will automatically add events when element is connected and remove them when element is disconnected
   */
  abstract eventActionData:
    | undefined
    | {
        eventAction: EventAction<unknown>;

        /**
         * A list of default events names to add {@link https://mustib.github.io/mustib-utils/v2/utilities/browser/eventaction/ event action} listeners
         */
        events: string[];
      };

  /**
   * A user customizable list of events names to add {@link https://mustib.github.io/mustib-utils/v2/utilities/browser/eventaction/ event action} listeners if the element has the `eventActionData` property
   */
  @property({
    converter: {
      toAttribute(value, _type) {
        return JSON.stringify(value);
      },
      fromAttribute(value, _type) {
        return value === null ? [] : parseJson(value);
      },
    },
  })
  protected readonly eventActionEvents?: string[];

  get interactable() {
    return !(this.disabled || this.readonly);
  }

  declare muId: string;

  constructor() {
    super();
    Reflect.defineProperty(this, 'muId', {
      value: `mu-element-${++count}`,
      configurable: false,
      writable: false,
      enumerable: true,
    });
  }

  generateIsReadyPromise({
    timeout = 1000,
    onTimeout = () => {
      console.warn('timeout reached for isReady promise', this);
    },
  }: {
    timeout?: number;
    onTimeout?: () => void;
  } = {}) {
    const obj = {
      status: 'pending',
      resolved: false,
    } as {
      status: 'success' | 'fail' | 'pending';
      resolved: boolean;
      promise: Promise<boolean>;
      resolve: () => void;
    };

    obj.promise = new Promise<boolean>((r) => {
      const timeoutId = setTimeout(() => {
        if (obj.resolved) return;
        obj.resolved = true;
        obj.status = 'fail';
        onTimeout?.();
        r(true);
      }, timeout);
      obj.resolve = () => {
        if (obj.resolved) return;
        clearTimeout(timeoutId);
        obj.resolved = true;
        obj.status = 'success';
        r(true);
      };
    });

    return obj as Readonly<typeof obj>;
  }

  getMuElementById(id: string) {
    return MUElement.#muElements.get(id);
  }

  closestPierce(selector: string) {
    return MUElement.closestPierce(selector, this);
  }

  /**
   * This method gets the next or previous navigable item from the given index.
   *
   * If an item not found and switchBack is true, it will go the other direction to find an item
   *
   * It takes An optional object with the following properties:
   *  - `fromIndex` - The index to start searching from.
   *
   *  - `direction` - The direction to search in, can be (`next` or `prev`).
   *
   *  - `switchBack` - A boolean Whether to search in the other direction if an item is not found.
   *
   *  - `items` - The array of items to search in.
   *
   *  - `isNavigable` - A function that takes an item and returns a boolean indicating whether the item is navigable.
   *
   *  - `shouldBreak` - An optional function that takes an item and returns a boolean indicating whether to break the loop.
   */
  getNavigationItem<T>(data: {
    fromIndex?: number;
    direction: 'next' | 'prev';
    switchBack?: boolean;
    items: T[];
    isNavigable: (item: T) => boolean;
    shouldBreak?: (item: T) => boolean;
  }) {
    const {
      direction,
      switchBack = false,
      items,
      fromIndex = direction === 'next' ? -1 : items.length,
      isNavigable,
      shouldBreak,
    } = data;
    let navigationItem: T | undefined;

    const getItem = ({
      endIndex,
      startIndex,
    }: {
      startIndex: number;
      endIndex: number;
    }) => {
      const numOfRetries = endIndex + 1 - startIndex;
      for (let i = 0; i < numOfRetries && !navigationItem; i++) {
        const itemIndex = direction === 'next' ? startIndex + i : endIndex - i;
        const item = items[itemIndex];
        if (item) {
          if (shouldBreak?.(item)) break;
          if (isNavigable(item)) {
            navigationItem = item;
          }
        }
      }
    };

    if (direction === 'next') {
      getItem({
        startIndex: fromIndex + 1,
        endIndex: items.length - 1,
      });
    } else {
      getItem({
        startIndex: 0,
        endIndex: fromIndex - 1,
      });
    }

    if (!navigationItem && switchBack) {
      if (direction === 'next') {
        getItem({
          startIndex: 0,
          endIndex: fromIndex - 1,
        });
      } else {
        getItem({
          startIndex: fromIndex + 1,
          endIndex: items.length - 1,
        });
      }
    }

    return navigationItem;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.dataset.muId = this.muId;
    if (!this.id) this.id = this.muId;
    MUElement.#muElements.set(this.muId, { element: this });

    this.updateComplete.then(() => {
      this.eventActionData?.eventAction.addListeners(
        this,
        this.eventActionEvents || this.eventActionData.events,
      );
      if (!this.noEventActionAttributes) this._addEventActionAttributes?.();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    MUElement.#muElements.delete(this.muId);
    this.eventActionData?.eventAction.removeListeners(
      this,
      this.eventActionEvents || this.eventActionData.events,
    );
  }
}
