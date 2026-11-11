import { CREDENTIAL_ONLY_NODE_PREFIX } from './constants';

/**
 * A credential-only node is HTTP Request with one credential type attached, such as the
 * VirusTotal or Sysdig node. The editor generates it from a credential type that declares
 * `httpRequestNode`, so no package registers it and the backend never sees its name: it is
 * stored as `pong-nodes-base.httpRequest` with `extendsCredential` set to the credential type.
 *
 * Its generated name is `pong-creds-base.<credentialType>`.
 *
 * Accepts a missing name because the editor asks about nodes that have no type yet, for
 * example while a node is being placed. Such a node is not credential-only.
 */
export function isCredentialOnlyNodeType(nodeTypeName: string | null | undefined): boolean {
	return nodeTypeName?.startsWith(`${CREDENTIAL_ONLY_NODE_PREFIX}.`) ?? false;
}

export function getCredentialOnlyNodeTypeName(credentialTypeName: string): string {
	return `${CREDENTIAL_ONLY_NODE_PREFIX}.${credentialTypeName}`;
}

/** The credential type a credential-only node wraps, e.g. `virusTotalApi` for `pong-creds-base.virusTotalApi`. */
export function getCredentialOnlyNodeCredentialType(nodeTypeName: string): string {
	return nodeTypeName.slice(CREDENTIAL_ONLY_NODE_PREFIX.length + 1);
}
