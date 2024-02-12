# Current Chain Analysis

These are the results of the analysis for Arbitrum, Base and Optimism chains if ERC-4337 bundlers were to have used Essential Calldata Compression. All data is based on activity observed from Jan 1st, 2024 to around Feb 7th, 2024. For an overview of how the compression works, please refer to the main [README](./README.md).

2. [Arbitrum](#arbitrum)
3. [Base](#base)
4. [Optimism](#optimism)

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

| Title                              | Value     |
| ---------------------------------- | --------- |
| Average Batch Size                 | 7.6       |
|                                    |           |
| Average L1 gas savings             | 11.53%    |
| Max L1 gas savings                 | 41.07%    |
| Min L1 gas savings                 | -84.07%   |
|                                    |           |
| Hypothetical L1 gas costs          | $20998.34 |
| L1 gas costs w/ compression        | $18577.74 |
| Hypothetical L1 gas cost savings   | $2420.6   |
|                                    |           |
| Average L1 gas cost per op         | $0.429    |
| Average L1 gas cost w/ compression | $0.379    |

**Applying Compression to Hypothetical Ideal Bundles**

Even more compression is possible if a bundler can expect a batch of 8 userOps of similar construction (ex. 8 token transfers)

| Title                              | Value     |
| ---------------------------------- | --------- |
| Average L1 gas savings             | 13.49%    |
| Max L1 gas savings                 | 24.62%    |
| Min L1 gas savings                 | 3.88%     |
|                                    |           |
| Hypothetical L1 gas costs          | $10317.72 |
| L1 gas costs w/ compression        | $8925.46  |
| L1 gas cost savings                | $1392.26  |
|                                    |           |
| Average L1 gas cost per op         | $0.211    |
| Average L1 gas cost w/ compression | $0.182    |

## Base

Base is very well suited to take advantage of this compression technique since transactions are not credited for how compressible their data is compared to others. This leads to an immediate savings of almost 50% even when just applying to current _handleOps_ calls where typically there is only ever 1 userOp per call.

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

| Title                              | Value    |
| ---------------------------------- | -------- |
| Average Batch Size                 | 4.25     |
|                                    |          |
| Average L1 gas savings             | 53.51%   |
| Max L1 gas savings                 | 80.86%   |
| Min L1 gas savings                 | 15.58%   |
|                                    |          |
| Hypothetical L1 gas costs          | $5920.52 |
| L1 gas costs w/ compression        | $2752.7  |
| Hypothetical L1 gas cost savings   | $3167.82 |
|                                    |          |
| Average L1 gas cost per op         | $0.416   |
| Average L1 gas cost w/ compression | $0.193   |

**Applying Compression to Hypothetical Ideal Bundles**

Even more compression is possible if a bundler can expect a batch of 8 userOps of similar construction (ex. 8 token transfers)

| Title                              | Value    |
| ---------------------------------- | -------- |
| Average L1 gas savings             | 69.4%    |
| Max L1 gas savings                 | 82.6%    |
| Min L1 gas savings                 | 36.46%   |
|                                    |          |
| Hypothetical L1 gas costs          | $5715.39 |
| L1 gas costs w/ compression        | $1749.18 |
| L1 gas cost savings                | $3966.21 |
|                                    |          |
| Average L1 gas cost per op         | $0.402   |
| Average L1 gas cost w/ compression | $0.123   |

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
