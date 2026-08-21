"""Nepal Standard Time (UTC+5:45) helpers.

The app stores naive UTC datetimes and treats all user-facing days as
NPT calendar days. Deployment servers (e.g. Render) run in UTC, so
server-local dates must never be used for day boundaries — always use
these helpers.
"""
from datetime import datetime, date, timedelta, timezone

NPT = timezone(timedelta(hours=5, minutes=45))


def now_npt() -> datetime:
    """Current timezone-aware datetime in NPT."""
    return datetime.now(NPT)


def today_npt() -> date:
    """Current calendar date in NPT."""
    return now_npt().date()


def day_bounds_utc(day: date):
    """Return (start, end) naive UTC datetimes covering an NPT calendar day.

    Stored timestamps are naive UTC, so NPT midnight is converted to UTC
    before querying (e.g. 2026-08-21 NPT -> 2026-08-20T18:15 .. 2026-08-21T18:14:59.999999 UTC).
    """
    start_npt = datetime.combine(day, datetime.min.time(), tzinfo=NPT)
    end_npt = datetime.combine(day, datetime.max.time(), tzinfo=NPT)
    return (
        start_npt.astimezone(timezone.utc).replace(tzinfo=None),
        end_npt.astimezone(timezone.utc).replace(tzinfo=None),
    )
