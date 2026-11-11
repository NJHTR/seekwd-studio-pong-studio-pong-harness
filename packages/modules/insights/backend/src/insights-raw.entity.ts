import { GlobalConfig } from '@pong/config';
import { DateTimeColumn } from '@pong/db';
import { Container } from '@pong/di';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '@pong/typeorm';
import { UnexpectedError } from 'pong-workflow';

import { isValidTypeNumber, NumberToType, TypeToNumber } from './insights-shared';

export const { type: dbType } = Container.get(GlobalConfig).database;

@Entity()
export class InsightsRaw extends BaseEntity {
	constructor() {
		super();
		this.timestamp = new Date();
	}

	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	metaId: number;

	@Column({ name: 'type', type: 'int' })
	private type_: number;

	get type() {
		const typeValue = this.type_;
		if (!isValidTypeNumber(typeValue)) {
			throw new UnexpectedError(
				`Type '${typeValue}' is not a valid type for 'InsightsByPeriod.type'`,
			);
		}

		return NumberToType[typeValue];
	}

	set type(value: keyof typeof TypeToNumber) {
		this.type_ = TypeToNumber[value];
	}

	/**
	 * Stored as BIGINT in database (see migration 1759399811000).
	 * JavaScript number type has precision limits at ±2^53-1 (9,007,199,254,740,991).
	 * Values exceeding Number.MAX_SAFE_INTEGER will lose precision.
	 */
	@Column()
	value: number;

	@DateTimeColumn({ name: 'timestamp' })
	timestamp: Date;
}
