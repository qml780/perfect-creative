import Image from 'next/image';
import { settings } from '@/lib/store.mjs';

export type Product = {
  slug: string; sku: string; category: string; names: string[]; material: string[];
  desc: string[]; photos: string[]; status: string; specs?: Record<string, string>
};

export function asset(photo: string) {
  return photo.startsWith('upload-') ? '/api/v1/media/' + photo.slice(7) : '/media/' + photo + '.jpg';
}

export function Photo({ photo, alt, className = '', priority = false }: {photo?: string; alt: string; className?: string; priority?: boolean}) {
  if (!photo) return <div className={'empty-photo ' + className}>Photo to be added</div>;
  return <Image src={asset(photo)} width={1086} height={1448} unoptimized alt={alt} className={className} loading={priority?'eager':undefined} fetchPriority={priority?'high':undefined}/>;
}


export function Icon({ name }: {name: 'bag' | 'arrow' | 'down' | 'menu' | 'close' | 'left' | 'right'}) {
  const paths = { bag: 'M5 8h14l1 13H4L5 8Zm4 1V6a3 3 0 1 1 6 0v3', arrow: 'M4 12h15m-6-6 6 6-6 6', down: 'M12 4v15m-6-6 6 6 6-6', menu: 'M3 8h18M3 16h18', close: 'm5 5 14 14M19 5 5 19', left: 'm15 5-7 7 7 7', right: 'm9 5 7 7-7 7' };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d={paths[name]}/></svg>;
}

export function Mark({ brand }: {brand: string}) {
  return <span className="wordmark"><svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><path d="M2 2h28v28H2zM8 24V8h7.2a4.5 4.5 0 0 1 0 9H8m15 7h-6" stroke="currentColor" strokeWidth="1.5"/></svg><span>{brand}</span></span>;
}

export function Header({ zh, suffix, current }: {zh: boolean; suffix: string; current: string}) {
  const base = zh ? '/zh' : '/en';
  const { brand } = settings();
  const nav = [['products','Products','产品'],['wholesale','Wholesale','批发'],['customization','Custom','定制'],['about','About','关于'],['contact','Contact','联系']];
  const links = (rows: string[][]) => rows.map(([slug,en,cn]) => <a key={slug} aria-current={current===slug ? 'page' : undefined} href={base+'/'+slug}>{zh?cn:en}</a>);
  return <>
    <a className="skip-link" href="#content">{zh?'跳到正文':'Skip to content'}</a>
    <header className="site-header"><div className="nav-shell">
      <button className="menu-button icon-button" type="button" data-menu-open aria-haspopup="dialog" aria-label={zh?'打开菜单':'Open menu'}><Icon name="menu"/></button>
      <a className="brand" href={base} aria-label={brand}><Mark brand={brand}/></a>
      <nav className="desktop-nav center-nav" aria-label={zh?'网站导航':'Main navigation'}>{links(nav)}</nav>
      <div className="right-nav">
        <a className="lang" href={(zh?'/en':'/zh')+suffix} hrefLang={zh?'en':'zh-CN'} lang={zh?'en':'zh-CN'}>{zh?'EN':'中文'}</a>
        <a className="nav-quote" href={base+'/quote'} aria-current={current==='quote'?'page':undefined}>{zh?'询价':'Request a quote'}</a>
      </div>
    </div><div className="reading-progress" data-progress aria-hidden="true"/></header>
    <dialog className="mobile-menu" data-menu aria-labelledby="menu-title">
      <div className="dialog-head"><strong id="menu-title">{zh?'菜单':'Menu'}</strong><button className="icon-button" data-menu-close aria-label={zh?'关闭菜单':'Close menu'}><Icon name="close"/></button></div>
      <nav>{links(nav)}<a href={base+'/quote'}>{zh?'获取批发报价':'Get wholesale quote'}</a></nav>
    </dialog>
  </>;
}

export function Footer({ zh }: {zh: boolean}) {
  const base = zh ? '/zh' : '/en';
  const { brand } = settings();
  return <footer className="site-footer"><div className="wrap footer-top">
    <div><a href={base}><Mark brand={brand}/></a><p>{zh?'面向会议、教育与活动空间的亚克力演讲台。':'Acrylic lecterns for conference, education and event spaces.'}</p></div>
    <div><strong>{zh?'浏览':'Explore'}</strong><a href={base+'/products'}>{zh?'产品目录':'Product catalog'}</a><a href={base+'/customization'}>{zh?'OEM 定制':'OEM customization'}</a><a href={base+'/wholesale'}>{zh?'批发合作':'Wholesale'}</a></div>
    <div><strong>{zh?'联系':'Contact'}</strong><a href={base+'/quote'}>{zh?'询价表单':'Contact form'}</a><a href={base+'/faq'}>FAQ</a><a href={base+'/privacy'}>{zh?'隐私说明':'Privacy notice'}</a></div>
  </div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} {brand}</span><button data-top type="button">{zh?'返回顶部':'Back to top'} ↑</button></div></footer>;
}

