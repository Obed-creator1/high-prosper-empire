# blockchain/hpc.py
from web3 import Web3
from stellar_sdk import Server, Keypair, TransactionBuilder, Network

def mint_hpc_for_payment(payment):
    if payment.status == "Completed" and payment.amount >= 1000:
        # Mint HPC = amount in local currency
        amount_hpc = payment.amount  # 1:1 peg
        tx_hash = polygon_contract.functions.mint(
            payment.customer.wallet_address,
            int(amount_hpc * 1e18)
        ).transact({'from': MINTER_WALLET})

        # Also issue on Stellar for DRC/Tanzania
        stellar_server.submit_transaction(build_stellar_mint(tx_hash))

        payment.hpc_minted = True
        payment.save()