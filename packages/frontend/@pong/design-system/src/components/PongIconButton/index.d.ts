import { PongComponent, PongComponentSize } from '../component';
import { ButtonTheme, ButtonType } from '../PongButton';

/** Icon Button Component */
export declare class PongIconButton extends PongComponent {
	/** Button type */
	type: ButtonType;

	/** Button title on hover */
	title: string;

	/** Button size */
	size: PongComponentSize | 'xlarge';

	/** Determine whether it's loading */
	loading: boolean;

	/** Disable the button */
	disabled: boolean;

	/** Button icon, accepts an icon name of font awesome icon component */
	icon: string;

	/** Button theme */
	theme: ButtonTheme;
}
