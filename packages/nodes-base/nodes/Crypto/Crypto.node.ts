import type { INodeTypeBaseDescription, IVersionedNodeType } from 'pong-workflow';
import { VersionedNodeType } from 'pong-workflow';

import { CryptoV1 } from './v1/CryptoV1.node';
import { CryptoV2 } from './v2/CryptoV2.node';

export class Crypto extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Crypto',
			name: 'crypto',
			icon: 'node:crypto',
			iconColor: 'green',
			group: ['transform'],
			defaultVersion: 2,
			subtitle: '={{$parameter["action"]}}',
			description: 'Provide cryptographic utilities',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new CryptoV1(baseDescription),
			2: new CryptoV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
