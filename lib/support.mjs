import { createHash, randomBytes } from 'node:crypto';

export const supportCookie = 'pc_support';
export const sessionSeconds = 30 * 24 * 60 * 60;
const digest = token => createHash('sha256').update(token).digest('hex');

/** @param {import('node:sqlite').DatabaseSync} db @param {string|undefined} token */
export function visitorRoom(db, token) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db.prepare('SELECT id,name,language,consent,updated,staff_read FROM support_rooms WHERE token_hash=? AND expires>?').get(digest(token), Date.now()) || null;
}

/** @param {import('node:sqlite').DatabaseSync} db @param {{name:string,language:string,consent:boolean}} input */
export function createRoom(db, { name, language, consent }) {
  const token = randomBytes(32).toString('base64url');
  const id = randomBytes(16).toString('hex');
  const now = Date.now();
  db.prepare('INSERT INTO support_rooms(id,token_hash,name,language,consent,updated,expires) VALUES (?,?,?,?,?,?,?)').run(id,digest(token),name,language,Number(consent),now,now+sessionSeconds*1000);
  return {id,token};
}

/** @param {import('node:sqlite').DatabaseSync} db @param {string} room @param {{sender:string,original:string,source:string,translated?:string,target?:string,status?:string,engine?:string}} message */
export function appendMessage(db, room, {sender,original,source,translated='',target='',status='none',engine=''}) {
  const now = Date.now();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = db.prepare('INSERT INTO support_messages(room,sender,original,source,translated,target,translation_status,engine,created) VALUES (?,?,?,?,?,?,?,?,?)').run(room,sender,original,source,translated,target,status,engine,now);
    db.prepare('UPDATE support_rooms SET updated=? WHERE id=?').run(now,room);
    db.exec('COMMIT');
    return Number(result.lastInsertRowid);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** @param {import('node:sqlite').DatabaseSync} db @param {string} room */
export function messages(db, room) {
  return db.prepare('SELECT * FROM (SELECT id,sender,original,source,translated,target,translation_status,engine,created FROM support_messages WHERE room=? ORDER BY id DESC LIMIT 150) ORDER BY id').all(room);
}

const localTranslationUrl = () => process.env.LOCAL_TRANSLATION_URL?.trim();
export const translationConfigured = () => Boolean(localTranslationUrl() || process.env.TRANSLATION_API_KEY?.trim());
const codes = { en:'en', zh:'zh-CN', ms:'ms' };

/** @param {string} original @param {'en'|'zh'|'ms'|'auto'} source @param {'en'|'zh'|'ms'} target */
export async function translate(original, source, target) {
  if (source === target) return {text:original, detected:source, engine:'', status:'same-language'};
  const local = localTranslationUrl();
  if (local) {
    try {
      const response = await fetch(new URL('/translate',local),{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({q:original,source,target,format:'text'}),
        signal:AbortSignal.timeout(9000),cache:'no-store'
      });
      if (!response.ok) throw new Error('Local translation unavailable');
      const result=await response.json();
      if (typeof result.translatedText!=='string' || !result.translatedText.trim()) throw new Error('Empty translation');
      const values=text=>JSON.stringify((text.match(/\d+(?:[.,]\d+)*/g)||[]).sort());
      const models=original.match(/\b[A-Za-z]+[-_][A-Za-z0-9_-]*\d[A-Za-z0-9_-]*/g)||[];
      if(values(original)!==values(result.translatedText)||models.some(model=>!result.translatedText.includes(model))) {
        throw new Error('Translation altered a quantity or model code');
      }
      const detected=result.detectedLanguage?.language||source;
      const translated=target==='ms'&&/(演讲台|讲台)/.test(original)
        ? result.translatedText.replace(/\bslot bicara\b/gi,'podium')
        : result.translatedText;
      return {text:translated,detected,engine:'argos-local',status:detected===target?'same-language':'translated'};
    } catch {
      return {text:'',detected:source,engine:'argos-local',status:'failed'};
    }
  }
  const key = process.env.TRANSLATION_API_KEY?.trim();
  if (!key) return {text:'', detected:source, engine:'', status:'unconfigured'};
  // Reserve numeric specifications and model codes before sending text to the provider.
  const protectedParts = [];
  const query = original.replace(/[A-Za-z]+[-_][A-Za-z0-9_-]*\d[A-Za-z0-9_-]*|\d+(?:[.,]\d+)*/g, value => {
    protectedParts.push(value);
    return `⟦${protectedParts.length}⟧`;
  });
  try {
    const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({q:query,format:'text',model:'nmt',target:codes[target],...(source==='auto'?{}:{source:codes[source]})}),
      signal:AbortSignal.timeout(5000), cache:'no-store'
    });
    if (!response.ok) throw new Error('Translation provider unavailable');
    const result = (await response.json())?.data?.translations?.[0];
    if (!result || typeof result.translatedText!=='string' || !result.translatedText.trim()) throw new Error('Empty translation');
    if (protectedParts.some((_,index)=>result.translatedText.split(`⟦${index+1}⟧`).length!==2)) throw new Error('Translation changed protected values');
    const translated = result.translatedText.replace(/⟦(\d+)⟧/g, (token,index)=>protectedParts[Number(index)-1] ?? token);
    return {text:translated, detected:result.detectedSourceLanguage || source, engine:'google-v2-nmt', status:'translated'};
  } catch {
    return {text:'', detected:source, engine:'google-v2-nmt', status:'failed'};
  }
}
