import re


def split_ready(text, *, first=False, first_chars=56, chunk_chars=140):
    # Don't break decimals or common titles into separate spoken fragments.
    for match in re.finditer(r'[.!?](?:\s|$)', text):
        end=match.end()
        if text[match.start()]=='.' and re.search(r'\b(?:Mr|Mrs|Ms|Dr|Prof|St|vs|etc)\.$',text[:match.start()+1],re.I):
            continue
        return text[:end].strip(),text[end:]
    if first:
        clause=re.search(r'[,;:—](?:\s|$)',text)
        if clause and clause.start()>=24:
            return text[:clause.end()].strip(),text[clause.end():]
    limit=first_chars if first else chunk_chars
    if len(text)>limit and ' ' in text[:limit]:
        end=text.rfind(' ',0,limit)
        return text[:end],text[end:]
    return None,text
