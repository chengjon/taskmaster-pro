/**
 * @fileoverview Command Constants
 *
 * Defines all available commands and which ones trigger AI processing
 */

/**
 * Command names that trigger AI processing
 * These commands interact with AI providers
 */
export const AI_COMMAND_NAMES = [
	'add-task',
	'analyze-complexity',
	'expand-task',
	'parse-prd',
	'research',
	'research-save',
	'update-subtask',
	'update-task',
	'update-tasks'
] as const;

export type AICommand = (typeof AI_COMMAND_NAMES)[number];

/**
 * Check if a command requires AI processing
 */
export function isAICommand(command: string): command is AICommand {
	return AI_COMMAND_NAMES.includes(command as AICommand);
}
