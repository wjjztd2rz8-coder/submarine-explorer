#!/usr/bin/env python3
"""Fail when a shipped third-party asset has no row in ATTRIBUTION.md.

Walks ``public/assets/**`` and ``public/audio/**`` and checks that every file's
name (for example ``rock_09.glb``) appears in ATTRIBUTION.md. The match is on
the bare filename, so a row may cite ``public/assets/models/rock_09.glb`` or just
``rock_09.glb``.

Exemptions
----------
- Directories in ``EXEMPT_DIRS`` hold vendored library files that are covered
  by one row for the whole folder instead of one row per file. The folder path
  itself must still appear in ATTRIBUTION.md, otherwise the check fails.
  ``public/assets/decoders/`` is the Draco glTF decoder copied from
  ``three/examples/jsm/libs/draco/gltf/`` (Google Draco, Apache-2.0), which
  ATTRIBUTION.md lists as ``public/assets/decoders/draco/*``.
- OS/editor litter (``.DS_Store``, ``Thumbs.db``, ``.gitkeep``) is ignored.

Exit status: 0 when every file is attributed, 1 when something is missing,
2 on usage errors (e.g. ATTRIBUTION.md not found). Stdlib only.
"""

import argparse
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Relative to the repo root, forward slashes, trailing slash.
SCANNED_DIRS = ("public/assets/", "public/audio/")
EXEMPT_DIRS = ("public/assets/decoders/",)
IGNORED_NAMES = frozenset({".DS_Store", "Thumbs.db", ".gitkeep", "desktop.ini"})


def list_asset_files(root):
    """Return sorted repo-relative paths (forward slashes) of files to check."""
    found = []
    for rel_dir in SCANNED_DIRS:
        top = os.path.join(root, *rel_dir.strip("/").split("/"))
        if not os.path.isdir(top):
            continue
        for dirpath, dirnames, filenames in os.walk(top):
            dirnames.sort()
            for name in sorted(filenames):
                if name in IGNORED_NAMES:
                    continue
                rel = os.path.relpath(os.path.join(dirpath, name), root).replace(os.sep, "/")
                found.append(rel)
    return found


def is_exempt(rel_path):
    return any(rel_path.startswith(d) for d in EXEMPT_DIRS)


def mentions(text, filename):
    """True when ``filename`` appears in ``text`` as a whole name.

    ``rock_09.glb`` matches in "`public/assets/models/rock_09.glb`" or
    "rock_09.glb." but not inside "big_rock_09.glb" or "rock_09.glb2".
    """
    pattern = r"(?<![\w.\-])" + re.escape(filename) + r"(?![\w\-])"
    return re.search(pattern, text) is not None


def check(root, attribution_text):
    """Return (checked_count, missing_files, missing_exempt_dirs)."""
    files = list_asset_files(root)
    missing = []
    used_exempt = set()
    checked = 0
    for rel in files:
        if is_exempt(rel):
            used_exempt.update(d for d in EXEMPT_DIRS if rel.startswith(d))
            continue
        checked += 1
        if not mentions(attribution_text, rel.rsplit("/", 1)[-1]):
            missing.append(rel)
    missing_dirs = sorted(d for d in used_exempt if d not in attribution_text)
    return checked, missing, missing_dirs


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Check that every file under public/assets/ and public/audio/ is "
            "mentioned by filename in ATTRIBUTION.md. Vendored library folders "
            "(%s) are exempt but must be mentioned as a folder."
        )
        % ", ".join(EXEMPT_DIRS),
    )
    parser.add_argument(
        "--root",
        default=REPO_ROOT,
        help="repository root to scan (default: the checkout containing this script)",
    )
    parser.add_argument(
        "--attribution",
        default=None,
        help="path to the attribution file (default: <root>/ATTRIBUTION.md)",
    )
    args = parser.parse_args(argv)

    attribution = args.attribution or os.path.join(args.root, "ATTRIBUTION.md")
    try:
        with open(attribution, encoding="utf-8") as fh:
            text = fh.read()
    except OSError as exc:
        print("check_attribution: cannot read %s: %s" % (attribution, exc), file=sys.stderr)
        return 2

    checked, missing, missing_dirs = check(args.root, text)
    if not missing and not missing_dirs:
        print(
            "check_attribution: OK, %d asset file(s) attributed in %s"
            % (checked, os.path.basename(attribution))
        )
        return 0

    if missing:
        print(
            "check_attribution: %d file(s) have no row in %s:"
            % (len(missing), os.path.basename(attribution)),
            file=sys.stderr,
        )
        for rel in missing:
            print("  - %s" % rel, file=sys.stderr)
    if missing_dirs:
        print("check_attribution: exempt folder(s) not mentioned at all:", file=sys.stderr)
        for d in missing_dirs:
            print("  - %s" % d, file=sys.stderr)
    print(
        "Add a row under the right heading in ATTRIBUTION.md (title, author, source "
        "URL, licence, and the shipped filename), or remove the file.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
