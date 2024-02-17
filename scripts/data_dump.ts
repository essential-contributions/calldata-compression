import hre from 'hardhat';
import { Provider, Block } from 'ethers';
import { promises as fs } from 'fs';
import path from 'path';
import { DATA_DIRECTORY_NAME, DATA_FILE_NAME_PREFIX, ENTRY_POINT_ADDRESS } from './utils/config';
import { FetchedHandleUserOpCalls, HandleUserOpCall, round } from './utils/utils';
import { IEntryPoint } from '../typechain';

const NUM_DAYS_TO_FETCH = 90;
const MAX_BLOCKS_TO_FETCH_LOGS = 1_000;
const MAX_OVERALL_QUERIES = 25_000;
const DATA_DIRECTORY = path.join(process.cwd(), DATA_DIRECTORY_NAME);

// Main script entry
async function main() {
  console.log(
    `Pulling the last ${NUM_DAYS_TO_FETCH} days of ERC-4337 EntryPoint_v0.6.0 transaction data for ${hre.network.name}...`,
  );
  const provider = hre.ethers.provider;
  const signer = new hre.ethers.Wallet(hre.ethers.hexlify(hre.ethers.randomBytes(32))).connect(provider);
  const contract = await hre.ethers.getContractAt('IEntryPoint', ENTRY_POINT_ADDRESS, signer);
  let queryCount = 0;

  //open data file
  let data: FetchedHandleUserOpCalls[] = [];
  try {
    try {
      await fs.access(DATA_DIRECTORY);
    } catch (err) {
      fs.mkdir(DATA_DIRECTORY);
    }
    const file = JSON.parse(
      await fs.readFile(path.join(DATA_DIRECTORY, `${DATA_FILE_NAME_PREFIX}_${hre.network.name}.json`), 'utf8'),
    );
    data.push(...file);
  } catch (err) {}

  if (data.length == 0) {
    //if data doesn't exist, fetch from the current block height
    const currentBlockNumber = await provider.getBlockNumber();
    const currentBlock = await provider.getBlock(currentBlockNumber);
    queryCount += 2;
    if (!currentBlock) throw new Error(`Something went wrong fetching current block`);
    const bottomBlockTimestamp = currentBlock.timestamp - NUM_DAYS_TO_FETCH * 24 * 60 * 60;
    const fetch = await fetchData(
      provider,
      contract,
      currentBlock.timestamp,
      currentBlock.number,
      bottomBlockTimestamp,
      queryCount,
    );
    data = [
      {
        handleOpsCalls: [...fetch.handleOpsCalls.values()].sort((a, b) => b.blockNumber - a.blockNumber),
        fromBlock: fetch.fromBlock,
        fromBlockTimestamp: fetch.fromBlockTimestamp,
        toBlock: fetch.toBlock,
        toBlockTimestamp: fetch.toBlockTimestamp,
      },
    ];
  } else if (data[0].toBlockTimestamp - data[0].fromBlockTimestamp < NUM_DAYS_TO_FETCH * 24 * 60 * 60) {
    //if data already exists, then make sure it spans the target number of days
    const bottomBlockTimestamp = data[0].toBlockTimestamp - NUM_DAYS_TO_FETCH * 24 * 60 * 60;
    const fetch = await fetchData(
      provider,
      contract,
      data[0].fromBlockTimestamp,
      data[0].fromBlock,
      bottomBlockTimestamp,
      queryCount,
    );
    const handleOpsCalls: Map<string, HandleUserOpCall> = new Map<string, HandleUserOpCall>();
    for (let handleOpsCall of data[0].handleOpsCalls) handleOpsCalls.set(handleOpsCall.hash, handleOpsCall);
    for (let entry of fetch.handleOpsCalls) handleOpsCalls.set(entry[0], entry[1]);
    data = [
      {
        handleOpsCalls: [...handleOpsCalls.values()].sort((a, b) => b.blockNumber - a.blockNumber),
        fromBlock: fetch.fromBlock,
        fromBlockTimestamp: fetch.fromBlockTimestamp,
        toBlock: data[0].toBlock,
        toBlockTimestamp: data[0].toBlockTimestamp,
      },
    ];
  }

  //save data file
  console.log(`Writting data to file...`);
  await fs.writeFile(
    path.join(DATA_DIRECTORY, `${DATA_FILE_NAME_PREFIX}_${hre.network.name}.json`),
    JSON.stringify(data, null, 2),
  );
}

