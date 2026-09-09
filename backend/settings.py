"""Local preference persistence and deterministic profile resolution.

No models are imported or initialised here. Repository defaults remain the
source of provider configuration; saved preferences can select, not inject,
models or bot definitions. Corrupt preference files are never deleted on read.
"""
from __future__ import annotations

import copy
import json
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import Any

log = logging.getLogger('avatar.settings')
SCHEMA_VERSION = 1
MAX_PREFERENCE_BYTES = 64 * 1024
PROFILE_SECTIONS = ('llm', 'conversation', 'tts', 'avatar')


def read_defaults(path: Path) -> dict[str, Any]:
    """Fail clearly for broken repository defaults; do not guess provider assets."""
    try:
        defaults = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError, UnicodeError) as exc:
        raise ValueError('Cannot read config.json. Restore a valid local configuration.') from exc
    required = (*PROFILE_SECTIONS, 'audio', 'stt', 'performanceProfiles', 'bots')
    if not isinstance(defaults, dict) or any(not isinstance(defaults.get(k), dict) for k in required):
        raise ValueError('config.json must contain the required engine, profile and bot objects.')
    profile = defaults.get('performanceProfile')
    bot = defaults['conversation'].get('persona')
    if not _known(profile, defaults['performanceProfiles']) or not _known(bot, defaults['bots']):
        raise ValueError('config.json must select an existing performance profile and companion.')
    return defaults


def _known(value: Any, choices: dict) -> bool:
    return isinstance(value, str) and value in choices


def read_preferences(path: Path) -> dict[str, Any]:
    try:
        with path.open('rb') as source:
            data = source.read(MAX_PREFERENCE_BYTES + 1)
        if len(data) > MAX_PREFERENCE_BYTES:
            raise ValueError('size limit')
        value = json.loads(data.decode('utf-8'))
        if not isinstance(value, dict):
            raise ValueError('object required')
        version = value.get('schemaVersion', SCHEMA_VERSION)
        if type(version) is not int or version != SCHEMA_VERSION:
            raise ValueError('unsupported schema')
        return value
    except FileNotFoundError:
        return {}
    except (OSError, ValueError, UnicodeError, RecursionError) as exc:
        # Do not log contents, user-supplied values or exception messages/paths.
        log.warning('Saved preferences unavailable (%s); using safe preference fallbacks. File left unchanged.', type(exc).__name__)
        # A broken file may have held a user's manual/private choices. Do not
        # turn its loss into automatic listening or memory persistence.
        return {'interaction': 'manual', 'memoryEnabled': False}


def select_preferences(raw: dict[str, Any], defaults: dict[str, Any]) -> dict[str, Any]:
    """Allowlist persisted choices without coercing strings, booleans or IDs."""
    clean: dict[str, Any] = {}
    checks = {
        'persona': lambda v: _known(v, defaults['bots']),
        'performanceProfile': lambda v: _known(v, defaults['performanceProfiles']),
        'interaction': lambda v: isinstance(v, str) and v in ('live', 'manual'),
        'memoryEnabled': lambda v: type(v) is bool,
        # Syntax validation only; multilingual/provider compatibility is a later batch.
        'language': lambda v: isinstance(v, str) and re.fullmatch(r'[a-z]{2,3}', v) is not None,
    }
    for key, valid in checks.items():
        if key not in raw:
            continue
        if valid(raw[key]):
            clean[key] = raw[key]
        else:
            log.warning('Ignoring invalid saved preference: %s.', key)
            if key == 'interaction':
                clean[key] = 'manual'
            elif key == 'memoryEnabled':
                clean[key] = False
    indices = raw.get('greetingIndexes', {})
    if isinstance(indices, dict):
        clean['greetingIndexes'] = {
            bot: index for bot, index in indices.items()
            if _known(bot, defaults['bots']) and type(index) is int and 0 <= index <= 2**31 - 1
        }
        if len(clean['greetingIndexes']) != len(indices):
            log.warning('Ignoring invalid saved greeting indices.')
    else:
        clean['greetingIndexes'] = {}
        log.warning('Ignoring invalid saved greeting indices.')
    return clean


def apply_profile(config: dict[str, Any], name: Any, defaults: dict[str, Any]) -> None:
    """Rebase each profile switch on defaults, not on the previous profile.

This avoids inheriting High's voice speed when switching to Fast. Retain the
active bot, microphone mode, memory choice and greeting rotation. High remains
supported until the separately tested two-mode UI migration.
"""
    profiles = defaults['performanceProfiles']
    name = name if _known(name, profiles) else defaults['performanceProfile']
    profile = profiles[name]
    if not isinstance(profile, dict):
        raise ValueError('The selected performance profile must be an object.')
    bot = config['conversation'].get('persona')
    if not _known(bot, defaults['bots']):
        bot = defaults['conversation']['persona']
    identity = defaults['bots'][bot]
    if not isinstance(identity, dict) or any(not isinstance(identity.get(k), str) or not identity[k].strip() for k in ('system', 'voice')):
        raise ValueError('The selected companion must define its prompt and voice.')
    sections = {}
    for section in PROFILE_SECTIONS:
        overrides = profile.get(section, {})
        if not isinstance(overrides, dict):
            raise ValueError('Performance profile overrides must be objects.')
        sections[section] = {**copy.deepcopy(defaults[section]), **copy.deepcopy(overrides)}
    sections['conversation'].update(persona=bot, system=identity['system'])
    sections['tts']['voice'] = identity['voice']
    # Validate before mutating the session so failed switches are non-partial.
    config.update(sections)
    config['performanceProfile'] = name


def load_config(config_path: Path, preferences_path: Path) -> dict[str, Any]:
    defaults = read_defaults(config_path)
    prefs = select_preferences(read_preferences(preferences_path), defaults)
    config = copy.deepcopy(defaults)
    config['conversation']['persona'] = prefs.get('persona', defaults['conversation']['persona'])
    apply_profile(config, prefs.get('performanceProfile'), defaults)
    if 'language' in prefs:
        config['stt']['language'] = prefs['language']
    if 'interaction' in prefs:
        config['audio']['mode'] = prefs['interaction']
    if 'memoryEnabled' in prefs:
        config.setdefault('memory', {})['enabled'] = prefs['memoryEnabled']
    config['_greetingIndexes'] = prefs['greetingIndexes']
    return config


def save_preferences(config: dict[str, Any], path: Path) -> bool:
    """Write a complete private JSON file, then atomically replace in the same dir.

On failure keep the last saved file and let the current in-memory session run.
Concurrent saves are complete snapshots (last successful writer wins), not a
cross-process preference merge or a guarantee against power loss.
"""
    raw = {
        'persona': config['conversation']['persona'],
        'performanceProfile': config['performanceProfile'],
        'interaction': config['audio']['mode'],
        'memoryEnabled': config.get('memory', {}).get('enabled', False),
        'language': config['stt']['language'],
        'greetingIndexes': config.get('_greetingIndexes', {}),
    }
    payload = {'schemaVersion': SCHEMA_VERSION, **select_preferences(raw, config)}
    temporary = None
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                         prefix=f'.{path.name}.', suffix='.tmp', delete=False) as target:
            temporary = Path(target.name)
            json.dump(payload, target, ensure_ascii=True, allow_nan=False)
            target.write('\n')
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, path)
        return True
    except OSError as exc:
        log.warning('Could not save preferences (%s); keeping the previous file and in-memory choices.', type(exc).__name__)
        return False
    finally:
        if temporary is not None:
            try:
                temporary.unlink(missing_ok=True)
            except OSError:
                log.warning('Could not remove a temporary preference file.')
