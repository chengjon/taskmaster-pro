/**
 * @fileoverview Rule Profiles Constants
 *
 * Defines all available rule profiles for different IDEs and editors
 */

export type RulesProfile =
	| 'amp'
	| 'claude'
	| 'cline'
	| 'codex'
	| 'cursor'
	| 'gemini'
	| 'kiro'
	| 'opencode'
	| 'kilo'
	| 'roo'
	| 'trae'
	| 'vscode'
	| 'windsurf'
	| 'zed';

/**
 * Available rule profiles for project initialization and rules command
 *
 * ⚠️  SINGLE SOURCE OF TRUTH: This is the authoritative list of all supported rule profiles.
 * This constant is used directly throughout the codebase.
 *
 * Defines possible rule profile sets:
 * - amp: Amp Code integration
 * - claude: Claude Code integration
 * - cline: Cline IDE rules
 * - codex: Codex integration
 * - cursor: Cursor IDE rules
 * - gemini: Gemini integration
 * - kiro: Kiro IDE rules
 * - opencode: OpenCode integration
 * - kilo: Kilo Code integration
 * - roo: Roo Code IDE rules
 * - trae: Trae IDE rules
 * - vscode: VS Code with GitHub Copilot integration
 * - windsurf: Windsurf IDE rules
 * - zed: Zed IDE rules
 *
 * To add a new rule profile:
 * 1. Add the profile name to this array
 * 2. Create a profile file in src/modules/config/profiles/{profile}.ts
 * 3. Export it in packages/tm-core/src/modules/config/profiles/index.ts
 */
export const RULE_PROFILES: RulesProfile[] = [
	'amp',
	'claude',
	'cline',
	'codex',
	'cursor',
	'gemini',
	'kiro',
	'opencode',
	'kilo',
	'roo',
	'trae',
	'vscode',
	'windsurf',
	'zed'
];

/**
 * Centralized enum for all supported Roo agent modes
 * Available Roo Code IDE modes for rule generation
 */
export type RooMode = 'architect' | 'ask' | 'orchestrator' | 'code' | 'debug' | 'test';

export const ROO_MODES: RooMode[] = [
	'architect',
	'ask',
	'orchestrator',
	'code',
	'debug',
	'test'
];

/**
 * Check if a given rule profile is valid
 */
export function isValidRulesProfile(
	rulesProfile: unknown
): rulesProfile is RulesProfile {
	if (typeof rulesProfile !== 'string') return false;
	return RULE_PROFILES.includes(rulesProfile as RulesProfile);
}

/**
 * Check if a given Roo mode is valid
 */
export function isValidRooMode(mode: unknown): mode is RooMode {
	if (typeof mode !== 'string') return false;
	return ROO_MODES.includes(mode as RooMode);
}