// Fetch data
async function fetchData(
  provider: Provider,
  contract: IEntryPoint,
  topBlockTimestamp: number,
  topBlockNumber: number,
  bottomBlockTimestamp: number,
  queryCount: number,
): Promise<{
  handleOpsCalls: Map<string, HandleUserOpCall>;
  fromBlock: number;
  fromBlockTimestamp: number;
  toBlock: number;
  toBlockTimestamp: number;
  queryCount: number;
}> {
  const blocks: Map<string, Block> = new Map<string, Block>();
  const handleOpsCalls: Map<string, HandleUserOpCall> = new Map<string, HandleUserOpCall>();
  let earliestBlockTimestampFetched = topBlockTimestamp;
  let earliestBlockFetched = topBlockNumber;
  while (earliestBlockTimestampFetched > bottomBlockTimestamp) {
    const percent = (earliestBlockTimestampFetched - bottomBlockTimestamp) / (topBlockTimestamp - bottomBlockTimestamp);
    const from = earliestBlockFetched - MAX_BLOCKS_TO_FETCH_LOGS;
    console.log(`fetching blocks ${from} to ${earliestBlockFetched} (${round((1 - percent) * 100)}%)`);
    const logs = await contract.queryFilter(contract.filters.UserOperationEvent(), from, earliestBlockFetched);
    queryCount++;
    logs.sort((a, b) => b.blockNumber - a.blockNumber);
    for (let i = 0; i < logs.length; i++) {
      //note the transaction where ops were successful
      if (logs[i].args[4]) {
        let block = blocks.get(logs[i].blockHash);
        if (block == undefined) {
          const fetchedBlock = await provider.getBlock(logs[i].blockHash, true);
          queryCount++;
          if (!fetchedBlock) throw new Error(`Something went wrong fetching block ${logs[i].blockHash}`);
          blocks.set(logs[i].blockHash, fetchedBlock);
          block = fetchedBlock;
        }
        if (block.timestamp <= bottomBlockTimestamp) {
          return {
            handleOpsCalls,
            fromBlock: earliestBlockFetched,
            fromBlockTimestamp: earliestBlockTimestampFetched,
            toBlock: topBlockNumber,
            toBlockTimestamp: topBlockTimestamp,
            queryCount,
          };
        }
        earliestBlockTimestampFetched = block.timestamp;
        earliestBlockFetched = block.number;

        const tx = await block.getTransaction(logs[i].transactionIndex);
        if (tx.to === null) throw new Error(`The 'to' field was null in transaction ${logs[i].transactionHash}`);
        handleOpsCalls.set(logs[i].transactionHash, {
          blockNumber: block.number,
          blockTimestamp: block.timestamp,
          hash: tx.hash.toLowerCase(),
          to: tx.to.toLowerCase(),
          from: tx.from.toLowerCase(),
          data: tx.data.toLowerCase(),
        });
      }
      if (queryCount >= MAX_OVERALL_QUERIES) {
        console.log(
          `Stopping here since since the max number of queries has been hit (${MAX_OVERALL_QUERIES}). Run script again to continue.`,
        );
        return {
          handleOpsCalls,
          fromBlock: earliestBlockFetched,
          fromBlockTimestamp: earliestBlockTimestampFetched,
          toBlock: topBlockNumber,
          toBlockTimestamp: topBlockTimestamp,
          queryCount,
        };
      }
    }
    if (queryCount >= MAX_OVERALL_QUERIES) {
      console.log(
        `Stopping here since since the max number of queries has been hit (${MAX_OVERALL_QUERIES}). Run script again to continue.`,
      );
      return {
        handleOpsCalls,
        fromBlock: earliestBlockFetched,
        fromBlockTimestamp: earliestBlockTimestampFetched,
        toBlock: topBlockNumber,
        toBlockTimestamp: topBlockTimestamp,
        queryCount,
      };
    }
    earliestBlockFetched = from;
  }
  return {
    handleOpsCalls,
    fromBlock: earliestBlockFetched,
    fromBlockTimestamp: earliestBlockTimestampFetched,
    toBlock: topBlockNumber,
    toBlockTimestamp: topBlockTimestamp,
    queryCount,
  };
}

// Start script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
