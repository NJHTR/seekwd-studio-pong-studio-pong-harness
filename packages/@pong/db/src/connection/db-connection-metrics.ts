import { Service } from '@pong/di';

@Service()
export class DbConnectionMetrics {
	acquireDurationObserver?: (seconds: number) => void;
	disconnectionObserver?: () => void;
	recoveryAttemptObserver?: (result: 'success' | 'failure') => void;
}
