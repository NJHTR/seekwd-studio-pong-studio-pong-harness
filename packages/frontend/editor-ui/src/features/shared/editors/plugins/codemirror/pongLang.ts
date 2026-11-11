import { parserWithMetaData as pongParser } from '@pong/codemirror-lang';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed, type SyntaxNodeRef } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';

import { pongCompletionSources } from './completions/addCompletions';
import type { Completion } from '@codemirror/autocomplete';
import { autocompletion } from '@codemirror/autocomplete';
import { expressionCloseBracketsConfig } from './expressionCloseBrackets';

const isResolvable = (node: SyntaxNodeRef) => node.type.name === 'Resolvable';

const pongParserWithNestedJsParser = pongParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;

		return node.name === 'Resolvable'
			? { parser: javascriptLanguage.parser, overlay: isResolvable }
			: null;
	}),
});

const pongLanguage = LRLanguage.define({ parser: pongParserWithNestedJsParser });

export function pongLang() {
	return new LanguageSupport(pongLanguage, [
		pongLanguage.data.of(expressionCloseBracketsConfig),
		...pongCompletionSources().map((source) => pongLanguage.data.of(source)),
	]);
}

export const pongAutocompletion = () =>
	autocompletion({
		icons: false,
		aboveCursor: true,
		closeOnBlur: false,
		optionClass: (completion: Completion) => completion.type ?? '',
	});