export function Card({ item, zh }: {item: Product; zh: boolean}) {
  const index = zh?1:0;
  const base = zh?'/zh':'/en';
  return <article className="product-card">
    <a className="card-media" href={base+'/products/'+item.slug} aria-label={item.names[index]}><Photo photo={item.photos[0]} alt={item.names[index]}/></a>
    <div className="card-meta"><span>{item.sku}</span><span>{zh?'演示产品':'Demo product'}</span></div>
    <div className="card-title"><h3><a href={base+'/products/'+item.slug}>{item.names[index]}</a></h3><a className="round-link" href={base+'/products/'+item.slug} aria-label={item.names[index]}><Icon name="arrow"/></a></div>
    <p>{item.material[index]} <span aria-hidden="true">·</span> {zh?'价格请咨询':'Price on request'}</p>
  </article>;
}

export function AssemblyDiagram({ step }: {step: number}) {
  return <svg className="assembly-svg" viewBox="0 0 660 470" aria-hidden="true">
    <defs><pattern id={'dots-'+step} width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#9ca4a8" opacity=".3"/></pattern></defs>
    <rect x="0" y="0" width="660" height="470" fill={'url(#dots-'+step+')'}/>
    <g fill="none" stroke="#728087" opacity=".55" strokeDasharray="4 8"><path d="M80 235h500M330 45v380"/><circle cx="330" cy="235" r="175"/></g>
    {step !== 2 ? <g strokeLinejoin="round" strokeWidth="1.5">
      <path d={step===0?'M215 371 356 344 452 389 308 417Z':'M215 385 356 357 452 402 308 431Z'} fill="#59646a" fillOpacity=".4" stroke="#c1cbd0"/>
      <g transform={step===1?'translate(82 0)':''}><path d="M280 147 361 132 361 359 280 374Z" fill="#9aadb3" fillOpacity=".16" stroke="#c0cacf"/><path d="M292 161 351 151v196l-59 11Z" fill="#566169" fillOpacity=".45" stroke="#7c8d94"/></g>
      <g transform={step===1?'translate(-86 0)':''}><path d="M280 147 232 125v226l48 23Z" fill="#88999e" fillOpacity=".31" stroke="#d6ddde"/><path d="m241 163 21 10v47l-21-10Zm0 103 21 10v35l-21-10Z" fill="#222b30" stroke="#9aa5a6"/></g>
      <g transform={step===1?'translate(0 -31)':''}><path d="m170 106 220-39 100 48-221 43Z" fill="#9ba9a9" fillOpacity=".36" stroke="#e0e3dc"/><path d="m170 106v8l99 50 221-43v-6l-221 43Z" fill="#7f8b92" stroke="#bec6c4"/></g>
      {step===1 && <path d="M330 126v247M181 241l294-55" fill="none" stroke="#c4966c" strokeDasharray="5 9"/>}
    </g> : <g strokeWidth="1.5" strokeLinejoin="round">
      <path d="M159 265 383 213 511 275 287 330 159 265v65l128 65 224-57v-63" fill="#8b6549" fillOpacity=".24" stroke="#d2a37b"/>
      <path d="M287 330v65M197 246 390 201l83 42-196 46Z" fill="#8b6549" fillOpacity=".4" stroke="#d2a37b"/>
      <path d="M197 226 390 181l83 42-196 46Zm0-20 193-45 83 42-196 46Zm0-20 193-45 83 42-196 46Z" fill="#93a6ae" fillOpacity=".25" stroke="#b6c2c6"/>
      <path d="m197 186 2 60m191-106v61m83-18v60m-196-14v60" fill="none" stroke="#c4966c" strokeDasharray="5 7"/>
    </g>}
  </svg>;
}

export function Assembly({ zh }: {zh: boolean}) {
  const steps = [
    {id:'assembled',en:'Assembled',cn:'组装完成',detail:'The reading surface, side panels and base form the lectern on stage.',zh:'台面、侧板与底座组成完整的演讲台。'},
    {id:'disassembled',en:'Disassembled',cn:'拆分板件',detail:'Separate the panels for transport. Confirm the hardware and instructions for your selected model.',zh:'运输前可拆分板件。紧固件及操作顺序以选定型号为准。'},
    {id:'flat-pack',en:'Flat-packed',cn:'平板包装',detail:'Layer the panels for packing and confirm the carton dimensions and gross weight when requesting a quote.',zh:'将板件分层装箱，询价时确认外箱尺寸与毛重。'}
  ];
  return <section id="construction" className="construction section-dark"><div className="wrap construction-grid">
    <div className="construction-copy" data-sequence><p className="kicker light">{zh?'结构与运输':'Construction & shipping'}</p>
      <h2 data-enter-title>{zh?'为平板包装而设计。':'Designed to\npack flat.'}</h2>
      <div className="steps" data-enter-body data-steps aria-label={zh?'拆装步骤':'Assembly steps'}>
        {steps.map((step,i) => <a key={step.id} href={'#'+step.id} data-step={step.id} aria-current={i===0?'step':undefined}><span>0{i+1}</span>{zh?step.cn:step.en}<Icon name="arrow"/></a>)}
      </div>
    </div>
    <div className="assembly-media" data-assembly>{steps.map((step,i)=><figure id={step.id} key={step.id} data-panel={step.id}>
      <AssemblyDiagram step={i}/><figcaption><span>{zh?'结构示意':'Construction schematic'}</span><p>{zh?step.zh:step.detail}</p></figcaption>
    </figure>)}</div>
  </div></section>;
}
