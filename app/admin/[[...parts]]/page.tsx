import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Mark, type Product } from '../../components';
import { withDb, enabled, getEmployee, readProducts, sessionCookie, settings } from '@/lib/store.mjs';
import { samplePhotos } from '@/lib/catalog.mjs';
import { inquiryStates } from '@/lib/validation.mjs';
import { SupportWorkspace } from '../../support-chat';

export const dynamic = 'force-dynamic';
export const metadata = { title:'员工后台', robots:{index:false,follow:false} };
type Props = {params: Promise<{parts?: string[]}>;searchParams: Promise<Record<string,string|undefined>>};
const menus=[['','总览'],['products','商品'],['inquiries','询盘'],['chat','客服'],['orders','订单'],['quotes','报价'],['analytics','统计'],['settings','网站设置'],['integrations','集成'],['audit','操作记录']];
const categoryList=[['solid','纯色'],['clear','透明'],['frosted','磨砂'],['event','展示支架']];

function Login({error}: {error?: string}) {
  return <div className="admin-login"><p className="kicker">PERFECT CREATIVE / STAFF</p><h1>员工后台</h1>
    <p className="notice">本地演示。首次使用请在项目目录运行 <code>npm run admin:init</code> 创建账号。</p>
    {error&&<p className="form-error" role="alert">邮箱或密码有误，或登录尝试过于频繁。</p>}
    <form action="/api/v1/admin/login" method="post">
      <label>邮箱<input type="email" name="email" autoComplete="username" required/></label>
      <label>密码<input type="password" name="password" autoComplete="current-password" required/></label>
      <button className="button primary">登录</button>
    </form>
    <a className="breadcrumb" href="/zh">← 返回网站</a>
  </div>;
}

