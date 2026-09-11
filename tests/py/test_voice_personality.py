import copy
import unittest
from pathlib import Path

from backend.core import settings
from backend.core.voice_personality import VOICE_PERSONALITIES, apply_voice_personality, voice_personality
from backend.providers.tts import speech_speed_for_voice


ROOT = Path(__file__).resolve().parents[2]


class VoicePersonalityTests(unittest.TestCase):
    def test_all_companions_share_one_bounded_voice_profile_contract(self):
        self.assertEqual(set(VOICE_PERSONALITIES), {'nova','robot','butler','pixel','luma'})
        for profile in VOICE_PERSONALITIES.values():
            self.assertGreaterEqual(profile.speed_multiplier, .94)
            self.assertLessEqual(profile.speed_multiplier, 1.06)
            self.assertGreaterEqual(profile.barge_guard_ms, 300)
            self.assertLessEqual(profile.barge_guard_ms, 600)
            self.assertGreaterEqual(profile.resume_delay_ms, 90)
            self.assertLessEqual(profile.resume_delay_ms, 200)

    def test_nova_is_warm_and_interruptible_without_being_hair_triggered(self):
        nova = voice_personality('nova')
        sterling = voice_personality('butler')
        pixel = voice_personality('pixel')
        self.assertLess(nova.barge_guard_ms, sterling.barge_guard_ms)
        self.assertGreater(nova.barge_guard_ms, pixel.barge_guard_ms)
        self.assertLess(nova.resume_delay_ms, sterling.resume_delay_ms)

    def test_unknown_bot_fails_closed_to_nova_profile(self):
        self.assertEqual(voice_personality('../unknown'), voice_personality('nova'))

    def test_application_changes_timing_only_not_provider_identity(self):
        conversation={'firstChunkChars':40,'chunkChars':112}
        tts={'provider':'kokoro','voice':'af_heart','speed':1.06,'model':'model','voices':'voices'}
        audio={'mode':'manual','vad':{'threshold':.0055,'bargeIn':{'threshold':.014}},'resumeDelayMs':140}
        apply_voice_personality(bot_id='pixel', conversation=conversation, tts=tts, audio=audio)
        self.assertEqual(tts['provider'],'kokoro')
        self.assertEqual(tts['voice'],'af_heart')
        self.assertEqual(tts['model'],'model')
        self.assertEqual(tts['persona'],'pixel')
        self.assertEqual(audio['mode'],'manual')
        self.assertEqual(audio['vad']['threshold'],.0055)
        self.assertEqual(audio['vad']['bargeIn']['threshold'],.014)
        self.assertLess(conversation['firstChunkChars'],40)

    def test_loaded_bot_profiles_feed_shared_tts_and_barge_in(self):
        defaults=settings.read_defaults(ROOT/'config.json')
        speeds={}
        guards={}
        for bot in defaults['bots']:
            config=copy.deepcopy(defaults)
            config['conversation']['persona']=bot
            settings.apply_profile(config,'low',defaults)
            self.assertEqual(config['tts']['persona'],bot)
            speeds[bot]=speech_speed_for_voice(config['tts'])
            guards[bot]=config['audio']['vad']['bargeIn']['guardMs']
        self.assertGreater(speeds['pixel'],speeds['nova'])
        self.assertLess(speeds['butler'],speeds['nova'])
        self.assertLess(guards['nova'],guards['butler'])

    def test_reapplying_profile_is_idempotent(self):
        defaults=settings.read_defaults(ROOT/'config.json')
        config=copy.deepcopy(defaults)
        config['conversation']['persona']='nova'
        settings.apply_profile(config,'medium',defaults)
        first=copy.deepcopy(config)
        settings.apply_profile(config,'medium',defaults)
        self.assertEqual(config,first)


if __name__=='__main__':unittest.main()
