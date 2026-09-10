"""Conservative natural-language controls for Rivet's pending coding workflow."""
from __future__ import annotations

import re


def coding_control_intent(text: str) -> str | None:
    value=re.sub(r'[^a-z0-9 ]+',' ',str(text or '').lower())
    value=re.sub(r'\s+',' ',value).strip()
    if not value:return None
    exact={
        'apply it':'apply','apply that':'apply','apply the change':'apply','apply this change':'apply','approve it':'apply','approve the change':'apply',
        'reject it':'reject','reject that':'reject','reject the change':'reject','do not apply it':'reject','dont apply it':'reject',
        'roll it back':'rollback','rollback':'rollback','roll back':'rollback','undo that change':'rollback','undo the change':'rollback',
        'propose a repair':'repair','propose repair':'repair','repair it':'repair','try one repair':'repair','fix the failed tests':'repair',
        'switch project':'switch_workspace','change project':'switch_workspace','choose project':'switch_workspace','switch workspace':'switch_workspace','change workspace':'switch_workspace',
    }
    if value in exact:return exact[value]
    if len(value)<=48:
        if re.fullmatch(r'(please )?(apply|approve)( (it|that|this|the change))?( please)?',value):return 'apply'
        if re.fullmatch(r'(please )?(reject|decline)( (it|that|this|the change))?( please)?',value):return 'reject'
        if re.fullmatch(r'(please )?(rollback|roll back|undo)( (it|that|this|the change))?( please)?',value):return 'rollback'
        if re.fullmatch(r'(please )?(propose|try|make)( one| a)? repair( attempt)?( please)?',value):return 'repair'
        if re.fullmatch(r'(please )?(switch|change|choose)( the)? (project|workspace)( please)?',value):return 'switch_workspace'
    return None
