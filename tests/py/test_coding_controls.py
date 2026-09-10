import unittest
from backend.core.coding_controls import coding_control_intent


class CodingControlTests(unittest.TestCase):
    def test_clear_controls_are_recognized(self):
        cases={
            'apply the change':'apply','Please approve it':'apply','reject that':'reject',
            'roll it back':'rollback','propose one repair':'repair','switch project':'switch_workspace',
        }
        for text,expected in cases.items():
            with self.subTest(text=text):self.assertEqual(coding_control_intent(text),expected)

    def test_normal_coding_requests_are_not_misclassified(self):
        for text in ('apply this pattern to the widget code','why did the test fail?','make a rollback button','change project card styling'):
            with self.subTest(text=text):self.assertIsNone(coding_control_intent(text))

if __name__=='__main__':unittest.main()
