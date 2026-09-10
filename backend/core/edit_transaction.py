"""Safe, local file-edit transactions for Rivet.

This module applies already validated unified diffs without invoking a shell.
Every transaction snapshots original file contents and hashes, refuses stale
workspaces, applies atomically per file, verifies results, and supports rollback.
"""
from __future__ import annotations

import hashlib
import os
import secrets
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from backend.core.patch_proposal import parse_patch_proposal

MAX_TRANSACTION_FILES = 8


def _digest(data: bytes | None) -> str | None:
    return None if data is None else hashlib.sha256(data).hexdigest()


def _safe_target(root: Path, relative: str) -> Path:
    target = (root / relative).resolve()
    try:
        target.relative_to(root)
    except ValueError as exc:
        raise ValueError('Edit target escapes the selected workspace.') from exc
    return target


def _write_atomic(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f'.{path.name}.', suffix='.tmp', delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                pass


def _parse_file_patches(diff: str) -> list[tuple[str, str, list[str]]]:
    lines = diff.splitlines()
    result: list[tuple[str, str, list[str]]] = []
    i = 0
    while i < len(lines):
        if not lines[i].startswith('--- '):
            raise ValueError('Malformed unified diff.')
        if i + 1 >= len(lines) or not lines[i + 1].startswith('+++ '):
            raise ValueError('Malformed unified diff header.')
        old_raw, new_raw = lines[i][4:].split('\t', 1)[0], lines[i + 1][4:].split('\t', 1)[0]
        old = old_raw[2:] if old_raw.startswith('a/') else old_raw
        new = new_raw[2:] if new_raw.startswith('b/') else new_raw
        i += 2
        body: list[str] = []
        while i < len(lines) and not lines[i].startswith('--- '):
            body.append(lines[i]); i += 1
        result.append((old, new, body))
    return result


def _apply_hunks(original: str, body: list[str]) -> str:
    source = original.splitlines(keepends=True)
    output: list[str] = []
    cursor = 0
    i = 0
    while i < len(body):
        header = body[i]
        if not header.startswith('@@ '):
            raise ValueError('Patch contains content outside a hunk.')
        import re
        match = re.match(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', header)
        if not match:
            raise ValueError('Patch hunk header is invalid.')
        old_start = int(match.group(1))
        target_index = max(0, old_start - 1)
        if target_index < cursor or target_index > len(source):
            raise ValueError('Patch hunk location is invalid or overlapping.')
        output.extend(source[cursor:target_index]); cursor = target_index; i += 1
        while i < len(body) and not body[i].startswith('@@ '):
            line = body[i]
            if line == '\\ No newline at end of file':
                i += 1; continue
            if not line:
                raise ValueError('Malformed empty patch line.')
            marker, text = line[0], line[1:]
            expected = text + '\n'
            if marker == ' ':
                if cursor >= len(source) or source[cursor].rstrip('\n') != text:
                    raise ValueError('Patch is stale: context no longer matches.')
                output.append(source[cursor]); cursor += 1
            elif marker == '-':
                if cursor >= len(source) or source[cursor].rstrip('\n') != text:
                    raise ValueError('Patch is stale: removed text no longer matches.')
                cursor += 1
            elif marker == '+':
                output.append(expected)
            else:
                raise ValueError('Patch contains an unsupported line type.')
            i += 1
    output.extend(source[cursor:])
    return ''.join(output)


@dataclass
class EditTransaction:
    id: str
    workspace: str
    diff: str
    files: list[dict[str, Any]]
    originals: dict[str, bytes | None]
    before_hashes: dict[str, str | None]
    status: str = 'pending'
    after_hashes: dict[str, str | None] = field(default_factory=dict)

    def public(self) -> dict[str, Any]:
        return {
            'id': self.id,
            'workspace': self.workspace,
            'files': self.files,
            'status': self.status,
            'requiresApproval': self.status == 'pending',
            'rollbackAvailable': self.status == 'applied',
        }


def create_transaction(proposal_text: str, *, root: Path | str = '.') -> EditTransaction:
    proposal = parse_patch_proposal(proposal_text)
    repo_root = Path(root).expanduser().resolve()
    if not repo_root.is_dir():
        raise ValueError('Selected workspace does not exist.')
    files = list(proposal['files'])
    if len(files) > MAX_TRANSACTION_FILES:
        raise ValueError('Too many files in one edit transaction.')
    originals: dict[str, bytes | None] = {}
    before_hashes: dict[str, str | None] = {}
    for item in files:
        relative = str(item['path'])
        target = _safe_target(repo_root, relative)
        data = target.read_bytes() if target.exists() else None
        originals[relative] = data
        before_hashes[relative] = _digest(data)
    return EditTransaction(
        id=secrets.token_hex(12), workspace=str(repo_root), diff=str(proposal['diff']),
        files=files, originals=originals, before_hashes=before_hashes,
    )


def apply_transaction(tx: EditTransaction) -> dict[str, Any]:
    if tx.status != 'pending':
        raise ValueError('Only a pending edit transaction can be applied.')
    root = Path(tx.workspace).resolve()
    patches = _parse_file_patches(tx.diff)
    changes: list[tuple[Path, bytes | None]] = []
    for old, new, body in patches:
        relative = new if new != '/dev/null' else old
        target = _safe_target(root, relative)
        current = target.read_bytes() if target.exists() else None
        if _digest(current) != tx.before_hashes.get(relative):
            raise ValueError('Workspace changed after preview; regenerate the patch before applying.')
        if old == '/dev/null':
            original_text = ''
        else:
            if current is None:
                raise ValueError('Patch target disappeared after preview.')
            try: original_text = current.decode('utf-8')
            except UnicodeDecodeError as exc: raise ValueError('Patch target is no longer UTF-8 text.') from exc
        if new == '/dev/null':
            changes.append((target, None))
        else:
            updated = _apply_hunks(original_text, body).encode('utf-8')
            changes.append((target, updated))
    written: list[Path] = []
    try:
        for target, data in changes:
            if data is None:
                target.unlink()
            else:
                _write_atomic(target, data)
            written.append(target)
    except Exception:
        for target in reversed(written):
            relative = target.relative_to(root).as_posix()
            original = tx.originals[relative]
            if original is None:
                target.unlink(missing_ok=True)
            else:
                _write_atomic(target, original)
        raise
    tx.after_hashes = {}
    for item in tx.files:
        relative = str(item['path']); target = _safe_target(root, relative)
        data = target.read_bytes() if target.exists() else None
        tx.after_hashes[relative] = _digest(data)
    tx.status = 'applied'
    return tx.public()


def rollback_transaction(tx: EditTransaction) -> dict[str, Any]:
    if tx.status != 'applied':
        raise ValueError('Only an applied transaction can be rolled back.')
    root = Path(tx.workspace).resolve()
    for relative, expected_hash in tx.after_hashes.items():
        target = _safe_target(root, relative)
        current = target.read_bytes() if target.exists() else None
        if _digest(current) != expected_hash:
            raise ValueError('Workspace changed after apply; automatic rollback was refused.')
    for relative, original in tx.originals.items():
        target = _safe_target(root, relative)
        if original is None:
            target.unlink(missing_ok=True)
        else:
            _write_atomic(target, original)
    tx.status = 'rolled_back'
    return tx.public()
