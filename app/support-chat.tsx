'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

type Language = 'en'|'zh'|'ms';
type Room = {id:string;name:string;language:Language;unread:number;consent:number};
type Message = {id:number;sender:'staff'|'visitor';original:string;source:string;translated:string;target:string;translation_status:string;created:number};
type Conversation = {room?:Room|null;rooms?:Room[];messages?:Message[];connected:boolean;local:boolean};
const endpoint='/api/v1/support';
const languageNames={en:'English',zh:'中文',ms:'Bahasa Melayu'};
const statuses:Record<string,string>={pending:'翻译中…',unconfigured:'翻译服务未连接',failed:'翻译失败，已保留原文',limited:'已达翻译限额，已保留原文','no-consent':'访客仅发送原文'};

async function request<T>(url:string, body?:object):Promise<T> {
  const response=await fetch(url, body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {cache:'no-store'});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function useConversation(url:string) {
  const [data,setData]=useState<Conversation|null>(null);
  const [error,setError]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const stream=new EventSource(url+(url.includes('?')?'&':'?')+'stream=1');
    stream.onmessage=event=>{
      setData(JSON.parse(event.data) as Conversation);
      setError(false);
    };
    stream.onerror=()=>setError(true);
    return ()=>stream.close();
  },[url,revision]);
  return {data,error,reconnect:()=>setRevision(value=>value+1)};
}

function TalkIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65"><path d="M4 4.75h16v11H10l-5 4v-4H4z"/><path d="M8 10h8"/></svg>;
}

function Transcript({ messages, zh, staff = false }: {messages:Message[];zh:boolean;staff?:boolean}) {
  const list=useRef<HTMLDivElement>(null);
  const count=messages.length;
  const latest=messages.at(-1)?.id;
  useEffect(()=>{
    const box=list.current;
    if(box) box.scrollTop=box.scrollHeight;
  },[count,latest]);
  const date=new Intl.DateTimeFormat(zh?'zh-CN':'en',{hour:'numeric',minute:'2-digit'});
  return <div className="support-transcript" ref={list} role="log" aria-label={zh?'对话记录':'Conversation messages'} tabIndex={0}>
    {!count&&<p className="support-empty">{zh?'还没有消息。':'No messages yet.'}</p>}
    {messages.map(message=>{
      const showTranslation=Boolean(message.translated)&&(staff||message.sender==='staff');
      const primary=!staff&&showTranslation?message.translated:message.original;
      return <article key={message.id} className={'support-message '+((message.sender==='staff')===staff?'mine':'theirs')}>
        <span>{message.sender==='staff'?(zh?'客服':'Support'):(zh?'访客':'Visitor')} <time dateTime={new Date(message.created).toISOString()}>{date.format(message.created)}</time></span>
        <p>{primary}</p>
        {showTranslation&&<details open={staff||undefined}><summary>{staff?'查看译文':zh?'查看原文':'Show original'}</summary><p>{staff?message.translated:message.original}</p></details>}
        {staff && !showTranslation && message.sender==='visitor' && statuses[message.translation_status]&&<small>{statuses[message.translation_status]}</small>}
      </article>;
    })}
  </div>;
}

