/**
 * @deprecated Import from `@pong/frontend-utils/htmlUtils` instead. This re-export
 * shim keeps existing `@/app/utils/htmlUtils` call sites working during the
 * CAT-3686 frontend-modularization migration and will be removed once importers
 * are retired per-directory. (PONG-36)
 */
export {
	capitalizeFirstLetter,
	escapeHtml,
	getBannerRowHeight,
	getScrollbarWidth,
	isEventTargetContainedBy,
	isOutsideSelected,
	openSafeUrl,
	sanitizeHtml,
	sanitizeIfString,
} from '@pong/frontend-utils/htmlUtils';
