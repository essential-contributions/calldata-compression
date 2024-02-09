import { expect } from 'chai';
import { ethers } from 'ethers';
//import { deployTestEnvironment, Environment } from '../../scripts/scenarios/environment';

describe('Compression Test', () => {
  //TODO: test that function selectors really don't collide
  /*
  let env: Environment;

  before(async () => {
    env = await deployTestEnvironment({ numAccounts: MAX_INTENTS });
  });

  it('Should compress repeating data', async () => {
    const rand1 = '00000000000000000000000000000000112233445566778899aabbccddeeffab';
    const rand2 = '00000000000000000000000000000000a2334455223899ee566778ef66778cf1';
    const data = '0x' + rand1 + rand2 + rand2 + rand1 + rand1 + rand2 + rand2 + rand1;
    const dataLength = (data.length - 2) / 2;

    const compressed = env.compression.entryPointCompression.encode(data);
    const compressedLength = (compressed.length - 2) / 2;
    expect(compressedLength).to.be.lessThan(dataLength / 3, 'Did not compress enough');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });

  it('Should compress level 1 dictionary', async () => {
    const dictLength = env.compression.entryPointCompression.getL1DictionaryLength();
    expect(dictLength).to.be.greaterThan(0, 'Empty L1 dictionary');

    const item = env.compression.entryPointCompression.getL1DictionaryItem(0);
    const data = '0x' + item;

    const compressed = env.compression.entryPointCompression.encode(data);
    expect(compressed.substring(4, 6)).to.equal('20', 'Did not encode correctly');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });

  it('Should compress level 2 dictionary', async () => {
    const dictLength = env.compression.entryPointCompression.getL2DictionaryLength();
    expect(dictLength).to.be.greaterThan(0, 'Empty L2 dictionary');

    const item = env.compression.entryPointCompression.getL2DictionaryItem(0);
    const data = '0x' + item;

    const compressed = env.compression.entryPointCompression.encode(data);
    expect(compressed.substring(4, 6)).to.equal('40', 'Did not encode correctly');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });

  it('Should compress level 3 dictionary', async () => {
    const dictLength = env.compression.entryPointCompression.getL3DictionaryLength();
    expect(dictLength).to.be.greaterThan(0, 'Empty L3 dictionary');

    const item = env.compression.entryPointCompression.getL3DictionaryItem(0);
    const data = '0x' + item;

    const compressed = env.compression.entryPointCompression.encode(data);
    expect(compressed.substring(4, 6)).to.equal('60', 'Did not encode correctly');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });

  it('Should compress zeros', async () => {
    const data = '0x000000000000000000000000000000000000';

    const compressed = env.compression.entryPointCompression.encode(data);
    expect(compressed.substring(4, 6)).to.equal('91', 'Did not encode correctly');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });

  it('Should compress padded zeros', async () => {
    const data = '0x000000000000000000000000000000000000000000000000000000ffffffffff';

    const compressed = env.compression.entryPointCompression.encode(data);
    expect(compressed.substring(4, 5)).to.equal('b', 'Did not encode correctly');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });

  it('Should compress bytes', async () => {
    const data = '0x1234567812345678';

    const compressed = env.compression.entryPointCompression.encode(data);
    expect(compressed.substring(4, 5)).to.equal('c', 'Did not encode correctly');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });

  it('Should compress decimal numbers', async () => {
    const number = ethers.parseEther('12.3');
    const data = '0x' + number.toString(16).padStart(64, '0');

    const compressed = env.compression.entryPointCompression.encode(data);
    const compressedLength = (compressed.length - 2) / 2;
    expect(compressedLength).to.equal(3 + 1, 'Did not encode correctly');

    const decompressed = env.compression.entryPointCompression.decode(compressed);
    expect(decompressed).to.equal(data, 'Decompressed result does not match original');
  });
  */
});
