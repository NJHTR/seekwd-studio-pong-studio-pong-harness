<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import { getLocalTimeZone, parseDate } from '@internationalized/date';
import { PongAlert, PongButton, PongIcon, PongText } from '@pong/design-system';
import { useI18n } from '@pong/i18n';
import { computed, ref } from 'vue';

const props = defineProps<{
	earliestDataDate: string | null;
	rangeStart: DateValue;
	rangeEnd: DateValue;
}>();

const emit = defineEmits<{ dismiss: [] }>();

const i18n = useI18n();

const isDismissed = ref(false);

const alertInfo = computed(() => {
	if (!props.earliestDataDate) return null;

	const earliestCalendarDate = parseDate(props.earliestDataDate.substring(0, 10));
	if (props.rangeStart.compare(earliestCalendarDate) >= 0) return null;

	if (props.rangeEnd.compare(earliestCalendarDate) < 0) {
		return { earliestCalendarDate, daysWithoutData: 0, noData: true as const };
	}

	const daysWithoutData = earliestCalendarDate.compare(props.rangeStart);
	return { earliestCalendarDate, daysWithoutData, noData: false as const };
});

const formattedDate = computed(() => {
	if (!alertInfo.value) return '';
	const d = alertInfo.value.earliestCalendarDate.toDate(getLocalTimeZone());
	return new Intl.DateTimeFormat(undefined, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	}).format(d);
});

function dismiss() {
	isDismissed.value = true;
	emit('dismiss');
}
</script>

<template>
	<PongAlert
		v-if="alertInfo && !isDismissed"
		type="info"
		:show-icon="false"
		data-test-id="insights-date-range-alert"
	>
		<template #icon>
			<PongText color="text-dark">
				<PongIcon icon="info" />
			</PongText>
		</template>
		<template #title>
			<PongText color="text-dark" bold>
				{{ i18n.baseText('insights.dashboard.dataRangeAlert.title') }}
			</PongText>
		</template>
		<PongText color="text-dark">
			{{
				alertInfo.noData
					? i18n.baseText('insights.dashboard.dataRangeAlert.descriptionNoData', {
							interpolate: { date: formattedDate },
						})
					: i18n.baseText('insights.dashboard.dataRangeAlert.description', {
							interpolate: { date: formattedDate, days: alertInfo.daysWithoutData },
							adjustToNumber: alertInfo.daysWithoutData,
						})
			}}
		</PongText>
		<template #aside>
			<PongButton
				size="small"
				variant="outline"
				:label="i18n.baseText('insights.dashboard.dataRangeAlert.dismiss')"
				data-test-id="insights-date-range-alert-dismiss"
				@click="dismiss"
			/>
		</template>
	</PongAlert>
</template>
