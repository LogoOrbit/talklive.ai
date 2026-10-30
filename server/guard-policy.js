// TalkLive's chat rules, as the AI Guard and auto-mod apply them.
//
//   Allowed:      flirting and sexual chat between adults; swearing and rough
//                 slang between friends.
//   Not allowed:  asking for money, sending links (or "visit/follow my
//                 profile"), moving people to WhatsApp/Instagram/Snapchat or
//                 sharing phone numbers, asking for pictures or videos, telling someone to
//                 kill themselves, real threats or murder talk, selling drugs
//                 or any other illegal activity. Someone saying they feel
//                 suicidal themselves is NOT a violation - they need help.
//   Ban:          asking for money again and again, or copy-pasting a money
//                 request to strangers.
//   Always:       sexual talk with someone who says they are under 18 goes to
//                 the owner (automod.js), whatever the rules above say.
//
// detect(text) says which rules a message breaks. classify(text) answers the
// AI Guard's "Teach it" queue the way the owner would: 'spam' for money, links,
// contact swaps, picture requests and drug/illegal selling, 'abuse' for suicide baiting and
// threats, 'sexual' for sexual chat
// (allowed, but labelled so the minor check keeps working), 'fine' for false
// alarms, 'skip' for plain swearing, or null to leave it for the owner
// (insults and slurs, which can be friendly slang).

const MONEY = [
  /\b(pay\s*pal|cash\s*app|venmo|zelle|upi|paytm|g\s*pay|google\s*pay|phone\s*pe|easy\s*paisa|jazz\s*cash|g\s*cash|bkash|western\s*union|money\s*gram|gift\s*cards?|amazon\s*card|steam\s*card|bitcoin|btc|usdt|binance|bank\s*(?:details|account|transfer))\b/i,
  /\b(?:send|give|transfer|lend|loan|need|want)\s+(?:me\s+)?(?:some\s+|a\s+little\s+)?(?:money|cash|funds|dollars?|bucks|rupees?|pkr|inr)\b/i,
  /\b(?:send|give|transfer)\s+me\s+(?:\$\s*)?\d+/i,
  /\bpay\s+(?:me|for|to\s+(?:see|watch|talk|chat))\b/i,
  /\$\s?\d+|\b\d+\s*(?:dollars?|usd|bucks|rs\.?|rupees?|pkr|inr)\b/i,
  /\b(?:per|each)\s+(?:video|vid|pic|photo|call|minute|min|session)\b/i,
  /\b(?:premium|paid|exclusive|private)\s+(?:videos?|vids?|pics?|photos?|content|shows?)\b/i,
  /\b(?:recharge|top\s*-?\s*up|mobile\s*load|easy\s*load)\s+(?:me|my|kar|kr|karo|kardo|please|plz|pls)\b/i,
  /\b(?:paise?|paisa|pese|pesa)\s*(?:bhej\w*|de\s*do|do|dedo|chahiye|chaiye|chahie)\b/i,
  /\b(?:donate|donation|sponsor\s+me|help\s+me\s+(?:with\s+money|financially))\b/i,
];

const PICS = [
  // "send me a pic", "send your pic", "send nudes" - not "no option to send video".
  /\b(?:send|share|show|give|drop)\s+me\s+(?:a\s+|your\s+|ur\s+|yr\s+|some\s+|one\s+)?(?:pic|pics|picture|pictures|photo|photos|pix|selfie|selfies|nudes?|video|videos|vid|vids|snap)\b/i,
  /\b(?:send|share|show|give|drop)\s+(?:your|ur|yr|some|one)\s+(?:pic|pics|picture|pictures|photo|photos|pix|selfie|selfies|nudes?|video|videos|vid|vids|snap)\b/i,
  /\bsend\s+(?:nudes?|pics?|photos?|selfies?)\b/i,
  /\b(?:can|could|may)\s+i\s+(?:see|get|have)\s+(?:your|ur|a|some)\s+(?:pic|pics|picture|pictures|photo|photos|selfie|nudes?|video|videos)\b/i,
  /\b(?:see|want|need|get)\s+(?:your|ur)\s+(?:pic|pics|picture|pictures|photo|photos|nudes|selfie|video|videos)\b/i,
  /\b(?:i\s+)?(?:want|need)\s+(?:sex\s+|nude\s+|naked\s+|hot\s+)?(?:videos?|pics?|nudes|photos?)\b/i,
  /\bshow\s+(?:me\s+)?(?:your|ur)\s+(?:ass|boobs?|tits?|pussy|dick|cock|body|face|pic|nudes?)\b/i,
  /^\s*(?:pic|pics|nudes?|send\s+nudes|pic\s+(?:pls|plz|please))\s*[?!.]*\s*$/i,
];

const LINK = [
  /(?:https?:\/\/|www\.)\S+/i,
  /\b(?!talklive\.)[a-z0-9-]{2,}\.(?:com|net|org|io|xyz|ru|link|gg|me|app|site|online|store|shop|live|tv|ly|to|cc)\b(?:\/\S*)?/i,
  /\b(?:visit|follow|check\s*out|subscribe\s+to|add)\s+(?:me|my)\b.{0,30}\b(?:instagram|insta|ig|tiktok|youtube|yt|channel|profile|page|only\s*fans|onlyfans|account)\b/i,
  /\bonly\s*fans\b/i,
];

