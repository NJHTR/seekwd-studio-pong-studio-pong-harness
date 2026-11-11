import { Service } from '@pong/di';
import { DataSource, Repository } from '@pong/typeorm';

import { AnnotationTagEntity } from '../entities';

@Service()
export class AnnotationTagRepository extends Repository<AnnotationTagEntity> {
	constructor(dataSource: DataSource) {
		super(AnnotationTagEntity, dataSource.manager);
	}
}
