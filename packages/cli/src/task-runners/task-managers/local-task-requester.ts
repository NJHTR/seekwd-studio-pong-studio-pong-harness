import { EventService } from '@pong/backend-services';
import { GlobalConfig, TaskRunnersConfig } from '@pong/config';
import { Container, Service } from '@pong/di';
import type { RequesterMessage } from '@pong/task-runner';
import { ErrorReporter } from 'pong-core';

import { NodeTypes } from '@/node-types';
import { TaskBroker } from '@/task-runners/task-broker/task-broker.service';

import { TaskRequester } from './task-requester';

@Service()
export class LocalTaskRequester extends TaskRequester {
	taskBroker: TaskBroker;

	id = 'local-task-requester';

	constructor(
		nodeTypes: NodeTypes,
		eventService: EventService,
		taskRunnersConfig: TaskRunnersConfig,
		globalConfig: GlobalConfig,
		errorReporter: ErrorReporter,
	) {
		super(nodeTypes, eventService, taskRunnersConfig, globalConfig, errorReporter);
		this.registerRequester();
	}

	registerRequester() {
		this.taskBroker = Container.get(TaskBroker);

		this.taskBroker.registerRequester(this.id, this.onMessage.bind(this));
	}

	sendMessage(message: RequesterMessage.ToBroker.All) {
		void this.taskBroker.onRequesterMessage(this.id, message).catch((error) => {
			this.errorReporter.error(error);
		});
	}
}
