import { type CSSResultGroup, css, html, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { MuElement, type MuElementComponent } from './mu-element';

export type MuIconComponent = {
  attributes: MuElementComponent['attributes'] & {
    name: MuIcon['name'];
  };
};

export class MuIcon extends MuElement {
  static override styles?: CSSResultGroup | undefined = [
    MuElement.cssBase,
    css`
    :host {
      display: inline-block;
    }

    #container {
      --icon-fill: var(--mu-icon-fill, currentColor);
      --icon-size: var(--mu-icon-size, calc(var(--mu-base-rem) * 1.6));
      display: flex;
      place-items: center;
      fill: var(--icon-fill);
      width: var(--icon-size);
      height: var(--icon-size);
      transition: all 0.1s ease-in-out;
    }
    `,
  ];

  override eventActionData = undefined;
  override _addEventActionAttributes = undefined;

  static icons = {
    downArrow: html`
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 122.88 63.9" style="enable-background:new 0 0 122.88 63.9" xml:space="preserve"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;}</style><g><polygon class="st0" points="61.44,63.9 122.88,0 0,0 61.44,63.9"/></g></svg>
    `,

    close: html`
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 121.31 122.876" enable-background="new 0 0 121.31 122.876" xml:space="preserve">
      <g><path fill-rule="evenodd" clip-rule="evenodd" d="M90.914,5.296c6.927-7.034,18.188-7.065,25.154-0.068 c6.961,6.995,6.991,18.369,0.068,25.397L85.743,61.452l30.425,30.855c6.866,6.978,6.773,18.28-0.208,25.247 c-6.983,6.964-18.21,6.946-25.074-0.031L60.669,86.881L30.395,117.58c-6.927,7.034-18.188,7.065-25.154,0.068 c-6.961-6.995-6.992-18.369-0.068-25.397l30.393-30.827L5.142,30.568c-6.867-6.978-6.773-18.28,0.208-25.247 c6.983-6.963,18.21-6.946,25.074,0.031l30.217,30.643L90.914,5.296L90.914,5.296z"/></g></svg>
    `,

    closeLine: html`
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="122.878px" height="122.88px" viewBox="0 0 122.878 122.88" enable-background="new 0 0 122.878 122.88" xml:space="preserve"><g><path d="M1.426,8.313c-1.901-1.901-1.901-4.984,0-6.886c1.901-1.902,4.984-1.902,6.886,0l53.127,53.127l53.127-53.127 c1.901-1.902,4.984-1.902,6.887,0c1.901,1.901,1.901,4.985,0,6.886L68.324,61.439l53.128,53.128c1.901,1.901,1.901,4.984,0,6.886 c-1.902,1.902-4.985,1.902-6.887,0L61.438,68.326L8.312,121.453c-1.901,1.902-4.984,1.902-6.886,0 c-1.901-1.901-1.901-4.984,0-6.886l53.127-53.128L1.426,8.313L1.426,8.313z"/></g></svg>
    `,

    noImage: html`
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 115.19 123.38" style="enable-background:new 0 0 115.19 123.38" xml:space="preserve"><style type="text/css">.st0{fill-rule:evenodd;clip-rule:evenodd;stroke:#000000;stroke-width:0.5;stroke-miterlimit:2.6131;}</style><g><path class="st0" d="M93.13,79.5c12.05,0,21.82,9.77,21.82,21.82c0,12.05-9.77,21.82-21.82,21.82c-12.05,0-21.82-9.77-21.82-21.82 C71.31,89.27,81.08,79.5,93.13,79.5L93.13,79.5z M8.08,0.25h95.28c2.17,0,4.11,0.89,5.53,2.3c1.42,1.42,2.3,3.39,2.3,5.53v70.01 c-2.46-1.91-5.24-3.44-8.25-4.48V9.98c0-0.43-0.16-0.79-0.46-1.05c-0.26-0.26-0.66-0.46-1.05-0.46H9.94 c-0.43,0-0.79,0.16-1.05,0.46C8.63,9.19,8.43,9.58,8.43,9.98v70.02h0.03l31.97-30.61c1.28-1.18,3.29-1.05,4.44,0.23 c0.03,0.03,0.03,0.07,0.07,0.07l26.88,31.8c-4.73,5.18-7.62,12.08-7.62,19.65c0,3.29,0.55,6.45,1.55,9.4H8.08 c-2.17,0-4.11-0.89-5.53-2.3s-2.3-3.39-2.3-5.53V8.08c0-2.17,0.89-4.11,2.3-5.53S5.94,0.25,8.08,0.25L8.08,0.25z M73.98,79.35 l3.71-22.79c0.3-1.71,1.91-2.9,3.62-2.6c0.66,0.1,1.25,0.43,1.71,0.86l17.1,17.97c-2.18-0.52-4.44-0.79-6.78-0.79 C85.91,71.99,79.13,74.77,73.98,79.35L73.98,79.35z M81.98,18.19c3.13,0,5.99,1.28,8.03,3.32c2.07,2.07,3.32,4.9,3.32,8.03 c0,3.13-1.28,5.99-3.32,8.03c-2.07,2.07-4.9,3.32-8.03,3.32c-3.13,0-5.99-1.28-8.03-3.32c-2.07-2.07-3.32-4.9-3.32-8.03 c0-3.13,1.28-5.99,3.32-8.03C76.02,19.44,78.86,18.19,81.98,18.19L81.98,18.19z M85.82,88.05l19.96,21.6 c1.58-2.39,2.5-5.25,2.5-8.33c0-8.36-6.78-15.14-15.14-15.14C90.48,86.17,87.99,86.85,85.82,88.05L85.82,88.05z M100.44,114.58 l-19.96-21.6c-1.58,2.39-2.5,5.25-2.5,8.33c0,8.36,6.78,15.14,15.14,15.14C95.78,116.46,98.27,115.78,100.44,114.58L100.44,114.58z"/></g></svg>
    `,

    dragVertical: html`
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="var(--icon-fill)" stroke-width="3"><circle cx="8" cy="4" r="1"/><circle cx="16" cy="4" r="1"/><circle cx="8" cy="12" r="1"/><circle cx="16" cy="12" r="1"/><circle cx="8" cy="20" r="1"/><circle cx="16" cy="20" r="1"/></svg>
    `,

    checkMark: html`
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 122.877 101.052" enable-background="new 0 0 122.877 101.052" xml:space="preserve"><g><path d="M4.43,63.63c-2.869-2.755-4.352-6.42-4.427-10.11c-0.074-3.689,1.261-7.412,4.015-10.281 c2.752-2.867,6.417-4.351,10.106-4.425c3.691-0.076,7.412,1.255,10.283,4.012l24.787,23.851L98.543,3.989l1.768,1.349l-1.77-1.355 c0.141-0.183,0.301-0.339,0.479-0.466c2.936-2.543,6.621-3.691,10.223-3.495V0.018l0.176,0.016c3.623,0.24,7.162,1.85,9.775,4.766 c2.658,2.965,3.863,6.731,3.662,10.412h0.004l-0.016,0.176c-0.236,3.558-1.791,7.035-4.609,9.632l-59.224,72.09l0.004,0.004 c-0.111,0.141-0.236,0.262-0.372,0.368c-2.773,2.435-6.275,3.629-9.757,3.569c-3.511-0.061-7.015-1.396-9.741-4.016L4.43,63.63 L4.43,63.63z"/></g></svg>
    `,

    warning: html`
      <svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 463.43"><path d="M189.46 44.02c34.26-58.66 99.16-58.77 133.24.12l.97 1.81 175.27 304.4c33.71 56.4-1.2 113.76-66.17 112.96v.12H73.53c-.9 0-1.78-.04-2.66-.11-58.34-.79-86.64-54.22-61.9-106.84.39-.85.82-1.67 1.28-2.46l-.04-.03 179.3-309.94-.05-.03zm50.32 302.4c4.26-4.13 9.35-6.19 14.45-6.56 3.4-.24 6.8.29 9.94 1.48 3.13 1.19 6.01 3.03 8.39 5.41 6.92 6.91 8.72 17.38 4.64 26.16-2.69 5.8-7.08 9.7-12.11 11.78-3.03 1.27-6.3 1.84-9.56 1.76-3.27-.08-6.49-.82-9.41-2.18-5.02-2.33-9.3-6.43-11.7-12.2-2.65-6.36-2.27-12.96.63-19.15 1.15-2.46 2.75-4.81 4.73-6.5zm33.86-47.07c-.8 19.91-34.51 19.93-35.28-.01-3.41-34.1-12.13-110.53-11.85-142.58.28-9.87 8.47-15.72 18.94-17.95 3.23-.69 6.78-1.03 10.35-1.02 3.6.01 7.16.36 10.39 1.05 10.82 2.3 19.31 8.39 19.31 18.45l-.05 1-11.81 141.06z"/></svg>
    `,

    error: html`
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.45 2.15C14.992 4.05652 17.5866 5 20.25 5C20.6642 5 21 5.33579 21 5.75V11C21 16.0012 18.0424 19.6757 12.2749 21.9478C12.0982 22.0174 11.9018 22.0174 11.7251 21.9478C5.95756 19.6757 3 16.0012 3 11V5.75C3 5.33579 3.33579 5 3.75 5C6.41341 5 9.00797 4.05652 11.55 2.15C11.8167 1.95 12.1833 1.95 12.45 2.15ZM12 16C11.5858 16 11.25 16.3358 11.25 16.75C11.25 17.1642 11.5858 17.5 12 17.5C12.4142 17.5 12.75 17.1642 12.75 16.75C12.75 16.3358 12.4142 16 12 16ZM12 6.98211C11.6203 6.98211 11.3065 7.26427 11.2568 7.63034L11.25 7.73211V14.2321L11.2568 14.3339C11.3065 14.7 11.6203 14.9821 12 14.9821C12.3797 14.9821 12.6935 14.7 12.7432 14.3339L12.75 14.2321V7.73211L12.7432 7.63034C12.6935 7.26427 12.3797 6.98211 12 6.98211Z"></path></svg>
    `,

    info: html`
      <svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 512"><path d="M256 0c70.689 0 134.692 28.656 181.02 74.98C483.344 121.308 512 185.311 512 256c0 70.689-28.656 134.692-74.98 181.016C390.692 483.344 326.689 512 256 512c-70.689 0-134.692-28.656-181.016-74.984C28.656 390.692 0 326.689 0 256S28.656 121.308 74.984 74.98C121.308 28.656 185.311 0 256 0zm-8.393 139.828c5.039-12.2 17.404-20.536 30.609-20.536 18.611 0 32.717 15.259 32.717 33.478 0 4.53-.796 8.776-2.407 12.704-6.902 16.91-26.09 25.405-43.082 18.302-16.871-7.122-24.821-27.096-17.837-43.948zm12.103 206.605c-.833 2.984-2.256 7.946-.674 10.725 4.22 7.45 16.459-6.058 19.036-8.97 8.307-9.414 15.461-20.475 21.905-31.229a1.506 1.506 0 012.061-.523l13.44 9.972c.641.473.789 1.363.367 2.03-6.18 10.743-12.426 20.124-18.744 28.129-10.452 13.234-23.595 25.852-39.583 32.065-9.918 3.842-22.817 5.363-34.144 2.829-10.506-2.353-19.66-8.206-23.822-18.946-5.464-14.092-.97-30.105 3.33-43.887l21.689-65.697c2.962-10.647 10.044-29.661-8.25-29.661H197.36c-1.56 0-1.596-1.402-1.297-2.484l4.858-17.685a1.5 1.5 0 011.463-1.103l96.89-3.038c1.409-.05 1.701 1.19 1.374 2.286L259.71 346.433z"/></svg>
    `,
  };

  @property()
  name?: keyof typeof MuIcon.icons;

  protected override firstUpdated(_changedProperties: PropertyValues): void {
    const iconName = this.name;
    if (!iconName || !MuIcon.icons[iconName]) {
      console.warn(`There is no icon named (${iconName})`, this);
    }
  }

  protected override render(): unknown {
    const name = this.name;
    const icon =
      name && Reflect.has(MuIcon.icons, name)
        ? MuIcon.icons[name]
        : MuIcon.icons.noImage;
    return name
      ? html`
      <div id='container' part='container'>
        ${icon}
      </div>
    `
      : undefined;
  }
}

MuIcon.register('mu-icon');

declare global {
  interface HTMLElementTagNameMap {
    'mu-icon': MuIcon;
  }
}
