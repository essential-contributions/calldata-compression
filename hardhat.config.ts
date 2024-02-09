import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const INFURA_KEY = process.env.INFURA_KEY || '';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    polygon: {
      url: 'https://polygon-mainnet.infura.io/v3/' + INFURA_KEY,
    },
    optimism: {
      url: 'https://optimism-mainnet.infura.io/v3/' + INFURA_KEY,
    },
    arbitrum: {
      url: 'https://arbitrum-mainnet.infura.io/v3/' + INFURA_KEY,
    },
  },
  solidity: {
    version: '0.8.22',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1_000_000_000,
      },
      viaIR: true,
    },
  },
  paths: {
    tests: './test',
    sources: './contracts',
  },
  typechain: {
    outDir: 'typechain',
  },
};

export default config;
