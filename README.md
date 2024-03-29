# Essential Calldata Compression

Generalized calldata compression strategy aimed at making account abstraction more approachable on rollups. This strategy can be applied to any contract, but the analysis scripts pay particular attention to ERC-4337 as an example. This is intended to serve as an immediate generalized first step towards acheiving even more copression in the future.

### Contents

1. [Chain Analysis Overview](#chain-analysis-overview)
2. [Strategy](#strategy)
   - [Encoding](#encoding)
   - [Tiered Dictionaries](#tiered-dictionaries)
3. [Running Scripts](#running-scripts-for-current-chain-analysis)
   - [Collect Data](#collect-data)
   - [Process Data](#process-data)
   - [Historical Analysis](#historical-analysis)
   - [Estimate Execution Overhead](#estimate-execution-overhead)

## Chain Analysis Overview

These are the results of if ERC-4337 bundlers were to have used Essential Calldata Compression on Arbitrum, Base and Optimism. All data is based on activity observed from Jan 1st, 2024 to around Feb 7th, 2024.

**Assumed Values:**

| Name                 | Value      | Description                                           |
| -------------------- | ---------- | ----------------------------------------------------- |
| ETH Price            | $2250      | The price of ETH                                      |
| Execution Gase Price | 0.004 GWEI | The gas price on Arbitrum, Base, Optimism             |
| L1 Data Gas Price    | 30 GWEI    | The gas price of L1 data for Arbitrum, Base, Optimism |
| Data Scaler          | 0.684      | Scaler to apply to L1 data cost for Base, Optimism    |

**Results Summary:**

| Chain    | Dictionary Sizes        | Avg Est. Execution Overhead per UserOp | L1 Gas Savings (30 days) | Batched Savings (5min Batching)\* |
| -------- | ----------------------- | -------------------------------------- | ------------------------ | --------------------------------- |
| Arbitrum | L1:32, L2:2628, L3:7504 | 45016 ($0.00041)                       | 1.25% ($479.61)          | 11.53% (batch size of 7.6)        |
| Base     | L1:32, L2:579, L3:8043  | 37698 ($0.00034)                       | 44.48% ($3195.01)        | 53.51% (batch size of 4.25)       |
| Optimism | L1:32, L2:422, L3:4125  | 40147 ($0.00036)                       | 51.32% ($5615.02)        | 59.29% (batch size of 3.73)       |

\*The amount of savings if userOps were batched every 5 minutes (max of 12)

**Average L1 Gas Costs Per UserOp:**

| Chain    | Now    | w/ Essential Compression | w/ Compression and Batching | Theoretical Ideal Compression\* |
| -------- | ------ | ------------------------ | --------------------------- | ------------------------------- |
| Arbitrum | $0.784 | $0.774                   | $0.379                      | $0.183                          |
| Base     | $0.505 | $0.28                    | $0.193                      | $0.124                          |
| Optimism | $0.60  | $0.29                    | $0.21                       | $0.153                          |

\*Compression that assumes being able to make batches of 8 where each userOp is of a similar construction

**Notes:**

- More compression is still possible!
- Targeted application specific compression on top of this could reduce things further
- More clever paymaster techniques could also reduce L1 data costs (a sudo paymaster handling an entire batch)
- Signature aggregation techniques could reduce data consumption by another ~50%

For the full data, please refer to the in depth metrics [here](./METRICS.md).

## Strategy

Essential compression works by placing a [contract](./contracts/core/GeneralCalldataCompression.sol) in between an EOA caller and the target contract. This contract takes in a compressed form of calldata which it decompresses and then makes the full decompressed call to the target contract.

### Encoding

A simple encoding scheme is used, based on common patterns found in standard solidity ABI encoding. Patterns are dictated by the first three bits in a byte. The remaining 5bits are used to specify additional parameters and sometimes are combined with the next few bytes as well.

| ID  | Remaining Bits                | Title                | Denotation                                                                                       |
| --- | ----------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| 000 | 5bit index                    | Dynamic Dictionary   | A reference to an item in the dynamic dictionary (noted by _index_)                              |
| 001 | 5bit index                    | L1 Dictionary Lookup | A reference to an item in the L1 dictionary (noted by _index_)                                   |
| 010 | 5bit+1byte index              | L2 Dictionary Lookup | A reference to an item in the L2 dictionary (noted by _index_)                                   |
| 011 | 5bit+3byte index              | L3 Dictionary Lookup | A reference to an item in the L3 dictionary (noted by _index_)                                   |
| 100 | 5bit num zeros                | Zeros                | 1 to 32 zeros (noted by _num zeros_)                                                             |
| 101 | 5bit num zeros                | Padded Bytes         | The next _x_ bytes are to be padded out to 32 bytes with leading zeros (x = 32 - _num zeros_)    |
| 110 | 5bit num bytes                | Bytes                | The next 1 to 32 bytes (noted by _num bytes_)                                                    |
| 111 | 2bit pad size, 3bit precision | Decimal Number       | The next few bytes to be interpreted as a decimal number (denoted by _pad size_ and _precision_) |

### Tiered Dictionaries

A tiered dictionary approach is used to allow for items to be identified in one byte, two bytes, or four bytes. The dictionaries are also structured so that the fewer bytes used to reference them, the more gas efficient the lookup strategy is.

| Level | Size to Reference | Method for Retrieval                        | Description                                                                  |
| ----- | ----------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| 0     | 1byte             | Pull from memory                            | The dynamic dictionary included at the beginning of data encoding            |
| 1     | 1byte             | Pull from current contract code             | A small 32 item dictionary for ultra common data                             |
| 2     | 2bytes            | Static call to a pure function (no storage) | A medium 8 thousand item dictionary for common data patterns                 |
| 3     | 4bytes            | Static call to a view function (storage)    | A large 500 million item dictionary for less common data (account addresses) |

## Running Scripts for Current Chain Analysis

This project includes scripts to run an analysis on how this compression would affect current chains ERC-4337 account abstraction activity. [Jump here](./METRICS.md) to view the in depth results of running these analyses on Arbitrum, Base and Optimism.

**Note:** These scripts require working RPC endpoints to connect to and that they make **a lot** of request calls which can quickly exceed free tiers from services like Infura. You may need to modify [hardhat.config.ts](./hardhat.config.ts) to make sure everything connects correctly.

### Collect Data

The first step is to grab all EntryPoint interactions within a given range. There are a few options that can be modified at the [top of the script](./scripts/data_dump.ts). The data will be placed in the data folder with a filename similar to `data_optimism.json`.

```
npm run data:arbitrum
npm run data:base
npm run data:optimism
```

### Process Data

The next step is to process this data to identify common data patterns to place in dictionaries for stateful reference. There are a few options that can be modified at the [top of the script](./scripts/process_data.ts). This script can take a _very_ long time to complete and may require multiple script runs in which the data is processed in chunks. The final run of this script will compile all the batch chunk results into a single file. The resulting analysis will be placed in the data folder with a filename similar to `analysis_optimism.json`.

```
npm run process:arbitrum
npm run process:base
npm run process:optimism
```

### Historical Analysis

This final step requires the previous two steps to have already been run. This script uses the processed data to simulate running the previously recorded calls using the compression method with well populated dictionaries instead. The result simply outputs to the console instead of writing to a file like the previous scripts.

```
npm run analysis:arbitrum
npm run analysis:base
npm run analysis:optimism
```

### Estimate Execution Overhead

There is a bonus script that can be used to estimate the amount of extra execution gas to complete the decompression on chain. This script requires data and analysis files to have been generated for at least one network.

```
npm run estimate_overhead
```

## Tests and Examples

The best way to see how the compression process works is to look over the [compression tests](./test/compression.ts). These tests can be run without needing to run any of the scripts beforehand (unlike when trying to run a historical analysis on a targeted chain).

```
npm run test
```
