import re

MAX_SPOKEN_CHARS=480

_TECH_TERMS={
    'API':'A P I',
    'CLI':'C L I',
    'CPU':'C P U',
    'GPU':'G P U',
    'JSON':'jay son',
    'SQL':'sequel',
    'UI':'U I',
    'UX':'U X',
}


def _replace_code_block(match):
    return ' Code is shown in the chat. '


def _technical_density(text: str) -> float:
    lines=[line for line in text.splitlines() if line.strip()]
    if not lines:return 0.0
    technical=0
    for line in lines:
        stripped=line.lstrip()
        if stripped.startswith(('```','diff --git','@@ ','+++ ','--- ','+','-')) or re.search(r'[{}();]|\b(?:const|let|var|def|class|import|return|async|await)\b',line):
            technical+=1
    return technical/len(lines)


def prepare_spoken_text(text, *, max_chars=MAX_SPOKEN_CHARS):
    """Convert detailed display text into a short TTS-safe representation.

    The original model text remains unchanged for chat/history. This only shapes
    the text sent to the speech engine. It is deliberately resilient to text that
    was truncated in the middle of a Markdown code fence.
    """
    value=str(text or '')
    if not value.strip():return ''

    # A caller may bound text before sanitising it. If that cut happens inside a
    # fence, remove the unmatched remainder rather than reading source code aloud.
    if value.count('```') % 2:
        value=value[:value.rfind('```')]+' Code is shown in the chat. '
    value=re.sub(r'```[\s\S]*?```',_replace_code_block,value)

    # Diff-heavy or source-heavy answers are useful on screen but unpleasant and
    # error-prone when spoken. Preserve any natural-language lead, then point the
    # listener to chat for exact details.
    if _technical_density(value)>=0.5:
        natural=[]
        for line in value.splitlines():
            stripped=line.strip()
            if not stripped or stripped.startswith(('diff --git','@@ ','+++ ','--- ','+','-')):continue
            if re.search(r'[{}();]|\b(?:const|let|var|def|class|import|return|async|await)\b',line):continue
            natural.append(stripped)
            if len(' '.join(natural))>180:break
        lead=' '.join(natural).strip()
        value=(lead+' ' if lead else '')+'The technical details are shown in chat.'

    value=re.sub(r'`([^`\n]+)`',r'\1',value)
    value=re.sub(r'!\[([^\]]*)\]\([^)]*\)',r'\1',value)
    value=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',value)
    value=re.sub(r'https?://\S+','the link in chat',value,flags=re.I)
    value=re.sub(r'(?<!\w)(?:[A-Za-z]:)?(?:[/\\][\w.@+~-]+){2,}(?:\.[A-Za-z0-9]+)?','the file shown in chat',value)
    value=re.sub(r'(?m)^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)','',value)
    value=re.sub(r'[*_~]{1,3}','',value)
    value=re.sub(r'[\U0001F000-\U0001FAFF\U00002600-\U000027BF\ufe0f]','',value)
    for term,spoken in _TECH_TERMS.items():
        value=re.sub(rf'\b{re.escape(term)}\b',spoken,value)
    value=re.sub(r'\s+',' ',value).strip(' -–—|')
    if len(value)>max_chars:
        cut=value.rfind(' ',0,max_chars)
        value=value[:cut if cut>max_chars//2 else max_chars].rstrip(' ,;:-')+'…'
    return value
