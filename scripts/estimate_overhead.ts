import hre from 'hardhat';
import { ContractTransactionResponse } from 'ethers';
import {
  calcL1Gas,
  formatTime,
  loadData,
  parseHandleOps,
  priceL1Gas,
  priceL2Gas,
  recommendDictionaries,
  round,
} from './utils/utils';
import {
  deployGeneralStaticRegistry,
  generateGeneralStaticRegistryDeployCode,
  splitDictionary,
} from './library/generalStaticRegistry';
import {
  deployGeneralCalldataCompression,
  generateGeneralCalldataCompressionDeployCode,
} from './library/generalCalldataCompression';
import { CalldataCompression } from './library/calldataCompression';
import { ENTRY_POINT_ADDRESS } from './utils/config';

const NUM_SAMPLES = 100;
const SAMPLE_FROM_NETWORKS = ['arbitrum', 'optimism'];

// Main script entry
async function main() {
  let timestart = new Date().getTime();
  const provider = hre.ethers.provider;
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  for (const n of SAMPLE_FROM_NETWORKS) {
    console.log(`Estimating for ${n}`);

    const { data, daysSampled } = await loadData(n);
    if (data.length == 0) {
      console.log(`No data for ${n}`);
      console.log(`Skipping to next n...`);
      console.log('');
      continue;
    }
    const dictionaries = await recommendDictionaries(n, daysSampled);
    if (dictionaries.l1.length == 0 || dictionaries.l2.length == 0 || dictionaries.l3.length == 0) {
      console.log(`No analysis for ${n}`);
      console.log(`Skipping to next network...`);
      console.log('');
      continue;
    }

    //get compression results
    console.log(`[${n}] L1 dictionary length: ${dictionaries.l1.length}`);
    console.log(`[${n}] L2 dictionary length: ${dictionaries.l2.length}`);
    console.log(`[${n}] L3 dictionary length: ${dictionaries.l3.length}`);
    console.log('');

    //deploy contracts
    console.log('Deploying contracts...');
    const entrypoint = await hre.ethers.deployContract('EntryPointTester', [100], deployer);
    const entrypointAddress = await entrypoint.getAddress();

    const multiplesRegistry = await hre.ethers.deployContract('MultiplesStaticRegistry', deployer);
    const multiplesRegistryAddress = await multiplesRegistry.getAddress();

    let staticRegistryGas = 0n;
    const staticRegistryAddresses: string[] = [];
    const l2Dictionaries = splitDictionary(dictionaries.l2);
    for (const dict of l2Dictionaries) {
      const staticRegistry = await deployGeneralStaticRegistry(dict, deployer);
      const staticRegistryBytes = await generateGeneralStaticRegistryDeployCode(dict);
      staticRegistryAddresses.push(await staticRegistry.getAddress());
      staticRegistryGas += calcL1Gas(staticRegistryBytes, n);
    }

    const publicRegistry = await hre.ethers.deployContract('PublicStorageRegistry', deployer);
    const publicRegistryAddress = await publicRegistry.getAddress();
    console.log('Filling public storage registry...');
    timestart = new Date().getTime();
    for (let i = 0; i < dictionaries.l3.length; i++) {
      if (i == 10) {
        const t = Math.round((((new Date().getTime() - timestart) / 10) * dictionaries.l3.length) / 1000);
        console.log(`(estimated time remaining: ${formatTime(t)}s)`);
      }
      await publicRegistry.register(dictionaries.l3[i]);
    }

    const calldataCompression = await deployGeneralCalldataCompression(
      entrypointAddress,
      dictionaries.l1,
      [multiplesRegistryAddress, ...staticRegistryAddresses],
      publicRegistryAddress,
      deployer
    );
    const calldataCompressionBytes = await generateGeneralCalldataCompressionDeployCode(
      entrypointAddress,
      dictionaries.l1,
      [multiplesRegistryAddress, ...staticRegistryAddresses],
      publicRegistryAddress
    );
    const calldataCompressionAddress = await calldataCompression.getAddress();

    //sync calldata compression util
    console.log('Syncing calldata compression utils...');
    const contract = await hre.ethers.getContractAt('IEntryPoint', ENTRY_POINT_ADDRESS);
    const compressedEntryPoint = new CalldataCompression(entrypoint, calldataCompressionAddress, provider);
    await compressedEntryPoint.sync();

    console.log('');
    console.log(`[${n}] L1 gas GenStaticRegistry: $${priceL1Gas(staticRegistryGas, n)}`);
    console.log(`[${n}] L1 gas GenCalldataCompression: $${priceL1Gas(calcL1Gas(calldataCompressionBytes, n), n)}`);
    console.log('');

    console.log('Sampling random EntryPoint calls...');
    timestart = new Date().getTime();
    let totalOverhead = 0;
    for (let i = 0; i < NUM_SAMPLES; i++) {
      if (i == 10) {
        const t = Math.round((((new Date().getTime() - timestart) / 10) * NUM_SAMPLES) / 1000);
        console.log(`(estimated time remaining: ${formatTime(t)}s)`);
      }
      const calldata = data[Math.floor(Math.random() * data.length)].data;
      const params = parseHandleOps(contract, calldata);

      //make sure this was a 'handleOps' call
      if (params.ops.length == 0) {
        i--;
        continue;
      }

      //run the original and the compressed version
      const original = await (await entrypoint.handleOps(params.ops, params.beneficiary)).wait();
      const compressed = await (
        await compressedEntryPoint.compressedCall('handleOps', [params.ops, params.beneficiary], deployer)
      ).wait();
      totalOverhead += (Number(compressed?.gasUsed) - Number(original?.gasUsed)) / params.ops.length;
    }
    const avg = Math.round(totalOverhead / NUM_SAMPLES);
    console.log('');
    console.log(`[${n}] Average overhead gas per userOp: ${avg} ($${round(priceL2Gas(avg, n), 100000)})`);
    console.log('');
  }
}

// Start script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
