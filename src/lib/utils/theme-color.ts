/**
 * Status bar colour for the installed app (Android takes it from
 * `<meta name="theme-color">`). Matches the header, `--topbar-bg` in
 * routes/layout.css, so the bar and the header read as one surface.
 *
 * The pre-paint script in app.html repeats these values: it runs before any
 * module loads and cannot import them.
 */
export const THEME_COLOR = {
	light: '#ffffff',
	dark: '#1b150f'
} as const;

/**
 * Points every theme-color meta at the active theme. app.html ships one per
 * `prefers-color-scheme`; a theme picked in the settings has to override both,
 * or the OS preference would still win.
 */
export function syncThemeColor(
	dark: boolean,
	root: Pick<Document, 'querySelectorAll'> = document
): void {
	const color = dark ? THEME_COLOR.dark : THEME_COLOR.light;
	for (const meta of root.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
		meta.content = color;
	}
}
