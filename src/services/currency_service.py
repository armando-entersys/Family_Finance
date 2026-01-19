"""
Currency service - Exchange rate management and conversion.
Supports multi-currency operations as per MD050.
"""

from decimal import Decimal
from typing import Dict, Optional
import httpx

from src.core.config import get_settings

settings = get_settings()


# Fallback rates if API is unavailable (conservative estimates)
FALLBACK_RATES: Dict[str, Decimal] = {
    "USD": Decimal("17.50"),
    "EUR": Decimal("19.00"),
    "GBP": Decimal("22.00"),
    "CAD": Decimal("13.00"),
    "MXN": Decimal("1.0"),
}


class CurrencyService:
    """
    Service for currency conversion operations.
    Uses external API with fallback to cached rates.
    """

    def __init__(self):
        self.base_currency = settings.base_currency
        self._cached_rates: Dict[str, Decimal] = FALLBACK_RATES.copy()

    async def get_exchange_rate(
        self,
        from_currency: str,
        to_currency: str = None,
    ) -> Decimal:
        """
        Get exchange rate between two currencies.

        Args:
            from_currency: Source currency code (ISO 4217)
            to_currency: Target currency code (defaults to base_currency)

        Returns:
            Exchange rate as Decimal
        """
        if to_currency is None:
            to_currency = self.base_currency

        from_currency = from_currency.upper()
        to_currency = to_currency.upper()

        # Same currency = 1:1
        if from_currency == to_currency:
            return Decimal("1.0")

        # If converting TO base currency, use direct rate
        if to_currency == self.base_currency:
            return await self._get_rate_to_base(from_currency)

        # If converting FROM base currency, invert the rate
        if from_currency == self.base_currency:
            rate = await self._get_rate_to_base(to_currency)
            if rate > 0:
                return Decimal("1.0") / rate
            return Decimal("1.0")

        # Cross-rate conversion (A -> MXN -> B)
        rate_a = await self._get_rate_to_base(from_currency)
        rate_b = await self._get_rate_to_base(to_currency)

        if rate_b > 0:
            return rate_a / rate_b
        return Decimal("1.0")

    async def _get_rate_to_base(self, currency: str) -> Decimal:
        """Get rate from currency to base currency (MXN)."""
        currency = currency.upper()

        if currency == self.base_currency:
            return Decimal("1.0")

        # Return cached/fallback rate
        return self._cached_rates.get(currency, Decimal("1.0"))

    async def refresh_rates(self) -> bool:
        """
        Refresh exchange rates from external API.
        Called periodically by background task.

        Returns:
            True if refresh successful, False otherwise
        """
        try:
            # Using a free exchange rate API
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://api.exchangerate-api.com/v4/latest/{self.base_currency}"
                )

                if response.status_code == 200:
                    data = response.json()
                    rates = data.get("rates", {})

                    # Update cached rates (inverted since API gives MXN -> X)
                    for currency, rate in rates.items():
                        if rate > 0:
                            self._cached_rates[currency] = Decimal(str(1 / rate))

                    return True

        except Exception:
            # Silent fail - use cached rates
            pass

        return False

    def convert(
        self,
        amount: Decimal,
        from_currency: str,
        rate: Decimal,
    ) -> Decimal:
        """
        Convert amount using provided exchange rate.

        Args:
            amount: Original amount
            from_currency: Source currency
            rate: Exchange rate to apply

        Returns:
            Converted amount in base currency
        """
        return amount * rate

    def get_supported_currencies(self) -> list[str]:
        """Get list of supported currency codes."""
        return list(self._cached_rates.keys())

    def format_currency(
        self,
        amount: Decimal,
        currency: str = None,
    ) -> str:
        """
        Format amount with currency symbol.

        Args:
            amount: Amount to format
            currency: Currency code (defaults to base_currency)

        Returns:
            Formatted string (e.g., "$1,234.56 MXN")
        """
        if currency is None:
            currency = self.base_currency

        currency = currency.upper()

        # Currency symbols
        symbols = {
            "MXN": "$",
            "USD": "US$",
            "EUR": "€",
            "GBP": "£",
            "CAD": "CA$",
        }

        symbol = symbols.get(currency, "$")
        formatted = f"{symbol}{amount:,.2f} {currency}"

        return formatted


# Singleton instance
_currency_service: Optional[CurrencyService] = None


def get_currency_service() -> CurrencyService:
    """Get or create currency service instance."""
    global _currency_service
    if _currency_service is None:
        _currency_service = CurrencyService()
    return _currency_service
