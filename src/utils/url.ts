import CryptoJS from 'crypto-js';

import { Hostname } from '../config';

export function isValidHttpUrl(string: string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

/**
 * Filters and retains specific search parameters in a URL.
 *
 * @param {URL} url - The URL object to process.
 * @param {Array<string>} paramsToKeep - List of parameters to retain.
 * @returns {string} - The reconstructed URL string.
 */
function filterUrlSearchParams(url: URL, paramsToKeep: string[]) {
  const searchParams = new URLSearchParams(url.search);
  const filteredParams = new URLSearchParams();

  paramsToKeep.forEach((param) => {
    const value = searchParams.get(param);
    if (value) filteredParams.set(param, value);
  });

  return filteredParams.toString() ? `?${filteredParams.toString()}` : '';
}

export function buildUrl(url: URL, keepSearch = false) {
  let queryString = '';
  switch (url.hostname) {
    case Hostname.YOUTUBE:
      queryString = filterUrlSearchParams(url, ['v', 'list']);
      break;
    case Hostname.NETFLIX:
    case Hostname.AMAZON:
    case Hostname.BILIBILI:
    case Hostname.NICOVIDEO:
    case Hostname.CRUNCHYROLL:
      queryString = '';
      break;
    default:
      if (keepSearch) {
        queryString = url.search;
      }
      break;
  }

  return `${url.protocol}//${url.host}${url.pathname}${queryString}`;
}

// For simplicity, use the "password" mode for encryption and decryption.
export function encryptUrl(url: string, key: string): string {
  return CryptoJS.AES.encrypt(url, key).toString();
}

export function decryptUrl(encryptedUrl: string, key: string): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedUrl, key);
  return decrypted.toString(CryptoJS.enc.Utf8);
}
