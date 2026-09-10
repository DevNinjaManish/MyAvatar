import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.core.coding_verify import choose_verification, verify_edit


class FakeProcess:
    def __init__(self, returncode=0, stdout='', stderr='', polls_before_done=0):
        self.returncode=None;self._final=returncode;self.stdout_text=stdout;self.stderr_text=stderr;self.polls=polls_before_done;self.terminated=False;self.killed=False
    def poll(self):
        if self.terminated or self.killed:
            self.returncode=-15;return self.returncode
        if self.polls>0:
            self.polls-=1;return None
        self.returncode=self._final;return self.returncode
    def communicate(self, timeout=None):return self.stdout_text,self.stderr_text
    def terminate(self):self.terminated=True;self.returncode=-15
    def kill(self):self.killed=True;self.returncode=-9


class CodingVerificationTests(unittest.TestCase):
    def test_selects_smallest_relevant_check_set(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'package.json').write_text('{}',encoding='utf-8');(root/'tests/py').mkdir(parents=True);(root/'tests/py/test_server.py').write_text('',encoding='utf-8')
            self.assertEqual([item['id'] for item in choose_verification([{'path':'src/widget.js'}],root=root)],['javascript'])
            self.assertEqual([item['id'] for item in choose_verification([{'path':'backend/core/app.py'}],root=root)],['python'])

    def test_shared_config_uses_project_test_script(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'package.json').write_text('{}',encoding='utf-8')
            self.assertEqual(choose_verification([{'path':'config.json'}],root=root)[0]['command'],['npm','test'])

    def test_verification_never_uses_shell_and_reports_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'package.json').write_text('{}',encoding='utf-8');process=FakeProcess(1,'failed test','')
            with patch('backend.core.coding_verify.subprocess.Popen',return_value=process) as popen:
                result=verify_edit([{'path':'src/app.js'}],root=root)
            self.assertFalse(result['ok']);self.assertEqual(result['status'],'failed');self.assertIn('failed test',result['checks'][0]['output']);self.assertFalse(popen.call_args.kwargs['shell'])

    def test_cancellation_terminates_running_process(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'package.json').write_text('{}',encoding='utf-8');process=FakeProcess(0,polls_before_done=1000);cancel=threading.Event()
            with patch('backend.core.coding_verify.subprocess.Popen',return_value=process),patch('backend.core.coding_verify.time.sleep',side_effect=lambda _delay:cancel.set()):
                result=verify_edit([{'path':'src/app.js'}],root=root,cancel_event=cancel)
            self.assertEqual(result['status'],'cancelled');self.assertTrue(process.terminated)

    def test_unconfigured_file_type_does_not_run_anything(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch('backend.core.coding_verify.subprocess.Popen') as popen:
                result=verify_edit([{'path':'README.md'}],root=directory)
            self.assertEqual(result['status'],'not_available');self.assertIsNone(result['ok']);popen.assert_not_called()


if __name__=='__main__':unittest.main()
