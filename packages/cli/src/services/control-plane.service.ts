import { Logger } from '@pong/backend-common';
import { Service } from '@pong/di';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/** Header that carries the control token. */
export const CONTROL_TOKEN_HEADER = 'x-pong-control-token';

export type ControlAccess = 'accepted' | 'not-configured' | 'not-loopback' | 'invalid-token';

export interface ControlHealth {
	status: 'ok' | 'shutting-down';
	pid: number;
	uptimeMs: number;
}

export type ControlShutdownHandler = () => Promise<void> | void;

/**
 * Serves the loopback control plane: it decides whether a caller may use it,
 * reports health, and runs the graceful shutdown once.
 *
 * The token is read from `PONG_CONTROL_TOKEN` at startup. An empty token
 * disables the endpoints, because the caller cannot authenticate them.
 */
@Service()
export class ControlPlaneService {
	private readonly token: string;

	private shutdownRequested = false;

	private shutdownHandler: ControlShutdownHandler | undefined;

	constructor(private readonly logger: Logger) {
		this.token = process.env.PONG_CONTROL_TOKEN ?? '';
	}

	private isEnabled(): boolean {
		return this.token.length > 0;
	}

	/**
	 * Accepts a request only from a loopback address with the expected token.
	 * The token is checked after the address, so a remote caller learns nothing.
	 */
	authorize(req: Request): ControlAccess {
		if (!this.isEnabled()) return 'not-configured';
		if (!this.isLoopback(req)) return 'not-loopback';

		const provided = this.readToken(req);
		if (provided === undefined || !this.matchesToken(provided)) return 'invalid-token';

		return 'accepted';
	}

	health(): ControlHealth {
		return {
			status: this.shutdownRequested ? 'shutting-down' : 'ok',
			pid: process.pid,
			uptimeMs: Math.round(process.uptime() * 1000),
		};
	}

	/** Registers the graceful shutdown sequence that a control request runs. */
	registerShutdownHandler(handler: ControlShutdownHandler): void {
		this.shutdownHandler = handler;
	}

	/** Runs the shutdown handler at most once. Later calls are ignored. */
	requestShutdown(): void {
		if (this.shutdownRequested) return;

		this.shutdownRequested = true;

		const handler = this.shutdownHandler;
		if (!handler) {
			this.logger.warn('Control plane shutdown requested, but no shutdown handler is registered');
			return;
		}

		// Run on a microtask so the caller's response can leave the process first.
		void Promise.resolve()
			.then(async () => await handler())
			.catch((error: unknown) => {
				this.logger.error('Control plane shutdown handler failed', { error });
			});
	}

	private isLoopback(req: Request): boolean {
		const address = req.socket?.remoteAddress ?? '';

		// `::ffff:127.0.0.1` is how a dual-stack listener reports an IPv4 caller.
		return address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.');
	}

	private readToken(req: Request): string | undefined {
		const header = req.headers[CONTROL_TOKEN_HEADER];

		return typeof header === 'string' ? header : undefined;
	}

	private matchesToken(provided: string): boolean {
		const expected = Buffer.from(this.token);
		const actual = Buffer.from(provided);

		return expected.length === actual.length && timingSafeEqual(expected, actual);
	}
}
