/**
 * Bumped whenever a change is shipped, and shown in the header.
 *
 * Deliberately a plain constant rather than something derived from git at build
 * time: `define` is not applied to bare globals by the dev server, and env vars
 * set in the config do not reach the browser in dev - both fail exactly where
 * this marker is needed, and one of them blanks the page.
 */
export const BUILD_ID = '2026-09-11f'
