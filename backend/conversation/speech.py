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


def prepare_spoken_text(text, *, max_chars=MAX_SPOKEN_CHARS):
    """Convert detailed display text into a short TTS-safe representation.

    The original model text remains unchanged for chat/history. This only shapes
    the text sent to the speech engine.
    """
    value=str(text or '')
    if not value.strip():return ''
    value=re.sub(r'```[\s\S]*?```',_replace_code_block,value)
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
