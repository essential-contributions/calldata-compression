import hre, { ethers } from 'hardhat';
import { promises as fs } from 'fs';
import { Provider } from 'ethers';
import path from 'path';
import { ANALYSIS_FILE_NAME_PREFIX, ENTRY_POINT_ADDRESS } from './utils/config';
import { DATA_DIRECTORY, HandleUserOpCall, loadData, parseHandleOps, sleep, toBeArray } from './utils/utils';
import { splitRawCalldata } from './library/calldataUtils';

const OCCURENCE_THRESHOLD = 1;
const MAX_BATCHES_PER_RUN = 1;
const REQUEST_PAUSE = 100;

// Main script entry
async function main() {
  const provider = hre.ethers.provider;
  const providerUrl = (hre.network.config as any).url;
  const { data, daysSampled } = await loadData(hre.network.name);
  console.log('total ops: ' + data.length);
  const numSamples = Math.ceil(data.length / daysSampled);
  const numBatches = Math.ceil(daysSampled);
  const contracts: Map<string, number> = new Map<string, number>();
  const accounts: Map<string, number> = new Map<string, number>();
  const common32: Map<string, number> = new Map<string, number>();
  const common20: Map<string, number> = new Map<string, number>();
  const common16: Map<string, number> = new Map<string, number>();
  const common8: Map<string, number> = new Map<string, number>();
  const common4: Map<string, number> = new Map<string, number>();

  //scan for what has been already been processed
  const range = await claimRange(numBatches);
  if (range.start === null || range.end === null) {
    if (range.inprogress) {
      console.log('Nothing left to process.');
      console.log('Please wait for all batches to finish processing.');
      console.log('Once all batches are processed, run this script again to consolodate all files.');
    } else {
      //consolidate all files
      console.log('');
      console.log('consolidating batch files...');
      const files = await scanDirectory(DATA_DIRECTORY, `${ANALYSIS_FILE_NAME_PREFIX}_${hre.network.name}`);
      for (const file of files) {
        const results = JSON.parse(await fs.readFile(path.join(DATA_DIRECTORY, file), 'utf8'));
        for (let con of results.contracts) contracts.set(con[0], (contracts.get(con[0]) || 0) + con[1]);
        for (let acc of results.accounts) accounts.set(acc[0], (accounts.get(acc[0]) || 0) + acc[1]);
        for (let c32 of results.common32) common32.set(c32[0], (common32.get(c32[0]) || 0) + c32[1]);
        for (let c20 of results.common20) common20.set(c20[0], (common20.get(c20[0]) || 0) + c20[1]);
        for (let c16 of results.common16) common16.set(c16[0], (common16.get(c16[0]) || 0) + c16[1]);
        for (let c8 of results.common8) common8.set(c8[0], (common8.get(c8[0]) || 0) + c8[1]);
        for (let c4 of results.common4) common4.set(c4[0], (common4.get(c4[0]) || 0) + c4[1]);
      }

      //remove known smart contract accounts to accounts
      const removeForSmartContractAcct: string[] = [];
      for (let entry of contracts) {
        const accountCount = accounts.get(entry[0]);
        if (accountCount) {
          console.log(`moving ${entry[0]} to accounts`);
          accounts.set(entry[0], accountCount + entry[1]);
          removeForSmartContractAcct.push(entry[0]);
        }
      }
      for (let r of removeForSmartContractAcct) {
        contracts.delete(r);
      }

      //write to file
      console.log('');
      console.log('writting to file...');
      const filename = `${ANALYSIS_FILE_NAME_PREFIX}_${hre.network.name}.json`;
      await writeToFile(filename, contracts, accounts, common32, common20, common16, common8, common4);

      //delete batch files
      console.log('');
      console.log('clearing batch files...');
      try {
        for (const file of files) fs.unlink(path.join(DATA_DIRECTORY, file));
      } catch (e) {}
    }
  } else {
    console.log('processing for batch ' + range.start + ' to ' + range.end);
    for (let i = range.start; i < range.end + 1; i++) {
      console.log('processing batch ' + i);
      const start = i * numSamples;
      const end = Math.min((i + 1) * numSamples, data.length);
      const results = await processInterestingItems(data, start, end, provider, providerUrl);
      for (let con of results.contracts) contracts.set(con[0], (contracts.get(con[0]) || 0) + con[1]);
      for (let acc of results.accounts) accounts.set(acc[0], (accounts.get(acc[0]) || 0) + acc[1]);
      for (let c32 of results.common32) common32.set(c32[0], (common32.get(c32[0]) || 0) + c32[1]);
      for (let c20 of results.common20) common20.set(c20[0], (common20.get(c20[0]) || 0) + c20[1]);
      for (let c16 of results.common16) common16.set(c16[0], (common16.get(c16[0]) || 0) + c16[1]);
      for (let c8 of results.common8) common8.set(c8[0], (common8.get(c8[0]) || 0) + c8[1]);
      for (let c4 of results.common4) common4.set(c4[0], (common4.get(c4[0]) || 0) + c4[1]);
    }

    //clear in progress file
    try {
      fs.unlink(path.join(DATA_DIRECTORY, range.progressfile));
    } catch (e) {}

    //write to file
    console.log('');
    console.log('writting to file...');
    await writeToFile(range.finishedfile, contracts, accounts, common32, common20, common16, common8, common4);
  }
}

