import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { builderIdentity, buildEnvironment, releaseCommand, requireSigningEnvironment } from '../scripts/release-signing.mjs';

describe('release signing configuration', () => {
	it('withholds command arguments and output on signing command failure', async () => {
		await expect(releaseCommand('/usr/bin/false', ['dummy-secret'])).rejects.toThrow(
			'/usr/bin/false failed during release verification. Arguments and output were withheld to protect credentials.',
		);
	});

	it('fails closed when signed release credentials are missing or malformed', () => {
		expect(() => requireSigningEnvironment({})).toThrow('never fall back');
		expect(() => requireSigningEnvironment({ APPLE_ID: 'dummy', APPLE_TEAM_ID: 'bad', APPLE_APP_SPECIFIC_PASSWORD: 'dummy', CSC_KEYCHAIN: '/tmp/keychain' })).toThrow(
			'Apple team',
		);
		expect(requireSigningEnvironment({ APPLE_ID: 'dummy', APPLE_TEAM_ID: 'DUMMY00000', APPLE_APP_SPECIFIC_PASSWORD: 'dummy', CSC_KEYCHAIN: '/tmp/keychain' })).toEqual({
			teamId: 'DUMMY00000',
			keychain: '/tmp/keychain',
		});
	});

	it('keeps signing and release secrets out of source build processes', () => {
		const environment = {
			PATH: '/bin',
			CSC_KEYCHAIN: '/tmp/keychain',
			APPLE_ID: 'dummy',
			APPLE_TEAM_ID: 'DUMMY00000',
			APPLE_APP_SPECIFIC_PASSWORD: 'dummy',
			GH_TOKEN: 'dummy',
			GITHUB_TOKEN: 'dummy',
			BUILD_CERTIFICATE_BASE64: 'dummy',
			P12_PASSWORD: 'dummy',
			CSC_LINK: 'dummy',
			CSC_KEY_PASSWORD: 'dummy',
		};
		expect(buildEnvironment(environment)).toEqual({ PATH: '/bin', CSC_KEYCHAIN: '/tmp/keychain' });
		expect(environment.APPLE_ID).toBe('dummy');
	});

	it('selects the exact intended team through the real electron-builder identity resolver', async () => {
		const signing = createRequire(import.meta.url)('app-builder-lib/out/codeSign/macCodeSign.js');
		const previous = signing.findIdentityRawResult;
		const identity = 'Developer ID Application: Example Developer (DUMMY00000)';
		signing.findIdentityRawResult = Promise.resolve([
			'0123456789012345678901234567890123456789 "Developer ID Application: Example Developer (OTHER00000)"',
			`1234567890123456789012345678901234567890 "${identity}"`,
		]);
		try {
			expect((await signing.findIdentity('Developer ID Application', builderIdentity(identity)))?.name).toBe(identity);
			expect(builderIdentity(null)).toBeNull();
		} finally {
			signing.findIdentityRawResult = previous;
		}
	});
});
