import { ethers } from 'hardhat';
import { promises as fs } from 'fs';
import path from 'path';
import { Wallet } from 'ethers';
import {
  ANALYSIS_FILE_NAME_PREFIX,
  ARB_DATA_PRICE,
  ARB_GAS_PRICE,
  DATA_DIRECTORY_NAME,
  DATA_FILE_NAME_PREFIX,
  ENTRY_POINT_ADDRESS,
  ETH_PRICE,
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
      await fs.readFile(path.join(DATA_DIRECTORY, `${DATA_FILE_NAME_PREFIX}_${network}.json`), 'utf8')
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
  daysSampled: number
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
      await fs.readFile(path.join(DATA_DIRECTORY, `${ANALYSIS_FILE_NAME_PREFIX}_${network}.json`), 'utf8')
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
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000001');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000002');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000003');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000004');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000005');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000006');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000007');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000008');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000009');
  dictionaryListL1.push('0x000000000000000000000000000000000000000000000000000000000000000a');
  dictionaryListL1.push('0x000000000000000000000000000000000000000000000000000000000000000b');
  dictionaryListL1.push('0x000000000000000000000000000000000000000000000000000000000000000c');
  dictionaryListL1.push('0x000000000000000000000000000000000000000000000000000000000000000d');
  dictionaryListL1.push('0x000000000000000000000000000000000000000000000000000000000000000e');
  dictionaryListL1.push('0x000000000000000000000000000000000000000000000000000000000000000f');
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000041'); //common signature length
  dictionaryListL1.push('0x1b00000000000000000000000000000000000000000000000000000000000000'); //common signature ending
  dictionaryListL1.push('0x1c00000000000000000000000000000000000000000000000000000000000000'); //common signature ending
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000020'); //common offset
  dictionaryListL1.push('0x0000000000000000000000000000000000000000000000000000000000000040'); //common offset

  dictionaryListL1.push('0x000000000000000000000000Fd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'.toLowerCase());
  dictionaryListL1.push('0x000000000000000000000000FF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'.toLowerCase());
  dictionaryListL1.push('0x000000000000000000000000af88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase());
  dictionaryListL1.push('0x000000000000000000000000f97f4df75117a78c1A5a0DBb814Af92458539FB4'.toLowerCase());
  dictionaryListL1.push('0x0000000000000000000000002f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'.toLowerCase());
  dictionaryListL1.push('0x000000000000000000000000Fa7F8980b0f1E64A2062791cc3b0871572f1F7f0'.toLowerCase());
  dictionaryListL1.push('0x000000000000000000000000DA10009cBd5D07dd0CeCc66161FC93D7c9000da1'.toLowerCase());
  dictionaryListL1.push('0x00000000000000000000000013Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60'.toLowerCase());
  dictionaryListL1.push('0x000000000000000000000000912CE59144191C1204E64559FE8253a0e49E6548'.toLowerCase());
  /*
  dictionaryListL1.push('0x00000000000000000000000094b008aA00579c1307B0EF2c499aD98a8ce58e58'.toLowerCase()); //tether
  dictionaryListL1.push('0x0000000000000000000000000b2C639c533813f4Aa9D7837CAf62653d097Ff85'.toLowerCase()); //usdc
  dictionaryListL1.push('0x0000000000000000000000007F5c764cBc14f9669B88837ca1490cCa17c31607'.toLowerCase()); //usdc bridged
  dictionaryListL1.push('0x000000000000000000000000350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6'.toLowerCase()); //chainlink
  dictionaryListL1.push('0x00000000000000000000000068f180fcCe6836688e9084f035309E29Bf0A2095'.toLowerCase()); //wrapped btc
  dictionaryListL1.push('0x000000000000000000000000DA10009cBd5D07dd0CeCc66161FC93D7c9000da1'.toLowerCase()); //dai
  dictionaryListL1.push('0x000000000000000000000000Fdb794692724153d1488CcdBE0C56c252596735F'.toLowerCase()); //lido
  dictionaryListL1.push('0x0000000000000000000000004200000000000000000000000000000000000006'.toLowerCase()); //wrapped ether
  dictionaryListL1.push('0x0000000000000000000000004200000000000000000000000000000000000016'.toLowerCase()); //bridge
  */
  dictionaryListL1.push('0x1fad948c'); //handleOps fn sel
  dictionaryListL1.push('0x51945447');
  dictionaryListL1.push('0x0000189a');

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
  if (net == 'optimism') {
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
