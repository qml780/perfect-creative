import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  enabled, withDb, allowAttempt, audit, createSession, getEmployee, recordInquiry,
  revokeSession, saveProduct, sessionCookie, verifyPassword
} from '@/lib/store.mjs';
import { inquirySchema, inquiryStates, productSchema } from '@/lib/validation.mjs';
import { samplePhotos } from '@/lib/catalog.mjs';
import { localOrigin } from '@/lib/local-request';

export const runtime = 'nodejs';
type Context = {params: Promise<{action?: string[]}>};
const json = (body: object, status=200) => NextResponse.json(body, { status, headers: {'Cache-Control':'no-store'} });
const redirect = (request: NextRequest,path: string) => NextResponse.redirect(new URL(path,localOrigin(request)!),303);
const formValues = (data: FormData) => Object.fromEntries(Array.from(data).filter(([,val])=>typeof val==='string'));
function kind(bytes: Uint8Array, allowPdf = false) {
  if (bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff) return 'image/jpeg';
  if (bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10') return 'image/png';
  if (allowPdf&&bytes.slice(0,5).join(',')==='37,80,68,70,45') return 'application/pdf';
  return '';
}

export async function GET(request: NextRequest, {params}: Context) {
  if (!enabled() || !localOrigin(request)) return json({error:'Not configured'},503);
  const [section,id,extra] = (await params).action || [];
  if (section==='inquiry-file'&&id&&!extra&&/^RFQ-[A-Za-z0-9_-]{20}$/.test(id)) {
    const employee=getEmployee(request.cookies.get(sessionCookie)?.value);
    if (employee?.role!=='owner') return json({error:'Sign in required'},401);
    const row=withDb(db=>db.prepare('SELECT * FROM inquiry_files WHERE inquiry=?').get(id));
    if (!row || !(row.data instanceof Uint8Array)) return json({error:'Not found'},404);
    const encoded = encodeURIComponent(String(row.name)).replace(/['()*]/g, value=>'%'+value.charCodeAt(0).toString(16));
    return new Response(new Uint8Array(row.data),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encoded,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if (section !== 'media' || !id || extra || !/^[a-f0-9]{32}$/.test(id)) return json({error:'Not found'},404);
  const row = withDb(db => db.prepare('SELECT mime,data FROM media WHERE id=?').get(id));
  if (!row || !(row.data instanceof Uint8Array)) return json({error:'Not found'},404);
  return new Response(new Uint8Array(row.data),{headers:{'Content-Type':String(row.mime),'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
}

export async function POST(request: NextRequest, {params}: Context) {
  const base = localOrigin(request);
  if (!enabled() || !base) return json({error:'Not configured'},503);
  const origin=request.headers.get('origin');
  if (origin && origin!==base) return json({error:'Invalid origin'},403);
  const [section, action, extra] = (await params).action || [];
  if (extra) return json({error:'Not found'},404);
  const limit = section==='inquiries' || (section==='admin' && action==='products') ? 6*1024*1024 : 24*1024;
  if (Number(request.headers.get('content-length')) > limit) return json({error:'Request too large'},413);
  if (section==='inquiries' && !action) {
    if (!withDb(db=>allowAttempt(db,'inquiry:local',12,600000))) return json({error:'Too many requests'},429);
    let data: Record<string,unknown>;
    let attachment: {name:string; mime:string; bytes:Uint8Array} | undefined;
    try {
      let payload: unknown;
      if (request.headers.get('content-type')?.includes('application/json')) {
        if (Number(request.headers.get('content-length')) > 24*1024) return json({error:'Request too large'},413);
        payload=await request.json();
      } else {
        const form=await request.formData();
        payload=formValues(form);
        const file=form.get('attachment');
        if (file instanceof File && file.size) {
          if (file.size>5*1024*1024) return json({error:'File too large',fields:['attachment']},422);
          const bytes=new Uint8Array(await file.arrayBuffer());
          const mime=kind(bytes,true);
          if (!mime) return json({error:'Invalid file',fields:['attachment']},422);
          attachment={name:file.name.split(/[\\/]/).at(-1)?.slice(0,120)||'attachment',mime,bytes};
        }
      }
      if (!payload || typeof payload!=='object' || Array.isArray(payload)) return json({error:'Invalid payload'},400);
      data = payload as Record<string,unknown>;
    } catch { return json({error:'Invalid request'},400); }
    const valid=inquirySchema.safeParse({phone:'',whatsapp:'',destination:'',delivery:'',trade:'',message:'',website:'',marketing:'',sku:'',...data});
    if (!valid.success) return json({error:'Check form',fields:valid.error.issues.map(issue=>issue.path[0])},422);
    return withDb(db=>{
      const {sku}=valid.data;
      if (sku&&!db.prepare("SELECT 1 FROM products WHERE sku=? AND status='published'").get(sku)) return json({error:'Product unavailable',fields:['sku']},422);
      db.exec('BEGIN IMMEDIATE');
      try {
        const reference=recordInquiry(db,valid.data);
        if (attachment) db.prepare('INSERT INTO inquiry_files VALUES (?,?,?,?)').run(reference,attachment.name,attachment.mime,attachment.bytes);
        db.exec('COMMIT');
        return json({reference,demo:true},201);
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    });
  }
  if (section==='checkout') return json({error:'Checkout disabled. Request a quote.'},403);
  if (section!=='admin') return json({error:'Not found'},404);
  if (!origin) return json({error:'Invalid origin'},403);
  let form: FormData;
  try { form=await request.formData(); } catch { return json({error:'Invalid form'},400); }
  const fields=formValues(form);
  if (action==='login') {
    const email=String(fields.email||'').trim().toLowerCase();
    const password=String(fields.password||'');
    if (email.length>254||password.length>256) return redirect(request,'/admin/login?error=invalid');
    const token=withDb(db=>{
      if (!allowAttempt(db,'login:local',18,600000)) return null;
      const employee=db.prepare('SELECT email,secret FROM employees WHERE email=?').get(email);
      if (!employee||!verifyPassword(String(employee.secret),password)) return null;
      return createSession(db,String(employee.email));
    });
    if (!token) return redirect(request,'/admin/login?error=invalid');
    const result=redirect(request,'/admin');
    result.cookies.set(sessionCookie,token,{httpOnly:true,sameSite:'strict',path:'/',maxAge:28800,secure:request.nextUrl.protocol==='https:'});
    return result;
  }
  const currentToken=request.cookies.get(sessionCookie)?.value;
  const employee=getEmployee(currentToken);
  if (!employee) return json({error:'Sign in required'},401);
  if (employee.role!=='owner') return json({error:'Access denied'},403);
  const actor=String(employee.email);
  if (action==='logout') {
    withDb(db=>revokeSession(db,currentToken));
    const result=redirect(request,'/admin/login');
    result.cookies.delete(sessionCookie);
    return result;
  }
  if (action==='products') {
    const original=String(fields.original||'');
    const editPath='/admin/products/'+(original ? encodeURIComponent(original) : 'new');
    const result=productSchema.safeParse({status:'draft',...fields});
    if (!result.success) return redirect(request,editPath+'?error=validate');
    const data=result.data;
    const file=form.get('image');
    let image: {id:string; mime:string; bytes:Uint8Array} | undefined;
    if (file instanceof File && file.size) {
      if (file.size>5*1024*1024) return redirect(request,editPath+'?error=image');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const mime=kind(bytes);
      if (!mime) return redirect(request,editPath+'?error=image');
      image={id:randomBytes(16).toString('hex'),mime,bytes};
      if (data.photo) data.photos=[data.photo,data.photos].filter(Boolean).join(',');
      data.photo='upload-'+image.id;
    }
    try {
      const valid = withDb(db=>{
        const images = [data.photo,...data.photos.split(',').map(item=>item.trim())].filter(Boolean);
        if (data.status==='published'&&!images.length) return false;
        if (images.some(photo=>!samplePhotos.includes(photo) && !(image&&photo==='upload-'+image.id) &&
          !(photo.startsWith('upload-')&&db.prepare('SELECT 1 FROM media WHERE id=?').get(photo.slice(7))))) return false;
        if (image) db.prepare('INSERT INTO media VALUES (?,?,?)').run(image.id,image.mime,image.bytes);
        try { saveProduct(db,data,original,actor); }
        catch (error) {
          if (image) db.prepare('DELETE FROM media WHERE id=?').run(image.id);
          throw error;
        }
        return true;
      });
      if (!valid) return redirect(request,editPath+'?error=image');
    } catch { return redirect(request,editPath+'?error=duplicate'); }
    return redirect(request,'/admin/products?saved=1');
  }
  if (action==='inquiries') {
    const id=String(fields.id||''), status=String(fields.status||''), owner=String(fields.assignee||'').trim(), notes=String(fields.notes||'').trim();
    if (!/^RFQ-[A-Za-z0-9_-]{20}$/.test(id) || !inquiryStates.includes(status) || owner.length>120||notes.length>4000) return json({error:'Check form'},422);
    const updated=withDb(db=>{
      const success=db.prepare('UPDATE inquiries SET status=?,assignee=?,notes=? WHERE id=?').run(status,owner,notes,id);
      if(success.changes) audit(db,actor,'inquiry:update',id);
      return success.changes;
    });
    return updated ? redirect(request,'/admin/inquiries/'+id+'?saved=1') : json({error:'Inquiry not found'},404);
  }
  if (action==='settings') {
    const keys=['brand','heroEn','heroZh'];
    if (!String(fields.brand||'').trim() || keys.some(key=>String(fields[key]||'').length>120)) return redirect(request,'/admin/settings?error=validate');
    withDb(db=>{
      const stmt=db.prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
      keys.forEach(key=>stmt.run(key,String(fields[key]||'').trim()));
      audit(db,actor,'settings:update','brand and homepage');
    });
    return redirect(request,'/admin/settings?saved=1');
  }
  return json({error:'Not found'},404);
}
