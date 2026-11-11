import type { INode, IConnections, IWorkflowSettings, IWorkflowGroup } from 'pong-workflow';

import type { RemoteResourceOwner } from './resource-owner';

export interface ExportableWorkflow {
	id: string;
	name: string;
	description: string | null;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	triggerCount: number;
	versionId?: string;
	owner: RemoteResourceOwner;
	parentFolderId: string | null;
	isArchived: boolean;
	nodeGroups: IWorkflowGroup[];
}
