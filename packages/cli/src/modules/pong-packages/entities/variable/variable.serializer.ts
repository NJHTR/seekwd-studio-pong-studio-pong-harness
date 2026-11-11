import { type SerializedVariable, serializedVariableSchema } from '@pong/api-types';
import type { Variables } from '@pong/db';
import { Service } from '@pong/di';

import { definePackageSerializationPayload } from '../package-serialization.types';

type VariablePackageKeyHandling = {
	id: 'exclude';
	key: 'transform';
	type: 'copy';
	value: 'copy';
	project: 'transform';
};

const serializePayload = definePackageSerializationPayload<
	Variables,
	SerializedVariable,
	VariablePackageKeyHandling
>();

@Service()
export class VariableSerializer {
	serialize(
		variable: Variables,
		{ includeValue = true }: { includeValue?: boolean } = {},
	): SerializedVariable {
		const type = serializedVariableSchema.shape.type.parse(variable.type);

		return serializedVariableSchema.parse(
			serializePayload({
				name: variable.key,
				type,
				...(includeValue ? { value: variable.value } : {}),
			}),
		);
	}
}
