/**
 * An intentional business-rule or authorization violation. Its message is written for users and is safe to show. Anything that is not a ClinicRuleError (database errors, TypeErrors, bugs) stays internal.
 */
export class ClinicRuleError extends Error {
  constructor(message) { super(message); this.name = 'ClinicRuleError'; }
}
export const isClinicRuleError = (error) => error instanceof ClinicRuleError;
