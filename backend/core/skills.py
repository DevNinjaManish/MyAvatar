"""Small, inert specialist skill descriptors.

Skills describe future instruction bundles; they are not prompts, tools, or
permission grants. Loading a descriptor never causes execution or I/O.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SkillDescriptor:
    id: str
    label: str
    bots: frozenset[str]
    purpose: str

    def public(self) -> dict[str, Any]:
        return {'id': self.id, 'label': self.label, 'purpose': self.purpose}


SKILLS = {
    'coding.review': SkillDescriptor('coding.review', 'Coding review', frozenset({'robot'}), 'Review bounded repository changes.'),
    'planning.follow-through': SkillDescriptor('planning.follow-through', 'Planning follow-through', frozenset({'nova', 'butler'}), 'Turn stated goals into practical next steps.'),
    'marketing.message': SkillDescriptor('marketing.message', 'Marketing message', frozenset({'pixel'}), 'Shape campaign messages and experiments.'),
    'design.critique': SkillDescriptor('design.critique', 'Design critique', frozenset({'luma'}), 'Review stated design goals and decisions.'),
}


def skills_for_bot(bot_id: str) -> tuple[SkillDescriptor, ...]:
    return tuple(skill for skill in SKILLS.values() if bot_id in skill.bots)
