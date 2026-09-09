import asyncio
import time
import unittest
from concurrent.futures import ThreadPoolExecutor

from backend.core.greetings import (
    GREETING_LINES,
    GreetingCoordinator,
    StartupGreetingGuard,
    choose_greeting,
)


def config(bot='nova'):
    return {
        'conversation': {'persona': bot},
        'bots': {'nova': {}, 'robot': {}, 'butler': {}, 'pixel': {}, 'luma': {}},
        'tts': {'voice': 'test', 'speed': 1.0},
        '_greetingIndexes': {},
    }


class GreetingText(unittest.TestCase):
    def test_templates_avoid_claims_of_finished_agendas_or_diagnostics(self):
        text = ' '.join(line.lower() for bot in GREETING_LINES.values() for part in bot.values() for line in part)
        for forbidden in ('your schedule ready', 'your agenda is ready', 'prepared your priorities', 'diagnostics clear'):
            self.assertNotIn(forbidden, text)

    def test_rotation_is_deterministic(self):
        cfg = config('robot')
        first, index = choose_greeting(cfg, hour=9)
        self.assertEqual(index, 0)
        cfg['_greetingIndexes']['robot'] = 1
        second, index = choose_greeting(cfg, hour=9)
        self.assertEqual(index, 1)
        self.assertNotEqual(first, second)

    def test_startup_guard_suppresses_quick_reconnect_greeting(self):
        guard = StartupGreetingGuard(cooldown_seconds=45)
        self.assertTrue(guard.allow('nova', now=10))
        self.assertFalse(guard.allow('nova', now=20))
        self.assertTrue(guard.allow('nova', now=56))
        self.assertTrue(guard.allow('robot', now=20))


class GreetingLifecycle(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.executor = ThreadPoolExecutor(max_workers=2)
        self.sent = []
        self.saved = []

    async def asyncTearDown(self):
        self.executor.shutdown(wait=True)

    async def make(self, generate, *, guard=None):
        async def send(kind, **data):
            self.sent.append((kind, data))
        return GreetingCoordinator(
            generate=generate,
            executor=self.executor,
            send=send,
            save_preferences=lambda cfg: self.saved.append(dict(cfg.get('_greetingIndexes', {}))) or True,
            startup_guard=guard or StartupGreetingGuard(),
        )

    async def wait_idle(self, coordinator):
        for _ in range(100):
            if not coordinator.pending:
                return
            await asyncio.sleep(.005)
        self.fail('Greeting did not settle')

    async def test_delivered_greeting_advances_rotation_only_after_send(self):
        coordinator = await self.make(lambda text, cfg: b'RIFF')
        cfg = config('nova')
        operation = coordinator.request(cfg, reason='onboarding', hour=10)
        self.assertIsNotNone(operation)
        await self.wait_idle(coordinator)
        self.assertEqual(len(self.sent), 1)
        self.assertEqual(self.sent[0][0], 'greeting')
        self.assertEqual(self.sent[0][1]['operation_id'], operation)
        self.assertEqual(cfg['_greetingIndexes']['nova'], 1)
        self.assertEqual(self.saved[-1]['nova'], 1)
        await coordinator.close()

    async def test_cancelled_synthesis_never_sends_or_advances_rotation(self):
        def slow(text, cfg):
            time.sleep(.08)
            return b'RIFF'
        coordinator = await self.make(slow)
        cfg = config('nova')
        coordinator.request(cfg, reason='onboarding', hour=10)
        await asyncio.sleep(.005)
        coordinator.cancel()
        await asyncio.sleep(.1)
        self.assertEqual(self.sent, [])
        self.assertEqual(cfg['_greetingIndexes'], {})
        await coordinator.close()

    async def test_latest_bot_wins_during_rapid_switching(self):
        def generate(text, cfg):
            if 'Nova' in text or 'morning' in text.lower():
                time.sleep(.06)
            return b'RIFF'
        coordinator = await self.make(generate)
        nova = config('nova')
        rivet = config('robot')
        coordinator.request(nova, reason='bot_switch', hour=10)
        await asyncio.sleep(.005)
        second = coordinator.request(rivet, reason='bot_switch', hour=14)
        await self.wait_idle(coordinator)
        self.assertEqual(len(self.sent), 1)
        self.assertEqual(self.sent[0][1]['operation_id'], second)
        self.assertIn('Rivet', self.sent[0][1]['text'])
        self.assertEqual(nova['_greetingIndexes'], {})
        self.assertEqual(rivet['_greetingIndexes']['robot'], 1)
        await coordinator.close()

    async def test_settings_reason_is_silent_and_startup_is_once_per_session(self):
        coordinator = await self.make(lambda text, cfg: b'RIFF')
        cfg = config('nova')
        self.assertIsNone(coordinator.request(cfg, reason='settings', hour=10))
        first = coordinator.request(cfg, reason='startup', hour=10)
        second = coordinator.request(cfg, reason='startup', hour=10)
        self.assertIsNotNone(first)
        self.assertIsNone(second)
        await self.wait_idle(coordinator)
        self.assertEqual(len(self.sent), 1)
        await coordinator.close()

    async def test_generation_failure_is_nonfatal(self):
        def fail(text, cfg):
            raise RuntimeError('voice down')
        coordinator = await self.make(fail)
        cfg = config('nova')
        coordinator.request(cfg, reason='onboarding', hour=10)
        await self.wait_idle(coordinator)
        self.assertEqual(self.sent, [])
        self.assertEqual(cfg['_greetingIndexes'], {})
        await coordinator.close()


if __name__ == '__main__':
    unittest.main()
