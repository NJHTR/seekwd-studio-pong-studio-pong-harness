import type { DocMetadata } from 'pong-workflow';

export type Resolved = unknown;

export type ExtensionTypeName = 'number' | 'string' | 'date' | 'array' | 'object' | 'boolean';

export type FnToDoc = { [fnName: string]: { doc?: DocMetadata; aliases?: string[] } };

export type FunctionOptionType = 'native-function' | 'extension-function';
export type KeywordOptionType = 'keyword';
export type AutocompleteOptionType = FunctionOptionType | KeywordOptionType;
export type AutocompleteInput<R = Resolved> = {
	resolved: R;
	base: string;
	tail: string;
	transformLabel?: (label: string) => string;
};
