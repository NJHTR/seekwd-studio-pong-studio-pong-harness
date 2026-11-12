import { createHash } from 'node:crypto';

import type { SystemAgentHostEventEmitter } from '../system-agent-host-events';
import { toJsonValue } from './easycode-json';
import type { EasycodeNotification } from './easycode-supervisor.port';

export interface EasycodeArtifactFile {
	path: string;
	/** `modified`, `added` or `deleted`, read from the patch headers. */
	status: string;
}

export interface EasycodeArtifactManifest {
	itemId: string;
	sha256: string;
	bytes: number;
	files: EasycodeArtifactFile[];
	/** The pong thread that produced the artifact. A later artifact names its parents. */
	parents: string[];
	/** Binary data id when a sink stored the patch. */
	fileId?: string;
}

export interface EasycodeArtifactSink {
	store(input: {
		bytes: Buffer;
		fileName: string;
		mimeType: string;
	}): Promise<{ fileId: string }>;
}

export interface EasycodeArtifactBridgeOptions {
	threadId: string;
	emit: SystemAgentHostEventEmitter;
	sink?: EasycodeArtifactSink;
}

/**
 * Projects the file changes of a turn to artifact manifests.
 *
 * The app-server streams a patch per changed file as `item/fileChange/outputDelta`.
 * The bridge joins the deltas of one item, then emits one `easycode-artifact`
 * host event with the SHA-256 of the patch, its size, the changed paths and the
 * parents. A sink may store the patch bytes (pong binary data) and returns the
 * id that the manifest carries, so the UI can show the diff again later.
 */
export class EasycodeArtifactBridge {
	private readonly chunks = new Map<string, string[]>();

	constructor(private readonly options: EasycodeArtifactBridgeOptions) {}

	observe(notification: EasycodeNotification): void {
		if (notification.method === 'item/fileChange/outputDelta') {
			const itemId = readString(notification.params, 'itemId');
			const delta = readString(notification.params, 'delta');
			if (itemId === undefined || delta === undefined) return;
			const existing = this.chunks.get(itemId) ?? [];
			existing.push(delta);
			this.chunks.set(itemId, existing);
			return;
		}
		if (notification.method === 'item/completed') {
			const item = readField(notification.params, 'item');
			if (readString(item, 'type') !== 'fileChange') return;
			const itemId = readString(item, 'id');
			if (itemId === undefined) return;
			void this.finalize(itemId);
		}
	}

	/** The joined patch of one item. Empty when no delta arrived. */
	patchOf(itemId: string): string {
		return (this.chunks.get(itemId) ?? []).join('');
	}

	private async finalize(itemId: string): Promise<void> {
		const patch = this.patchOf(itemId);
		if (patch === '') return;
		this.chunks.delete(itemId);
		const bytes = Buffer.from(patch, 'utf8');
		const sha256 = createHash('sha256').update(bytes).digest('hex');
		const manifest: EasycodeArtifactManifest = {
			itemId,
			sha256,
			bytes: bytes.byteLength,
			files: parsePatchFiles(patch),
			parents: [this.options.threadId],
		};
		if (this.options.sink !== undefined) {
			try {
				const stored = await this.options.sink.store({
					bytes,
					fileName: `easycode-${itemId}.patch`,
					mimeType: 'text/x-diff',
				});
				manifest.fileId = stored.fileId;
			} catch {
				// The manifest still carries the hash; the stored bytes are best effort.
			}
		}
		this.options.emit('easycode-artifact', toJsonValue(manifest), {
			key: `artifact:${itemId}`,
		});
	}
}

/** Read the changed paths and their status from a unified diff. */
export function parsePatchFiles(patch: string): EasycodeArtifactFile[] {
	const files = new Map<string, string>();
	const lines = patch.split('\n');
	let current: string | undefined;
	let status = 'modified';
	for (const line of lines) {
		if (line.startsWith('diff --git ')) {
			const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
			current = match?.[2] ?? match?.[1];
			status = 'modified';
			if (current !== undefined) files.set(current, status);
			continue;
		}
		if (line.startsWith('new file mode')) {
			status = 'added';
			if (current !== undefined) files.set(current, status);
			continue;
		}
		if (line.startsWith('deleted file mode')) {
			status = 'deleted';
			if (current !== undefined) files.set(current, status);
			continue;
		}
		if (current === undefined && line.startsWith('+++ ')) {
			const path = line.replace(/^\+\+\+ b\//, '').replace(/^\+\+\+ /, '');
			if (path !== '/dev/null') files.set(path, 'modified');
		}
	}
	return [...files.entries()].map(([path, entryStatus]) => ({ path, status: entryStatus }));
}

function readField(source: unknown, key: string): unknown {
	return typeof source === 'object' && source !== null ? Reflect.get(source, key) : undefined;
}

function readString(source: unknown, key: string): string | undefined {
	const value = readField(source, key);
	return typeof value === 'string' ? value : undefined;
}
