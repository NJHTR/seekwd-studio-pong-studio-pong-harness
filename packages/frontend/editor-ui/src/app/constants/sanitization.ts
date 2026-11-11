/**
 * @deprecated Import from `@pong/frontend-utils/constants/sanitization` instead. These
 * constants moved into `@pong/frontend-utils` (alongside their only consumer
 * `htmlUtils`) during the CAT-3686 frontend-modularization migration; this
 * re-export keeps `@/app/constants` consumers working until they are retired.
 * (PONG-36)
 */
export {
	ALLOWED_HTML_ATTRIBUTES,
	ALLOWED_HTML_TAGS,
} from '@pong/frontend-utils/constants/sanitization';
