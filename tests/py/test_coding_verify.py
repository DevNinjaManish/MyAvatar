import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.core.coding_verify import choose_verification, verify_edit


class CodingVerificationTests(unittest.TestCase):
    def test_selects_smallest_relevant_check_set(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'package.json').write_text('{}',encoding='utf-8')
            (root/'tests/py').mkdir(parents=True)
            (root/'tests/py/test_server.py').write_text('',encoding='utf-8')
            js=choose_verification([{'path':'src/widget.js'}],root=root)
            py=choose_verification([{'path':'backend/core/app.py'}],root=root)
            self.assertEqual([item['id'] for item in js],['javascript'])
            self.assertEqual([item['id'] for item in py],['python'])

    def test_shared_config_uses_project_test_script(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'package.json').write_text('{}',encoding='utf-8')
            checks=choose_verification([{'path':'config.json'}],root=root)
            self.assertEqual(checks[0]['command'],['npm','test'])

    def test_verification_never_uses_shell_and_reports_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'package.json').write_text('{}',encoding='utf-8')
            completed=type('Result',(),{'returncode':1,'stdout':'failed test','stderr':''})()
            with patch('backend.core.coding_verify.subprocess.run',return_value=completed) as run:
                result=verify_edit([{'path':'src/app.js'}],root=root)
            self.assertFalse(result['ok']);self.assertEqual(result['status'],'failed')
            self.assertIn('failed test',result['checks'][0]['output'])
            self.assertFalse(run.call_args.kwargs['shell'])

    def test_unconfigured_file_type_does_not_run_anything(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch('backend.core.coding_verify.subprocess.run') as run:
                result=verify_edit([{'path':'README.md'}],root=directory)
            self.assertEqual(result['status'],'not_available');self.assertIsNone(result['ok'])
            run.assert_not_called()


if __name__=='__main__':unittest.main()
