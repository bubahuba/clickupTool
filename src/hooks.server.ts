import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server.js';

export const handle: Handle = ({ event, resolve }) => {
	// Skip paraglide for API routes - avoid any request modification
	if (event.url.pathname.startsWith('/api/')) {
		return resolve(event);
	}
	return paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%lang%', locale)
		});
	});
};
