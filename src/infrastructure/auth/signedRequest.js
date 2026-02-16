import crypto from 'node:crypto';
import { OAUTH } from '../../config/config.js';

/**
 * Validates and decodes a signed_request from Meta.
 */
export function parseSignedRequest(signedRequest) {
	if (!signedRequest || typeof signedRequest !== 'string') return null;

	const parts = signedRequest.split('.');
	if (parts.length !== 2) return null;

	const [encodedSig, payload] = parts;

	// Decode signature
	const sig = base64UrlDecode(encodedSig);

	// Calculate expected signature
	const expectedSig = crypto.createHmac('sha256', OAUTH.clientSecret).update(payload).digest();

	// Compare signatures
	// Note: Buffer comparison handles timing attacks usually, but let's be safe
	if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig, 'binary'), expectedSig)) {
		console.warn('Invalid signed_request signature');
		return null;
	}

	// Decode payload
	try {
		const json = base64UrlDecode(payload).toString('utf8');
		return JSON.parse(json);
	} catch (err) {
		console.error('JSON parse error in signed_request', err);
		return null;
	}
}

function base64UrlDecode(str) {
	str = str.replace(/-/g, '+').replace(/_/g, '/');
	const pad = str.length % 4;
	if (pad) str += new Array(5 - pad).join('=');
	return Buffer.from(str, 'base64');
}
