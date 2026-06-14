"""Nepal area unit and currency utilities."""
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal


SQM_PER_DAAM = Decimal("1.9872")
SQM_PER_PAISA = SQM_PER_DAAM * 4
SQM_PER_AANA = SQM_PER_PAISA * 4
SQM_PER_ROPANI = SQM_PER_AANA * 16

SQM_PER_DHUR = Decimal("16.9316")
SQM_PER_KATTHA = SQM_PER_DHUR * 20
SQM_PER_BIGHA = SQM_PER_KATTHA * 20


@dataclass(frozen=True)
class RopaniArea:
    ropani: int
    aana: int
    paisa: int
    daam: Decimal


def sqm_to_ropani(sqm) -> RopaniArea:
    total = Decimal(str(sqm))
    ropani, rem = divmod(total, SQM_PER_ROPANI)
    aana, rem = divmod(rem, SQM_PER_AANA)
    paisa, rem = divmod(rem, SQM_PER_PAISA)
    daam = (rem / SQM_PER_DAAM).quantize(Decimal("0.01"))
    return RopaniArea(int(ropani), int(aana), int(paisa), daam)


def format_npr(paisa: int) -> str:
    rupees = Decimal(paisa) / 100
    if rupees >= 10_000_000:
        return f"Rs. {rupees / 10_000_000:.2f} Cr"
    if rupees >= 100_000:
        return f"Rs. {rupees / 100_000:.2f} Lakh"
    return f"Rs. {rupees:,.0f}"
