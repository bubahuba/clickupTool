import type { operations } from './api.generated.js';

/** Response type for Get Authorized User endpoint */
export type GetAuthorizedUserResponse =
	operations['getAuthorizedUser']['responses'][200]['content']['application/json'];

/** ClickUp user type */
export type ClickUpUser = GetAuthorizedUserResponse['user'];

/** Parses username "First Last" into { name, surname } */
export function parseUsername(username: string): { name: string; surname: string } {
	const parts = username.trim().split(/\s+/);
	const name = parts[0] ?? '';
	const surname = parts.slice(1).join(' ') ?? '';
	return { name, surname };
}
