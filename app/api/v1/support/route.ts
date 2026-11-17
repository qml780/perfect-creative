import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { allowAttempt, enabled, getEmployee, sessionCookie, withDb } from '@/lib/store.mjs';
import { appendMessage, createRoom, messages, sessionSeconds, supportCookie, translate, translationConfigured, visitorRoom } from '@/lib/support.mjs';
import { localOrigin } from '@/lib/local-request';
import { notifySupport, supportStream } from '@/lib/support-stream';

export const runtime = 'nodejs';
const slug = z.string().regex(/^[a-f0-9]{32}$/);
const language = z.enum(['en', 'zh', 'ms']);
const original = z.string().trim().min(1).max(1500);
const payload = z.discriminatedUnion('action', [
  z.object({action:z.literal('start'),name:z.string().trim().max(70),language,consent:z.boolean()}),
  z.object({action:z.literal('message'),text:original,source:z.enum(['auto', 'en', 'zh', 'ms'])}),
  z.object({action:z.literal('preview'),room:slug,text:original}),
  z.object({action:z.literal('reply'),room:slug,text:original,translation:z.string().trim().max(3000),engine:z.enum(['','google-v2-nmt','argos-local'])})
]);
const json = (value: unknown, status=200) => NextResponse.json(value, {status,headers:{'Cache-Control':'no-store'}});
const fail = (message:string, status:number) => json({error:message},status);
const limited = () => fail('Please wait before trying again.',429);
const minute = 60_000;

const staff = (request:NextRequest) => getEmployee(request.cookies.get(sessionCookie)?.value)?.role === 'owner';
const token = (request:NextRequest) => request.cookies.get(supportCookie)?.value;

export async function GET(request: NextRequest) {
  if (!enabled() || !localOrigin(request)) return fail('Chat is unavailable.',503);
  const {searchParams}=request.nextUrl;
  const streaming=searchParams.get('stream')==='1';
  const connected=translationConfigured();
  const local=Boolean(process.env.LOCAL_TRANSLATION_URL);
  if(searchParams.get('view')==='staff') {
    if(!staff(request)) return fail('Sign in to open the support workspace.',401);
    const id=searchParams.get('room');
    if(id&&!slug.safeParse(id).success) return fail('Conversation unavailable.',404);
    const snapshot=()=>withDb(db=>{
      const now=Date.now();
      const rooms=db.prepare(`SELECT r.id,r.name,r.language,r.consent,r.updated,
          (SELECT COUNT(*) FROM support_messages m WHERE m.room=r.id AND m.sender='visitor' AND m.id>r.staff_read) AS unread
        FROM support_rooms r WHERE r.expires>? AND EXISTS(SELECT 1 FROM support_messages m WHERE m.room=r.id) ORDER BY r.updated DESC LIMIT 100`).all(now);
      if(!id) return {rooms,connected,local};
      const room=rooms.find(row=>row.id===id) || db.prepare('SELECT id,name,language,consent,updated FROM support_rooms WHERE id=? AND expires>?').get(id,now);
      return {rooms,room:room||null,messages:room?messages(db,id):[],connected,local};
    });
    return streaming ? supportStream('staff',request.signal,()=>{
      if(!staff(request)) throw new Error('Expired staff session');
      return snapshot();
    }) : json(snapshot());
  }
  const visitorSnapshot=()=>withDb(db=>{
    const room=visitorRoom(db,token(request));
    return {room:room ? {language:room.language} : null,messages:room?messages(db,String(room.id)):[],connected,local};
  });
  if(!streaming) return json(visitorSnapshot());
  const visitor=withDb(db=>visitorRoom(db,token(request)));
  return supportStream(visitor?'room:'+visitor.id:'anonymous',request.signal,visitorSnapshot);
}

export async function POST(request: NextRequest) {
  const host=localOrigin(request);
  if(!enabled() || !host) return fail('Chat is unavailable.',503);
  if(request.headers.get('origin')!==host) return fail('Invalid origin.',403);
  if(Number(request.headers.get('content-length'))>16_384) return fail('Message too large.',413);
  let body;
  try { body=payload.safeParse(await request.json()); }
  catch {return fail('Invalid message.',400);}
  if(!body.success) return fail('Check the message and try again.',422);
  const data=body.data;
  if(data.action==='start') {
    const existing=withDb(db=>visitorRoom(db,token(request)));
    if(existing) return json({created:false});
    const made=withDb(db=>allowAttempt(db,'support:new',30,10*minute) ? createRoom(db,data) : null);
    if(!made) return limited();
    const result=json({created:true},201);
    result.cookies.set(supportCookie,made.token,{httpOnly:true,sameSite:'strict',path:'/api/v1/support',maxAge:sessionSeconds,secure:request.nextUrl.protocol==='https:'});
    return result;
  }
  if(data.action==='message') {
    const room=withDb(db=>visitorRoom(db,token(request)));
    if(!room) return fail('Start a conversation first.',401);
    const id=String(room.id);
    if(!withDb(db=>allowAttempt(db,'support:message:'+id,16,minute))) return limited();
    const permitsTranslation=Boolean(room.consent)||Boolean(process.env.LOCAL_TRANSLATION_URL);
    const canTranslate=permitsTranslation && data.source!=='zh' && translationConfigured();
    const message=withDb(db=>appendMessage(db,id,{
      sender:'visitor',original:data.text,source:data.source,target:'zh',
      status:canTranslate ? 'pending' : data.source==='zh'?'same-language':permitsTranslation?'unconfigured':'no-consent'
    }));
    notifySupport(id);
    if(canTranslate) {
      after(async()=>{
        const result=withDb(db=>allowAttempt(db,'support:provider',80,60*minute))
          ? await translate(data.text,data.source,'zh') : {text:'',detected:data.source,status:'limited',engine:''};
        withDb(db=>db.prepare('UPDATE support_messages SET translated=?,source=?,translation_status=?,engine=? WHERE id=? AND room=?').run(result.text,result.detected,result.status,result.engine,message,id));
        notifySupport(id);
      });
    }
    return json({saved:true},201);
  }
  if(!staff(request)) return fail('Sign in to open the support workspace.',401);
  const room=withDb(db=>db.prepare('SELECT language FROM support_rooms WHERE id=? AND expires>?').get(data.room,Date.now()));
  const target=language.safeParse(room?.language);
  if(!target.success) return fail('Conversation unavailable.',404);
  if(data.action==='preview') {
    if(!withDb(db=>allowAttempt(db,'support:preview',20,minute))) return limited();
    if(target.data!=='zh' && translationConfigured() && !withDb(db=>allowAttempt(db,'support:provider',80,60*minute))) return limited();
    return json(await translate(data.text,'zh',target.data));
  }
  withDb(db=>{
    appendMessage(db,data.room,{
      sender:'staff',original:data.text,source:'zh',translated:data.translation,target:target.data,
      status:data.translation?'reviewed':'original',engine:data.translation?(data.engine||'human'):''
    });
    db.prepare("UPDATE support_rooms SET staff_read=(SELECT COALESCE(MAX(id),0) FROM support_messages WHERE room=?) WHERE id=?").run(data.room,data.room);
  });
  notifySupport(data.room);
  return json({saved:true},201);
}
