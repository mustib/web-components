import { css, html, nothing, type CSSResultGroup, type PropertyValues } from "lit";
import { MUElement } from "../mu-element";
import '../mu-trigger'
import { property, state } from "lit/decorators.js";
import { MuSelectLabelContent } from "./mu-select-label-content";
import { MuTransparent } from "../mu-transparent";
import '../mu-icon'
import { staticProperty } from "@/decorators";

export class MuSelectLabel extends MUElement {
  static override styles: CSSResultGroup = [MUElement.cssBase, css`
    :host(:focus-within) #container,
    :host([opened]) #container {
      --select-label-border-color: var(--mu-select-label-border-color, var(--mu-color-500));
    }
    
    #container {
      --select-label-border-width: var(--mu-select-label-border-width, 3px);
      --select-label-border-color: var(--mu-select-label-border-color, var(--mu-color-700));
      --select-label-border-radius: var(--mu-select-label-border-radius, calc(var(--mu-base-rem) * 1.2));
      --select-label-gap: var(--mu-select-label-gap ,var(--mu-base-rem));
      display: grid;
      grid-template-columns: auto auto;
      gap: var(--select-label-gap);
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s ease-in-out;
      user-select: none;
      border-width: var(--select-label-border-width);
      border-style: solid;
      border-color: var(--select-label-border-color);
      border-radius: var(--select-label-border-radius);
      padding: calc(var(--mu-base-rem) * .8) calc(var(--mu-base-rem) * 1.2);
    }

    @media (prefers-color-scheme: light) {
      :host(:focus-within) #container,
      :host([opened]) #container {
        --select-label-border-color: var(--mu-color-400);
      }

      #container {
        --select-label-border-color: var(--mu-color-200);
      }
    }

    #legend {
      margin-left: calc(var(--mu-base-rem) * -.6);
      padding-inline: .75ch;
      font-size: .85em;
    }

    #icons, #content {
      display: flex;
      gap: var(--select-label-gap);
      align-items: center;
      align-content: start;
    }
    
    #content {
      flex-wrap: wrap;
      min-width: 0;
    }

    #icon-toggle-open, #icon-remove-all {
      transition: all 0.1s ease-in-out;
      cursor: pointer;
    }

    #icon-remove-all {
      visibility: hidden;
      opacity: 0;
    }

    :host([opened]) #icon-remove-all, :host(:hover) #icon-remove-all {
      visibility: visible;
      opacity: 1;
    }

    :host([opened]) #icon-toggle-open {
      transform: scaleY(-1)
    }

    #autocomplete-input {
      all: unset;
    }

    #autocomplete-input::placeholder {
      all: unset;
    }
    `];

  @property({ reflect: true, type: Boolean })
  opened = false

  @staticProperty()
  label = 'Please select a value'

  @staticProperty()
  legend?: string

  @staticProperty()
  type: 'autocomplete' | 'autocomplete-value' | 'autocomplete-template' | 'label-value' | 'label-template' = 'label-value'

  @state()
  value: string[] = []

  protected _listboxId?: string;
  protected _activeDescendantId?: string;
  protected _labelType!: 'label' | 'autocomplete'
  protected _valueType!: 'value' | 'template' | 'autocomplete-label'
  protected labelElement?: MuSelectLabelContent
  protected valueElement?: MuSelectLabelContent
  protected _isReadyPromise!: ReturnType<MUElement['generateIsReadyPromise']>
  override eventActionData = undefined;

  get hasAutocomplete() {
    return this._labelType === 'autocomplete'
  }

  get hasAutocompleteBoth() {
    return this.hasAutocomplete && this._valueType === 'autocomplete-label'
  }

  get hasTemplate() {
    return this._valueType === 'template'
  }

