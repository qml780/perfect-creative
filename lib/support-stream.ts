import { EventEmitter } from 'node:events';

const root=globalThis as typeof globalThis & {perfectCreativeSupport?:EventEmitter};
const updates=root.perfectCreativeSupport ??= new EventEmitter().setMaxListeners(0);

export function notifySupport(room:string) {
  updates.emit('staff');
  updates.emit('room:'+room);
}

export function supportStream(channel:string, signal:AbortSignal, snapshot:()=>unknown) {
  const encoder=new TextEncoder();
  let cleanup=()=>{};
  const stream=new ReadableStream<Uint8Array>({
    start(controller) {
      let closed=false;
      const deliver=()=>{
        if(closed) return;
        try { controller.enqueue(encoder.encode('data: '+JSON.stringify(snapshot())+'\n\n')); }
        catch { finish(); }
      };
      const heartbeat=setInterval(()=>{
        if(!closed) controller.enqueue(encoder.encode(': heartbeat\n\n'));
      },12000);
      const lease=setTimeout(()=>finish(),55000);
      function finish() {
        if(closed) return;
        cleanup();
        controller.close();
      }
      cleanup=()=>{
        closed=true;
        clearInterval(heartbeat);
        clearTimeout(lease);
        updates.off(channel,deliver);
        signal.removeEventListener('abort',finish);
      };
      updates.on(channel,deliver);
      signal.addEventListener('abort',finish,{once:true});
      if(signal.aborted) finish();
      else {
        controller.enqueue(encoder.encode('retry: 750\n\n'));
        deliver();
      }
    },
    cancel(){cleanup();}
  });
  return new Response(stream,{headers:{
    'Content-Type':'text/event-stream; charset=utf-8',
    'Cache-Control':'no-cache, no-store, no-transform',
    'X-Accel-Buffering':'no'
  }});
}
