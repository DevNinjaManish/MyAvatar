import copy
import json
import tempfile
import unittest
from pathlib import Path

from backend.core.bot_behavior import BEHAVIORS, behavior_prompt, next_step_policy
from backend.core.settings import apply_profile, read_defaults


class BotBehaviorTests(unittest.TestCase):
    def test_all_companions_have_distinct_behavior_profiles(self):
        self.assertEqual(set(BEHAVIORS), {'robot','nova','butler','pixel','luma'})
        self.assertEqual(len({item.name for item in BEHAVIORS.values()}), 5)

    def test_behavior_prompts_are_truthful_and_non_nagging(self):
        for bot_id in BEHAVIORS:
            prompt = behavior_prompt(bot_id)
            self.assertIn('at most once per reply', prompt)
            self.assertIn('easy to ignore', prompt)
            self.assertIn('Do not nag', prompt)
            self.assertIn('unless that information was actually supplied', prompt)

    def test_next_step_policy_is_role_specific(self):
        instructions = {bot: next_step_policy(bot)['instruction'] for bot in BEHAVIORS}
        self.assertIn('urgency', instructions['butler'])
        self.assertIn('marketing', instructions['pixel'])
        self.assertIn('design', instructions['luma'])
        self.assertIn('coding', instructions['robot'])

    def test_profile_application_appends_behavior_without_mutating_repo_defaults(self):
        config_path = Path('config.json')
        defaults = read_defaults(config_path)
        original = copy.deepcopy(defaults)
        for bot_id in defaults['bots']:
            config = copy.deepcopy(defaults)
            config['conversation']['persona'] = bot_id
            apply_profile(config, 'low', defaults)
            self.assertTrue(config['conversation']['system'].startswith(defaults['bots'][bot_id]['system']))
            self.assertIn(BEHAVIORS[bot_id].name, config['conversation']['system'])
            self.assertIn('Do not nag', config['conversation']['system'])
        self.assertEqual(defaults, original)


if __name__ == '__main__':
    unittest.main()
