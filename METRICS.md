# Current Chain Analysis

These are the results of the analysis for Arbitrum, Base and Optimism chains if ERC-4337 bundlers were to have used Essential Calldata Compression. All data is based on activity observed from Jan 1st, 2024 to around Feb 7th, 2024. For an overview of how the compression works, please refer to the main [README](./README.md).

1. [Overview](#overview)
2. [Arbitrum](#arbitrum)
3. [Base](#base)
4. [Optimism](#optimism)

## Overview

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
| Arbitrum | L1:32, L2:2628, L3:7504 | 45016 ($0.00041)                       | 1.25% ($479.61)          |                                   |
| Base     | L1:32, L2:579, L3:8043  | 37698 ($0.00034)                       | 44.48% ($3195.01)        |                                   |
| Optimism | L1:32, L2:422, L3:4125  | 40147 ($0.00036)                       | 51.32% ($5615.02)        | 59.29% (batch size of 3.73)       |

\*The amount of savings if userOps were batched every 5 minutes (max of 12)

**Average L1 Gas Costs Per UserOp:**

| Chain    | Now    | w/ Essential Compression | w/ Compression and Batching | Theoretical Ideal Compression\* |
| -------- | ------ | ------------------------ | --------------------------- | ------------------------------- |
| Arbitrum | $0.784 | $0.774                   |                             | $0.183                          |
| Base     | $0.505 | $0.28                    |                             | $0.124                          |
| Optimism | $0.60  | $0.29                    | $0.21                       | $0.153                          |

\*Compression that assumes being able to make batches of 8 where each userOp is of a similar construction

**Notes:**

- More compression is still possible!
- Targeted application specific compression on top of this could reduce things further
- More clever paymaster techniques could also reduce L1 data costs (a sudo paymaster handling an entire batch)
- Signature aggregation techniques could reduce data consumption by another ~50%

## Arbitrum

Arbitrum already gives a good sized discount to transactions that are compressible. This makes the on-chain compression technique not as advantageous as other chains and can even cause L1 data gas costs to increase (particularly when _handleOps_ only contains a single userOp). However, the statefulness of this compression does provide some savings especially when lots of userOps are bundled together.

**Execution Gas Overhead For On-Chain Decompression:**

Each userOp adds an average of 45016 gas to total execution cost ($0.00041)

**Applying Compression to Previous _handleOps_ Calls:**

| Title                              | Value     |
| ---------------------------------- | --------- |
| Average L1 gas savings             | 1.25%     |
| Max L1 gas savings                 | 48.17%    |
| Min L1 gas savings                 | -86.46%   |
|                                    |           |
| Total L1 gas costs                 | $38419.92 |
| L1 gas costs w/ compression        | $37940.31 |
| Total L1 gas cost savings          | $479.61   |
|                                    |           |
| Average L1 gas cost per op         | $0.784    |
| Average L1 gas cost w/ compression | $0.774    |

**Applying Compression to Bundles Built Every 5 minutes:**

Further compression is possible simply by including more userOps in the same _handleOps_ bundle

| Title              | Value |
| ------------------ | ----- |
| Average Batch Size | 3.73  |

**Applying Compression to Hypothetical Ideal Bundles**

Even more compression is possible if a bundler can expect a batch of 8 userOps of similar construction (ex. 8 token transfers)

| Title                              | Value     |
| ---------------------------------- | --------- |
| Average L1 gas savings             | 13.48%    |
| Max L1 gas savings                 | 25.92%    |
| Min L1 gas savings                 | -3.04%    |
|                                    |           |
| Hypothetical L1 gas costs          | $10354.07 |
| L1 gas costs w/ compression        | $8958.53  |
| L1 gas cost savings                | $1395.54  |
|                                    |           |
| Average L1 gas cost per op         | $0.211    |
| Average L1 gas cost w/ compression | $0.183    |

## Base

Base is very well suited to take advantage of this compression technique since transactions are not credited for how compressible their data is compared to others. This leads to an immediate savings of over 50% even when just applying to current _handleOps_ calls where typically there is only ever 1 userOp per call.

**Execution Gas Overhead For On-Chain Decompression:**

Each userOp adds an average of 37698 gas to total execution cost ($0.00034)

**Applying Compression to Previous _handleOps_ Calls:**

| Title                              | Value    |
| ---------------------------------- | -------- |
| Average L1 gas savings             | 44.48%   |
| Max L1 gas savings                 | 87.09%   |
| Min L1 gas savings                 | 9.65%    |
|                                    |          |
| Total L1 gas costs                 | $7183.17 |
| L1 gas costs w/ compression        | $3988.16 |
| Total L1 gas cost savings          | $3195.01 |
|                                    |          |
| Average L1 gas cost per op         | $0.505   |
| Average L1 gas cost w/ compression | $0.28    |

**Applying Compression to Bundles Built Every 5 minutes:**

Further compression is possible simply by including more userOps in the same _handleOps_ bundle

| Title              | Value |
| ------------------ | ----- |
| Average Batch Size | 3.73  |

**Applying Compression to Hypothetical Ideal Bundles**

Even more compression is possible if a bundler can expect a batch of 8 userOps of similar construction (ex. 8 token transfers)

| Title                              | Value    |
| ---------------------------------- | -------- |
| Average L1 gas savings             | 69.39%   |
| Max L1 gas savings                 | 82.47%   |
| Min L1 gas savings                 | 36.46%   |
|                                    |          |
| Hypothetical L1 gas costs          | $5744.95 |
| L1 gas costs w/ compression        | $1758.38 |
| L1 gas cost savings                | $3986.57 |
|                                    |          |
| Average L1 gas cost per op         | $0.404   |
| Average L1 gas cost w/ compression | $0.124   |

## Optimism

Just like Base, Optimism is very well suited to take advantage of this compression technique since transactions are not credited for how compressible their data is compared to others. This leads to an immediate savings of over 50% even when just applying to current _handleOps_ calls where typically there is only ever 1 userOp per call.

**Execution Gas Overhead For On-Chain Decompression:**

Each userOp adds an average of 40147 gas to total execution cost ($0.00036)

**Applying Compression to Previous _handleOps_ Calls:**

| Title                              | Value     |
| ---------------------------------- | --------- |
| Average L1 gas savings             | 51.32%    |
| Max L1 gas savings                 | 84.29%    |
| Min L1 gas savings                 | 11.4%     |
|                                    |           |
| Total L1 gas costs                 | $10940.71 |
| L1 gas costs w/ compression        | $5325.69  |
| Total L1 gas cost savings          | $5615.02  |
|                                    |           |
| Average L1 gas cost per op         | $0.60     |
| Average L1 gas cost w/ compression | $0.29     |

**Applying Compression to Bundles Built Every 5 minutes:**

Further compression is possible simply by including more userOps in the same _handleOps_ bundle

| Title                              | Value    |
| ---------------------------------- | -------- |
| Average Batch Size                 | 3.73     |
|                                    |          |
| Average L1 gas savings             | 59.29%   |
| Max L1 gas savings                 | 81.49%   |
| Min L1 gas savings                 | 16.79%   |
|                                    |          |
| Hypothetical L1 gas costs          | $9371.17 |
| L1 gas costs w/ compression        | $3815.14 |
| Hypothetical L1 gas cost savings   | $5556.03 |
|                                    |          |
| Average L1 gas cost per op         | $0.51    |
| Average L1 gas cost w/ compression | $0.21    |

**Applying Compression to Hypothetical Ideal Bundles**

Even more compression is possible if a bundler can expect a batch of 8 userOps of similar construction (ex. 8 token transfers)

| Title                              | Value    |
| ---------------------------------- | -------- |
| Average L1 gas savings             | 69.28%   |
| Max L1 gas savings                 | 83.14%   |
| Min L1 gas savings                 | 20.1%    |
|                                    |          |
| Hypothetical L1 gas costs          | $9100.33 |
| L1 gas costs w/ compression        | $2795.49 |
| L1 gas cost savings                | $6304.84 |
|                                    |          |
| Average L1 gas cost per op         | $0.497   |
| Average L1 gas cost w/ compression | $0.153   |
