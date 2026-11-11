import type { DateRangePickerRootEmits, DateRangePickerRootProps, PopoverRootEmits } from 'reka-ui';

export { default as PongDateRangePicker } from './DateRangePicker.vue';

export type PongDateRangePickerProps = DateRangePickerRootProps & {
	/** When true, hides the date input fields and apply button at the bottom of the picker */
	hideInputs?: boolean;
};
export type PongDateRangePickerRootEmits = DateRangePickerRootEmits & PopoverRootEmits;
export type { DateRange, DateValue } from 'reka-ui';
