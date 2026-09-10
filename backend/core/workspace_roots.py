"""Workspace-root selection helpers for Rivet coding sessions.

Selection is explicit and local. This module never scans outside the chosen root,
never creates directories, and never executes commands.
"""
from __future__ import annotations

from pathlib import Path


def select_workspace(requested: str | None, *, default: Path | str = '.') -> Path:
    """Resolve an existing directory for a coding session.

    Empty selection uses the app repository. Symlinks are resolved once so all
    downstream path checks operate on the canonical root.
    """
    raw = requested.strip() if isinstance(requested, str) else ''
    root = Path(raw).expanduser() if raw else Path(default)
    root = root.resolve()
    if not root.exists():
        raise ValueError('Selected workspace does not exist.')
    if not root.is_dir():
        raise ValueError('Selected workspace must be a directory.')
    return root


def public_workspace(root: Path | str) -> dict[str, str]:
    resolved = Path(root).resolve()
    return {'path': str(resolved), 'name': resolved.name or str(resolved)}
