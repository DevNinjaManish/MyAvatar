import tempfile
import unittest
from pathlib import Path

from backend.core.edit_session import EditSession

PATCH='''--- a/demo.py\n+++ b/demo.py\n@@ -1 +1 @@\n-old = 1\n+old = 2\n'''


class EditSessionTests(unittest.TestCase):
    def test_approval_applies_and_rollback_restores(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);target=root/'demo.py';target.write_text('old = 1\n',encoding='utf-8')
            session=EditSession(root=root)
            preview=session.create(PATCH)
            result=session.apply(preview['id'])
            self.assertEqual(target.read_text(encoding='utf-8'),'old = 2\n')
            self.assertTrue(result['rollbackAvailable'])
            session.rollback(preview['id'])
            self.assertEqual(target.read_text(encoding='utf-8'),'old = 1\n')

    def test_reject_never_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);target=root/'demo.py';target.write_text('old = 1\n',encoding='utf-8')
            session=EditSession(root=root)
            preview=session.create(PATCH)
            result=session.reject_pending(tx_id=preview['id'])
            self.assertEqual(result['status'],'rejected')
            self.assertEqual(target.read_text(encoding='utf-8'),'old = 1\n')
            with self.assertRaises(ValueError):session.apply(preview['id'])

    def test_expired_approval_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'demo.py').write_text('old = 1\n',encoding='utf-8')
            session=EditSession(root=root,ttl_seconds=30)
            preview=session.create(PATCH)
            session.pending_created_at=0
            with self.assertRaisesRegex(ValueError,'expired'):
                session.apply(preview['id'])

    def test_workspace_switch_cancels_pending_and_forgets_rollback(self):
        with tempfile.TemporaryDirectory() as first,tempfile.TemporaryDirectory() as second:
            first=Path(first);second=Path(second);(first/'demo.py').write_text('old = 1\n',encoding='utf-8')
            session=EditSession(root=first)
            preview=session.create(PATCH)
            session.set_workspace(second)
            self.assertEqual(session.root,second.resolve())
            with self.assertRaises(ValueError):session.apply(preview['id'])

    def test_repeated_or_wrong_transaction_decisions_are_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'demo.py').write_text('old = 1\n',encoding='utf-8')
            session=EditSession(root=root);preview=session.create(PATCH)
            with self.assertRaises(ValueError):session.apply('wrong-id')
            session.apply(preview['id'])
            with self.assertRaises(ValueError):session.apply(preview['id'])


if __name__=='__main__':unittest.main()