//Identify interesting bits
async function processInterestingItems(
  data: HandleUserOpCall[],
  start: number,
  end: number,
  provider: Provider,
  providerUrl?: string,
): Promise<ProcessResults> {
  console.log(`processing for common data items`);
  const contracts = new Map<string, number>();
  const accounts = new Map<string, number>();
  const addresses = new Map<string, number>();
  const commondatas: Uint8Array[] = [];
  const contract = await hre.ethers.getContractAt('IEntryPoint', ENTRY_POINT_ADDRESS);
  for (let i = start; i < end; i++) {
    if ((i - start) % 1000 == 0) console.log(`collecting data ${i - start} of ${end - start}`);
    const params = parseHandleOps(contract, data[i].data);
    if (params.ops.length > 0) {
      if (params.beneficiary != '0x') {
        addresses.set(params.beneficiary, 0);
      } else {
        addresses.set(data[i].from, 0);
      }

      for (let op of params.ops) {
        const sender = op.sender.toString();
        accounts.set(sender, 0);

        const paymaster = op.paymasterAndData.toString().substring(0, 42);
        if (paymaster != '0x') contracts.set(paymaster, 0);
      }
    }
    commondatas.push(...splitRawCalldata(data[i].data));
  }

  //find interesting occurences
  console.log(`analyizing 32 byte occurences in common data`);
  const startTime = new Date().getTime();
  const occurences = new Map<string, number>();
  const bytelength = 32;
  for (let i = 0; i < commondatas.length; i++) {
    if (i % 1000 == 0) console.log(`checking data ${i} of ${commondatas.length}`);
    for (let j = 0; j < commondatas[i].length - bytelength; j++) {
      const startZeros = startingZeros(commondatas[i], j, j + bytelength);
      const nonZ = nonZeros(commondatas[i], j, j + bytelength);

      const possibleAddress = startZeros >= 12 && startZeros < 20 && nonZ >= 10;
      const somethingInteresting = nonZ >= 28;
      const eightByte = startZeros >= 24 && startZeros < 32;

      if (possibleAddress || somethingInteresting || eightByte) {
        const slice = commondatas[i].slice(j, j + bytelength);
        const hex = hre.ethers.hexlify(slice);
        if (!occurences.has(hex)) {
          let count = countOccurences(slice, commondatas[i], j + bytelength, commondatas[i].length);
          for (let i2 = i + 1; i2 < commondatas.length; i2++) {
            count += countOccurences(slice, commondatas[i2], 0, commondatas[i2].length);
          }
          if (count > OCCURENCE_THRESHOLD) occurences.set(hex, count);
        }
      }
    }
  }

  //remove items that are already in contracts, accounts, addresses
  const removeForAlreadyKnown: string[] = [];
  for (let entry of occurences) {
    const addr = '0x' + entry[0].substring(26);
    const contractCount = contracts.get(addr);
    const accountCount = accounts.get(addr);
    const addressCount = addresses.get(addr);
    if (contractCount) {
      console.log(`removing ${entry[0]} because it is a known contract`);
      contracts.set(addr, contractCount + entry[1]);
      removeForAlreadyKnown.push(entry[0]);
    } else if (accountCount) {
      console.log(`removing ${entry[0]}  because it is a known account`);
      accounts.set(addr, accountCount + entry[1]);
      removeForAlreadyKnown.push(entry[0]);
    } else if (addressCount) {
      console.log(`removing ${entry[0]}  because it is a known address`);
      addresses.set(addr, addressCount + entry[1]);
      removeForAlreadyKnown.push(entry[0]);
    }
  }
  for (let r of removeForAlreadyKnown) {
    occurences.delete(r);
  }

  //check if items that look like addresses are addresses (has nonce, or code)
  console.log(`checking if any items are contracts or EOAs`);
  const removeForKnownAddress: string[] = [];
  for (let entry of occurences) {
    const data = toBeArray(entry[0]);
    const startZeros = startingZeros(data, 0, data.length);
    const nonZ = nonZeros(data, 0, data.length);

    if (startZeros >= 12 && startZeros < 20 && nonZ >= 10) {
      const addr = '0x' + entry[0].substring(26);
      const hasCode = await checkCode(provider, addr, providerUrl);
      await sleep(REQUEST_PAUSE);
      if (hasCode) {
        console.log(`identified contract ${entry[0]}`);
        contracts.set(addr, entry[1]);
        removeForKnownAddress.push(entry[0]);
      } else {
        const txCount = await transactionCount(provider, addr);
        await sleep(REQUEST_PAUSE);
        if (txCount > 0) {
          console.log(`identified account ${entry[0]}`);
          accounts.set(addr, entry[1]);
          removeForKnownAddress.push(entry[0]);
        }
      }
    }
  }
  for (let r of removeForKnownAddress) {
    occurences.delete(r);
  }
  for (let entry of addresses) {
    const addr = entry[0];
    const hasCode = await checkCode(provider, addr, providerUrl);
    await sleep(REQUEST_PAUSE);
    if (hasCode) {
      console.log(`identified contract ${entry[0]}`);
      contracts.set(entry[0], entry[1]);
    } else {
      console.log(`identified account ${entry[0]}`);
      accounts.set(entry[0], entry[1]);
    }
  }
  addresses.clear();

  //check for collisions after removing leading zeros
  console.log(`filtering identified items`);
  const removeForLeadingZeroCollision: string[] = [];
  for (let entry1 of occurences) {
    let zr = entry1[0];
    while (zr.indexOf('0x00') == 0) {
      let removeMe = false;
      zr = '0x' + zr.substring(4);
      const zrp = zr.padEnd(66, '0');
      for (let entry2 of occurences) {
        if (entry2[0] != zrp && entry2[0].indexOf(zr) == 0 && entry2[1] >= entry1[1]) {
          console.log(`removing ${entry1[0]} because of ${entry2[0]}`);
          removeMe = true;
          break;
        }
      }
      if (removeMe) {
        removeForLeadingZeroCollision.push(entry1[0]);
        break;
      }
    }
  }
  for (let r of removeForLeadingZeroCollision) {
    occurences.delete(r);
  }

  //go down the list in order of most common, remove if they can no longer be found
  const occurencesSorted = [...occurences.entries()].sort((a, b) => b[1] - a[1]);
  for (let a of contracts) split(toBeArray(a[0]), commondatas);
  for (let a of accounts) split(toBeArray(a[0]), commondatas);
  for (let i = 0; i < occurencesSorted.length; i++) {
    if (!split(toBeArray(occurencesSorted[i][0]), commondatas)) {
      console.log(`removing ${occurencesSorted[i][0]} because it became irrelevant`);
      occurencesSorted.splice(i, 1);
      i--;
    }
  }

  //scan for possible 20 byte address occurences
  console.log(`analyizing 20 byte occurences in common data`);
  const occurencesAddr = new Map<string, number>();
  const bytelengthAddr = 20;
  for (let i = 0; i < commondatas.length; i++) {
    if (i % 1000 == 0) console.log(`checking data ${i} of ${commondatas.length}`);
    for (let j = 0; j < commondatas[i].length - bytelengthAddr; j++) {
      const nonZ = nonZeros(commondatas[i], j, j + bytelengthAddr);
      if (nonZ > bytelengthAddr / 2) {
        const slice = commondatas[i].slice(j, j + bytelengthAddr);
        const hex = hre.ethers.hexlify(slice);
        if (!occurencesAddr.has(hex)) {
          let count = countOccurences(slice, commondatas[i], j + bytelengthAddr, commondatas[i].length);
          for (let i2 = i + 1; i2 < commondatas.length; i2++) {
            count += countOccurences(slice, commondatas[i2], 0, commondatas[i2].length);
          }
          if (count > OCCURENCE_THRESHOLD) occurencesAddr.set(hex, count);
        }
      }
    }
  }

  //remove anything that is not a contract address
  const removeForNonContract: string[] = [];
  for (let entry of occurencesAddr) {
    const hasCode = await checkCode(provider, entry[0], providerUrl);
    await sleep(REQUEST_PAUSE);
    if (!hasCode) {
      console.log(`removing ${entry[0]} because it is not a contract`);
      removeForNonContract.push(entry[0]);
    }
  }
  for (let r of removeForNonContract) {
    occurencesAddr.delete(r);
  }

  //scan for smaller possible occurences
  console.log(`analyizing smaller byte occurences in common data`);
  const occurences16Sorted = occurencesAtByteLength(commondatas, 16);
  const occurences8Sorted = occurencesAtByteLength(commondatas, 8);
  const occurences4Sorted = occurencesAtByteLength(commondatas, 4);

  //finish
  const elapsed = new Date().getTime() - startTime;
  console.log(`finished in ${elapsed}ms`);
  const contractsSorted = [...contracts.entries()].sort((a, b) => b[1] - a[1]);
  const accountsSorted = [...accounts.entries()].sort((a, b) => b[1] - a[1]);
  const occurences20Sorted = [...occurencesAddr.entries()].sort((a, b) => b[1] - a[1]);
  return {
    contracts: contractsSorted,
    accounts: accountsSorted,
    common32: occurencesSorted,
    common20: occurences20Sorted,
    common16: occurences16Sorted,
    common8: occurences8Sorted,
    common4: occurences4Sorted,
  };
}

