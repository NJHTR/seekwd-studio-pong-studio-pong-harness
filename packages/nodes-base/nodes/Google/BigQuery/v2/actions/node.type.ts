import type { AllEntities, Entity } from 'pong-workflow';

type GoogleBigQueryMap = {
	database: 'executeQuery' | 'insert';
};

export type GoogleBigQuery = AllEntities<GoogleBigQueryMap>;

export type GoogleBigQueryDatabase = Entity<GoogleBigQueryMap, 'database'>;
