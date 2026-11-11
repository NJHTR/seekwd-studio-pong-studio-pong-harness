import { Config, Env } from '@pong/config';

@Config
export class RuntimeCredentialsConfig {
	@Env('PONG_SECURITY_SENSITIVE_FIELD_RULES')
	sensitiveFieldRules: string = '{}';
}
