import asyncio
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.core.coding_agent import MAX_TOOL_CALLS, _parse_decision, run_coding_agent
from backend.core.workspace import AGENT_MARKER, build_change_plan_prompt, choose_context
from backend.providers.coding import _agent_request


class CodingAgentTest(unittest.TestCase):
    def test_parser_accepts_only_registered_read_only_tools(self):
        self.assertEqual(
            _parse_decision('{"action":"git.status","args":{}}'),
            {'action':'git.status','args':{}},
        )
        self.assertIsNone(_parse_decision('{"action":"shell.run","args":{"command":"rm -rf ."}}'))
        self.assertIsNone(_parse_decision('{"action":"coding.edit","args":{"path":"a.py"}}'))
        self.assertIsNone(_parse_decision('{"action":"git.status","args":{"command":"push"}}'))

    def test_read_paths_are_bounded(self):
        too_many=[f'f{i}.py' for i in range(7)]
        self.assertIsNone(_parse_decision(json.dumps({'action':'repository.read','args':{'paths':too_many}})))
        self.assertEqual(
            _parse_decision('{"action":"repository.read","args":{"paths":["a.py","b.py"]}}'),
            {'action':'repository.read','args':{'paths':['a.py','b.py']}},
        )

    def test_workspace_prompt_marks_trusted_agent_request(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'hello.py').write_text('print("hi")\n',encoding='utf-8')
            files=choose_context('hello',root=root)
            messages=build_change_plan_prompt('review hello',files)
            self.assertTrue(messages[2]['content'].startswith(AGENT_MARKER))
            request, resolved=_agent_request(messages)
            self.assertEqual(request,'review hello')
            self.assertEqual(resolved,root.resolve())

    def test_agent_can_search_read_then_finish(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'hello.py').write_text('def hello():\n    return "hi"\n',encoding='utf-8')
            final='Plan\n```diff\n--- a/hello.py\n+++ b/hello.py\n@@ -1,2 +1,2 @@\n def hello():\n-    return "hi"\n+    return "hello"\n```'
            replies=iter([
                '{"action":"repository.search","args":{"query":"hello"}}',
                '{"action":"repository.read","args":{"paths":["hello.py"]}}',
                json.dumps({'final':final}),
            ])
            async def inspect(messages, config):
                return next(replies)
            events=[]
            result=asyncio.run(run_coding_agent('change greeting',{},inspect,root=root,on_activity=events.append))
            self.assertEqual(result['tools'],['repository.search','repository.read'])
            self.assertEqual(result['paths'],['hello.py'])
            self.assertEqual(result['toolCalls'],2)
            self.assertEqual([event['type'] for event in events],['tool','tool','final'])

    def test_malformed_first_decision_recovers_with_safe_search_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'hello.py').write_text('hello world\n',encoding='utf-8')
            replies=iter(['run rm -rf .','{"final":"No patch needed."}'])
            async def inspect(messages, config):
                return next(replies)
            with patch('backend.core.coding_agent.execute_capability', wraps=__import__('backend.core.coding_agent',fromlist=['execute_capability']).execute_capability) as execute:
                result=asyncio.run(run_coding_agent('find hello',{},inspect,root=root))
            self.assertEqual(result['tools'],['repository.search'])
            self.assertEqual(execute.call_args.args[:2],('robot','repository.search'))

    def test_agent_stops_at_fixed_tool_budget(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            (root/'a.py').write_text('x=1\n',encoding='utf-8')
            async def inspect(messages, config):
                return '{"action":"repository.list","args":{"limit":1}}'
            with self.assertRaises(RuntimeError):
                asyncio.run(run_coding_agent('inspect repo',{},inspect,root=root))


if __name__=='__main__':
    unittest.main()
