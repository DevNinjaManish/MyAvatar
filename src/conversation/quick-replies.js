export function quickReply(text,bot='nova'){
  const normalized=String(text).toLowerCase().replace(/[!?.,।]/g,'').trim();
  if(/^(?:(?:hi|hey|hello)[ ,]+)?(?:nova[ ,]+)?(?:how are you(?: doing)?|कैसे हो|कैसी हो|आप कैसे हैं|kaise ho|kaisi ho)(?: today)?(?: nova)?$/u.test(normalized)){
    return {nova:'I’m here and ready to chat. How are you?',sterling:'Very well, thank you. How are you?',rivet:'Ready to go. How about you?',luma:'Glad you’re here. How are you?'}[bot]||'Ready to chat. How are you?';
  }
  if(/^(hi|hello|hey|नमस्ते)( nova)?$/u.test(normalized))return bot==='sterling'?'Hello. How can I help?':'Hey! Good to hear from you.';
  if(/^(thanks|thank you|धन्यवाद|शुक्रिया)$/u.test(normalized))return 'You’re welcome.';
  return null;
}
