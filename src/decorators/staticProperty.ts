/** biome-ignore-all lint: <> */
type Options = {
  /**
   * The HTML attribute to get the value from.
   * If not provided, it defaults to the kebab case version of the property name.
   * @example If the property name is "propName", the attribute will default to "prop-name".
   */
  attribute?: string;

  /**
   * A function that converts the attribute value to the property value.
   */
  converter?: (value: string | null) => any;

  /**
   * Whether to reflect the default value of the property to the attribute.
   *
   * The default value is the value that is assigned to the property on the class definition like so:
   * `propName = value` or basically any value that calls the setter before the first call to the getter.
   *
   * This is useful when you want the attribute to have the same value as the property by default.
   *
   * For example, if you have a property `visible` with a default value of `true`, and you want the attribute `visible` to have the value `"true"` by default, you can set `reflectDefault` to `true`.
   *
   * @default false
   */
  reflectDefault?: boolean;

  /**
   * A function that converts the default property value to the attribute value.
   *
   * this is only used if `reflectDefault` is true
   */
  reflectConverter?: (value: any) => string;
};

const defaultConverter: Required<Options>['converter'] = (value) =>
  value ?? undefined;
const toKebabCase = (str: string) =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const defaultReflectConverter: Required<Options>['reflectConverter'] = (
  value,
) => value.toString();

type StaticData = {
  value: any;
  hasBeenCalled: boolean;
  defaultValue: any;
};

type StaticProperties = WeakMap<HTMLElement, Record<string, StaticData>>;

export function staticProperty(options?: Options) {
  return function staticPropertyDecorator<T extends HTMLElement>(
    target: T,
    key: string,
  ) {
    if (!Reflect.has(target, '__staticProperties')) {
      Reflect.set(
        target,
        '__staticProperties',
        new WeakMap() as StaticProperties,
      );
    }

    const {
      attribute = toKebabCase(key),
      converter = defaultConverter,
      reflectDefault = false,
      reflectConverter = defaultReflectConverter,
    } = options ?? {};

    Reflect.defineProperty(target, key, {
      configurable: false,
      enumerable: true,

      set(v) {
        const mapData = getOrCreateMapData(this, key);

        if (mapData.hasBeenCalled) {
          throw new Error(
            `cannot set ${v} for a static property ${key} after first call to get`,
          );
        }

        if (reflectDefault) {
          this.setAttribute(attribute, reflectConverter(v));
        }

        mapData.defaultValue = v;
      },
      get() {
        const mapData = getOrCreateMapData(this, key);
        if (mapData.hasBeenCalled) return mapData.value;
        mapData.hasBeenCalled = true;
        const attrValue = this.getAttribute(attribute);
        if (attrValue === null && mapData.defaultValue !== undefined) {
          mapData.value = mapData.defaultValue;
        } else mapData.value = converter(attrValue);
        return mapData.value;
      },
    });
  };
}

function getOrCreateMapData(instance: HTMLElement, key: string) {
  const properties = Reflect.get(
    Reflect.getPrototypeOf(instance)!,
    '__staticProperties',
  ) as StaticProperties;
  const _mapData =
    properties.get(instance) || properties.set(instance, {}).get(instance)!;

  const staticData = (_mapData[key] ||= {
    value: undefined,
    hasBeenCalled: false,
    defaultValue: undefined,
  });

  return staticData;
}
