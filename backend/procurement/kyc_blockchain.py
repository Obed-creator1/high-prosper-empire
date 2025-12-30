# backend/procurement/kyc_blockchain.py
from django.conf import settings
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY"))

def register_supplier_on_blockchain(supplier):
    # Simple DID registration
    tx = {
        'from': settings.BLOCKCHAIN_WALLET,
        'to': settings.KYC_CONTRACT,
        'data': w3.to_hex(text=f"did:highprosper:supplier:{supplier.code}")
    }
    # Sign & send (use your wallet)
    supplier.blockchain_id = f"did:hp:{supplier.code}"
    supplier.save()