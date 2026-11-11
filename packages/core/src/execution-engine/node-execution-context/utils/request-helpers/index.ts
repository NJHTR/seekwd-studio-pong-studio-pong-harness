import { configureGlobalAxiosDefaults } from '@pong/backend-network';

// Applies pong's global axios defaults and registers the request interceptor.
configureGlobalAxiosDefaults();

export { getRequestHelperFunctions } from './factory';
