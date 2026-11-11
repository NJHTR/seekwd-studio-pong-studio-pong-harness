import type { INode } from '../interfaces';
import { OperationalError, type OperationalErrorOptions } from '@pong/errors';

interface TriggerCloseErrorOptions extends ErrorOptions {
	level: OperationalErrorOptions['level'];
}

export class TriggerCloseError extends OperationalError {
	constructor(
		readonly node: INode,
		{ cause, level }: TriggerCloseErrorOptions,
	) {
		super('Trigger Close Failed', { cause, level, extra: { nodeName: node.name } });
	}
}
