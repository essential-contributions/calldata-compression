import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';
import { DATA_DIRECTORY, sleep } from './utils/utils';
import { FUNCTION_SIGNATURES_FILE, SIGNATURES_4BYTE_FILE_NAME } from './utils/config';

const HOST_NAME = 'www.4byte.directory';
const START_PATH = '/api/v1/signatures/?format=json';
const CURTESY_DELAY_MS = 1000;

type Signature = {
  id: number;
  text_signature: string;
  bytes_signature: string;
  hex_signature: string;
};

// Main script entry
async function main() {
  console.log(`Fetching 4byte signature data...`);
  let signatures: Signature[] = [];
  let results: Results | null = null;
  for (let i = 0; true; i++) {
    const apiPath = results ? results.next : START_PATH;
    if (apiPath === null) break;

    results = await fetch(apiPath);
    signatures.push(...results.results);

    await sleep(CURTESY_DELAY_MS);
    console.log(`fetched page ${i} of ${Math.ceil(results.count / 100)}`);
  }

  console.log(`dumping data...`);
  await fs.writeFile(
    path.join(DATA_DIRECTORY, `${SIGNATURES_4BYTE_FILE_NAME}.json`),
    JSON.stringify(signatures, null, 2),
  );

  console.log(`Writting data to file...`);
  const function_signatures: string[] = [];
  for (const sig of signatures) {
    const parts = splitSignature(sig.text_signature);
    if (parts.params != '()' && parts.params.indexOf('fixed') == -1 && parts.params.indexOf('bool256') == -1) {
      const fnsel = sig.hex_signature.substring(2);
      let compressedParams = parts.params;
      compressedParams = compressedParams.split('address').join('a');
      compressedParams = compressedParams.split('bool').join('o');
      compressedParams = compressedParams.split('string').join('s');
      compressedParams = compressedParams.split('bytes').join('b');
      compressedParams = compressedParams.split('uint').join('u');
      compressedParams = compressedParams.split('int').join('i');
      function_signatures.push(fnsel + compressedParams);
    }
  }
  await fs.writeFile(FUNCTION_SIGNATURES_FILE, JSON.stringify(signatures, null, 2));
}

// Makes an http fetch
function fetch(apiPath: string) {
  const options = {
    hostname: HOST_NAME,
    path: apiPath,
    method: 'GET',
  };
  return new Promise<Results>((resolve, reject) => {
    var req = https.request(options, (res) => {
      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode));
      }
      var body: string[] = [];
      res.on('data', (chunk: string) => {
        body.push(chunk);
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body.join('')));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

// Utils
function splitSignature(signature: string): { name: string; params: string } {
  const firstParen = signature.indexOf('(');
  if (firstParen > -1 && signature[signature.length - 1] == ')') {
    return { name: signature.substring(0, firstParen), params: signature.substring(firstParen) };
  }
  throw new Error('Invalid signature text');
}

// Data
type Results = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Signature[];
};

// Start script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
