import { mockLogger } from '@pong/backend-test-utils';
import type { GlobalConfig } from '@pong/config';
import { ControllerRegistryMetadata } from '@pong/decorators';
import { Container } from '@pong/di';
import express, { type Application, type Request, type Response } from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { ControllerRegistry } from '@/controller.registry';
import { InternalControlController } from '@/controllers/internal-control.controller';
import type { License } from '@/license';
import { CONTROL_TOKEN_HEADER, ControlPlaneService } from '@/services/control-plane.service';
import type { LastActiveAtService } from '@/services/last-active-at.service';
import { RateLimitService } from '@/services/rate-limit.service';

const CONTROL_PATH = '/internal/control';

/**
 * Builds the smallest app that still uses the real controller registry, so the
 * route registration and the controller middleware are covered.
 */
function buildApp(token: string | undefined): {
	app: Application;
	service: ControlPlaneService;
	controller: InternalControlController;
} {
	if (token === undefined) delete process.env.PONG_CONTROL_TOKEN;
	else process.env.PONG_CONTROL_TOKEN = token;

	const service = new ControlPlaneService(mockLogger());
	Container.set(ControlPlaneService, service);
	Container.set(InternalControlController, new InternalControlController(service));

	const app = express();
	app.use(express.json());

	new ControllerRegistry(
		mock<License>(),
		mock<AuthService>(),
		mock<GlobalConfig>({ endpoints: { rest: 'rest' } }),
		Container.get(ControllerRegistryMetadata),
		mock<LastActiveAtService>(),
		new RateLimitService(),
	).activate(app);

	return { app, service, controller: Container.get(InternalControlController) };
}

describe('InternalControlController', () => {
	const originalToken = process.env.PONG_CONTROL_TOKEN;

	afterEach(() => {
		if (originalToken === undefined) delete process.env.PONG_CONTROL_TOKEN;
		else process.env.PONG_CONTROL_TOKEN = originalToken;
	});

	describe('when PONG_CONTROL_TOKEN is not set', () => {
		it('hides the health endpoint behind a 404', async () => {
			const { app } = buildApp(undefined);

			await request(app).get(`${CONTROL_PATH}/health`).expect(404);
		});

		it('hides the shutdown endpoint behind a 404', async () => {
			const { app, service } = buildApp(undefined);
			const handler = vi.fn();
			service.registerShutdownHandler(handler);

			await request(app).post(`${CONTROL_PATH}/shutdown`).expect(404);
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('when PONG_CONTROL_TOKEN is set', () => {
		const token = 'test-control-token';

		it('rejects a request without the token header', async () => {
			const { app } = buildApp(token);

			await request(app).get(`${CONTROL_PATH}/health`).expect(401);
			await request(app).post(`${CONTROL_PATH}/shutdown`).expect(401);
		});

		it('rejects a request with a wrong token', async () => {
			const { app } = buildApp(token);

			await request(app)
				.get(`${CONTROL_PATH}/health`)
				.set(CONTROL_TOKEN_HEADER, 'wrong-token')
				.expect(401);
		});

		it('rejects a non-loopback caller before it checks the token', () => {
			const { controller } = buildApp(token);
			const req = { socket: { remoteAddress: '10.1.2.3' } } as unknown as Request;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn().mockReturnThis(),
			} as unknown as Response;
			const next = vi.fn();

			controller.authorizeControlAccess(req, res, next);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(next).not.toHaveBeenCalled();
		});

		it('reports health for the expected token', async () => {
			const { app } = buildApp(token);

			const response = await request(app)
				.get(`${CONTROL_PATH}/health`)
				.set(CONTROL_TOKEN_HEADER, token)
				.expect(200);

			expect(response.body).toEqual({
				status: 'ok',
				pid: process.pid,
				uptimeMs: expect.any(Number),
			});
		});

		it('accepts a shutdown request and runs the handler once', async () => {
			const { app, service } = buildApp(token);
			const handler = vi.fn().mockResolvedValue(undefined);
			service.registerShutdownHandler(handler);

			const response = await request(app)
				.post(`${CONTROL_PATH}/shutdown`)
				.set(CONTROL_TOKEN_HEADER, token)
				.expect(202);

			expect(response.body).toEqual({ accepted: true });
			await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
		});

		it('keeps concurrent shutdown requests idempotent', async () => {
			const { app, service } = buildApp(token);
			const handler = vi.fn().mockResolvedValue(undefined);
			service.registerShutdownHandler(handler);

			const responses = await Promise.all(
				Array.from(
					{ length: 5 },
					async () =>
						await request(app).post(`${CONTROL_PATH}/shutdown`).set(CONTROL_TOKEN_HEADER, token),
				),
			);

			for (const response of responses) {
				expect(response.status).toBe(202);
				expect(response.body).toEqual({ accepted: true });
			}

			await vi.waitFor(() => expect(handler).toHaveBeenCalledOnce());
		});

		it('answers before the editor catch-all, and leaves it unchanged', async () => {
			const { app } = buildApp(token);
			app.use((_req, res) => {
				res.status(200).type('html').send('<html>editor</html>');
			});

			const editorPage = await request(app).get('/workflows').expect(200);
			expect(editorPage.text).toBe('<html>editor</html>');

			await request(app).get(`${CONTROL_PATH}/health`).set(CONTROL_TOKEN_HEADER, token).expect(200);

			const unknown = await request(app)
				.post(`${CONTROL_PATH}/unknown`)
				.set(CONTROL_TOKEN_HEADER, token)
				.expect(200);
			expect(unknown.text).toBe('<html>editor</html>');
		});
	});
});
