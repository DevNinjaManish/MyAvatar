import unittest
from backend.conversation.speech import prepare_spoken_text
from backend.conversation.chunks import split_ready
from backend.providers.tts import speech_speed_for_voice


class SpokenText(unittest.TestCase):
    def test_display_formatting_is_reduced_for_speech(self):
        text='## Fix\nUse `npm test` and see https://example.com/docs. Open /Users/me/project/src/app/widget-runtime.js.'
        spoken=prepare_spoken_text(text)
        self.assertNotIn('##',spoken)
        self.assertNotIn('https://',spoken)
        self.assertNotIn('/Users/',spoken)
        self.assertIn('npm test',spoken)
        self.assertIn('the link in chat',spoken)
        self.assertIn('the file shown in chat',spoken)

    def test_code_blocks_are_not_read_verbatim(self):
        spoken=prepare_spoken_text('Here is the fix:\n```js\nconst secret = 42;\n```\nRun the API test.')
        self.assertNotIn('const secret',spoken)
        self.assertIn('Code is shown in the chat.',spoken)
        self.assertIn('A P I',spoken)

    def test_unclosed_code_fence_is_never_read_verbatim(self):
        spoken=prepare_spoken_text('Here is the patch.\n```js\nconst secret = 42;\nreturn secret;')
        self.assertNotIn('const secret',spoken)
        self.assertNotIn('return secret',spoken)
        self.assertIn('Code is shown in the chat.',spoken)

    def test_diff_heavy_answer_becomes_short_spoken_summary(self):
        source='Here is the safe fix.\n--- a/app.js\n+++ b/app.js\n@@ -1 +1 @@\n-old();\n+newCall();\n+return value;'
        spoken=prepare_spoken_text(source)
        self.assertIn('Here is the safe fix.',spoken)
        self.assertIn('technical details are shown in chat',spoken)
        self.assertNotIn('newCall',spoken)

    def test_spoken_text_is_bounded_without_changing_display_source(self):
        source='word '*300
        spoken=prepare_spoken_text(source,max_chars=120)
        self.assertLessEqual(len(spoken),121)
        self.assertTrue(spoken.endswith('…'))
        self.assertGreater(len(source),len(spoken))

    def test_symbol_only_content_becomes_empty(self):
        self.assertEqual(prepare_spoken_text('✨'), '')


class VoiceCadence(unittest.TestCase):
    def test_authored_voice_cadence_is_subtle_and_bounded(self):
        base={'speed':1.06}
        rivet=speech_speed_for_voice({**base,'voice':'am_michael'})
        sterling=speech_speed_for_voice({**base,'voice':'bm_george'})
        pixel=speech_speed_for_voice({**base,'voice':'af_sarah'})
        nova=speech_speed_for_voice({**base,'voice':'af_heart'})
        self.assertLess(sterling,rivet)
        self.assertLess(rivet,nova)
        self.assertGreater(pixel,nova)
        for speed in (rivet,sterling,pixel,nova):self.assertGreaterEqual(speed,.82);self.assertLessEqual(speed,1.22)

    def test_unknown_voice_keeps_requested_speed(self):
        self.assertEqual(speech_speed_for_voice({'voice':'custom','speed':1.03}),1.03)


class SpeechChunking(unittest.TestCase):
    def test_sentence_beats_character_limit(self):
        chunk,rest=split_ready('This is a complete sentence. This continues.',first=True,first_chars=12)
        self.assertEqual(chunk,'This is a complete sentence.')
        self.assertEqual(rest,'This continues.')

    def test_clause_is_preferred_before_hard_split(self):
        text='This opening phrase has enough substance, and the rest can follow later'
        chunk,rest=split_ready(text,first=True,first_chars=90)
        self.assertEqual(chunk,'This opening phrase has enough substance,')
        self.assertTrue(rest.lstrip().startswith('and the rest'))

    def test_decimal_is_not_mistaken_for_sentence_end(self):
        chunk,rest=split_ready('Version 2.5 is installed. Continue.')
        self.assertEqual(chunk,'Version 2.5 is installed.')
        self.assertEqual(rest,'Continue.')


if __name__=='__main__':unittest.main()
