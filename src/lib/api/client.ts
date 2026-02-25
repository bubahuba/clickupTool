import createClient from 'openapi-fetch';
import type { paths } from './api.generated.js';

export function createClickUpClient(token: string) {
	return createClient<paths>({
		baseUrl: 'https://api.clickup.com/api',
		headers: {
			Authorization: token
		}
	});
}
