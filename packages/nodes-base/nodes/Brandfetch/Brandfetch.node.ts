import type { INodeTypeBaseDescription, IVersionedNodeType } from 'pong-workflow';
import { VersionedNodeType } from 'pong-workflow';

import { BrandfetchV1 } from './v1/BrandfetchV1.node';
import { BrandfetchV2 } from './v2/BrandfetchV2.node';

export class Brandfetch extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Brandfetch',
			// eslint-disable-next-line pong-nodes-base/node-class-description-name-miscased
			name: 'Brandfetch',
			icon: 'file:brandfetch.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"]}}',
			description: 'Consume Brandfetch API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new BrandfetchV1(baseDescription),
			2: new BrandfetchV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
