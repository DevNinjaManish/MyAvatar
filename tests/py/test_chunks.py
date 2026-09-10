import unittest
from backend.conversation.chunks import split_ready


class Chunks(unittest.TestCase):
    def test_sentences(self):
        self.assertEqual(split_ready('Hello. How are you?'),('Hello.','How are you?'))

    def test_first_phrase_starts_before_a_long_sentence_finishes(self):
        text='I would love to help you choose a lovely place for dinner tonight'
        first,rest=split_ready(text,first=True,first_chars=40)
        self.assertLessEqual(len(first),40)
        self.assertEqual(first+rest,text)
        self.assertEqual(split_ready(text),(None,text))

    def test_first_clause_can_start_earlier_than_regular_chunks(self):
        text='That sounds excellent, and I can handle the rest from here'
        self.assertEqual(split_ready(text,first=True,first_chars=40),('That sounds excellent,','and I can handle the rest from here'))
        self.assertEqual(split_ready(text,first=False,chunk_chars=120),(None,text))

    def test_first_clause_and_titles(self):
        self.assertEqual(split_ready('That sounds like a lovely idea, and we could',first=True),('That sounds like a lovely idea,','and we could'))
        self.assertEqual(split_ready('Dr. Smith likes 3.14.'),('Dr. Smith likes 3.14.',''))

    def test_exact_first_limit_can_emit_without_waiting_for_another_token(self):
        text='Fast voice should begin around this point now'
        first,rest=split_ready(text,first=True,first_chars=40)
        self.assertIsNotNone(first)
        self.assertEqual(first+rest,text)

    def test_wait(self):
        self.assertEqual(split_ready('Good morning'),(None,'Good morning'))

    def test_bound(self):
        text='hello '*40
        first,rest=split_ready(text)
        self.assertLessEqual(len(first),180)
        self.assertEqual(first+rest,text)


if __name__=='__main__':unittest.main()
