// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InvoiceVerifier {
    mapping(string => bytes32) private invoiceHashes;
    mapping(string => bool) public invoiceExists;

    event InvoiceRegistered(string indexed invoiceNumber, bytes32 hash, address indexed registrant);
    event InvoiceVerified(string indexed invoiceNumber, bool isValid);

    /// @notice Register an invoice hash (called by trusted party or supplier)
    function registerInvoice(string memory invoiceNumber, bytes32 hash) external {
        require(!invoiceExists[invoiceNumber], "Invoice already registered");

        invoiceHashes[invoiceNumber] = hash;
        invoiceExists[invoiceNumber] = true;

        emit InvoiceRegistered(invoiceNumber, hash, msg.sender);
    }

    /// @notice Verify if computed hash matches stored hash
    function verifyInvoice(string memory invoiceNumber, bytes32 computedHash) external returns (bool) {
        bool isValid = invoiceExists[invoiceNumber] && invoiceHashes[invoiceNumber] == computedHash;

        emit InvoiceVerified(invoiceNumber, isValid);
        return isValid;
    }

    /// @notice Get stored hash (for off-chain comparison)
    function getStoredHash(string memory invoiceNumber) external view returns (bytes32) {
        require(invoiceExists[invoiceNumber], "Invoice not registered");
        return invoiceHashes[invoiceNumber];
    }
}