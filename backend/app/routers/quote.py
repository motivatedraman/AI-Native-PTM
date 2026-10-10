from datetime import date
from typing import Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.app.services.npt import today_npt

router = APIRouter(prefix="/api/quote", tags=["Quote"])

# Deterministic per-day pick so the same quote survives a page reload and
# a backend restart, and so two requests on the same day agree. Rotating
# through a free API on every render would be both noisy and rude.
_LOCAL_QUOTES = [
    "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.",
    "It is not that we have a short time to live, but that we waste a lot of it.",
    "How many men would be better off if they stopped doing what they think is right?",
    "Order your soul. Reduce your wants.",
    "You have power over your mind - not outside events. Realize this, and you will find strength.",
    "The happiness of your life depends upon the quality of your thoughts.",
    "If you do not have a consistent goal in life, you can not live it in a consistent way.",
    "First say to yourself what you would be; and then do what you have to do.",
    "Well begun is half done.",
    "It is never too late to be what you might have been.",
    "No man is an island, entire of itself; every man is a piece of the continent.",
    "The best way out is always through.",
    "Knowing is not enough; we must apply. Willing is not enough; we must do.",
    "Discipline equals freedom.",
    "Do the hard jobs first. The easy jobs will take care of themselves.",
]

_cache: dict = {}


class QuoteResponse(BaseModel):
    text: str
    author: Optional[str] = None
    date: str


def _seeded_index(day: date) -> int:
    return day.toordinal() % len(_LOCAL_QUOTES)


async def _fetch_remote() -> Optional[QuoteResponse]:
    """ZenQuotes is free and needs no key. Attribution is required by their
    terms, so the author is carried through when we can get one."""
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get("https://zenquotes.io/api/random")
            res.raise_for_status()
            payload = res.json()
            if not payload:
                return None
            item = payload[0]
            text = (item.get("q") or "").strip()
            author = (item.get("a") or "").strip() or None
            if not text:
                return None
            return QuoteResponse(text=text, author=author, date="")
    except Exception:
        return None


@router.get("", response_model=QuoteResponse)
async def get_quote():
    today = today_npt()
    key = today.isoformat()

    if key not in _cache:
        remote = await _fetch_remote()
        if remote:
            remote.date = key
            _cache[key] = remote
        else:
            text = _LOCAL_QUOTES[_seeded_index(today)]
            _cache[key] = QuoteResponse(text=text, author=None, date=key)

    return _cache[key]