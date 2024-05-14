import 'dotenv/config';

import { generatePassword } from '../utils/string';
import { buildUrl, decryptUrl, encryptUrl, isValidHttpUrl } from '../utils/url';

describe('buildUrl', () => {
  test('keeps "v" and "list" parameters for YouTube URLs', () => {
    const url = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be');
    expect(buildUrl(url)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('ignores irrelevant parameters for YouTube URLs', () => {
    const url = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be&extra=123');
    expect(buildUrl(url)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  test('returns original URL for Netflix as no specific parameters are handled', () => {
    const url = new URL('https://www.netflix.com/watch/80192098?trackId=200257859');
    expect(buildUrl(url)).toBe('https://www.netflix.com/watch/80192098');
  });

  test('returns unmodified URL for other domains', () => {
    const url = new URL('https://www.example.com/page?param=value&another=xyz');
    expect(buildUrl(url)).toBe('https://www.example.com/page');
  });
});

describe('isValidHttpUrl', () => {
  test('returns true for valid URLs', () => {
    const url = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be');
    expect(isValidHttpUrl(url.href)).toBe(true);
  });
  test('returns false for invalid URLs', () => {
    const url = new URL('ftp://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be');
    expect(isValidHttpUrl(url.href)).toBe(false);
  });
});

describe('encrypt and decrypt Url', () => {
  test('encrypt and decrypt URL', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be';
    const key = 'password';
    const encryptedUrl = encryptUrl(url, key);
    const decryptedUrl = decryptUrl(encryptedUrl, key);
    expect(decryptedUrl).toBe(url);
  });
});

describe('generatePassword', () => {
  test('generate password', () => {
    const password = generatePassword(10);
    expect(password.length).toBe(10);
  });
});
