import tempfile
import unittest
from pathlib import Path

from backend.core.workspace import (
    build_change_plan_prompt,
    choose_context,
    list_workspace,
    search_workspace,
)


class WorkspaceAwarenessTests(unittest.TestCase):
    def test_tree_skips_blocked_and_binary_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            (root / 'src' / 'app.py').write_text('def greet(): return "hi"\n', encoding='utf-8')
            (root / '.git').mkdir()
            (root / '.git' / 'config').write_text('secret', encoding='utf-8')
            (root / 'image.png').write_bytes(b'\x89PNG')
            paths = [item['path'] for item in list_workspace(root=root)]
            self.assertIn('src/app.py', paths)
            self.assertNotIn('.git/config', paths)
            self.assertNotIn('image.png', paths)

    def test_search_ranks_filename_and_content_matches(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'backend').mkdir()
            (root / 'backend' / 'voice.py').write_text('def transcribe_audio(): pass\n', encoding='utf-8')
            (root / 'README.md').write_text('voice setup notes\n', encoding='utf-8')
            hits = search_workspace('fix voice transcription', root=root)
            self.assertTrue(hits)
            self.assertEqual(hits[0]['path'], 'backend/voice.py')

    def test_choose_context_selects_relevant_files_automatically(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            (root / 'src' / 'calendar.ts').write_text('export function openCalendar() {}\n', encoding='utf-8')
            (root / 'src' / 'unrelated.ts').write_text('export const x = 1\n', encoding='utf-8')
            files = choose_context('calendar button', root=root)
            self.assertEqual(files[0]['path'], 'src/calendar.ts')

    def test_choose_context_falls_back_to_project_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'README.md').write_text('project overview\n', encoding='utf-8')
            files = choose_context('zzzz-not-present', root=root)
            self.assertEqual(files[0]['path'], 'README.md')

    def test_plan_prompt_is_explicitly_read_only(self):
        prompt = build_change_plan_prompt(
            'Add a button.',
            [{'path': 'src/app.ts', 'content': 'export const app = true'}],
        )
        self.assertIn('read-only', prompt[0]['content'])
        self.assertIn('Do not claim', prompt[0]['content'])
        self.assertIn('src/app.ts', prompt[1]['content'])
        self.assertIn('Add a button.', prompt[1]['content'])


if __name__ == '__main__':
    unittest.main()