// Telling someone to kill or hurt themselves. "I want to kill myself" is not here.
const SUICIDE_BAIT = /\b(?:kys|kill\s*(?:your\s*self|urself|yourself|ur\s*self)|go\s+(?:die|kill\s+(?:your|ur)\s*self)|you\s+should\s+(?:die|kill\s+(?:your|ur)\s*self|end\s+(?:it|your\s+life))|end\s+your\s+(?:life|self)|hang\s+(?:your|ur)\s*self|slit\s+your\s+wrists?|drink\s+bleach|jump\s+off\s+a\s+(?:bridge|building|roof))\b/i;
// Real threats and murder talk, not "this movie's murder scene".
const THREAT = /\b(?:i(?:'?ll|\s+will|\s+am\s+going\s+to|'?m\s+(?:gonna|going\s+to)|\s+wanna|\s+want\s+to)\s+(?:kill|murder|stab|shoot|rape)\s+(?:you|u|him|her|them|your\s+\w+)|(?:how\s+(?:do\s+i\s+|to\s+)|help\s+me\s+)(?:kill|murder|poison)\s+(?:someone|somebody|a\s+person|my\s+\w+|him|her)|i(?:'?ll|\s+will)\s+find\s+you|rape\s+you)\b/i;
// Selling drugs and other illegal services.
const ILLEGAL = [
  /\b(?:sell(?:ing)?|buy(?:ing)?|plug\s+for|deliver(?:ing|y)?|supply(?:ing)?|dealer\s+for)\s+(?:some\s+|good\s+)?(?:weed|ganja|charas|hash|coke|cocaine|meth|crystal|ice|heroin|mdma|molly|ecstasy|lsd|acid|xanax|oxy\w*|percs?|shrooms|ketamine|fentanyl|drugs?)\b/i,
  /\b(?:weed|ganja|coke|cocaine|meth|mdma|xanax|drugs?|pills)\s+(?:for\s+sale|available|delivery|delivered)\b/i,
  /\b(?:fake\s+(?:id|ids|passports?|documents?|notes|currency)|carding|cc\s+dumps?|stolen\s+(?:cards?|accounts?)|money\s+laundering|launder\s+money|sell(?:ing)?\s+(?:guns?|weapons?|stolen\s+\w+))\b/i,
  /\bhack(?:ing)?\s+(?:any\s+)?(?:accounts?|instagram|insta|facebook|fb|whatsapp|snapchat)\b/i,
];
// Slurs: hateful, but also used as slang between friends; the owner decides.
const SLUR = /\b(nigg(?:a|er|ers|as)?|faggots?)\b/i;
// Insults: rude, but context decides (role-play, talking about a third person).
const INSULT = /\b(fuck\s+(?:you|u|off|your\s+(?:mom|mum|mother|sister|family))|fuck\s+yourself|bitch\w*|dumbass|asshole|stfu|shut\s+up|whore|slut|retard\w*|motherfucker|loser|idiot)\b/i;
// Moving people to another app, or sharing a phone number: warned like links.
const CONTACT = /\b(?:wh?ats?\s*app|wa\s*(?:number|no)|telegram|snap\s*chat|snap\s*id|discord|kik)\b|\b(?:your|ur|my|any|send)\s+(?:id|ig|insta|instagram|number|no|snap|whatsapp)\b|^\s*(?:ig|my\s+ig|ur\s+id|id)\s*[?!.]*\s*$|(?:^|[^\d$])\+?\d(?:[\s().-]?\d){9,13}(?!\d)/i;
const SEXUAL = /\b(sex|sexy|sext\w*|dick\w*|cock|pussy|boobs?|tits?|horny|naked|nude|porn\w*|suck\w*|lick\w*|wet|cum\w*|balls|thighs?|doggy|finger\w*|naughty|dirty|blow\s*job|bj|orgasm|moan\w*|grop\w*|bend|kiss\w*|nipples?|clit|erect\w*|masturbat\w*)\b|\b(?:wanna|want\s+to|gonna|can\s+we|let'?s|i\s+will|i'?ll|to)\s+fuck\b|\bfuck\s+(?:me|her|him|hard|you\s+(?:hard|in))\b/i;
const SEX_FUCK_YOU = /\b(?:will|wanna|want\s+to|gonna|let\s+me|i'?ll|can\s+i|to)\s+fuck\s+(?:you|u)\b/i;
const SWEAR_ONLY = /^\W*(?:aa*h+\s+)?(?:the\s+)?(?:fuck|fucking|fck|fuk|shit)(?:\s+(?:no|yes|society|off|it|this|that|man))?\W*$/i;

const any = (list, t) => list.some((re) => re.test(t));

function detect(text) {
  const t = String(text || '');
  return {
    money: any(MONEY, t),
    link: any(LINK, t),
    pics: any(PICS, t),
    harm: SUICIDE_BAIT.test(t) || THREAT.test(t),
    suicideBait: SUICIDE_BAIT.test(t),
    illegal: any(ILLEGAL, t),
    slur: SLUR.test(t),
    insult: INSULT.test(t),
    contact: CONTACT.test(t),
    sexual: SEXUAL.test(t),
  };
}

function classify(text) {
  const t = String(text || '').trim();
  if (!t) return 'skip';
  const d = detect(t);
  if (d.harm) return 'abuse';
  if (d.money || d.pics || d.link || d.contact || d.illegal) return 'spam';
  // Slurs and insults can be friendly slang: the owner decides.
  if (d.slur) return null;
  // "I will fuck you" is sexual chat, not an insult.
  if (SEX_FUCK_YOU.test(t)) return 'sexual';
  if (d.insult) return null;
  if (d.sexual) return 'sexual';
  if (SWEAR_ONLY.test(t)) return 'skip';
  return 'fine';
}

module.exports = { detect, classify };
