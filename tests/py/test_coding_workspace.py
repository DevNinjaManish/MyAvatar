import tempfile
import unittest
from pathlib import Path

from backend.core.coding_workspace import plan_workspace, workspace_snapshot


class CodingWorkspaceServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_plan_workspace_auto_selects_context_and_returns_read_only_plan(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            (root / 'src' / 'widget.ts').write_text('export function renderWidget() {}\n', encoding='utf-8')
            (root / 'README.md').write_text('project docs\n', encoding='utf-8')

            async def fake_inspect(messages, config):
                self.assertEqual(config['model'], 'coder')
                self.assertIn('src/widget.ts', messages[1]['content'])
                return 'Change src/widget.ts and add focused tests.'

            result = await plan_workspace(
                'improve widget rendering',
                {'model': 'coder'},
                fake_inspect,
                root=root,
            )
            self.assertTrue(result['readOnly'])
            self.assertIn('src/widget.ts', result['paths'])
            self.assertIn('focused tests', result['plan'])

    def test_snapshot_exposes_tree_and_search_without_file_contents(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'voice.py').write_text('def listen(): pass\n', encoding='utf-8')
            snap = workspace_snapshot('voice listen', root=root)
            self.assertTrue(snap['readOnly'])
            self.assertEqual(snap['files'][0]['path'], 'voice.py')
            self.assertEqual(snap['matches'][0]['path'], 'voice.py')
            self.assertNotIn('content', snap['files'][0])


if __name__ == '__main__':
    unittest.main()
