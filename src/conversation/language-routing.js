const ENGLISH_REQUEST=/\b(?:speak|reply|talk|answer|switch|back)\b[^.?!]*\b(?:in )?english\b|\benglish(?: only| please)?\b/i;
const HINDI_REQUEST=/\b(?:speak|reply|talk|answer|switch)\b[^.?!]*\b(?:in )?hindi\b|\bhindi(?: mein| me| only| please)?\b|हिंदी(?: में)?/iu;

/** Keep the newest spoken turn in charge of its response language. */
export function responseLanguageFor(text,recognizedLanguage=''){
  const value=String(text||'');
  if(ENGLISH_REQUEST.test(value))return 'english';
  if(HINDI_REQUEST.test(value))return 'hindi';
  if(/[\u0900-\u097f]/u.test(value)||String(recognizedLanguage).toLowerCase().startsWith('hi'))return 'hindi';
  return 'english';
}

export function languageInstruction(language){
  return language==='hindi'
    ? 'Reply in natural Hindi or Hinglish that matches the user. Do not switch to English-only unless they ask.'
    : 'Reply in English. Do not continue in Hindi merely because an earlier turn used Hindi.';
}