  setListboxId(id?: string) {
    this._listboxId = id
    id ? this.comboboxElement?.setAttribute('aria-controls', id) : this.comboboxElement?.removeAttribute('aria-controls')
  }
  setActiveDescendantId(id?: string) {
    this._activeDescendantId = id
    id ? this.comboboxElement?.setAttribute('aria-activedescendant', id) : this.comboboxElement?.removeAttribute('aria-activedescendant')
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.tabIndex = 0
    this._assignLabelAndValueTypes()
    this.addEventListener('mu-transparent-slotchange', this._slotChangeHandler)
    this._isReadyPromise = this.generateIsReadyPromise()
  }

  protected _assignLabelAndValueTypes() {
    switch (this.type) {
      case 'autocomplete':
        this._labelType = 'autocomplete'
        this._valueType = 'autocomplete-label'
        break;
      case 'autocomplete-value':
        this._labelType = 'autocomplete'
        this._valueType = 'value'
        break;
      case 'autocomplete-template':
        this._labelType = 'autocomplete'
        this._valueType = 'template'
        break;
      case 'label-value':
        this._labelType = 'label'
        this._valueType = 'value'
        break;
      case 'label-template':
        this._labelType = 'label'
        this._valueType = 'template'
        break;
      default:
        this.type satisfies never
        this._labelType = 'label'
        this._valueType = 'value'
        console.warn(`unsupported type (${this.type}) for mu-select-label`, this)
        break;
    }
  }

  get comboboxElement() {
    return this.hasAutocomplete ? this.labelElement?.contentEl : this.labelElement
  }

  override focus(options?: FocusOptions): void {
    const el = this.hasAutocomplete ? this.labelElement?.contentEl : this
    if (document.activeElement === el) return

    setTimeout(() => {
      el === this ? super.focus(options) : el?.focus(options)
    })
  }

