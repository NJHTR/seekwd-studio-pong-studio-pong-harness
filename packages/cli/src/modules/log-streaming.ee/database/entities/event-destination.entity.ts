import { JsonColumn, WithTimestamps } from '@pong/db';
import { Entity, PrimaryColumn } from '@pong/typeorm';
import { MessageEventBusDestinationOptions } from 'pong-workflow';

@Entity({ name: 'event_destinations' })
export class EventDestinations extends WithTimestamps {
	@PrimaryColumn('uuid')
	id: string;

	@JsonColumn()
	destination: MessageEventBusDestinationOptions;
}
