import type { InstanceType } from '@pong/constants';
import { generateNanoId } from '@pong/utils/generate-nano-id';

export function generateHostInstanceId(instanceType: InstanceType) {
	return `${instanceType}-${generateNanoId()}`;
}
