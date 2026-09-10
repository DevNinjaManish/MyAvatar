import re

_ABBREVIATIONS=r'\b(?:Mr|Mrs|Ms|Dr|Prof|St|vs|etc|e\.g|i\.e)\.$'


def split_ready(text, *, first=False, first_chars=56, chunk_chars=140):
    """Return one speech-ready chunk while preserving natural boundaries."""
    # Prefer complete sentences immediately, while avoiding decimals and common abbreviations.
    for match in re.finditer(r'[.!?](?:["\')\]]?)(?:\s|$)', text):
        end=match.end()
        if text[match.start()]=='.':
            prefix=text[:match.start()+1]
            if re.search(_ABBREVIATIONS,prefix,re.I):continue
            if match.start()>0 and match.start()+1<len(text) and text[match.start()-1].isdigit() and text[match.start()+1].isdigit():continue
        return text[:end].strip(),text[end:]
    # The first spoken chunk may use an earlier clause boundary so TTS can start
    # while the model is still generating the rest of the sentence.
    clause_floor=18 if first else max(32,min(72,chunk_chars//2))
    for match in re.finditer(r'[,;:—–](?:\s|$)',text):
        if match.start()>=clause_floor:
            return text[:match.end()].strip(),text[match.end():]
    limit=max(24,first_chars if first else chunk_chars)
    if len(text)>=limit:
        # Prefer a nearby whitespace boundary, but don't emit tiny fragments.
        end=text.rfind(' ',max(0,limit-28),min(len(text),limit+1))
        if end<max(20,limit//2):end=text.find(' ',limit)
        if end>0:return text[:end].strip(),text[end:]
    return None,text
