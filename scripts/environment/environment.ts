import { ethers } from 'hardhat';
import { Provider, Signer } from 'ethers';
import { CalldataCompression } from '../library/calldataCompression';
import { EntryPointTester, GeneralCalldataCompression } from '../../typechain';
import { deployGeneralStaticRegistry, splitDictionary } from '../library/generalStaticRegistry';
import { deployGeneralCalldataCompression } from '../library/generalCalldataCompression';

// Environment definition
export type Environment = {
  provider: Provider;
  deployer: Signer;
  deployerAddress: string;
  entrypoint: EntryPointTester;
  entrypointAddress: string;
  calldataCompression: GeneralCalldataCompression;
  compressedEntryPoint: CalldataCompression;
};

// Deploy configuration options
export type DeployConfiguration = {
  l1Dictionary?: string[];
  l2Dictionary?: string[];
  l3Dictionary?: string[];
};

// Deploy the testing environment
export async function deployTestEnvironment(config: DeployConfiguration): Promise<Environment> {
  const provider = ethers.provider;
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  const l1Dictionary = config.l1Dictionary || [];
  if (!config.l1Dictionary) {
    for (let i = 0; i < 16; i++) l1Dictionary.push(ethers.hexlify(ethers.randomBytes(32)));
  }
  const l2Dictionary = config.l2Dictionary || [];
  if (!config.l2Dictionary) {
    for (let i = 0; i < 16; i++) l2Dictionary.push(ethers.hexlify(ethers.randomBytes(32)));
  }
  const l3Dictionary = config.l3Dictionary || [];
  if (!config.l3Dictionary) {
    for (let i = 0; i < 16; i++) l3Dictionary.push(ethers.hexlify(ethers.randomBytes(20)));
  }

  const entrypoint = await ethers.deployContract('EntryPointTester', [100], deployer);
  const entrypointAddress = await entrypoint.getAddress();

  const multiplesRegistry = await ethers.deployContract('MultiplesStaticRegistry', deployer);
  const multiplesRegistryAddress = await multiplesRegistry.getAddress();

  const staticRegistryAddresses: string[] = [];
  const l2Dictionaries = splitDictionary(l2Dictionary);
  for (const dict of l2Dictionaries) {
    const staticRegistry = await deployGeneralStaticRegistry(dict, deployer);
    staticRegistryAddresses.push(await staticRegistry.getAddress());
  }

  const publicRegistry = await ethers.deployContract('PublicStorageRegistry', deployer);
  const publicRegistryAddress = await publicRegistry.getAddress();
  for (let i = 0; i < l3Dictionary.length; i++) {
    await publicRegistry.register(l3Dictionary[i]);
  }

  const calldataCompression = await deployGeneralCalldataCompression(
    entrypointAddress,
    l1Dictionary,
    [multiplesRegistryAddress, ...staticRegistryAddresses],
    publicRegistryAddress,
    deployer
  );
  const calldataCompressionAddress = await calldataCompression.getAddress();

  const compressedEntryPoint = new CalldataCompression(entrypoint, calldataCompressionAddress, provider);
  await compressedEntryPoint.sync();

  return {
    provider,
    deployer,
    deployerAddress: await deployer.getAddress(),
    entrypoint,
    entrypointAddress,
    calldataCompression,
    compressedEntryPoint,
  };
}
