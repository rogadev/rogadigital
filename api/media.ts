import { isEmailConfigured, sendEmail } from './_lib/email.js';
import { isTurnstileConfigured, verifyTurnstile } from './_lib/turnstile.js';
import { buildMediaEmail, validateMediaSubmission } from './_lib/validation.js';

function json(status: number, body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export async function POST(request: Request): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'Invalid request body.' });
	}

	const result = validateMediaSubmission(body);
	if (!result.ok) return json(400, { error: result.error });
	const data = result.data;

	// Honeypot tripped: pretend success, send nothing, don't tip off the bot.
	if (data.website !== '') return json(200, { ok: true });

	if (!isTurnstileConfigured() || !isEmailConfigured()) {
		return json(500, { error: 'The media form is temporarily unavailable.' });
	}

	const remoteip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
	if (!(await verifyTurnstile(data.token, remoteip))) {
		return json(400, { error: 'Verification failed — please try again.' });
	}

	const { subject, text } = buildMediaEmail(data, new Date().toISOString());
	if (!(await sendEmail({ subject, text, replyTo: data.email }))) {
		return json(502, { error: "Couldn't send your message — please try again in a minute." });
	}

	return json(200, { ok: true });
}