function ProductEditor({item, error}: {item?: Product;error?: string}) {
  const input = (key:string,label:string,value='',required=false) => <label>{label}<input name={key} defaultValue={value} required={required}/></label>;
  return <>
    <a className="admin-back" href="/admin/products">← 商品列表</a>
    <h1>{item?'编辑 '+item.sku:'新增商品'}</h1>
    {error&&<p className="form-error" role="alert">{error==='image'?'请为已发布商品提供有效图片。上传支持 5 MB 内的 JPG 或 PNG。':error==='duplicate'?'保存失败。请核对型号和 URL 标识是否重复。':'请补全商品信息。URL 标识用小写字母、数字与连字符。'}</p>}
    <form className="editor-form" action="/api/v1/admin/products" method="post" encType="multipart/form-data">
      <input type="hidden" name="original" value={item?.slug||''}/>
      {input('sku','型号 / SKU',item?.sku,true)}{input('slug','URL 标识',item?.slug,true)}
      {input('en','英文名称',item?.names[0],true)}{input('zh','中文名称',item?.names[1],true)}
      {input('materialEn','英文材质',item?.material[0],true)}{input('materialZh','中文材质',item?.material[1],true)}
      <label>类别<select name="category" defaultValue={item?.category||'solid'}>{categoryList.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label>状态<select name="status" defaultValue={item?.status||'draft'}><option value="draft">草稿</option><option value="published">发布</option><option value="archived">下架</option></select></label>
      <label>英文说明<textarea name="descEn" rows={3} defaultValue={item?.desc[0]||''}/></label>
      <label>中文说明<textarea name="descZh" rows={3} defaultValue={item?.desc[1]||''}/></label>
      <label>主图<select name="photo" defaultValue={item?.photos[0]||''}><option value="">请选择或上传</option>{[...new Set([...samplePhotos,...(item?.photos||[])])].map(photo=><option key={photo}>{photo}</option>)}</select></label>
      <label>上传主图<input type="file" name="image" accept="image/png,image/jpeg"/></label>
      {input('photos','附图（素材 ID 用逗号分隔）',item?.photos.slice(1).join(','))}
      {input('moq','最小起订量',item?.specs?.moq)}
      {input('dimensions','长 × 宽 × 高',item?.specs?.dimensions)}{input('thickness','板厚',item?.specs?.thickness)}
      {input('netWeight','净重',item?.specs?.netWeight)}{input('packing','包装尺寸',item?.specs?.packing)}
      {input('grossWeight','毛重',item?.specs?.grossWeight)}{input('lead','预计交期',item?.specs?.lead)}
      <button className="button primary full">保存商品</button>
    </form>
  </>;
}

type LocalInquiry={id:string;status:string;payload:string;notes:string;assignee:string;created:string};

function Inquiries({id,saved}: {id?:string;saved?:string}) {
  if(id) {
    const row=withDb(db=>db.prepare('SELECT * FROM inquiries WHERE id=?').get(id)) as LocalInquiry|undefined;
    if(!row) notFound();
    const payload=JSON.parse(row.payload);
    const attachment=withDb(db=>db.prepare('SELECT name FROM inquiry_files WHERE inquiry=?').get(id));
    const fields=[['name','联系人'],['email','工作邮箱'],['company','公司'],['country','国家/地区'],['sku','型号'],['qty','数量'],['purpose','用途'],['custom','Logo / OEM'],['phone','电话'],['whatsapp','WhatsApp'],['language','沟通语言'],['destination','目的地'],['delivery','期望到货日期'],['trade','贸易条款'],['message','备注']];
    return <>
      <a className="admin-back" href="/admin/inquiries">← 询盘列表</a><h1>询盘详情</h1>
      <p className="notice">{row.id} · {new Date(row.created).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</p>
      <dl className="admin-answers">{fields.map(([key,label])=><Pair key={key} label={label} value={String(payload[key]||'—')}/>)}</dl>
      {attachment&&<p className="notice">参考文件 <a className="admin-back" href={'/api/v1/inquiry-file/'+id}>{String(attachment.name)}</a></p>}
      {saved&&<p className="notice" role="status">已保存跟进记录。</p>}
      <form className="editor-form" action="/api/v1/admin/inquiries" method="post">
        <input type="hidden" name="id" value={row.id}/>
        <label>状态<select name="status" defaultValue={row.status}>{inquiryStates.map(status=><option key={status}>{status}</option>)}</select></label>
        <label>负责人<input name="assignee" maxLength={120} defaultValue={row.assignee}/></label>
        <label className="full">内部备注<textarea name="notes" defaultValue={row.notes} maxLength={4000} rows={4}/></label>
        <button className="button primary full">保存跟进</button>
      </form>
    </>;
  }
  const rows=withDb(db=>db.prepare('SELECT * FROM inquiries ORDER BY created DESC LIMIT 200').all()) as unknown as LocalInquiry[];
  return <><h1>客户询盘</h1>{rows.length ? <Table head={['编号','公司','型号 / 数量','状态','负责人']} rows={rows.map(row=>{
    const payload=JSON.parse(row.payload);
    return [<a key={row.id} href={'/admin/inquiries/'+row.id}>{row.id}</a>,payload.company, (payload.sku||'—')+' / '+payload.qty,row.status,row.assignee||'未分配'];
  })}/> : <p className="notice">暂无询盘。可以在前台询价表单提交一条测试记录。</p>}</>;
}

function Pair({label,value}: {label:string;value:string}) {return <><dt>{label}</dt><dd>{value}</dd></>;}

function Table({head,rows}: {head:string[];rows:React.ReactNode[][]}) {
  return <div className="table-scroll"><table><thead><tr>{head.map(label=><th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,i)=><td key={head[i]}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

export default async function Admin({params,searchParams}: Props) {
  const {parts=[]}=await params;
  const search=await searchParams;
  const [page='',id,extra]=parts;
  if(extra) notFound();
  const account=getEmployee((await cookies()).get(sessionCookie)?.value);
  if (!enabled()) return <main className="admin-login"><h1>员工后台</h1><p className="notice">正式身份服务尚未配置。</p><a className="breadcrumb" href="/zh">← 返回网站</a></main>;
  if (page==='login') {
    if(account) redirect('/admin');
    return <Login error={search.error}/>;
  }
  if(!account||account.role!=='owner') redirect('/admin/login');

  let view: React.ReactNode;
  if(page==='products') {
    const items=withDb(db=>readProducts(db)) as Product[];
    if(id) {
      const item=items.find(p=>p.slug===id);
      if(id!=='new'&&!item) notFound();
      view=<ProductEditor item={item} error={search.error}/>;
    } else {
      view=<><h1>商品管理</h1>{search.saved&&<p className="notice" role="status">商品已保存。</p>}
        <a className="button primary" href="/admin/products/new">新增商品</a>
        <Table head={['型号','中文名称','英文名称','状态','价格','操作']} rows={items.map(p=>[p.sku,p.names[1],p.names[0],p.status==='published'?'已发布':p.status==='archived'?'已下架':'草稿','询价',<a key={p.sku} href={'/admin/products/'+p.slug}>编辑</a>])}/>
      </>;
    }
  } else if(page==='inquiries') view=<Inquiries id={id} saved={search.saved}/>;
  else if(id) notFound();
  else if(page==='') {
    const totals=withDb(db=>({products:db.prepare("SELECT COUNT(*) AS n FROM products WHERE status='published'").get()?.n,inquiries:db.prepare('SELECT COUNT(*) AS n FROM inquiries').get()?.n,new:db.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status='NEW'").get()?.n}));
    view=<><h1>运营总览</h1><p className="notice">演示环境 · 以下数字来自本地数据库。</p><div className="admin-tiles">
      <a href="/admin/products"><strong>{Number(totals.products)}</strong><span>已发布商品</span></a>
      <a href="/admin/inquiries"><strong>{Number(totals.inquiries)}</strong><span>询盘总数</span></a>
      <a href="/admin/inquiries"><strong>{Number(totals.new)}</strong><span>待跟进询盘</span></a>
    </div></>;
  } else if(page==='settings') {
    const conf=settings();
    view=<><h1>网站设置</h1>{search.saved&&<p className="notice" role="status">已保存网站设置。</p>}{search.error&&<p className="form-error">请输入有效的品牌名称及标题。</p>}
      <form className="editor-form" action="/api/v1/admin/settings" method="post">
        <label className="full">品牌显示名<input name="brand" defaultValue={conf.brand} required maxLength={100}/></label>
        <label>英文首页标题<input name="heroEn" defaultValue={conf.heroEn} maxLength={120}/></label>
        <label>中文首页标题<input name="heroZh" defaultValue={conf.heroZh} maxLength={120}/></label>
        <button className="button primary full">保存设置</button>
      </form>
    </>;
  } else if(page==='audit') {
    const entries=withDb(db=>db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all());
    view=<><h1>操作记录</h1><Table head={['UTC 时间','员工','操作','对象']} rows={entries.map(row=>[String(row.created),String(row.employee),String(row.action),String(row.target)])}/></>;
  } else if(page==='integrations') {
    view=<><h1>集成状态</h1><Table head={['服务','状态']} rows={[...['Supabase / MFA','PayPal Sandbox','微信 / 支付宝 / UseePay','GA4','邮件服务'].map(service=>[service,'未连接']),['Argos 本地翻译',process.env.LOCAL_TRANSLATION_URL?'本地服务地址已配置':'未连接'],['Google Cloud Translation',process.env.TRANSLATION_API_KEY?'API 密钥已配置':'未连接']]}/></>;
  } else if(page==='chat') view=<SupportWorkspace/>;
  else if(page==='analytics') view=<><h1>访问与转化分析</h1><p className="notice">Analytics not configured · GA4 未连接。</p></>;
  else if(page==='orders') view=<><h1>订单与交易</h1><p className="notice">在线交易未开通。演示商品仅支持询价。</p></>;
  else if(page==='quotes') view=<><h1>报价管理</h1><p className="notice">目前可在询盘详情登记内部报价备注，正式报价单功能尚未接入。</p><a className="button outline" href="/admin/inquiries">查看询盘</a></>;
  else notFound();

  return <div className="admin" lang="zh-CN">
    <header className="admin-top"><a href="/admin"><Mark brand={settings().brand}/></a><a href="/zh">打开前台 ↗</a><form action="/api/v1/admin/logout" method="post"><button className="button cream">退出</button></form></header>
    <div className="admin-shell"><nav className="admin-nav" aria-label="后台导航">{menus.map(([path,label])=><a key={path} aria-current={path===page?'page':undefined} href={'/admin'+(path?'/'+path:'')}>{label}</a>)}</nav>
      <main className="admin-content"><p className="kicker">本地演示 / {String(account.email)}</p>{view}</main></div>
  </div>;
}
