# backend/procurement/blockchain.py
import os
import json
import logging
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Path to ABI artifact
ABI_PATH = os.path.join(settings.BASE_DIR, 'procurement', 'contracts', 'InvoiceVerifier.json')

# Load ABI safely
INVOICE_VERIFIER_ABI = None
try:
    if os.path.exists(ABI_PATH):
        with open(ABI_PATH, 'r') as f:
            artifact = json.load(f)
            # Extract only the 'abi' array from Hardhat/Truffle artifact
            INVOICE_VERIFIER_ABI = artifact.get('abi', [])
        logger.info("InvoiceVerifier ABI loaded successfully")
    else:
        logger.warning("InvoiceVerifier.json not found — blockchain verification disabled")
except json.JSONDecodeError as e:
    logger.error(f"Invalid JSON in InvoiceVerifier.json: {e}")
except Exception as e:
    logger.error(f"Unexpected error loading ABI: {e}")

# Web3 configuration
WEB3_PROVIDER_URL = getattr(settings, 'WEB3_PROVIDER_URL', None)
CONTRACT_ADDRESS = getattr(settings, 'INVOICE_CONTRACT_ADDRESS', None)

WEB3 = None
CONTRACT = None

if WEB3_PROVIDER_URL and INVOICE_VERIFIER_ABI is not None and CONTRACT_ADDRESS:
    try:
        from web3 import Web3

        WEB3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))

        if WEB3.is_connected():
            CONTRACT = WEB3.eth.contract(address=CONTRACT_ADDRESS, abi=INVOICE_VERIFIER_ABI)
            logger.info(f"Web3 connected to {WEB3_PROVIDER_URL} | Contract loaded at {CONTRACT_ADDRESS}")
        else:
            logger.warning("Web3 provider not reachable — blockchain verification disabled")
            WEB3 = None
    except Exception as e:
        logger.error(f"Web3 setup failed: {e}")
        WEB3 = None
        CONTRACT = None
else:
    if not WEB3_PROVIDER_URL:
        logger.info("WEB3_PROVIDER_URL not configured")
    if not CONTRACT_ADDRESS:
        logger.info("INVOICE_CONTRACT_ADDRESS not configured")


def verify_invoice_on_blockchain(invoice):
    """
    Verify invoice authenticity against on-chain stored hash.
    Safe: never crashes, gracefully degrades.
    """
    if not CONTRACT:
        logger.debug("Blockchain verification skipped: contract not available")
        return False

    try:
        # Consistent hash input (must match contract registration)
        hash_input = (
            f"{invoice.invoice_number}"
            f"{invoice.supplier.tax_id or ''}"
            f"{invoice.grand_total}"
            f"{invoice.invoice_date.strftime('%Y-%m-%d')}"
        )
        from web3 import Web3
        computed_hash = Web3.keccak(text=hash_input)

        # Call contract view function
        stored_hash = CONTRACT.functions.getStoredHash(invoice.invoice_number).call()

        is_valid = computed_hash == stored_hash

        if is_valid:
            invoice.blockchain_verified = True
            invoice.verified_at = timezone.now()
            invoice.save(update_fields=['blockchain_verified', 'verified_at'])
            logger.info(f"Invoice {invoice.invoice_number} successfully verified on-chain")
        else:
            logger.info(f"Invoice {invoice.invoice_number} hash mismatch")

        return is_valid

    except Exception as e:
        logger.error(f"Blockchain verification error for invoice {invoice.invoice_number}: {e}")
        return False