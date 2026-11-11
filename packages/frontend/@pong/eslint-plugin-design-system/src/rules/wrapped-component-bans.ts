/**
 * Primitives a design-system component already wraps.
 * Replace this table with a package boundary when product packages no longer import `reka-ui` or `element-plus`.
 */
export type WrappedComponentBan = RekaUiBan | ElementPlusBan;

type RekaUiBan = {
	library: 'reka-ui';
	/**
	 * Export-name prefixes. `Dialog` does not match `AlertDialog`.
	 * A longer prefix wins, so list both when one name starts with another.
	 */
	prefixes: readonly string[];
	/** Folders under `design-system/src` that may import the primitives. */
	allowedFolders: readonly string[];
	/** Design-system components callers should use instead. */
	replacement: string | readonly string[];
};

type ElementPlusBan = {
	library: 'element-plus';
	/** Named exports. Match is exact. */
	names?: readonly string[];
	/**
	 * Deep-import path segments under `element-plus/.../components/<segment>`.
	 * `menu` matches `element-plus/es/components/menu` and does not match `menu-item`.
	 */
	componentPaths?: readonly string[];
	/** Template tags. Match is exact, so list kebab-case and PascalCase. */
	templateNames?: readonly string[];
	/** Folders under `design-system/src` that may import the primitives. */
	allowedFolders: readonly string[];
	/** Design-system components callers should use instead. */
	replacement: string | readonly string[];
};

export const wrappedComponentBans = [
	{
		library: 'reka-ui',
		prefixes: ['Checkbox'],
		allowedFolders: ['v2/components/Checkbox'],
		replacement: 'PongCheckbox',
	},
	{
		library: 'reka-ui',
		prefixes: ['Combobox'],
		allowedFolders: ['v2/components/Combobox'],
		replacement: 'PongCombobox2',
	},
	{
		library: 'reka-ui',
		prefixes: ['DateRangePicker'],
		allowedFolders: ['components/DateRangePicker'],
		replacement: 'PongDateRangePicker',
	},
	{
		library: 'reka-ui',
		prefixes: ['Dialog', 'AlertDialog'],
		allowedFolders: ['components/PongDialog', 'components/PongAlertDialog'],
		replacement: ['PongDialog', 'PongAlertDialog'],
	},
	{
		library: 'reka-ui',
		prefixes: ['Editable'],
		allowedFolders: ['components/PongInlineTextEdit'],
		replacement: 'PongInlineTextEdit',
	},
	{
		library: 'reka-ui',
		prefixes: ['FocusScope'],
		allowedFolders: ['components/FocusScope'],
		replacement: 'FocusScope',
	},
	{
		library: 'reka-ui',
		prefixes: ['HoverCard'],
		allowedFolders: ['components/PongHoverCard'],
		replacement: 'PongHoverCard',
	},
	{
		library: 'reka-ui',
		prefixes: ['Listbox'],
		allowedFolders: ['components/PongListbox'],
		replacement: ['PongListbox', 'PongListboxItem'],
	},
	{
		library: 'reka-ui',
		prefixes: ['NumberField'],
		allowedFolders: ['components/PongInputNumber'],
		replacement: 'PongInputNumber',
	},
	{
		library: 'reka-ui',
		prefixes: ['Pagination'],
		allowedFolders: ['components/PongPagination'],
		replacement: 'PongPagination',
	},
	{
		// DateRangePicker composes Popover, so that folder may import both.
		library: 'reka-ui',
		prefixes: ['Popover'],
		allowedFolders: ['components/PongPopover', 'components/DateRangePicker'],
		replacement: 'PongPopover',
	},
	{
		library: 'reka-ui',
		prefixes: ['RadioGroup', 'injectRadioGroup'],
		allowedFolders: ['components/PongRadioGroup', 'components/PongSegmentControl'],
		replacement: ['PongRadioGroup', 'PongSegmentControl'],
	},
	{
		library: 'reka-ui',
		prefixes: ['ScrollArea'],
		allowedFolders: ['components/PongScrollArea'],
		replacement: 'PongScrollArea',
	},
	{
		library: 'reka-ui',
		prefixes: ['Select'],
		allowedFolders: ['v2/components/Select'],
		replacement: 'PongSelect2',
	},
	{
		library: 'reka-ui',
		prefixes: ['Switch'],
		allowedFolders: ['components/PongSwitch'],
		replacement: 'PongSwitch',
	},
	{
		library: 'reka-ui',
		prefixes: ['TagsInput'],
		allowedFolders: ['v2/components/TagsInput'],
		replacement: 'PongTagsInput2',
	},
	{
		// The `Toggle` prefix also matches `ToggleGroup`.
		library: 'reka-ui',
		prefixes: ['Toggle'],
		allowedFolders: ['components/PongToggle', 'components/PongToggleGroup'],
		replacement: ['PongToggle', 'PongToggleGroup'],
	},
	{
		library: 'reka-ui',
		prefixes: ['Tooltip'],
		allowedFolders: ['components/PongTooltip'],
		replacement: 'PongTooltip',
	},
	{
		library: 'reka-ui',
		prefixes: ['Tree'],
		allowedFolders: ['v2/components/Tree'],
		replacement: 'PongTree2',
	},
	{
		library: 'reka-ui',
		prefixes: ['VisuallyHidden'],
		allowedFolders: ['components/PongVisuallyHidden'],
		replacement: 'PongVisuallyHidden',
	},
	{
		library: 'element-plus',
		names: ['ElMenu', 'ElSubMenu', 'ElMenuItem'],
		componentPaths: ['menu', 'menu-item', 'sub-menu'],
		templateNames: ['el-menu', 'ElMenu', 'el-sub-menu', 'ElSubMenu', 'el-menu-item', 'ElMenuItem'],
		allowedFolders: ['components/PongNavigationDropdown'],
		replacement: 'PongNavigationDropdown',
	},
] as const satisfies readonly WrappedComponentBan[];

export function formatWrappedComponentReplacement(replacement: string | readonly string[]): string {
	const names = typeof replacement === 'string' ? [replacement] : replacement;
	return names.map((name) => `\`${name}\``).join(' or ');
}
