import tempfile
import unittest
from pathlib import Path

from backend.core.edit_transaction import create_transaction, apply_transaction, rollback_transaction
from backend.core.workspace_roots import public_workspace, select_workspace


class EditTransactionTests(unittest.TestCase):
    def test_requires_explicit_approval_then_applies_and_rolls_back(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'demo.py'
            target.write_text('value = 1\n', encoding='utf-8')
            proposal = '''```diff\n--- a/demo.py\n+++ b/demo.py\n@@ -1 +1 @@\n-value = 1\n+value = 2\n```'''
            tx = create_transaction(proposal, root=root)
            self.assertEqual(tx.public()['status'], 'pending')
            with self.assertRaises(PermissionError):
                apply_transaction(tx)
            self.assertEqual(target.read_text(encoding='utf-8'), 'value = 1\n')
            applied = apply_transaction(tx, approved=True)
            self.assertEqual(applied['status'], 'applied')
            self.assertTrue(applied['rollbackAvailable'])
            self.assertEqual(target.read_text(encoding='utf-8'), 'value = 2\n')
            rolled = rollback_transaction(tx)
            self.assertEqual(rolled['status'], 'rolled_back')
            self.assertEqual(target.read_text(encoding='utf-8'), 'value = 1\n')

    def test_refuses_stale_workspace(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'demo.py'
            target.write_text('value = 1\n', encoding='utf-8')
            proposal = '''--- a/demo.py\n+++ b/demo.py\n@@ -1 +1 @@\n-value = 1\n+value = 2\n'''
            tx = create_transaction(proposal, root=root)
            target.write_text('value = 99\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Workspace changed'):
                apply_transaction(tx, approved=True)
            self.assertEqual(target.read_text(encoding='utf-8'), 'value = 99\n')

    def test_new_file_is_removed_by_rollback(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            proposal = '''--- /dev/null\n+++ b/new.py\n@@ -0,0 +1 @@\n+print("hello")\n'''
            tx = create_transaction(proposal, root=root)
            apply_transaction(tx, approved=True)
            self.assertTrue((root / 'new.py').exists())
            rollback_transaction(tx)
            self.assertFalse((root / 'new.py').exists())

    def test_rollback_refuses_to_clobber_later_user_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / 'demo.py'
            target.write_text('value = 1\n', encoding='utf-8')
            proposal = '''--- a/demo.py\n+++ b/demo.py\n@@ -1 +1 @@\n-value = 1\n+value = 2\n'''
            tx = create_transaction(proposal, root=root)
            apply_transaction(tx, approved=True)
            target.write_text('manual = True\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'automatic rollback was refused'):
                rollback_transaction(tx)
            self.assertEqual(target.read_text(encoding='utf-8'), 'manual = True\n')


class WorkspaceRootTests(unittest.TestCase):
    def test_selects_existing_directory_and_exposes_small_public_shape(self):
        with tempfile.TemporaryDirectory() as directory:
            root = select_workspace(directory)
            info = public_workspace(root)
            self.assertEqual(info['path'], str(root))
            self.assertEqual(info['name'], root.name)

    def test_rejects_missing_or_file_workspace(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            file = root / 'x.txt'
            file.write_text('x', encoding='utf-8')
            with self.assertRaises(ValueError):
                select_workspace(str(root / 'missing'))
            with self.assertRaises(ValueError):
                select_workspace(str(file))


if __name__ == '__main__':
    unittest.main()
