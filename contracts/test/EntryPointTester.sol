// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import "../erc-4337/IEntryPoint.sol";

/**
 * Simple entry point implementer meant for testing
 */
contract EntryPointTester is IEntryPoint {
    uint256 private _length;
    bytes32 public result;

    constructor(uint256 length) {
        _length = length;
    }

    function handleOps(UserOperation[] calldata, /*ops*/ address payable /*beneficiary*/ ) external {
        bytes memory data;
        assembly {
            let size := calldatasize()
            data := mload(0x40)
            mstore(data, size)
            calldatacopy(add(data, 32), 0, size)
            mstore(0x40, add(data, add(size, 32)))
        }
        result = keccak256(data);
    }

    function handleAggregatedOps(UserOpsPerAggregator[] calldata, /*opsPerAggregator*/ address payable /*beneficiary*/ )
        external
    {
        _doWork();
    }

    function getUserOpHash(UserOperation calldata /*userOp*/ ) external pure returns (bytes32) {
        return bytes32(0);
    }

    function simulateValidation(UserOperation calldata /*userOp*/ ) external {
        _doWork();
    }

    function getSenderAddress(bytes memory /*initCode*/ ) external {
        _doWork();
    }

    function simulateHandleOp(UserOperation calldata, /*op*/ address, /*target*/ bytes calldata /*targetCallData*/ )
        external
    {
        _doWork();
    }

    function _doWork() private returns (bytes32) {
        uint256[] memory data = new uint256[](_length);
        for (uint256 i = 0; i < _length; i++) {
            data[i] = 1234567890 + i;
        }
        bytes32 r = keccak256(abi.encode(data));
        result = r;
        return r;
    }
}
