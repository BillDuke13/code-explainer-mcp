import { describe, expect, it } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { isSecretConfigured } from '../src/index';

const ENDPOINT = 'https://example.com/';

function authHeaders(): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${env.SHARED_SECRET}`,
	};
}

function explain(code: string, language: string): Promise<Response> {
	return SELF.fetch(ENDPOINT, {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({ method: 'explainCode', params: [code, language] }),
	});
}

describe('GET info page', () => {
	it('returns an HTML info page', async () => {
		const res = await SELF.fetch(ENDPOINT);
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toContain('text/html');
		expect(await res.text()).toContain('Code Explainer MCP');
	});

	it('serves the info page for HEAD requests', async () => {
		const res = await SELF.fetch(ENDPOINT, { method: 'HEAD' });
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toContain('text/html');
	});
});

describe('authentication', () => {
	it('rejects a POST with no Authorization header', async () => {
		const res = await SELF.fetch(ENDPOINT, {
			method: 'POST',
			body: JSON.stringify({ method: 'explainCode', params: ['x', 'javascript'] }),
		});
		expect(res.status).toBe(401);
	});

	it('rejects a POST with a wrong bearer token', async () => {
		const res = await SELF.fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-secret' },
			body: JSON.stringify({ method: 'explainCode', params: ['x', 'javascript'] }),
		});
		expect(res.status).toBe(401);
	});
});

describe('explainCode contract', () => {
	it('explains JavaScript and returns markdown', async () => {
		const res = await explain('function add(a, b) { return a + b; }', 'javascript');
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toContain('application/json');
		const { result } = (await res.json()) as { result: string };
		expect(result).toContain('# Code Analysis for javascript Code');
		expect(result).toContain('## Architecture Diagram');
		expect(result).toContain('add');
	});

	it('explains Python, listing classes and def functions', async () => {
		const python = ['class Animal:', '    def speak(self):', '        return "noise"', '', 'def greet(name):', '    return name'].join(
			'\n',
		);
		const res = await explain(python, 'python');
		expect(res.status).toBe(200);
		const { result } = (await res.json()) as { result: string };
		expect(result).toContain('# Code Analysis for python Code');
		expect(result).toContain('Animal');
		// Language-aware extraction now lists Python `def` functions, not only JS-style ones.
		const mainFunctions = result.split('## Main Functions:')[1] ?? '';
		expect(mainFunctions).toContain('greet');
	});

	it('handles empty code without failing', async () => {
		const res = await explain('', 'javascript');
		expect(res.status).toBe(200);
		const { result } = (await res.json()) as { result: string };
		expect(typeof result).toBe('string');
		expect(result.length).toBeGreaterThan(0);
		expect(result).toContain('# Code Analysis for javascript Code');
		expect(result).toContain('Implementation');
	});

	it('describes network code that targets an API as a service layer', async () => {
		const res = await explain(`async function getUser(id) { return fetch('https://api.example.com/users/' + id); }`, 'javascript');
		const { result } = (await res.json()) as { result: string };
		expect(result).toContain('API or service layer');
	});

	it('uses a Python docstring as the component description', async () => {
		const python = ['def compute(value):', '    """Compute the doubled value."""', '    return value * 2'].join('\n');
		const res = await explain(python, 'python');
		const { result } = (await res.json()) as { result: string };
		expect(result).toContain('Compute the doubled value');
	});

	it('lists JavaScript arrow functions as components', async () => {
		const res = await explain('const multiply = (a, b) => a * b;', 'javascript');
		const { result } = (await res.json()) as { result: string };
		const mainFunctions = result.split('## Main Functions:')[1] ?? '';
		expect(mainFunctions).toContain('multiply');
	});
});

describe('request validation', () => {
	it('rejects an unknown method with 400', async () => {
		const res = await SELF.fetch(ENDPOINT, {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ method: 'somethingElse', params: ['x', 'javascript'] }),
		});
		expect(res.status).toBe(400);
	});

	it('rejects fewer than two params with 400', async () => {
		const res = await SELF.fetch(ENDPOINT, {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ method: 'explainCode', params: ['only-code'] }),
		});
		expect(res.status).toBe(400);
	});

	it('returns 500 with a message on malformed JSON', async () => {
		const res = await SELF.fetch(ENDPOINT, {
			method: 'POST',
			headers: authHeaders(),
			body: '{ not valid json',
		});
		expect(res.status).toBe(500);
		expect(await res.text()).toContain('Error processing request');
	});

	it('rejects non-string params with 400', async () => {
		const res = await SELF.fetch(ENDPOINT, {
			method: 'POST',
			headers: authHeaders(),
			body: JSON.stringify({ method: 'explainCode', params: [123, 'javascript'] }),
		});
		expect(res.status).toBe(400);
	});

	it('rejects code over the size limit with 413', async () => {
		const res = await explain('a'.repeat(100_001), 'javascript');
		expect(res.status).toBe(413);
	});

	it('rejects unsupported HTTP methods with 405', async () => {
		const res = await SELF.fetch(ENDPOINT, { method: 'DELETE' });
		expect(res.status).toBe(405);
		expect(res.headers.get('Allow')).toContain('POST');
	});
});

describe('isSecretConfigured (fail-closed guard)', () => {
	it('treats unset, empty, or placeholder secrets as not configured', () => {
		expect(isSecretConfigured(undefined)).toBe(false);
		expect(isSecretConfigured('')).toBe(false);
		expect(isSecretConfigured('YOUR_SECRET_KEY_HERE')).toBe(false);
	});

	it('accepts a real configured secret', () => {
		expect(isSecretConfigured('a-real-secret')).toBe(true);
	});
});
