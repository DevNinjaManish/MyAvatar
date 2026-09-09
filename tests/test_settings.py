import copy
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend import settings

ROOT = Path(__file__).resolve().parents[1]


class Settings(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / 'nested' / 'settings.json'
        self.defaults_path = ROOT / 'config.json'
        self.defaults = settings.read_defaults(self.defaults_path)

    def write(self, value):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(value), encoding='utf-8')

    def load(self):
        return settings.load_config(self.defaults_path, self.path)

    def test_first_launch_applies_declared_profile_not_unprofiled_model(self):
        result = self.load()
        self.assertEqual(result['performanceProfile'], 'medium')
        self.assertEqual(result['llm']['model'], self.defaults['performanceProfiles']['medium']['llm']['model'])
        self.assertEqual(result['llm']['context'], 4096)
        self.assertEqual(result['tts']['speed'], 1.04)
        self.assertFalse(self.path.parent.exists())

    def test_valid_legacy_preferences_restore_all_bot_and_profile_combinations(self):
        for bot in self.defaults['bots']:
            for profile in self.defaults['performanceProfiles']:
                with self.subTest(bot=bot, profile=profile):
                    self.write({'persona': bot, 'performanceProfile': profile, 'interaction': 'manual', 'memoryEnabled': False})
                    config = self.load()
                    self.assertEqual(config['tts']['voice'], self.defaults['bots'][bot]['voice'])
                    self.assertEqual(config['conversation']['system'], self.defaults['bots'][bot]['system'])
                    self.assertEqual(config['conversation']['persona'], bot)
                    self.assertEqual(config['performanceProfile'], profile)
                    self.assertEqual(config['audio']['mode'], 'manual')
                    self.assertFalse(config['memory']['enabled'])

    def test_malformed_or_nonobject_preferences_recover_without_rewriting_file(self):
        for raw in ('{broken', 'null', '[]', 'true', '42', '"text"', ''):
            with self.subTest(raw=raw):
                self.path.parent.mkdir(parents=True, exist_ok=True)
                self.path.write_text(raw)
                with self.assertLogs('avatar.settings', 'WARNING'):
                    result = self.load()
                self.assertEqual(result['performanceProfile'], 'medium')
                self.assertEqual(result['audio']['mode'], 'manual')
                self.assertFalse(result['memory']['enabled'])
                self.assertEqual(self.path.read_text(), raw)

    def test_invalid_utf8_recovers_without_logging_file_content(self):
        self.path.parent.mkdir(parents=True)
        self.path.write_bytes(b'private-secret\xff')
        with self.assertLogs('avatar.settings', 'WARNING') as logs:
            self.assertEqual(self.load()['performanceProfile'], 'medium')
        self.assertNotIn('private-secret', '\n'.join(logs.output))
        self.assertEqual(self.path.read_bytes(), b'private-secret\xff')

    def test_oversized_preferences_are_bounded_and_untouched(self):
        self.path.parent.mkdir(parents=True)
        data = b' ' * (settings.MAX_PREFERENCE_BYTES + 1)
        self.path.write_bytes(data)
        with self.assertLogs('avatar.settings', 'WARNING'):
            self.assertEqual(settings.read_preferences(self.path), {'interaction': 'manual', 'memoryEnabled': False})
        self.assertEqual(self.path.read_bytes(), data)

    def test_deeply_nested_preferences_recover(self):
        self.path.parent.mkdir(parents=True)
        self.path.write_text('[' * 2000 + ']' * 2000)
        with self.assertLogs('avatar.settings', 'WARNING'):
            self.assertEqual(settings.read_preferences(self.path), {'interaction': 'manual', 'memoryEnabled': False})

    def test_unreadable_preferences_recover(self):
        with patch.object(Path, 'open', side_effect=PermissionError('private path')), self.assertLogs('avatar.settings', 'WARNING') as logs:
            self.assertEqual(settings.read_preferences(self.path), {'interaction': 'manual', 'memoryEnabled': False})
        self.assertNotIn('private path', '\n'.join(logs.output))

    def test_future_and_invalid_schema_versions_do_not_crash_or_migrate_destructively(self):
        for version in (2, 0, True, '1', [], None):
            with self.subTest(version=version):
                self.write({'schemaVersion': version, 'persona': 'robot'})
                original = self.path.read_bytes()
                with self.assertLogs('avatar.settings', 'WARNING'):
                    self.assertEqual(self.load()['conversation']['persona'], 'nova')
                self.assertEqual(self.path.read_bytes(), original)

    def test_schema_one_and_versionless_files_remain_compatible(self):
        for extra in ({}, {'schemaVersion': 1}):
            self.write({**extra, 'persona': 'robot'})
            self.assertEqual(self.load()['conversation']['persona'], 'robot')

    def test_invalid_ids_never_reach_dictionary_lookups(self):
        for value in ([], {}, None, 1, True, '../outside', 'missing'):
            with self.subTest(value=value):
                self.write({'persona': value, 'performanceProfile': value})
                with self.assertLogs('avatar.settings', 'WARNING'):
                    config = self.load()
                self.assertEqual(config['conversation']['persona'], 'nova')
                self.assertEqual(config['performanceProfile'], 'medium')

    def test_memory_preference_is_never_truthiness_coerced(self):
        for value in ('false', 'true', 1, 0, [], {}):
            self.write({'memoryEnabled': value})
            with self.assertLogs('avatar.settings', 'WARNING'):
                self.assertFalse(self.load()['memory']['enabled'])
        for value in (True, False):
            self.write({'memoryEnabled': value})
            self.assertIs(self.load()['memory']['enabled'], value)

    def test_invalid_fields_do_not_discard_other_valid_choices(self):
        self.write({'persona': 'luma', 'interaction': [], 'language': {'value': 'en'}, 'memoryEnabled': False})
        with self.assertLogs('avatar.settings', 'WARNING'):
            config = self.load()
        self.assertEqual(config['conversation']['persona'], 'luma')
        self.assertEqual(config['stt']['language'], 'en')
        self.assertEqual(config['audio']['mode'], 'manual')

    def test_saved_preferences_cannot_override_provider_or_prompt_definitions(self):
        self.write({'llm': {'url': 'https://untrusted.invalid'}, 'bots': {}, 'system': 'override', 'tts': {'voice': 'other'}})
        config = self.load()
        self.assertEqual(config['llm']['url'], self.defaults['llm']['url'])
        self.assertEqual(config['tts']['voice'], self.defaults['bots']['nova']['voice'])
        self.assertNotIn('system', config)

    def test_greeting_indices_are_known_bounded_integers_not_booleans(self):
        self.write({'greetingIndexes': {'nova': 2, 'robot': -1, 'butler': True, 'pixel': 2**80, 'luma': '2', '../secret': 1}})
        with self.assertLogs('avatar.settings', 'WARNING'):
            self.assertEqual(self.load()['_greetingIndexes'], {'nova': 2})
        for value in (None, [], 'broken'):
            self.write({'greetingIndexes': value})
            with self.assertLogs('avatar.settings', 'WARNING'):
                self.assertEqual(self.load()['_greetingIndexes'], {})

    def test_high_to_fast_restores_base_values_and_preserves_companion_preferences(self):
        self.write({'persona': 'butler', 'performanceProfile': 'high', 'interaction': 'manual', 'memoryEnabled': False, 'greetingIndexes': {'butler': 2}})
        config = self.load()
        settings.apply_profile(config, 'low', self.defaults)
        self.assertEqual(config['tts']['speed'], self.defaults['tts']['speed'])
        self.assertEqual(config['tts']['voice'], self.defaults['bots']['butler']['voice'])
        self.assertEqual(config['conversation']['persona'], 'butler')
        self.assertEqual(config['audio']['mode'], 'manual')
        self.assertEqual(config['_greetingIndexes'], {'butler': 2})

    def test_repeated_switches_are_idempotent_and_do_not_mutate_defaults(self):
        original = copy.deepcopy(self.defaults)
        config = self.load()
        for name in ('high', 'medium', 'low', 'medium', 'medium'):
            settings.apply_profile(config, name, self.defaults)
        self.assertEqual(config, self.load())
        self.assertEqual(self.defaults, original)
        config['audio']['vad']['threshold'] = 99
        self.assertNotEqual(self.defaults['audio']['vad']['threshold'], 99)

    def test_invalid_profile_request_falls_back_to_declared_default(self):
        config = self.load()
        for invalid in (None, [], {}, 'missing'):
            settings.apply_profile(config, invalid, self.defaults)
            self.assertEqual(config['performanceProfile'], self.defaults['performanceProfile'])

    def test_bad_profile_does_not_partially_mutate_running_config(self):
        config = self.load()
        before = copy.deepcopy(config)
        defaults = copy.deepcopy(self.defaults)
        defaults['performanceProfiles']['high']['avatar'] = []
        with self.assertRaisesRegex(ValueError, 'overrides'):
            settings.apply_profile(config, 'high', defaults)
        self.assertEqual(config, before)

    def test_broken_repository_defaults_fail_clearly(self):
        path = Path(self.directory.name) / 'config.json'
        for contents in ('{bad', '[]', '{}'):
            path.write_text(contents)
            with self.assertRaisesRegex(ValueError, 'config.json'):
                settings.read_defaults(path)
        with self.assertRaisesRegex(ValueError, 'config.json'):
            settings.read_defaults(path.parent / 'missing.json')

    def test_unknown_declared_default_is_not_silently_replaced(self):
        path = Path(self.directory.name) / 'config.json'
        defaults = copy.deepcopy(self.defaults)
        defaults['performanceProfile'] = 'missing'
        path.write_text(json.dumps(defaults))
        with self.assertRaisesRegex(ValueError, 'existing'):
            settings.read_defaults(path)

    def test_atomic_save_round_trips_only_allowed_preferences(self):
        config = self.load()
        config['_greetingIndexes'] = {'nova': 2}
        config['privateTranscript'] = 'do not save'
        self.assertTrue(settings.save_preferences(config, self.path))
        saved = json.loads(self.path.read_text())
        self.assertEqual(set(saved), {'schemaVersion', 'persona', 'performanceProfile', 'interaction', 'memoryEnabled', 'language', 'greetingIndexes'})
        self.assertEqual(saved['schemaVersion'], 1)
        self.assertNotIn('do not save', self.path.read_text())
        self.assertEqual(self.load()['_greetingIndexes'], {'nova': 2})
        if os.name == 'posix':
            self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        self.assertEqual(list(self.path.parent.glob('*.tmp')), [])

    def test_failed_replace_keeps_old_file_and_removes_temp_file(self):
        self.write({'persona': 'robot'})
        original = self.path.read_bytes()
        config = self.load()
        with patch('backend.settings.os.replace', side_effect=OSError('disk full')), self.assertLogs('avatar.settings', 'WARNING'):
            self.assertFalse(settings.save_preferences(config, self.path))
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual(list(self.path.parent.iterdir()), [self.path])

    def test_failed_flush_keeps_old_file(self):
        self.write({'persona': 'robot'})
        original = self.path.read_bytes()
        with patch('backend.settings.os.fsync', side_effect=OSError('I/O')), self.assertLogs('avatar.settings', 'WARNING'):
            self.assertFalse(settings.save_preferences(self.load(), self.path))
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual(list(self.path.parent.iterdir()), [self.path])

    def test_failed_directory_creation_does_not_fail_in_memory_session(self):
        config = self.load()
        with patch.object(Path, 'mkdir', side_effect=PermissionError()), self.assertLogs('avatar.settings', 'WARNING'):
            self.assertFalse(settings.save_preferences(config, self.path))
        self.assertEqual(config['conversation']['persona'], 'nova')
