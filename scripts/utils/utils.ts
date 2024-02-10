import { ethers } from 'hardhat';
import { promises as fs } from 'fs';
import path from 'path';
import { Wallet } from 'ethers';
import {
  ANALYSIS_FILE_NAME_PREFIX,
  ARB_DATA_PRICE,
  ARB_GAS_PRICE,
  BASE_DATA_PRICE,
  BASE_DATA_SCALER,
  BASE_GAS_PRICE,
  DATA_DIRECTORY_NAME,
  DATA_FILE_NAME_PREFIX,
  ENTRY_POINT_ADDRESS,
  ETH_PRICE,
  L1_FILE_NAME_PREFIX,
  OP_DATA_PRICE,
  OP_DATA_SCALER,
  OP_GAS_PRICE,
} from './config';
import { IEntryPoint, UserOperationStruct } from '../../typechain/erc-4337/IEntryPoint';
import brotli from 'brotli';

export const DATA_DIRECTORY = path.join(process.cwd(), DATA_DIRECTORY_NAME);

//Data structures
export type FetchedHandleUserOpCalls = {
  handleOpsCalls: HandleUserOpCall[];
  fromBlock: number;
  fromBlockTimestamp: number;
  toBlock: number;
  toBlockTimestamp: number;
};
export type HandleUserOpCall = {
  blockNumber: number;
  blockTimestamp: number;
  hash: string;
  to: string;
  from: string;
  data: string;
};
export type DataAnalysis = {
  contracts: [string, number][];
  accounts: [string, number][];
  common32: [string, number][];
  common20: [string, number][];
  common16: [string, number][];
  common8: [string, number][];
  common4: [string, number][];
};
export type HandleOpsParams = {
  ops: UserOperationStruct[];
  beneficiary: string;
};

