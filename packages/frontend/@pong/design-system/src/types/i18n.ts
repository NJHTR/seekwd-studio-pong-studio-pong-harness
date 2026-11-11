export type PongLocaleTranslateFnOptions = string[] | Record<string, unknown>;

export type PongLocaleTranslateFn = (path: string, options?: PongLocaleTranslateFnOptions) => string;

export type PongLocale = Record<string, string | ((...args: unknown[]) => string)>;