  protected _slotChangeHandler = () => {
    const addElement = (element: Element) => {
      if (element instanceof MuSelectLabelContent) {
        switch (element.type) {
          case 'label':
            if (!this.hasAutocomplete)
              this.labelElement = element
            break;
          case 'value':
            if (this._valueType === 'value')
              this.valueElement = element
            break;
          case 'autocomplete':
            if (this.hasAutocomplete)
              this.labelElement = element
            break;
          case 'template':
            if (this._valueType === 'template')
              this.valueElement = element
            break;
          default:
            element.type satisfies never
            break;
        }
      }
    }

    this.shadowRoot?.querySelector('slot')?.assignedElements({ flatten: true }).forEach(el => {
      if (el instanceof MuTransparent) {
        el.contents.forEach(el => addElement(el))
      } else {
        addElement(el)
      }
    })

    if (!this.labelElement) {
      console.warn('mu-select-label should have mu-select-label-content for label', this)
    } else {
      this.comboboxElement?.setAttribute('role', 'combobox')
      this.comboboxElement?.setAttribute('aria-label', this.label)
      this.hasAutocomplete && this.comboboxElement?.setAttribute('aria-autocomplete', 'list')
      this.setListboxId(this._listboxId)
      this.setActiveDescendantId(this._activeDescendantId)
    }

    if (!this.valueElement && this._valueType !== 'autocomplete-label') {
      console.warn('mu-select-label should have mu-select-label-content for value', this)
    }

    if (!this._isReadyPromise.resolved) this._isReadyPromise.resolve()

    this._updateLabelAndValueElements()
  }

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    /**
     * needs to be called to add initial elements in case of default slot
     */
    this._slotChangeHandler()
    this.renderRoot.addEventListener('slotchange', this._slotChangeHandler)
  }

  protected _addEventActionAttributes() {
    const autocompleteInput = this._autocompleteInput
    const toggleOpenIcon = this.renderRoot.querySelector('#icon-toggle-open')
    const removeAllIcon = this.renderRoot.querySelector('#icon-remove-all')
    this.setAttribute('data-select-pointerdown', 'toggle && #prevent')

    toggleOpenIcon?.setAttribute('data-select-click', 'toggle')
    toggleOpenIcon?.setAttribute('data-select-pointerdown', '#nothing && #prevent')

    removeAllIcon?.setAttribute('data-select-click', 'remove-all')
    removeAllIcon?.setAttribute('data-select-pointerdown', '#nothing && #prevent')

    autocompleteInput?.setAttribute('data-select-pointerdown', 'open')
    autocompleteInput?.setAttribute('data-select-input', 'filter && open')
  }

  protected override async getUpdateComplete(): Promise<boolean> {
    const result = await super.getUpdateComplete()
    await this._isReadyPromise.promise
    return result
  }

  protected async _updateLabelAndValueElements() {
    const hasValue = this.value.length > 0

    if (this.valueElement) {
      await this.valueElement.updateComplete
      this.valueElement.setValue(this.value)
      this.valueElement.active = hasValue
    }
    if (this.labelElement) {
      await this.labelElement.updateComplete
      this.labelElement.active = this.hasAutocomplete ? true : !hasValue
      if (this._valueType === 'autocomplete-label') {
        this.labelElement.setValue(this.value)
      }
    }
  }

  switchActiveTemplate(dir: 'next' | 'prev') {
    if (!this.valueElement || this._valueType !== 'template') return

    const activeValue = this.valueElement?.activeTemplateValue
    const activeIndex = this.value.indexOf(activeValue ?? '')

    this.valueElement.activeTemplateValue = this.getNavigationItem({
      items: this.value,
      fromIndex: activeIndex === -1 ? undefined : activeIndex,
      direction: dir,
      isNavigable() {
        return true
      },
    })
  }

  protected override async updated(_changedProperties: PropertyValues<this>): Promise<void> {
    await this.updateComplete
    if (_changedProperties.has('value')) {
      this._updateLabelAndValueElements()
    }

    if (_changedProperties.has('opened')) {
      this.comboboxElement?.setAttribute('aria-expanded', this.opened ? 'true' : 'false')
    }
  }

  protected get _autocompleteInput() {
    if (this._labelType !== 'autocomplete') return

    const input = this.labelElement?.contentEl
    return input instanceof HTMLInputElement ? input : undefined
  }

  get autocompleteValue() {
    return this._autocompleteInput?.value
  }

  clearAutocompleteValue() {
    if (this.type === 'autocomplete') return;
    const input = this._autocompleteInput
    if (input) input.value = ''
  }

  get activeTemplateValue() {
    if (this._valueType !== 'template') return

    return this.valueElement?.activeTemplateValue
  }

  protected override render(): unknown {
    const label = this.hasAutocomplete ?
      html`
        <mu-select-label-content part='autocomplete' type='autocomplete'>
          <input autocomplete='off' type='text' placeholder=${this.label} id='autocomplete-input' data-is='content'></input>
        </mu-select-label-content>
    `:
      html`
        <mu-select-label-content type='label'>
          ${this.label}
        </mu-select-label-content>
    `


    const value = this._valueType === 'value' ?
      html`
        <mu-select-label-content part='value' type='value'></mu-select-label-content>
    `: this._valueType === 'template' ?
        html`
          <mu-select-label-content part='template' type='template'></mu-select-label-content>
    `: nothing

    return html`
      <fieldset id='container' part='container' class='autocomplete'>
        <slot>
          ${this.legend ? html`<legend id='legend' part='legend'>${this.legend}</legend>` : nothing}
          <mu-transparent content-selector='mu-select-label-content'>
            <div id='content' part='content'>${value}${label}</div>
          </mu-transparent>
          <div id='icons' part='icons'>
            <mu-icon role='button' aria-label='Clear' id='icon-remove-all' part='icon-remove-all' name='close'></mu-icon>
            <mu-icon role='button' aria-label=${this.opened ? 'Close' : 'Open'} id='icon-toggle-open' name='downArrow'></mu-icon>
          </div>
        </slot>
      </fieldset>
    `
  }
}

MuSelectLabel.register('mu-select-label')

declare global {
  interface HTMLElementTagNameMap {
    'mu-select-label': MuSelectLabel
  }
}