import type { AxiosRequestConfig } from 'axios';

import { PongApiClient } from './pong-api-client';

export class AuthenticatedPongApiClient extends PongApiClient {
	constructor(
		apiBaseUrl: string,
		private readonly authCookie: string,
	) {
		super(apiBaseUrl);
	}

	static async createUsingUsernameAndPassword(
		apiClient: PongApiClient,
		loginDetails: {
			email: string;
			password: string;
		},
	): Promise<AuthenticatedPongApiClient> {
		const response = await apiClient.restApiRequest('/login', {
			method: 'POST',
			data: {
				emailOrLdapLoginId: loginDetails.email,
				password: loginDetails.password,
			},
		});

		if (response.data === 'pong is starting up. Please wait') {
			await apiClient.delay(1000);
			return await this.createUsingUsernameAndPassword(apiClient, loginDetails);
		}

		const cookieHeader = response.headers['set-cookie'];
		const authCookie = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
		if (!authCookie) {
			throw new Error(
				'Did not receive authentication cookie even tho login succeeded: ' +
					JSON.stringify(
						{
							status: response.status,
							headers: response.headers,
							data: response.data,
						},
						null,
						2,
					),
			);
		}

		return new AuthenticatedPongApiClient(apiClient.apiBaseUrl, authCookie);
	}

	async get<T>(endpoint: string) {
		return await this.authenticatedRequest<T>(endpoint, {
			method: 'GET',
		});
	}

	async post<T>(endpoint: string, data: unknown) {
		return await this.authenticatedRequest<T>(endpoint, {
			method: 'POST',
			data,
		});
	}

	async patch<T>(endpoint: string, data: unknown) {
		return await this.authenticatedRequest<T>(endpoint, {
			method: 'PATCH',
			data,
		});
	}

	async delete<T>(endpoint: string, init?: Omit<AxiosRequestConfig, 'url' | 'method'>) {
		return await this.authenticatedRequest<T>(endpoint, {
			...init,
			method: 'DELETE',
		});
	}

	protected async authenticatedRequest<T>(endpoint: string, init: Omit<AxiosRequestConfig, 'url'>) {
		return await this.restApiRequest<T>(endpoint, {
			...init,
			headers: {
				...init.headers,
				cookie: this.authCookie,
			},
		});
	}
}
