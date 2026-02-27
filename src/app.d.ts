// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Paraglide JS compiles to plain JS without .d.ts - this declaration satisfies TypeScript
declare module '$lib/paraglide/messages.js' {
	export function capacity_grid_title(): string;
	export function capacity_grid_title_prediction(): string;
	export function capacity_legend_less(): string;
	export function capacity_legend_more(): string;
	export function tooltip_total(inputs?: object): string;
	export function no_time_tracked(): string;
	export function loading_timesheets(): string;
	export function error_timesheet(args: { message: string }): string;
	// Additional exports from messages - add more as needed when used
	export function welcome_dashboard(args: { name: string; surname: string }): string;
	export function user(): string;
	export function loading(): string;
	export function loading_workspace(): string;
	export function error_prefix(args: { message: string }): string;
	export function error_workspace(args: { message: string }): string;
	export function no_workspace(): string;
	export function aria_previous_month(): string;
	export function aria_next_month(): string;
	export function tasks_by_spaces_title(): string;
	export function loading_spaces(): string;
	export function loading_tasks(): string;
	export function no_spaces(): string;
	export function no_tasks(): string;
	export function edit_task(): string;
	export function task_status(): string;
	export function status_updated(): string;
	export function task_name(): string;
	export function task_name_required(): string;
	export function task_description(): string;
	export function save_task(): string;
	export function task_saved(): string;
	export function task_save_failed(): string;
	export function back_to_spaces(): string;
	export function show_in_clickup(): string;
	export function nav_dashboard(): string;
	export function nav_label(): string;
	export function comments(): string;
	export function add_comment(): string;
	export function comment_placeholder(): string;
	export function comment_required(): string;
	export function comment_added(): string;
	export function comment_add_failed(): string;
	export function no_comments(): string;
	export function assignees(): string;
	export function time_estimate(): string;
	export function time_spent(): string;
	export function hours_format(args: { hours: unknown }): string;
	export function no_assignees(): string;
	export function capacity_prediction_toggle(): string;
	export function capacity_predicted(): string;
	export function login_title(): string;
	export function login_placeholder(): string;
	export function login_submit(): string;
	export function login_error_invalid(): string;
	export function login_api_key_instructions(): string;
	export function nav_logout(): string;
}

export {};