export function SupportChat({zh}: {zh:boolean}) {
  const t=(en:string,cn:string)=>zh?cn:en;
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false);
  const [seen,setSeen]=useState(0);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const {data,error,reconnect}=useConversation(endpoint);
  const lastReply=data?.messages?.reduce((id,message)=>message.sender==='staff'?message.id:id,0)||0;

  function show(){
    dialog.current?.showModal();
    setOpen(true);
  }
  async function submit(event:FormEvent<HTMLFormElement>,start:boolean){
    event.preventDefault();
    const form=event.currentTarget;
    const values=new FormData(form);
    setBusy(true);
    setNotice('');
    try {
      await request(endpoint,start ? {action:'start',name:values.get('name'),language:values.get('language'),consent:values.get('consent')==='on'} :
        {action:'message',text:values.get('text'),source:values.get('source')});
      if(!start) { form.reset();setNotice(t('Message delivered','消息已送达')); }
      else reconnect();
    } catch {setNotice(t('Could not send. Please try again.','发送失败，请重试。'));}
    finally {setBusy(false);}
  }

  return <>
    <button className="support-launch" ref={trigger} type="button" aria-haspopup="dialog" onClick={show}><TalkIcon/>{t('Chat with us','在线咨询')}{!open&&lastReply>seen&&<span className="support-unread" aria-label={t('New reply','有新回复')}/>}</button>
    <dialog className="support-dialog" ref={dialog} aria-labelledby="support-heading" onClose={()=>{setSeen(lastReply);setOpen(false);trigger.current?.focus();}}>
      <header><div><TalkIcon/><h2 id="support-heading">{t('Customer support','产品顾问')}</h2></div><button className="icon-button" type="button" onClick={()=>dialog.current?.close()} aria-label={t('Close chat','关闭咨询')}>×</button></header>
      <div className="support-content">
        {error&&<p className="support-hint" role="status">{t('Reconnecting…','正在重新连接…')}</p>}
        {!data&&!error?<p role="status">{t('Connecting…','正在连接…')}</p>:data&&<>
          <p className="support-hint">{t('Leave a message for our team. Replies appear here.','请给团队留言，回复会显示在这里。')}</p>
          {!data.connected&&<p className="support-hint">{t('Automatic translation is unavailable. Messages are delivered in their original language.','自动翻译尚未配置，消息会以原文送达。')}</p>}
          {data.room ? <>
            <Transcript zh={zh} messages={data.messages||[]}/>
            <form className="support-form" onSubmit={event=>void submit(event,false)}>
              <label>{t('Message language','消息语言')}<select name="source" defaultValue="auto"><option value="auto">{t('Detect automatically','自动识别')}</option>{Object.entries(languageNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
              <label>{t('Your message','你的消息')}<textarea name="text" rows={2} maxLength={1500} required/></label>
              <button className="button primary" disabled={busy}>{busy?t('Sending…','发送中…'):t('Send message','发送消息')}</button>
            </form>
          </>:<form className="support-form" onSubmit={event=>void submit(event,true)}>
            <label>{t('Name (optional)','称呼（选填）')}<input name="name" maxLength={70} autoComplete="given-name"/></label>
            <label>{t('Reply language','接收回复的语言')}<select name="language" defaultValue={zh?'zh':'en'}>{Object.entries(languageNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
            {data.connected&&!data.local&&<label className="checkbox"><input name="consent" type="checkbox"/><span>{t('Allow Google Cloud Translation to translate my messages.','允许 Google Cloud Translation 翻译我发送的消息。')}</span></label>}
            {data.local&&<input type="hidden" name="consent" value="on"/>}
            <button className="button primary" disabled={busy}>{t('Start conversation','开始咨询')}</button>
          </form>}
        </>}
        <p className="support-announcement" role="status">{notice}</p>
      </div>
    </dialog>
  </>;
}

export function SupportWorkspace(){
  const [selected,setSelected]=useState('');
  const url=endpoint+'?view=staff'+(selected?'&room='+selected:'');
  const {data,error}=useConversation(url);
  return <div className="support-workspace">
    <h1>多语言客服</h1>
    <p className="support-hint">{data?.local?'本地翻译已配置，请核对译文后发送。':data?.connected?'翻译 API 已配置，请核对译文后发送。':'自动翻译尚未配置。可发送原文或手动填写译文。'}</p>
    {error&&<p className="notice" role="status">连接失败，请检查登录状态。</p>}
    <div className="support-inbox">
      <aside aria-label="访客会话">
        <h2>访客会话</h2>
        {data?.rooms?.length ? data.rooms.map(room=><button key={room.id} type="button" aria-pressed={room.id===selected} onClick={()=>setSelected(room.id)}>
          <strong>{room.name||'访客 '+room.id.slice(0,4)}</strong><span>{languageNames[room.language]} {room.unread>0&&<b>{room.unread} 条待回复</b>}</span>
        </button>) : <p className="support-empty">暂无访客留言。</p>}
      </aside>
      <section aria-label="当前会话">
        {data?.room && data.room.id===selected ? <ReplyWorkspace key={data.room.id} room={data.room} messages={data.messages||[]}/> : <p className="support-empty">选择会话后查看原文并回复。</p>}
      </section>
    </div>
  </div>;
}

function ReplyWorkspace({room,messages}:{room:Room;messages:Message[]}){
  const [original,setOriginal]=useState('');
  const [translated,setTranslated]=useState('');
  const [status,setStatus]=useState('');
  const [engine,setEngine]=useState('');
  const [busy,setBusy]=useState(false);
  async function send(preview:boolean){
    if(!original.trim()){setStatus('请填写回复内容。');return;}
    setBusy(true);
    setStatus('');
    try{
      if(preview){
        const result=await request<{text:string;status:string;engine:string}>(endpoint,{action:'preview',room:room.id,text:original});
        setTranslated(result.text);
        setEngine(result.engine);
        setStatus(result.status==='translated'?'已生成预览，请核对后发送。':result.status==='same-language'?'访客选择中文，可以直接发送。':statuses[result.status]||'暂时无法生成译文，可填写人工译文。');
      }else{
        await request(endpoint,{action:'reply',room:room.id,text:original,translation:room.language==='zh'?'':translated,engine});
        setOriginal('');
        setTranslated('');
        setEngine('');
        setStatus('已回复。');
      }
    }catch{setStatus('操作失败，请重试。');}
    finally{setBusy(false);}
  }
  return <>
    <h2>{room.name||'访客'} · {languageNames[room.language]}</h2>
    <Transcript zh staff messages={messages}/>
    <form className="support-form" onSubmit={event=>{event.preventDefault();void send(false);}}>
      <label>中文回复<textarea value={original} rows={3} maxLength={1500} required disabled={busy}
        onChange={event=>{setOriginal(event.target.value);setTranslated('');setEngine('');setStatus('');}}/></label>
      {room.language!=='zh'&&<><button className="button outline" type="button" disabled={busy} onClick={()=>void send(true)}>预览译文</button>
        <label>{languageNames[room.language]} 译文<textarea value={translated} rows={3} maxLength={3000} disabled={busy} onChange={event=>setTranslated(event.target.value)}/></label></>}
      <button className="button primary" disabled={busy}>{translated.trim()&&room.language!=='zh'?'确认译文并发送':'发送原文'}</button>
      <p className="support-announcement" role="status">{status}</p>
    </form>
  </>;
}
