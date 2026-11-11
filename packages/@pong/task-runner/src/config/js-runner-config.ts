import { Config, Env } from '@pong/config';

@Config
export class JsRunnerConfig {
	@Env('NODE_FUNCTION_ALLOW_BUILTIN')
	allowedBuiltInModules: string = '';

	@Env('NODE_FUNCTION_ALLOW_EXTERNAL')
	allowedExternalModules: string = '';

	@Env('PONG_RUNNERS_INSECURE_MODE')
	insecureMode: boolean = false;
}
