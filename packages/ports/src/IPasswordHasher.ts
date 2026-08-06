/**
 * Password hashing.
 *
 * Why a port for what is one library call: two reasons that are not
 * "swappability" for its own sake. First, cost parameters are a deployment
 * concern that changes without touching code. Second, the real hasher is slow
 * by design - deliberately so - and a test suite that registers fifty accounts
 * pays that cost fifty times, which is how "we only run the auth tests before a
 * release" starts.
 *
 * Contract:
 *   - verify returns false for a malformed or foreign-algorithm hash. It never
 *     throws: a corrupt stored hash must read as "wrong password", not as a 500
 *     that tells the caller the account exists.
 *   - hash embeds its own parameters, so verify needs no configuration
 *   - needsRehash reports that a stored hash was made with weaker parameters
 *     than current policy, so a successful login can silently upgrade it
 */
export interface IPasswordHasher {
	hash(plaintext: string): Promise<string>;
	verify(plaintext: string, hash: string): Promise<boolean>;
	needsRehash(hash: string): boolean;
}

export const PASSWORD_HASHER = 'PASSWORD_HASHER';
