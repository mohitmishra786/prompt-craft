import * as assert from 'assert';
import { sanitizePrompt } from '../../sanitizer';

suite('Sanitizer Test Suite', () => {
	test('Redacts AWS Keys', () => {
		const input = "Key: AKIAIOSFODNN7EXAMPLE";
		const expected = "Key: <REDACTED_AWS_KEY>";
		assert.strictEqual(sanitizePrompt(input), expected);
	});

	test('Redacts OpenAI Keys', () => {
		const input = "API_KEY=sk-123456789012345678901234";
		const expected = "API_KEY=<REDACTED_OPENAI_KEY>";
		assert.strictEqual(sanitizePrompt(input), expected);
	});

	test('Redacts Database Passwords', () => {
		const input = "postgres://user:supersecret@localhost:5432";
		const expected = "postgres://user:<REDACTED_PASSWORD>@localhost:5432";
		assert.strictEqual(sanitizePrompt(input), expected);
	});

    test('Redacts Generic Secrets', () => {
        const input = "const SECRET_KEY = 'x8s7df8s7df8s7dfsdf'";
        const expected = "const SECRET_KEY = <REDACTED_SECRET>";
        assert.strictEqual(sanitizePrompt(input), expected);
    });

    test('Ignores Short/Safe Strings', () => {
        const input = "token = 'abc'";
        assert.strictEqual(sanitizePrompt(input), input);
    });
});
