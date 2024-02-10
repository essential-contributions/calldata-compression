import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'dotenv/config';

const ARBITRUM_URL = process.env.ARBITRUM_URL || '';
const OPTIMISM_URL = process.env.OPTIMISM_URL || '';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    arbitrum: {
      url: ARBITRUM_URL,
    },
    optimism: {
      url: OPTIMISM_URL,
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
