import unittest

from backend.core.patch_proposal import extract_unified_diff, parse_patch_proposal, summarize_unified_diff


class PatchProposalTests(unittest.TestCase):
    def test_extracts_fenced_unified_diff_and_counts_changes(self):
        text = '''Plan: update the greeting helper.\n\n```diff\n--- a/src/demo.py\n+++ b/src/demo.py\n@@ -1 +1,2 @@\n-old = 1\n+old = 2\n+new = 3\n```\n'''
        proposal = parse_patch_proposal(text)
        self.assertTrue(proposal['readOnly'])
        self.assertFalse(proposal['applicable'])
        self.assertEqual(proposal['files'], [
            {'path': 'src/demo.py', 'additions': 2, 'deletions': 1},
        ])
        self.assertIn('--- a/src/demo.py', proposal['diff'])

    def test_rejects_parent_absolute_and_blocked_paths(self):
        unsafe = [
            '--- a/../secret.py\n+++ b/../secret.py\n@@ -0,0 +1 @@\n+x\n',
            '--- /tmp/x.py\n+++ /tmp/x.py\n@@ -1 +1 @@\n-a\n+b\n',
            '--- a/.git/config\n+++ b/.git/config\n@@ -1 +1 @@\n-a\n+b\n',
            '--- a/data/settings.json\n+++ b/data/settings.json\n@@ -1 +1 @@\n-a\n+b\n',
        ]
        for patch in unsafe:
            with self.subTest(patch=patch):
                with self.assertRaises(ValueError):
                    summarize_unified_diff(extract_unified_diff(patch))

    def test_rejects_binary_or_unknown_file_types(self):
        patch = '''--- a/public/logo.png\n+++ b/public/logo.png\n@@ -1 +1 @@\n-old\n+new\n'''
        with self.assertRaises(ValueError):
            parse_patch_proposal(patch)

    def test_rejects_header_only_preview_without_hunk_or_changes(self):
        for patch in (
            '--- a/src/x.py\n+++ b/src/x.py\n',
            '--- a/src/x.py\n+++ b/src/x.py\n@@ -1 +1 @@\n context only\n',
        ):
            with self.subTest(patch=patch):
                with self.assertRaises(ValueError):
                    parse_patch_proposal(patch)

    def test_supports_new_and_deleted_files_without_dev_null_as_target(self):
        new_file = '''--- /dev/null\n+++ b/src/new.py\n@@ -0,0 +1 @@\n+print("hi")\n'''
        deleted = '''--- a/src/old.py\n+++ /dev/null\n@@ -1 +0,0 @@\n-print("bye")\n'''
        self.assertEqual(parse_patch_proposal(new_file)['files'][0]['path'], 'src/new.py')
        self.assertEqual(parse_patch_proposal(deleted)['files'][0]['path'], 'src/old.py')

    def test_rejects_duplicate_file_headers(self):
        patch = '''--- a/x.py\n+++ b/x.py\n@@ -1 +1 @@\n-a\n+b\n--- a/x.py\n+++ b/x.py\n@@ -1 +1 @@\n-b\n+c\n'''
        with self.assertRaises(ValueError):
            parse_patch_proposal(patch)

    def test_requires_a_real_unified_diff(self):
        with self.assertRaises(ValueError):
            parse_patch_proposal('Just a plan, no patch yet.')


if __name__ == '__main__':
    unittest.main()
