import { TypedEmitter } from '@pong/backend-common';
import { Service } from '@pong/di';

type RunnerIdentity = { runnerId: string };

export type TaskRunnerLifecycleEventMap = {
	'runner:failed-heartbeat-check': RunnerIdentity;
	'runner:timed-out-during-task': RunnerIdentity;
	'runner:unresponsive': RunnerIdentity;
};

@Service()
export class TaskRunnerLifecycleEvents extends TypedEmitter<TaskRunnerLifecycleEventMap> {}
