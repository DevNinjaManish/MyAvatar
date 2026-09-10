import unittest

from backend.core.coding_repair import build_repair_prompt, failed_verification_text, MAX_FAILURE_CHARS


class CodingRepairTests(unittest.TestCase):
    def test_prompt_uses_only_failed_checks_and_supplied_files(self):
        verification={
            'checks':[
                {'id':'js','label':'JavaScript tests','ok':False,'output':'Assertion failed'},
                {'id':'py','label':'Python tests','ok':True,'output':'all good'},
            ]
        }
        files=[{'path':'src/app.js','content':'export const x = 1;'}]
        prompt=build_repair_prompt(verification,files)
        system=prompt[0]['content'].lower();user=prompt[1]['content']
        self.assertIn('exactly one bounded repair attempt',system)
        self.assertIn('src/app.js',user)
        self.assertIn('Assertion failed',user)
        self.assertNotIn('all good',user)
        self.assertIn('untrusted data',system)

    def test_failure_output_is_bounded_from_the_tail(self):
        output='A'*(MAX_FAILURE_CHARS+50)+'TAIL'
        text=failed_verification_text({'checks':[{'ok':False,'label':'test','output':output}]})
        self.assertLessEqual(len(text),MAX_FAILURE_CHARS)
        self.assertTrue(text.endswith('TAIL'))

    def test_missing_failure_evidence_refuses_repair(self):
        with self.assertRaises(ValueError):
            build_repair_prompt({'checks':[{'ok':True,'output':'fine'}]},[{'path':'a.py','content':'x=1'}])


if __name__=='__main__':unittest.main()
