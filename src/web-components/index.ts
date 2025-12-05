import type { MuIconComponent } from './mu-icon';
import type { MuRangeComponent } from './mu-range/mu-range';
import type { MuRangeFillComponent } from './mu-range/mu-range-fill';
import type { MuRangeThumbComponent } from './mu-range/mu-range-thumb';
import type { MuRangeThumbValueComponent } from './mu-range/mu-range-thumb-value';
import type { MuSelectComponent } from './mu-select/mu-select';
import type { MuSelectItemComponent } from './mu-select/mu-select-item';
import type { MuSelectItemsComponent } from './mu-select/mu-select-items';
import type { MuSelectLabelComponent } from './mu-select/mu-select-label';
import type { MuSelectLabelContentComponent } from './mu-select/mu-select-label-content';
import type {
  MuSortableComponent,
  MuSortableItemComponent,
} from './mu-sortable';
import type { MuTransparentComponent } from './mu-transparent';
import type { MuTriggerComponent } from './mu-trigger';

type ComponentsAttributes = {
  'mu-select': MuSelectComponent['attributes'];
  'mu-select-items': MuSelectItemsComponent['attributes'];
  'mu-select-item': MuSelectItemComponent['attributes'];
  'mu-select-label': MuSelectLabelComponent['attributes'];
  'mu-select-label-content': MuSelectLabelContentComponent['attributes'];
  'mu-range': MuRangeComponent['attributes'];
  'mu-range-fill': MuRangeFillComponent['attributes'];
  'mu-range-thumb': MuRangeThumbComponent['attributes'];
  'mu-range-thumb-value': MuRangeThumbValueComponent['attributes'];
  'mu-icon': MuIconComponent['attributes'];
  'mu-transparent': MuTransparentComponent['attributes'];
  'mu-trigger': MuTriggerComponent['attributes'];
  'mu-sortable': MuSortableComponent['attributes'];
  'mu-sortable-item': MuSortableItemComponent['attributes'];
};

// biome-ignore lint/suspicious/noExplicitAny: <>
export type MuComponentsAttributes<GlobalAttributes = Record<string, any>> = {
  [key in keyof ComponentsAttributes]: Partial<ComponentsAttributes[key]> &
    GlobalAttributes;
};

export * from './mu-element';
export * from './mu-icon';
export * from './mu-range';
export * from './mu-select';
export * from './mu-transparent';
export * from './mu-trigger';
