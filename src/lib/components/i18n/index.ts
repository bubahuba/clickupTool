import { getContext } from 'svelte';
import { I18N_CONTEXT_KEY, type I18nContext } from './context.js';

export { default as I18nProvider } from './I18nProvider.svelte';
export { I18N_CONTEXT_KEY, type I18nContext };

export function getI18nContext(): I18nContext {
	return getContext(I18N_CONTEXT_KEY);
}
