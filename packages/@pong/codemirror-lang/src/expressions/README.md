# pong Expression language support

## Usage

```js
import { parserWithMetaData as pongParser } from '@pong/codemirror-lang';
import { LanguageSupport, LRLanguage } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { parser as jsParser } from '@lezer/javascript';

const pongPlusJsParser = pongParser.configure({
	wrap: parseMixed((node) => {
		if (node.type.isTop) return null;

		return node.name === 'Resolvable'
			? { parser: jsParser, overlay: (node) => node.type.name === 'Resolvable' }
			: null;
	}),
});

const pongLanguage = LRLanguage.define({ parser: pongPlusJsParser });

export function pongExpressionLanguageSupport() {
	return new LanguageSupport(pongLanguage);
}
```

## Supported Unicode ranges

- From `Basic Latin` up to and including `Currency Symbols`
- `Miscellaneous Symbols and Pictographs`
- `CJK Unified Ideographs`
