"""Validation and normalization for Rivet's proposed unified diffs.

This module never writes files and never executes commands. It only parses model
text into bounded preview metadata so later approval/apply work can consume a
strictly validated proposal.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

MAX_PATCH_CHARS = 48 * 1024
MAX_PATCH_FILES = 8
MAX_PATCH_LINES = 1200
BLOCKED_PREFIXES = (
    '.git/', 'data/', 'logs/', 'node_modules/', '.venv/', 'venv/',
)


@dataclass(frozen=True)
class PatchFile:
    path: str
    additions: int
    deletions: int


def _normalize_path(raw: str) -> str:
    value = raw.strip().split('\t', 1)[0]
    if value in ('/dev/null', ''):
        return value
    if value.startswith(('a/', 'b/')):
        value = value[2:]
    value = value.replace('\\', '/')
    if value.startswith('/') or any(part in ('', '.', '..') for part in value.split('/')):
        raise ValueError('Patch contains an unsafe path.')
    if value.startswith(BLOCKED_PREFIXES) or value in {p.rstrip('/') for p in BLOCKED_PREFIXES}:
        raise ValueError('Patch targets a blocked repository path.')
    return value


def extract_unified_diff(text: str) -> str:
    """Extract one unified-diff preview from model output without applying it."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError('Patch proposal is empty.')
    if len(text) > MAX_PATCH_CHARS * 2:
        raise ValueError('Patch proposal response is too large.')
    fenced = re.search(r'```(?:diff|patch)\s*\n(.*?)```', text, re.IGNORECASE | re.DOTALL)
    candidate = fenced.group(1) if fenced else text
    start = candidate.find('--- ')
    if start < 0:
        raise ValueError('Patch proposal does not contain a unified diff.')
    patch = candidate[start:].strip()
    if len(patch) > MAX_PATCH_CHARS:
        raise ValueError('Patch preview is too large.')
    if patch.count('\n') + 1 > MAX_PATCH_LINES:
        raise ValueError('Patch preview has too many lines.')
    return patch + '\n'


def summarize_unified_diff(patch: str) -> list[PatchFile]:
    """Validate paths and return per-file addition/deletion counts."""
    lines = patch.splitlines()
    files: list[PatchFile] = []
    current_path: str | None = None
    additions = deletions = 0
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.startswith('--- '):
            if index + 1 >= len(lines) or not lines[index + 1].startswith('+++ '):
                raise ValueError('Patch file header is incomplete.')
            if current_path is not None:
                files.append(PatchFile(current_path, additions, deletions))
            old_path = _normalize_path(line[4:])
            new_path = _normalize_path(lines[index + 1][4:])
            current_path = new_path if new_path != '/dev/null' else old_path
            if current_path == '/dev/null':
                raise ValueError('Patch file path is missing.')
            additions = deletions = 0
            index += 2
            continue
        if current_path is None:
            raise ValueError('Patch content appears before a file header.')
        if line.startswith('+') and not line.startswith('+++'):
            additions += 1
        elif line.startswith('-') and not line.startswith('---'):
            deletions += 1
        index += 1
    if current_path is not None:
        files.append(PatchFile(current_path, additions, deletions))
    if not files:
        raise ValueError('Patch proposal contains no files.')
    if len(files) > MAX_PATCH_FILES:
        raise ValueError(f'Patch proposal changes more than {MAX_PATCH_FILES} files.')
    names = [item.path for item in files]
    if len(names) != len(set(names)):
        raise ValueError('Patch proposal repeats the same file header.')
    return files


def parse_patch_proposal(text: str) -> dict[str, object]:
    """Return a safe, read-only patch preview with structured file metadata."""
    patch = extract_unified_diff(text)
    files = summarize_unified_diff(patch)
    return {
        'diff': patch,
        'files': [
            {'path': item.path, 'additions': item.additions, 'deletions': item.deletions}
            for item in files
        ],
        'readOnly': True,
        'applicable': False,
    }
