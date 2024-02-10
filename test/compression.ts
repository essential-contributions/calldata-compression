import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployTestEnvironment, Environment } from '../scripts/environment/environment';
import { UserOperationStruct } from '../typechain/erc-4337/IEntryPoint';
//TODO: test that calldata should be correctly passed to EntryPoint (maybe try 3 examples)

describe('Compression Test', () => {
  let env: Environment;

  before(async () => {
    env = await deployTestEnvironment({});
  });

  it('Should not have colliding fn selector', async () => {
    const factory = await ethers.getContractFactory('GeneralCalldataCompression');
    factory.interface.forEachFunction((fn) => {
      expect(fn.selector.indexOf('0xff00')).to.equal(0, 'Function selector collides with potential encoding');
    });
  });

  it('Should compress repeating data', async () => {
    const rand1 = '00000000000000000000000000000000112233445566778899aabbccddeeffab';
    const rand2 = '00000000000000000000000000000000a2334455223899ee566778ef66778cf1';
    const data = '0x' + rand1 + rand2 + rand2 + rand1 + rand1 + rand2 + rand2 + rand1;
    const dataLength = (data.length - 2) / 2;

    const compressed = env.compressedEntryPoint.encode(data);
    const compressedLength = (compressed.length - 2) / 2;
    expect(compressedLength).to.be.lessThan(dataLength / 3, 'Did not compress enough');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should compress level 1 dictionary', async () => {
    const dictLength = env.compressedEntryPoint.getL1DictionaryLength();
    expect(dictLength).to.be.greaterThan(0, 'Empty L1 dictionary');

    const item = env.compressedEntryPoint.getL1DictionaryItem(0);
    const data = '0x' + item;

    const compressed = env.compressedEntryPoint.encode(data);
    expect(compressed.substring(4, 6)).to.equal('20', 'Did not encode correctly');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should compress level 2 dictionary', async () => {
    const dictLength = env.compressedEntryPoint.getL2DictionaryLength();
    expect(dictLength).to.be.greaterThan(0, 'Empty L2 dictionary');

    const item = env.compressedEntryPoint.getL2DictionaryItem(0);
    const data = '0x' + item;

    const compressed = env.compressedEntryPoint.encode(data);
    expect(compressed.substring(4, 6)).to.equal('40', 'Did not encode correctly');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should compress level 3 dictionary', async () => {
    const dictLength = env.compressedEntryPoint.getL3DictionaryLength();
    expect(dictLength).to.be.greaterThan(0, 'Empty L3 dictionary');

    const item = env.compressedEntryPoint.getL3DictionaryItem(0);
    const data = '0x' + item;

    const compressed = env.compressedEntryPoint.encode(data);
    expect(compressed.substring(4, 6)).to.equal('60', 'Did not encode correctly');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should compress zeros', async () => {
    const data = '0x000000000000000000000000000000000000';

    const compressed = env.compressedEntryPoint.encode(data);
    expect(compressed.substring(4, 6)).to.equal('91', 'Did not encode correctly');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should compress padded zeros', async () => {
    const data = '0x000000000000000000000000000000000000000000000000000000ffffffffff';

    const compressed = env.compressedEntryPoint.encode(data);
    expect(compressed.substring(4, 5)).to.equal('b', 'Did not encode correctly');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should compress bytes', async () => {
    const data = '0x1234567812345678';

    const compressed = env.compressedEntryPoint.encode(data);
    expect(compressed.substring(4, 5)).to.equal('c', 'Did not encode correctly');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should compress decimal numbers', async () => {
    const number = ethers.parseEther('12.3');
    const data = '0x' + number.toString(16).padStart(64, '0');

    const compressed = env.compressedEntryPoint.encode(data);
    const compressedLength = (compressed.length - 2) / 2;
    expect(compressedLength).to.equal(3 + 1, 'Did not encode correctly');

    const decompressed = env.compressedEntryPoint.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');

    const decompressedOC = await env.calldataCompression.decompress_0076ce(compressed);
    expect(decompressedOC).to.equal(data, 'On-chain decompressed result does not match original');
  });

  it('Should correctly pass calldata to the target contract', async () => {
    const beneficiary = ethers.hexlify(ethers.randomBytes(20));
    const ops: UserOperationStruct[] = [
      {
        sender: ethers.hexlify(ethers.randomBytes(20)),
        nonce: 1n,
        initCode: '0x',
        callData: ethers.hexlify(ethers.randomBytes(128)),
        callGasLimit: 100000n,
        verificationGasLimit: 200000n,
        preVerificationGas: 300000n,
        maxFeePerGas: 400000n,
        maxPriorityFeePerGas: 500000n,
        paymasterAndData: '0x',
        signature: ethers.hexlify(ethers.randomBytes(64)),
      },
    ];
    const hash = ethers.keccak256(env.entrypoint.interface.encodeFunctionData('handleOps', [ops, beneficiary]));

    await env.compressedEntryPoint.compressedCall('handleOps', [ops, beneficiary], env.deployer);
    const result = await env.entrypoint.result();
    expect(result).to.equal(hash, 'Data was not correctly passed to the target contract');
  });
});
