import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.core.capabilities import execute_capability, profile_for_bot
from backend.core.repo_inspection import git_diff_summary, git_log, git_status


class RivetCapabilitiesTest(unittest.TestCase):
    def test_rivet_exposes_read_only_repository_and_git_capabilities(self):
        profile=profile_for_bot('robot')
        capabilities={item['id']:item for item in profile['capabilities']}
        for capability_id in ('repository.list','repository.read','repository.search','git.status','git.log','git.diff'):
            self.assertIn(capability_id, capabilities)
            self.assertTrue(capabilities[capability_id]['available'])
            self.assertFalse(capabilities[capability_id]['sideEffect'])
            self.assertFalse(capabilities[capability_id]['requiresApproval'])

    def test_other_bots_cannot_execute_rivet_repo_capabilities(self):
        with self.assertRaises(PermissionError):
            execute_capability('nova','repository.list',root='.')

    def test_mutating_capabilities_cannot_bypass_approval_flow(self):
        with self.assertRaises(PermissionError):
            execute_capability('robot','coding.edit',root='.')

    def test_repository_capabilities_stay_bounded_to_repo_text(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'src').mkdir()
            (root/'src'/'hello.py').write_text('def hello():\n    return "hi"\n',encoding='utf-8')
            listed=execute_capability('robot','repository.list',root=root)
            self.assertEqual(listed,[{'path':'src/hello.py','bytes':29}])
            read=execute_capability('robot','repository.read',root=root,paths=['src/hello.py'])
            self.assertIn('return "hi"',read[0]['content'])
            hits=execute_capability('robot','repository.search',root=root,query='hello return')
            self.assertEqual(hits[0]['path'],'src/hello.py')
            with self.assertRaises(ValueError):
                execute_capability('robot','repository.read',root=root,paths=['../outside.txt'])

    def test_git_helpers_use_only_fixed_read_only_commands(self):
        completed=type('Result',(),{'returncode':0,'stdout':'## main\n M src/a.py\n','stderr':''})()
        with patch('backend.core.repo_inspection.subprocess.run',return_value=completed) as run:
            status=git_status(root='.')
        args=run.call_args.args[0]
        self.assertEqual(args[0],'git')
        self.assertEqual(args[2:],('status','--short','--branch','--untracked-files=normal'))
        self.assertTrue(status['dirty'])
        self.assertEqual(status['changes'],[' M src/a.py'])

    def test_git_log_and_diff_are_bounded_and_non_mutating(self):
        def fake_run(args,**kwargs):
            if 'log' in args:
                return type('Result',(),{'returncode':0,'stdout':'abc123\t2026-09-11\tSafe commit\n','stderr':''})()
            return type('Result',(),{'returncode':0,'stdout':' src/a.py | 2 +-\n','stderr':''})()
        with patch('backend.core.repo_inspection.subprocess.run',side_effect=fake_run) as run:
            log=git_log(root='.',limit=999)
            diff=git_diff_summary(root='.')
        self.assertEqual(log,[{'sha':'abc123','date':'2026-09-11','subject':'Safe commit'}])
        self.assertTrue(diff['readOnly'])
        calls=[call.args[0] for call in run.call_args_list]
        self.assertTrue(any('diff' in args for args in calls))
        self.assertFalse(any(arg in {'commit','push','checkout','reset','clean','add'} for args in calls for arg in args))


if __name__=='__main__':
    unittest.main()
