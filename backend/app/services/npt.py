"""Timezone and clock helpers. The single source of truth for "now".

Storage
-------
Every datetime column is TIMESTAMPTZ holding an aware instant, and every
value is written with `utcnow()`. A `timestamptz` is normalized on write,
so no session or server timezone can reinterpret it. That matters here:
the database is hosted on Neon and its branch timezone was changed to
Asia/Kathmandu, which under the previous naive-UTC schema silently shifted
every timestamp the browser sent by +05:45.

Calendar days
-------------
User-facing days are days in the user's own timezone, not server-local
days. Render runs in UTC, so server-local dates are wrong for roughly a
six-hour window around every midnight. Use `today_local()` and
`day_bounds_utc()` and never `date.today()`.

The timezone comes from APP_TIMEZONE so it is defined once instead of
being re-spelled as a +05:45 offset in four separate modules.
"""
from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from backend.app.config import settings

UTC = timezone.utc


def _resolve_timezone() -> ZoneInfo:
    name = (settings.APP_TIMEZONE or "").strip() or "Asia/Kathmandu"
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        # A bad APP_TIMEZONE must not take the process down; Nepal is the
        # documented default.
        return ZoneInfo("Asia/Kathmandu")


# The user's timezone. Historical name kept because callers import it.
NPT = _resolve_timezone()


def utcnow() -> datetime:
    """Current instant as an aware UTC datetime.

    Use this for every stored timestamp. `datetime.utcnow()` is both naive
    and deprecated, and a naive value written into a timestamptz column is
    interpreted in the *session* timezone rather than UTC.
    """
    return datetime.now(UTC)


def now_local() -> datetime:
    """Current instant in the user's timezone."""
    return datetime.now(NPT)


# Historical names. Kept so existing callers keep working; they now read
# from the same resolved timezone rather than a duplicated constant.
def now_npt() -> datetime:
    return now_local()


def today_npt() -> date:
    """Current calendar date in the user's timezone."""
    return now_local().date()


def as_utc(dt: datetime) -> datetime:
    """Normalize any datetime to an aware UTC datetime.

    Naive input is assumed to already be UTC, which is what the stored
    values were before this module existed. Accepting both keeps old
    callers and SQLite (which returns naive datetimes) working.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def day_bounds_utc(day: date) -> tuple[datetime, datetime]:
    """Return (start, end) aware UTC datetimes covering a local calendar day.

    Local midnight is converted to UTC before querying, so a day in Nepal
    is 18:15 UTC the previous day to 18:14:59 UTC the same day.
    """
    start = datetime.combine(day, datetime.min.time(), tzinfo=NPT).astimezone(UTC)
    end = datetime.combine(day, datetime.max.time(), tzinfo=NPT).astimezone(UTC)
    return start, end