// Functions
export async function loadData(network: string): Promise<{ data: HandleUserOpCall[]; daysSampled: number }> {
  const datas: FetchedHandleUserOpCalls[] = [];
  try {
    const file = JSON.parse(
      await fs.readFile(path.join(DATA_DIRECTORY, `${DATA_FILE_NAME_PREFIX}_${network}.json`), 'utf8'),
    );
    datas.push(...file);
  } catch (err) {}

  return {
    data: datas[0].handleOpsCalls,
    daysSampled: (datas[0].toBlockTimestamp - datas[0].fromBlockTimestamp) / (60 * 60 * 24),
  };
}
export async function recommendDictionaries(
  network: string,
  daysSampled: number,
): Promise<{ l1: string[]; l2: string[]; l3: string[] }> {
  const analysis: DataAnalysis = {
    contracts: [],
    accounts: [],
    common32: [],
    common20: [],
    common16: [],
    common8: [],
    common4: [],
  };
  try {
    const file = JSON.parse(
      await fs.readFile(path.join(DATA_DIRECTORY, `${ANALYSIS_FILE_NAME_PREFIX}_${network}.json`), 'utf8'),
    );
    analysis.contracts.push(...file.contracts);
    analysis.accounts.push(...file.accounts);
    analysis.common32.push(...file.common32);
    analysis.common20.push(...file.common20);
    analysis.common16.push(...file.common16);
    analysis.common8.push(...file.common8);
    analysis.common4.push(...file.common4);
  } catch (err) {}

  //compile items for the L1 dictionary
  const dictionaryListL1: string[] = [];
  try {
    const file = JSON.parse(
      await fs.readFile(path.join(DATA_DIRECTORY, `${L1_FILE_NAME_PREFIX}_${network}.json`), 'utf8'),
    );
    dictionaryListL1.push(...file);
  } catch (err) {}
  for (let i = 0; i < 32; i++) {
    if (dictionaryListL1.length >= 32) break;
    dictionaryListL1.push('0x' + (i + 1).toString(16).padStart(64, '0'));
  }

  //compile items for the L2 dictionary
  const dictionaryL2: [string, number][] = [];
  for (let entry of analysis.contracts) {
    if (entry[1] > daysSampled / 2) {
      const addr = '0x000000000000000000000000' + entry[0].substring(2);
      dictionaryL2.push([addr, entry[1]]);
    }
  }
  for (let entry of analysis.common32) {
    const asNum = parseInt(entry[0], 16);
    const enoughOccurences = entry[1] > daysSampled / 2;
    const notPadable = startingZeros(entry[0]) < 31;
    const notSmallMultipleOf32 = asNum < 256 || asNum >= 16640 || asNum % 32 != 0;
    if (enoughOccurences && notPadable && notSmallMultipleOf32) {
      dictionaryL2.push(entry);
    }
  }
  for (let entry of analysis.common20) {
    if (entry[1] > daysSampled / 2) dictionaryL2.push(entry);
  }
  for (let entry of analysis.common16) {
    if (entry[1] > daysSampled / 2) dictionaryL2.push(entry);
  }
  for (let entry of analysis.common8) {
    if (entry[1] > daysSampled / 2) dictionaryL2.push(entry);
  }
  for (let entry of analysis.common4) {
    if (entry[1] > daysSampled / 2) dictionaryL2.push(entry);
  }
  dictionaryL2.sort((a, b) => b[1] - a[1]);
  const dictionaryListL2: string[] = [];
  for (let item of dictionaryL2) dictionaryListL2.push(item[0]);

  //compile items for the L3 dictionary
  const dictionaryL3: [string, number][] = [];
  for (let entry of analysis.accounts) {
    dictionaryL3.push(entry);
  }
  dictionaryL3.sort((a, b) => b[1] - a[1]);
  const dictionaryListL3: string[] = [];
  for (let item of dictionaryL3) dictionaryListL3.push(item[0]);

  return {
    l1: dictionaryListL1,
    l2: dictionaryListL2,
    l3: dictionaryListL3,
  };
}
export function toBeArray(hex: string): Uint8Array {
  if (hex.indexOf('0x') == 0) hex = hex.substring(2);
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < result.length; i++) {
    const offset = i * 2;
    result[i] = parseInt(hex.substring(offset, offset + 2), 16);
  }
  return result;
}
export function startingZeros(hex: string): number {
  const data = toBeArray(hex);
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] == 0) count++;
    else break;
  }
  return count;
}
export async function serialized(calldata: string, signer: Wallet): Promise<string> {
  const tx = {
    type: 2,
    to: ENTRY_POINT_ADDRESS,
    from: signer.address,
    nonce: 138862,
    gasLimit: 1367480n,
    gasPrice: 101439936n,
    maxPriorityFeePerGas: 1000000n,
    maxFeePerGas: 103138726n,
    data: calldata,
    value: 0n,
    chainId: 10n,
    accessList: [],
  };
  return await signer.signTransaction(tx);
}
export function calcL1Gas(data: string, net: string): bigint {
  if (net == 'arbitrum') {
    const arr = ethers.toBeArray(data);
    const compressed = brotli.compress(Buffer.from(arr), {
      mode: 0, // 0 = generic, 1 = text, 2 = font (WOFF2)
      quality: 0, // 0 - 11
      lgwin: 22, // window size
    });
    const dataLength = compressed ? compressed.length : data.length;
    return BigInt(dataLength * 16);
  }
  if (net == 'base' || net == 'optimism') {
    let gas = 0n;
    for (let i = 2; i < data.length; i += 2) {
      const byte = data.substring(i, i + 2);
      if (byte == '00') gas += 4n;
      else gas += 16n;
    }
    return gas;
  }
  return 0n;
}
export function priceL1Gas(gas: bigint | number, net: string): number {
  if (net == 'arbitrum') {
    return Math.round(Number((BigInt(gas) * BigInt(ARB_DATA_PRICE) * BigInt(ETH_PRICE)) / 1_000n)) / 1_000_000;
  }
  if (net == 'base') {
    return (
      Math.round(Number((BigInt(gas) * BigInt(BASE_DATA_PRICE) * BigInt(ETH_PRICE)) / 1_000n) * BASE_DATA_SCALER) /
      1_000_000
    );
  }
  if (net == 'optimism') {
    return (
      Math.round(Number((BigInt(gas) * BigInt(OP_DATA_PRICE) * BigInt(ETH_PRICE)) / 1_000n) * OP_DATA_SCALER) /
      1_000_000
    );
  }
  return 0;
}
export function priceL2Gas(gas: bigint | number, net: string): number {
  if (net == 'arbitrum') {
    return Math.round((Number(gas) * ARB_GAS_PRICE * ETH_PRICE) / 1_000) / 1_000_000;
  }
  if (net == 'base') {
    return Math.round((Number(gas) * BASE_GAS_PRICE * ETH_PRICE) / 1_000) / 1_000_000;
  }
  if (net == 'optimism') {
    return Math.round((Number(gas) * OP_GAS_PRICE * ETH_PRICE) / 1_000) / 1_000_000;
  }
  return 0;
}
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / (60 * 60));
  const m = Math.floor(seconds / 60) - h * 60;
  const s = seconds - h * 60 * 60 - m * 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}
export function round(num: number, decimals: number = 100): number {
  return Math.round(num * decimals) / decimals;
}
export function parseHandleOps(contract: IEntryPoint, data: string): HandleOpsParams {
  const result = contract.interface.parseTransaction({ data });
  if (result) {
    const beneficiary = result.args[1].toLowerCase();
    const opResults = result.args[0];
    const ops: UserOperationStruct[] = [];
    for (let op of opResults) {
      ops.push({
        sender: op[0].toLowerCase(),
        nonce: op[1],
        initCode: op[2].toLowerCase(),
        callData: op[3].toLowerCase(),
        callGasLimit: op[4],
        verificationGasLimit: op[5],
        preVerificationGas: op[6],
        maxFeePerGas: op[7],
        maxPriorityFeePerGas: op[8],
        paymasterAndData: op[9].toLowerCase(),
        signature: op[10].toLowerCase(),
      });
    }
    return {
      ops,
      beneficiary,
    };
  }
  return {
    ops: [],
    beneficiary: '0x',
  };
}
export function hasInitcode(ops: UserOperationStruct[]): boolean {
  for (let op of ops) {
    if (op.initCode.length > 2) return true;
  }
  return false;
}
