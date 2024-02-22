import hre from 'hardhat';
import { CompressionTest } from './library/compressionCore';
import { ENTRY_POINT_ADDRESS } from './utils/config';
import {
  calcL1Gas,
  formatTime,
  hasInitcode,
  loadData,
  parseHandleOps,
  priceL1Gas,
  recommendDictionaries,
  round,
  serialized,
} from './utils/utils';

// Main script entry
async function main() {
  const provider = hre.ethers.provider;
  const signer = new hre.ethers.Wallet(hre.ethers.hexlify(hre.ethers.randomBytes(32))).connect(provider);
  const { data, daysSampled } = await loadData(hre.network.name);
  const dictionaries = await recommendDictionaries(hre.network.name, daysSampled);
  data.sort((a, b) => a.time - b.time);

  //get compression results
  const compression = new CompressionTest();
  compression.setL1Dictionary(dictionaries.l1);
  compression.setL2Dictionary(dictionaries.l2);
  compression.setL3Dictionary(dictionaries.l3);
  console.log('L1 dictionary length: ' + dictionaries.l1.length);
  console.log('L2 dictionary length: ' + dictionaries.l2.length);
  console.log('L3 dictionary length: ' + dictionaries.l3.length);
  console.log('');

  console.log('Total handleOps: ' + data.length);
  console.log('');

  const numSamples = data.length;
  const contract = await hre.ethers.getContractAt('IEntryPoint', ENTRY_POINT_ADDRESS);
  let opscount = 0;
  let avgUncompressedL1GasPerOp = 0n;
  let avgCompressedL1GasPerOp = 0n;
  let minGasRatio = 0;
  let maxGasRatio = 0;
  let timeleft = 0;
  let timer = new Date().getTime();
  for (let i = 0; i < numSamples; i++) {
    const p = parseHandleOps(contract, data[i].data);
    if (p.ops.length > 0 && !hasInitcode(p.ops)) {
      opscount += p.ops.length;

      const d = await serialized(data[i].data, signer);
      const dl = (d.length - 2) / 2;
      const dg = calcL1Gas(d, hre.network.name);
      const c = await serialized(compression.encodeFast(data[i].data), signer);
      const cl = (c.length - 2) / 2;
      const cg = calcL1Gas(c, hre.network.name);

      const now = new Date().getTime();
      const estTimeleft = ((now - timer) / 1000) * (numSamples - i);
      if (timeleft == 0) timeleft = estTimeleft;
      else timeleft = timeleft * 0.95 + estTimeleft * 0.05;
      const remain = formatTime(Math.round(timeleft));
      timer = now;

      const ratio = round(((dl - cl) / dl) * 100);
      const gasRatio = round((Number(dg - cg) / Number(dg)) * 100);
      const gasRatioText = gasRatio >= 0 ? 'less L1 gas' : 'more L1 gas';
      console.log(
        `compressing ${i} of ${numSamples - 1}` +
          ' - ' +
          `${ratio}%`.padEnd(6, ' ') +
          ' ratio - ' +
          `${Math.abs(gasRatio)}%`.padEnd(6, ' ') +
          ` ${gasRatioText} - ` +
          `${remain}s remaining`,
      );

      if (minGasRatio == 0 || gasRatio < minGasRatio) minGasRatio = gasRatio;
      if (maxGasRatio == 0 || gasRatio > maxGasRatio) maxGasRatio = gasRatio;
      avgUncompressedL1GasPerOp += dg;
      avgCompressedL1GasPerOp += cg < dg ? cg : dg;
    }
  }
  avgUncompressedL1GasPerOp = avgUncompressedL1GasPerOp / BigInt(opscount);
  avgCompressedL1GasPerOp = avgCompressedL1GasPerOp / BigInt(opscount);
  console.log('');

  const avgGasRatio = round(
    (Number(avgUncompressedL1GasPerOp - avgCompressedL1GasPerOp) / Number(avgUncompressedL1GasPerOp)) * 100,
  );
  const avgUncompressedL1GasCost = priceL1Gas(avgUncompressedL1GasPerOp, hre.network.name);
  const totalOperatingCost = round(avgUncompressedL1GasCost * opscount);
  const totalOperatingCostWithComp = round(priceL1Gas(avgCompressedL1GasPerOp, hre.network.name) * opscount);
  console.log('Average L1 gas savings: ' + avgGasRatio + '%');
  console.log('Max L1 gas savings: ' + maxGasRatio + '%');
  console.log('Min L1 gas savings: ' + minGasRatio + '%');
  console.log('');
  console.log('Total L1 gas costs: $' + totalOperatingCost);
  console.log('L1 gas costs with compression: $' + totalOperatingCostWithComp);
  console.log('L1 gas cost savings: $' + round(totalOperatingCost - totalOperatingCostWithComp));
  console.log('');
  console.log('Average L1 gas cost per op: $' + round(totalOperatingCost / opscount, 1000));
  console.log('Average L1 gas cost with compression: $' + round(totalOperatingCostWithComp / opscount, 1000));
}

// Start script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
