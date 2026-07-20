// The ONLY place the destination address exists. Never move this to src/.
const TO_ADDRESS = 'ryan@roga.dev';
const FROM_ADDRESS = 'Roga Digital <ryan@roga.dev>';

export function isEmailConfigured(): boolean {
	return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(options: {
	subject: string;
	text: string;
	replyTo: string;
}): Promise<boolean> {
	const key = process.env.RESEND_API_KEY;
	if (!key) return false;
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			from: FROM_ADDRESS,
			to: [TO_ADDRESS],
			reply_to: options.replyTo,
			subject: options.subject,
			text: options.text,
		}),
	});
	if (!res.ok) console.error('Resend send failed', res.status, await res.text());
	return res.ok;
}
