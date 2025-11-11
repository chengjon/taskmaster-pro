/**
 * @fileoverview Rules Actions Constants
 *
 * Defines actions for rule management commands
 */

export type RulesAction = 'add' | 'remove';

/**
 * Individual rules action constants
 */
export const RULES_ACTIONS = {
	ADD: 'add' as const,
	REMOVE: 'remove' as const
} as const;

/**
 * Special rules command (not a CRUD operation)
 */
export const RULES_SETUP_ACTION = 'setup' as const;

/**
 * All valid rules actions
 */
export const RULES_ACTION_VALUES: RulesAction[] = Object.values(
	RULES_ACTIONS
);

/**
 * Check if a given action is a valid rules action
 */
export function isValidRulesAction(action: unknown): action is RulesAction {
	if (typeof action !== 'string') return false;
	return RULES_ACTION_VALUES.includes(action as RulesAction);
}
