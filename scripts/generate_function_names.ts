import hre from 'hardhat';
import { id } from 'ethers';
import { FunctionFragment } from 'ethers';

const CONTRACT_NAME = 'GeneralCalldataCompression';
const REQUIRED_FN_SEL_START = '0xff00';

// Main script entry
async function main() {
  const factory = await hre.ethers.getContractFactory(CONTRACT_NAME);
  factory.interface.forEachFunction((fn) => {
    if (fn.selector.indexOf(REQUIRED_FN_SEL_START) != 0) {
      console.log(
        `Finding a name for '${fn.name}' with a function selector that starts with ${REQUIRED_FN_SEL_START}...`
      );
      const basename = getBaseName(fn.name);
      const inputs = getInputs(fn);

      for (let i = 0; i < 16777216; i++) {
        const name = basename + '_' + i.toString(16).padStart(6, '0');
        if (fnSelector(name + inputs).indexOf(REQUIRED_FN_SEL_START) == 0) {
          console.log(`Rename to ${name}`);
          console.log('');
          break;
        }
      }
    } else {
      console.log(`Function '${fn.name}' already has a non colliding selector (${fn.selector})`);
      console.log('');
    }
  });
}

//checks if string is all hex character
function isHex(str: string): boolean {
  const hexChars = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
  ];
  for (let i = 0; i < str.length; i++) {
    if (hexChars.indexOf(str[i]) == -1) return false;
  }
  return true;
}

//gets the function name with any ending hex removed
function getBaseName(name: string): string {
  const underscoreIdx = name.lastIndexOf('_');
  if (underscoreIdx > -1 && isHex(name.slice(underscoreIdx + 1))) return name.substring(0, underscoreIdx);
  return name;
}

//gets the function inputs
function getInputs(fn: FunctionFragment): string {
  const inputs: string[] = [];
  for (const i of fn.inputs) inputs.push(i.type);
  return '(' + inputs.join(',') + ')';
}

//calculates the function selector
function fnSelector(def: string): string {
  return id(def).substring(0, 10);
}

// Start script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
