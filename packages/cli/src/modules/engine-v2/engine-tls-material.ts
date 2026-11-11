import type { Logger } from '@pong/backend-common';
import { EngineConfig } from '@pong/config';
import { Service } from '@pong/di';
import { assertSecureTransport, loadEngineTls, type EngineTls } from '@pong/engine';

/**
 * This process's engine TLS certificate, key and CA, read once from
 * `PONG_ENGINE_TLS_*`. `undefined` when none is set: the planes then use plain
 * HTTP, which the boot checks allow only in-process or with the opt-out.
 */
@Service()
export class EngineTlsMaterial {
	private loaded?: { tls: EngineTls | undefined };

	constructor(private readonly engineConfig: EngineConfig) {}

	get tls(): EngineTls | undefined {
		this.loaded ??= { tls: loadEngineTls(this.engineConfig) };
		return this.loaded.tls;
	}

	/** Refuses plain HTTP without the opt-out, and an `http://` peer URL with TLS on. */
	assertSecureTransport(peerUrls: Record<string, string>, logger: Logger): void {
		assertSecureTransport(this.engineConfig, this.tls, peerUrls, logger);
	}
}
