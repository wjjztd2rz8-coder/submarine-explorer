"""ESRI ASCII Grid (.asc / ArcInfo ASCII Grid) parser -- Python 3.9 stdlib only.

The format is a small text header followed by whitespace-separated float values
in row-major order, FIRST ROW = NORTH edge (this matches our tile format, so no
vertical flip is required anywhere in the pipeline).

Header keys we accept (case-insensitive):
    ncols, nrows, xllcorner/xllcenter, yllcorner/yllcenter, cellsize, nodata_value

Reference: https://en.wikipedia.org/wiki/Esri_grid
"""

from typing import Dict, Iterable, List, NamedTuple, Optional

_HEADER_KEYS = (
    "ncols",
    "nrows",
    "xllcorner",
    "yllcorner",
    "xllcenter",
    "yllcenter",
    "cellsize",
    "nodata_value",
)


class EsriGrid(NamedTuple):
    ncols: int
    nrows: int
    xllcorner: float  # longitude of the lower-left CORNER of the grid
    yllcorner: float  # latitude of the lower-left CORNER of the grid
    cellsize: float  # degrees per cell (square cells in GMRT esriascii output)
    nodata_value: float
    # Row-major, length == ncols*nrows. Row 0 is the NORTHERNMOST row.
    values: List[float]

    @property
    def north(self) -> float:
        return self.yllcorner + self.nrows * self.cellsize

    @property
    def south(self) -> float:
        return self.yllcorner

    @property
    def west(self) -> float:
        return self.xllcorner

    @property
    def east(self) -> float:
        return self.xllcorner + self.ncols * self.cellsize


class EsriAsciiError(ValueError):
    pass


def parse_esri_ascii(lines: Iterable[str]) -> EsriGrid:
    """Parse an ESRI ASCII grid from an iterable of text lines.

    Accepts any iterable of str (a file object, a list, a splitlines() result),
    so callers can stream a large file without loading it all as one string.
    """
    header: Dict[str, float] = {}
    data: List[float] = []
    in_data = False

    for raw in lines:
        line = raw.strip()
        if not line:
            continue
        if not in_data:
            first = line.split(None, 1)[0].lower()
            if first in _HEADER_KEYS:
                parts = line.split()
                if len(parts) < 2:
                    raise EsriAsciiError("malformed header line: %r" % raw)
                try:
                    header[first] = float(parts[1])
                except ValueError as exc:
                    raise EsriAsciiError("bad header value in %r" % raw) from exc
                # Some producers put data on the same line as the last header key.
                continue
            in_data = True
        data.extend(float(tok) for tok in line.split())

    missing = [k for k in ("ncols", "nrows", "cellsize") if k not in header]
    if missing:
        raise EsriAsciiError("missing header keys: %s" % ", ".join(missing))

    ncols = int(header["ncols"])
    nrows = int(header["nrows"])
    cellsize = header["cellsize"]

    # Normalise *center* variants to *corner* variants.
    if "xllcorner" in header:
        xll = header["xllcorner"]
    elif "xllcenter" in header:
        xll = header["xllcenter"] - cellsize / 2.0
    else:
        raise EsriAsciiError("missing xllcorner/xllcenter")
    if "yllcorner" in header:
        yll = header["yllcorner"]
    elif "yllcenter" in header:
        yll = header["yllcenter"] - cellsize / 2.0
    else:
        raise EsriAsciiError("missing yllcorner/yllcenter")

    nodata = header.get("nodata_value", -9999.0)

    expected = ncols * nrows
    if len(data) != expected:
        raise EsriAsciiError(
            "cell count mismatch: header says %d (%dx%d), got %d"
            % (expected, ncols, nrows, len(data))
        )

    return EsriGrid(ncols, nrows, xll, yll, cellsize, nodata, data)


def parse_esri_ascii_file(path: str) -> EsriGrid:
    with open(path, "r") as fh:
        return parse_esri_ascii(fh)


def fill_nodata(
    values: List[float], ncols: int, nrows: int, nodata: float
) -> "tuple[List[float], int]":
    """Return (filled_values, nodata_count).

    Strategy: iterative nearest-valid-neighbour dilation (4-neighbourhood). Each
    pass averages the already-valid neighbours of each hole cell, so holes fill
    inward from their edges. If a pass makes no progress (the remaining holes
    have no valid neighbour at all -- e.g. the whole grid is NODATA), the rest
    fall back to the minimum valid value, or 0.0 if there is none.
    """
    out = list(values)

    def is_hole(v: float) -> bool:
        return v == nodata or v != v  # NaN-safe

    todo = [i for i, v in enumerate(out) if is_hole(v)]
    nodata_count = len(todo)
    if not nodata_count:
        return out, 0

    valid = [v for v in out if not is_hole(v)]
    fallback = min(valid) if valid else 0.0
    hole = set(todo)

    while todo:
        filled = []
        remaining = []
        for idx in todo:
            r, c = divmod(idx, ncols)
            acc = 0.0
            n = 0
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                rr, cc = r + dr, c + dc
                if 0 <= rr < nrows and 0 <= cc < ncols:
                    j = rr * ncols + cc
                    if j not in hole:
                        acc += out[j]
                        n += 1
            if n:
                filled.append((idx, acc / n))
            else:
                remaining.append(idx)
        if not filled:
            for idx in remaining:
                out[idx] = fallback
                hole.discard(idx)
            break
        for idx, v in filled:
            out[idx] = v
            hole.discard(idx)
        todo = remaining

    return out, nodata_count
