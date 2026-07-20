export function isTurnstileConfigured(): boolean {
	return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) return false;
	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ secret, response: token, ...(remoteip ? { remoteip } : {}) }),
	});
	const verdict = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
	if (verdict.success !== true) {
		// Without these codes a failure is indistinguishable from a wrong secret,
		// a token minted by a different widget, or a replayed token.
		console.error('Turnstile verify failed', {
			codes: verdict['error-codes'] ?? [],
			sentRemoteip: Boolean(remoteip),
		});
	}
	return verdict.success === true;
}