//Small utils
function nonZeros(data: Uint8Array, start: number, end: number): number {
  let count = 0;
  for (let i = start; i < end; i++) {
    if (data[i] > 0) count++;
  }
  return count;
}
function startingZeros(data: Uint8Array, start: number, end: number): number {
  let count = 0;
  for (let i = start; i < end; i++) {
    if (data[i] == 0) count++;
    else break;
  }
  return count;
}
function countOccurences(search: Uint8Array, data: Uint8Array, start: number, end: number): number {
  let count = 0;
  for (let i = start; i < end - search.length; i += 1) {
    let match = true;
    for (let j = 0; j < search.length; j++) {
      if (search[j] != data[i + j]) {
        match = false;
        break;
      }
    }
    if (match) {
      i += search.length - 1;
      count++;
    }
  }
  return count;
}
function split(search: Uint8Array, datas: Uint8Array[]): boolean {
  let found = false;
  for (let i = 0; i < datas.length; i++) {
    let splitResult = splitOne(search, datas[i]);
    if (splitResult.length == 0) {
      datas.splice(i, 1);
      found = true;
      i--;
    }
    if (splitResult.length > 0) {
      const startingLength = datas[i].length;
      datas.splice(i, 1, ...splitResult);
      if (startingLength != splitResult[0].length) {
        found = true;
        i--;
      }
    }
  }
  return found;
}
function splitOne(search: Uint8Array, data: Uint8Array): Uint8Array[] {
  for (let j = 0; j < data.length - search.length; j++) {
    let match = true;
    for (let k = 0; k < search.length; k++) {
      if (search[k] != data[j + k]) {
        match = false;
        break;
      }
    }
    if (match) {
      const splitResult: Uint8Array[] = [];
      if (j > 0) splitResult.push(data.slice(0, j));
      if (j < data.length - search.length - 1) splitResult.push(data.slice(j + search.length));
      return splitResult;
    }
  }
  return [data];
}
function occurencesAtByteLength(commondatas: Uint8Array[], bytelength: number) {
  //scan for duplicate occurences
  const occurences = new Map<string, number>();
  for (let i = 0; i < commondatas.length; i++) {
    if (i % 1000 == 0) console.log(`checking data ${i} of ${commondatas.length}`);
    for (let j = 0; j < commondatas[i].length - bytelength; j++) {
      const nonZ = nonZeros(commondatas[i], j, j + bytelength);
      if (nonZ > bytelength / 2) {
        const slice = commondatas[i].slice(j, j + bytelength);
        const hex = hre.ethers.hexlify(slice);
        if (!occurences.has(hex)) {
          let count = countOccurences(slice, commondatas[i], j + bytelength, commondatas[i].length);
          for (let i2 = i + 1; i2 < commondatas.length; i2++) {
            count += countOccurences(slice, commondatas[i2], 0, commondatas[i2].length);
          }
          if (count > OCCURENCE_THRESHOLD) occurences.set(hex, count);
        }
      }
    }
  }

  //go down the list in order of most common, remove if they can no longer be found
  const occurencesSorted = [...occurences.entries()].sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < occurencesSorted.length; i++) {
    if (!split(toBeArray(occurencesSorted[i][0]), commondatas)) {
      console.log(`removing ${occurencesSorted[i][0]} because it became irrelevant`);
      occurencesSorted.splice(i, 1);
      i--;
    }
  }
  return occurencesSorted;
}
async function writeToFile(
  filename: string,
  contracts: Map<string, number>,
  accounts: Map<string, number>,
  common32: Map<string, number>,
  common20: Map<string, number>,
  common16: Map<string, number>,
  common8: Map<string, number>,
  common4: Map<string, number>,
) {
  const result = {
    contracts: [...contracts.entries()].sort((a, b) => b[1] - a[1]),
    accounts: [...accounts.entries()].sort((a, b) => b[1] - a[1]),
    common32: [...common32.entries()].sort((a, b) => b[1] - a[1]),
    common20: [...common20.entries()].sort((a, b) => b[1] - a[1]),
    common16: [...common16.entries()].sort((a, b) => b[1] - a[1]),
    common8: [...common8.entries()].sort((a, b) => b[1] - a[1]),
    common4: [...common4.entries()].sort((a, b) => b[1] - a[1]),
  };
  const NUM_RETRIES = 8;
  const w = async (retries: number) => {
    if (retries > 0) {
      try {
        await fs.writeFile(path.join(DATA_DIRECTORY, filename), JSON.stringify(result, null, 2));
      } catch (e) {
        await sleep(5_000 + Math.round(Math.random() * 10_000));
        await w(retries - 1);
      }
    }
  };
  await w(NUM_RETRIES);
}
async function scanDirectory(directory: string, filename: string): Promise<string[]> {
  const files = await fs.readdir(directory);
  const found: string[] = [];
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fs.stat(filePath);
    if (!stat.isDirectory() && file.indexOf(filename) == 0) found.push(file);
  }
  return found;
}
function multiSplit(str: string, separators: string[]): string[] {
  let parts: string[] = [str];
  for (const separator of separators) {
    const newParts: string[] = [];
    for (const part of parts) newParts.push(...part.split(separator));
    parts = [...newParts];
  }
  return parts;
}
async function claimRange(numBatches: number): Promise<{
  start: number | null;
  end: number | null;
  finishedfile: string;
  progressfile: string;
  inprogress: boolean;
}> {
  let inprogress = false;
  let batchesProcessed: boolean[] = [];
  for (let i = 0; i < numBatches; i++) batchesProcessed[i] = false;

  //scan files to determine what's already being processed
  const files = await scanDirectory(DATA_DIRECTORY, `${ANALYSIS_FILE_NAME_PREFIX}_${hre.network.name}`);
  for (let file of files) {
    const donefile = `${ANALYSIS_FILE_NAME_PREFIX}_${hre.network.name}.json`;
    if (file == donefile) throw new Error(`Data for ${hre.network.name} has already been processed (${donefile})`);

    const split: string[] = multiSplit(file, ['][', '[', ']']);
    if (split.length == 4) {
      if (split[2] != 'inprogress') throw new Error(`Bad filename: ${file}`);
      inprogress = true;
    }
    if (split.length < 3 || split.length > 4) throw new Error(`Bad filename: ${file}`);

    const range = split[1].split('-');
    if (range.length < 1 || range.length > 2 || isNaN(Number(range[0]))) throw new Error(`Bad filename: ${file}`);
    if (range.length == 2) {
      const start = Number(range[0]);
      const end = Number(range[1]);
      if (isNaN(end) || start > end) throw new Error(`Bad filename: ${file}`);
      for (let i = start; i < end + 1; i++) batchesProcessed[i] = true;
    } else {
      const num = Number(range[0]);
      batchesProcessed[num] = true;
    }
  }

  //determine a range to process
  let start = -1;
  for (let i = 0; i < numBatches; i++) {
    if (!batchesProcessed[i]) {
      start = i;
      break;
    }
  }
  let end = -1;
  for (let i = start + 1; i < numBatches; i++) {
    if (!batchesProcessed[i]) end = i;
    else break;
  }
  if (end == -1) end = start;
  if (end + 1 - start > MAX_BATCHES_PER_RUN) end = start + MAX_BATCHES_PER_RUN - 1;

  if (start == -1 || end == -1) {
    return { start: null, end: null, finishedfile: '', progressfile: '', inprogress };
  } else {
    //write file to claim processing our range
    const finishedfile =
      start == end
        ? `${ANALYSIS_FILE_NAME_PREFIX}_${hre.network.name}[${start}].json`
        : `${ANALYSIS_FILE_NAME_PREFIX}_${hre.network.name}[${start}-${end}].json`;
    const progressfile = finishedfile.replace('.json', '[inprogress].json');
    await fs.writeFile(path.join(DATA_DIRECTORY, progressfile), '');
    return { start, end, finishedfile, progressfile, inprogress };
  }
}
async function checkCode(provider: Provider, address: string, providerUrl?: string): Promise<boolean> {
  const NUM_RETRIES = 8;
  const c = async (retries: number, provider: Provider): Promise<boolean> => {
    try {
      return (await provider.getCode(address)).length > 2;
    } catch (e) {
      if (retries == 0) throw e;

      if (providerUrl) provider = new ethers.JsonRpcProvider(providerUrl);
      await sleep(1_000 + Math.round(Math.random() * 50_000));
      return await c(retries - 1, provider);
    }
  };
  return await c(NUM_RETRIES, provider);
}
async function transactionCount(provider: Provider, address: string, providerUrl?: string): Promise<number> {
  const NUM_RETRIES = 8;
  const t = async (retries: number): Promise<number> => {
    try {
      return await provider.getTransactionCount(address);
    } catch (e) {
      if (retries == 0) throw e;

      if (providerUrl) provider = new ethers.JsonRpcProvider(providerUrl);
      await sleep(1_000 + Math.round(Math.random() * 5_000));
      return await t(retries - 1);
    }
  };
  return await t(NUM_RETRIES);
}

// Data
type ProcessResults = {
  contracts: [string, number][];
  accounts: [string, number][];
  common32: [string, number][];
  common20: [string, number][];
  common16: [string, number][];
  common8: [string, number][];
  common4: [string, number][];
};

// Start script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
