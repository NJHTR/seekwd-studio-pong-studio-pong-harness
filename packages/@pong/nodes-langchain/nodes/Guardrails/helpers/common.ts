import { parseRegexLiteral } from 'pong-workflow';

export const splitByComma = (str: string) => {
	return str
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s);
};

export const parseRegex = (input: string) => {
	return parseRegexLiteral((input || '').toString());
};
