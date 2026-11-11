import type { IconSize } from '../../types';
import { PongComponent } from '../component';

/** Spinner Component */
export declare class PongSpinner extends PongComponent {
	/** Icon size */
	size: IconSize;
	/** Loading indicator shape */
	type: 'dots' | 'ring' | 'grid';
}
