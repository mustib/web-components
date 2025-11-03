import { parseJson } from "@mustib/utils";
import { MuTransparent } from "./mu-transparent";
import { staticProperty } from "@/decorators";
import type { EventAction } from "@mustib/utils/browser";

/**
 * `<mu-trigger>` is a helper element that listens for a specified event
 * (e.g., `click`) and dispatches a custom event (e.g., `mu-trigger-toggle`)
 * to a target element.
 *
 * This is useful when you want to listen to event and dispatch a custom event
 * like dispatch toggle when a user clicks on a button.
 * 
 * it abstracts away the logic of selecting the element, listening to the event, dispatching the custom event, removing the event listener when the element is disconnected, and more.
 * 
 * you can reuse different triggers (click, keydown, hover, etc.)
 * without hard-coding logic inside the parent element (e.g., `mu-select`).
 */
export class MuTrigger<T extends Event = Event> extends MuTransparent {
  /**
   * The DOM event to listen for (e.g., `"click"`, `"keydown"`, `"mouseenter"`).
   * @attr listen-to
   * @default "click"
   */
  @staticProperty()
  listenTo = 'click'

  /**
   * A JSON string representing the detail to pass to the custom event.
   * @default undefined
   */
  @staticProperty({
    converter(value) {
      return value ? parseJson(value) : undefined
    },
  })
  detail: any

  /**
   * A boolean value indicates if the event should call `stopPropagation`.
   * @default false
   */
  @staticProperty({ converter: Boolean })
  stopPropagation = false

  /**
   * A boolean value indicates if the event should call `stopImmediatePropagation`.
   * @default false
   */
  @staticProperty({ converter: Boolean })
  stopImmediatePropagation = false

  /**
   * The name of the custom event to dispatch when the trigger fires.
   * @default "mu-trigger-toggle"
   */
  @staticProperty()
  dispatch = 'mu-trigger-toggle'


  /**
   * Whether the event is no-cancelable.
   * @default false
   */
  @staticProperty({ converter: Boolean })
  noCancelable = false


  /**
   * Whether the custom event should not bubble.
   *
   * @default false
   */
  @staticProperty({ converter: Boolean })
  noBubble = false


  /**
   * A boolean value indicates if the listener should not be added as a capture listener.
   * @default false
   */
  @staticProperty({ converter: Boolean })
  noCapture = false


  /**
   * A css selector that is used to find the element that will listen for the event.
   * which is the current target of the event.
   * 
   * current target will be this element by default
   * 
   * @default undefined
   */
  @staticProperty()
  currentTargetSelector?: string


  /**
   * A boolean value indicates if the event should not call `preventDefault`.
   * @default false
   */
  @staticProperty({ converter: Boolean })
  noPreventDefault = false


  /**
   * A CSS selector used to find the element where the event should be dispatched.
   * If not provided, the trigger dispatches the event on itself.
   *
   * Example: `dispatch-to-selector="#mu-select"`
   *
   * @attr dispatch-to-selector
   */
  @staticProperty()
  dispatchToSelector?: string

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined


  /**
   * The current target of the event.
   */
  protected get _currentTarget(): Element {
    const currTarget = this.currentTargetSelector ? this.closestPierce(this.currentTargetSelector) : this
    if (!currTarget) {
      console.warn(`no element found with selector (${this.currentTargetSelector}) as the current target to listen to (${this.listenTo}) events.\nFalling back to the current element`, this)
    }

    return currTarget || this
  }


  /**
   * A function that returns the element where the event should be dispatched.
   * If not provided, the trigger dispatches the event on itself.
   */
  protected _getDispatchElement(): Element {
    const element = this.dispatchToSelector ? this.closestPierce(this.dispatchToSelector) : this

    if (!element) console.warn(`no element found with selector ${this.dispatchToSelector} to dispatch ${this.dispatch} to.\nFalling back to the current element`, this);

    return element || this
  }


  /**
   * This function is called after the event is fired.
   * You can return a custom object with the following properties to customize the dispatching of the event.
   * - `shouldDispatch`: a boolean indicating whether the event should be dispatched.
   * - `eventName`: a string indicating the name of the event to be dispatched.
   * - `dispatchElement`: an element indicating where the event should be dispatched.
   *
   * If you return nothing, the event will not be dispatched.
   *
   * @param e The original event that was fired.
   * @returns {Object} An object with the properties above.
   */
  protected _createDispatchEvent(e: T): { shouldDispatch: boolean, eventName: string, dispatchElement: Element } {
    return {
      shouldDispatch: true,
      eventName: this.dispatch,
      dispatchElement: this._getDispatchElement()
    }
  }


  /**
   * 
   */
  protected _listener = (e: Event) => {
    if (this.disabled) return
    if (this.stopPropagation) e.stopPropagation()
    if (this.stopImmediatePropagation) e.stopImmediatePropagation()
    if (!this.noPreventDefault) e.preventDefault()

    const { dispatchElement, eventName, shouldDispatch } = this._createDispatchEvent(e as T);
    if (!shouldDispatch) return

    dispatchElement.dispatchEvent(new CustomEvent(eventName, { bubbles: !this.noBubble, composed: true, cancelable: !this.noCancelable, detail: this.detail }))
  }


  /**
   * 
   */
  override connectedCallback(): void {
    super.connectedCallback();
    this._currentTarget.addEventListener(this.listenTo, this._listener, { capture: !this.noCapture })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._currentTarget.removeEventListener(this.listenTo, this._listener, { capture: !this.noCapture })
  }
}

MuTrigger.register('mu-trigger');

declare global {
  interface HTMLElementTagNameMap {
    'mu-trigger': MuTrigger;
  }
}