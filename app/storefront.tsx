import { Assembly, Card, Icon, Photo, type Product, asset } from './components';
import { FinishLineup, MoreSettings, ReferenceSheets, StageGallery } from './lectern-visuals';
import { LecternViewer } from './lectern-viewer';
import { settings } from '@/lib/store.mjs';

const quoteLabel = (zh: boolean) => zh ? '获取批发报价' : 'Get wholesale quote';
const baseFor = (zh: boolean) => zh?'/zh':'/en';
const materialFilters = [['','All lecterns','全部'],['solid','Solid finish','纯色'],['clear','Clear','透明'],['frosted','Frosted','磨砂'],['event','Display stands','展示支架']];

export function HomePage({ zh, items }: {zh: boolean; items: Product[]}) {
  const base = baseFor(zh);
  const { heroEn, heroZh } = settings();
  const hero = items.find(item=>item.slug==='onyx') || items[0];
  const selection = items.filter(item=>item.category!=='event').slice(0,6);
  const materialViews = [
    {slug:'onyx',className:'detail-onyx',en:'Polished black edge',cn:'黑色亚克力亮面边缘',description:'The reading surface and polished edge on the Onyx lectern.',detail:'曜黑演讲台的阅读台面与抛光边缘。'},
    {slug:'clarity',className:'detail-clear',en:'Clear acrylic joints',cn:'透明亚克力连接处',description:'Visible fastenings and clear panel edges on the Clarity lectern.',detail:'透影演讲台可见的紧固件和透明板材边缘。'}
  ].flatMap(view=>{
    const item=items.find(product=>product.slug===view.slug&&product.photos[0]);
    return item ? [{...view,item}] : [];
  });
  return <>
    <section className="hero">
      <div className="hero-copy" data-sequence>
        <h1 data-enter-title>{(zh?heroZh:heroEn) || (zh?'亚克力演讲台':'Acrylic\nlecterns.')}</h1>
        <div data-enter-body>
          <p className="hero-description">{zh?'可拆装亚克力演讲台，用于会议、教育与活动空间。支持批量采购和品牌标识定制。':'Knock-down lecterns for conferences, classrooms and live events. Available with custom finishes and branding.'}</p>
          <div className="actions"><a className="button primary" href={base+'/products'}>{zh?'查看产品':'Explore the collection'}<Icon name="arrow"/></a><a className="hero-custom" href="#lectern-3d">{zh?'3D 展示':'Explore in 3D'}</a><a className="hero-custom" href={base+'/customization'}>{zh?'了解定制':'Custom options'}</a></div>
        </div>
      </div>
      <div className="hero-media">
        <div className="hero-object"><Photo photo={hero?.photos[0]} alt={hero?.names[zh?1:0] || ''} priority/></div>
        {hero && <a className="hero-caption" href={base+'/products/'+hero.slug}><div><span>{hero.sku}</span><strong>{hero.names[zh?1:0]}</strong></div><Icon name="arrow"/></a>}
      </div>
    </section>
    <section id="collection" className="section wrap collection" data-sequence>
      <div className="section-heading"><h2 data-enter-title>{zh?'演讲台系列':'The collection'}</h2><a className="text-link" href={base+'/products'} data-enter-body>{zh?'浏览产品目录':'View all lecterns'} <Icon name="arrow"/></a></div>
      <div data-enter-body>
      {selection.length ? <div className="gallery" data-gallery>
        <div className="gallery-track" data-track tabIndex={0} aria-label={zh?'演讲台产品轮播':'Lectern product gallery'}>
          {selection.map(item=><Card key={item.slug} item={item} zh={zh}/>)}
        </div>
        {selection.length>1 && <div className="gallery-controls" aria-label={zh?'轮播控制':'Gallery controls'}>
          <div className="dots">{selection.map((item,i)=><button key={item.slug} type="button" data-dot={i} aria-current={i===0?'true':undefined} aria-label={(zh?'显示 ':'Show ')+item.names[zh?1:0]}/>)}</div>
          <div className="gallery-arrows"><button className="round-link" type="button" data-gallery-prev aria-label={zh?'上一项':'Previous item'}><Icon name="left"/></button><button className="round-link" type="button" data-gallery-next aria-label={zh?'下一项':'Next item'}><Icon name="right"/></button></div>
        </div>}
      </div> : <p>{zh?'产品目录准备中。':'The product catalog is being prepared.'}</p>}
      </div>
      <FinishLineup zh={zh}/>
    </section>
    <LecternViewer zh={zh}/>
    <StageGallery zh={zh}/>
    {materialViews.length>0&&<section id="materials" className="material-section" aria-labelledby="material-title">
      <div className="wrap material-layout">
        <div className="material-heading" data-sequence>
          <h2 id="material-title" data-enter-title>{zh?'近看材质与工艺':'Materials, up close.'}</h2>
          <p data-enter-body>{zh?'从台面抛光到板件连接，近距离看清演讲台的细节。':'A closer look at the polished surfaces and joints of our acrylic lecterns.'}</p>
        </div>
        {materialViews.map(view=><figure className={'material-view '+view.className} key={view.slug}>
          <a href={base+'/products/'+view.item.slug}><Photo photo={view.item.photos[0]} alt={zh?view.cn:view.en}/></a>
          <figcaption><div data-sequence><h3 data-enter-title>{zh?view.cn:view.en}</h3><p data-enter-body>{zh?view.detail:view.description}</p></div><a className="round-link" href={base+'/products/'+view.item.slug} aria-label={view.item.names[zh?1:0]}><Icon name="arrow"/></a></figcaption>
        </figure>)}
      </div>
    </section>}
    <Assembly zh={zh}/>
    <ReferenceSheets zh={zh}/>
    <section className="section wrap editorial">
      <div className="editorial-photo"><Photo photo={items.find(item=>item.slug==='clarity')?.photos[1]} alt={zh?'展示品牌标识定制的透明演讲台':'Clear acrylic lectern with a custom logo application'}/><span>{zh?'标识定制示例':'Logo application example'}</span></div>
      <div className="editorial-copy" data-sequence><p className="kicker">{zh?'OEM 与定制':'OEM & customization'}</p><h2 data-enter-title>{zh?'让讲台呈现你的品牌。':'Built for your brand.'}</h2><p data-enter-body>{zh?'把标识融入台面或前板。发来使用场景、数量和设计文件，我们会确认尺寸、表面处理与标识方案。':'Share your intended use, quantity and artwork so we can confirm dimensions, finish and logo placement.'}</p><a className="text-link" data-enter-body href={base+'/customization'}>{zh?'了解定制选项':'Explore customization'}<Icon name="arrow"/></a></div>
    </section>
    <section className="wholesale-band"><div className="wrap" data-sequence><div><p className="kicker light">{zh?'批发与供应':'Wholesale & supply'}</p><h2 data-enter-title>{zh?'从一款样品到批量采购。':'From sample\nto wholesale.'}</h2></div><div data-enter-body><p>{zh?'告诉我们型号、数量和目的地。我们会逐项确认包装、运费及交期，再由人工报价。':'Tell us the model, quantity and destination. We’ll confirm packaging, freight and lead time with each quotation.'}</p><a className="button cream" href={base+'/quote'}>{quoteLabel(zh)} <Icon name="arrow"/></a></div></div></section>
  </>;
}

export function Intro({ kicker, title, desc }: {kicker: string; title: string; desc?: string}) {
  return <div className="page-intro" data-sequence><p className="kicker">{kicker}</p><h1 data-enter-title>{title}</h1>{desc && <p data-enter-body>{desc}</p>}</div>;
}

export function CatalogPage({ zh, items, query }: {zh: boolean; items: Product[]; query: Record<string,string|string[]|undefined>}) {
  const q = typeof query.q==='string'?query.q.slice(0,100):'';
  const category = typeof query.category==='string'?query.category:'';
  const sort = query.sort==='name'?'name':'featured';
  const index=zh?1:0;
  const filtered=items.filter(item=>(!category||item.category===category)&&[item.sku,...item.names,...item.material].join(' ').toLowerCase().includes(q.toLowerCase()));
  if(sort==='name') filtered.sort((a,b)=>a.names[index].localeCompare(b.names[index],zh?'zh':'en'));
  return <section className="section wrap subpage">
    <Intro kicker={zh?'产品目录':'Product catalog'} title={zh?'探索演讲台系列':'Explore our lecterns'} desc={zh?'按材质与结构查找适合你场地的演讲台。':'Find the right finish and silhouette for your space.'}/>
    <form className="filters"><label>{zh?'查找型号或名称':'Search by name or model'}<input type="search" name="q" defaultValue={q} placeholder={zh?'例如：AC-001':'e.g. AC-001'}/></label>
      <label>{zh?'表面与类别':'Finish & category'}<select name="category" defaultValue={category}>{materialFilters.map(([id,en,cn])=><option value={id} key={id}>{zh?cn:en}</option>)}</select></label>
      <label>{zh?'排序':'Sort by'}<select name="sort" defaultValue={sort}><option value="featured">{zh?'推荐':'Featured'}</option><option value="name">{zh?'名称':'Name'}</option></select></label>
      <button className="button primary">{zh?'筛选':'Apply filters'}</button>
    </form>
    <div className="catalog-grid">{filtered.map(item=><Card key={item.slug} item={item} zh={zh}/>)}</div>
    {!filtered.length&&<p className="notice">{zh?'没有匹配的产品。请尝试其他关键词或类别。':'No matching products. Try another search or finish.'}</p>}
  </section>;
}

export function ProductPage({ zh, item }: {zh: boolean; item: Product}) {
  const index=zh?1:0;
  const base=baseFor(zh);
  const specs=[['dimensions','Dimensions','尺寸'],['thickness','Panel thickness','板厚'],['netWeight','Net weight','净重'],['packing','Carton dimensions','包装尺寸'],['grossWeight','Gross weight','毛重'],['moq','MOQ','最小起订量'],['lead','Lead time','交期']];
  return <section className="section wrap subpage">
    <a className="breadcrumb" href={base+'/products'}>← {zh?'产品目录':'All lecterns'}</a>
    <div className="product-detail">
      <div className="product-photos">
        <div className="detail-photo"><Photo photo={item.photos[0]} alt={item.names[index]} priority/></div>
        {item.photos.length>1&&<div className="thumbs">{item.photos.map((photo,i)=><a href={asset(photo)} data-photo={asset(photo)} key={photo} aria-current={i===0?'true':undefined} aria-label={(zh?'产品视图 ':'Product view ')+(i+1)}><Photo photo={photo} alt={item.names[index]}/></a>)}</div>}
      </div>
      <div><p className="kicker">{item.sku} · {zh?'演示产品':'Demo product'}</p><h1>{item.names[index]}</h1><p className="detail-description">{item.desc[index]}</p>
        <p className="price-state">{zh?'价格请咨询':'Price on request'}</p>
        <a className="button primary" href={base+'/quote?sku='+encodeURIComponent(item.sku)}>{quoteLabel(zh)}<Icon name="arrow"/></a>
        <dl className="specs"><div><dt>{zh?'材质':'Material'}</dt><dd>{item.material[index]}</dd></div>
          {specs.map(([id,en,cn])=><div key={id}><dt>{zh?cn:en}</dt><dd>{item.specs?.[id] || (id==='moq'?(zh?'请咨询':'Ask us'):(zh?'待确认':'To be confirmed'))}</dd></div>)}
        </dl><a className="text-link" href={base+'/#disassembled'}>{zh?'查看拆装与包装示意':'View construction & packing'}<Icon name="arrow"/></a>
      </div>
    </div>
  </section>;
}

export function QuotePage({ zh, items, sku }: {zh: boolean; items: Product[]; sku: string}) {
  const t=(en:string,cn:string)=>zh?cn:en;
  const field=(name:string,en:string,cn:string,required=false,type='text')=><label>{t(en,cn)}{required?' *':''}<input name={name} type={type} required={required} maxLength={type==='email'?254:180}/></label>;
  const selected=items.find(item=>item.sku===sku);
  return <section className="section wrap subpage quote-layout"><div className="quote-aside">
    <a className="breadcrumb" href={selected?baseFor(zh)+'/products/'+selected.slug:baseFor(zh)+'/products'}>← {t('Back to products','返回产品')}</a>
    <Intro kicker={t('Wholesale enquiries','批发询盘')} title={t('Request a quote.','获取批发报价。')} desc={t('Tell us what you need and where it’s going.','告诉我们所需型号、数量和收货地点。')}/>
    {selected&&<div className="quote-product"><Photo photo={selected.photos[0]} alt={selected.names[zh?1:0]}/><div><span>{selected.sku}</span><strong>{selected.names[zh?1:0]}</strong><span>{selected.material[zh?1:0]}</span></div></div>}
    <p className="quote-demo">{t('Demo form. Use sample contact details.','演示表单，请使用测试资料。')}</p>
  </div><form className="quote-form" data-inquiry action="/api/v1/inquiries" method="post" encType="multipart/form-data">
    <h2 className="quote-form-title full">{t('Contact details','联系信息')}</h2>
    {field('name','Contact name','联系人',true)}{field('email','Work email','工作邮箱',true,'email')}
    {field('company','Company','公司',true)}{field('country','Country / region','国家或地区',true)}
    <h2 className="quote-form-title full">{t('Your order','采购信息')}</h2>
    <label>{t('Product / model','产品或型号')}<select name="sku" defaultValue={items.some(p=>p.sku===sku)?sku:''}><option value="">{t('Help me choose','请推荐')}</option>{items.map(p=><option key={p.sku} value={p.sku}>{p.sku} — {p.names[zh?1:0]}</option>)}</select></label>
    <label>{t('Quantity','数量')} *<input type="number" name="qty" min="1" max="100000" required defaultValue="20"/></label>
    {field('purpose','Intended use','用途',true)}<label>{t('Custom logo / OEM','Logo 或 OEM 定制')}<select name="custom"><option value="unsure">{t('To discuss','待沟通')}</option><option value="yes">{t('Yes','需要')}</option><option value="no">{t('No','不需要')}</option></select></label>
    <details className="quote-options full"><summary>{t('Delivery and contact preferences','送货及联系方式（选填）')}</summary><div>
    {field('destination','Destination / port','目的地或港口')} {field('delivery','Preferred delivery date','期望到货日期',false,'date')}
    {field('phone','Phone','电话',false,'tel')} {field('whatsapp','WhatsApp','WhatsApp',false,'tel')}
    <label>{t('Preferred language','沟通语言')}<select name="language" defaultValue={zh?'zh':'en'}><option value="en">English</option><option value="zh">中文</option><option value="ms">Bahasa Melayu</option></select></label>
    <label>{t('Trade term','贸易术语')}<select name="trade"><option value="">{t('To discuss','待沟通')}</option>{['EXW','FOB','CIF','DAP'].map(term=><option key={term}>{term}</option>)}</select></label>
    </div></details>
    <label className="full">{t('Project details','项目备注')}<textarea name="message" rows={4} maxLength={2500}/></label>
    <label className="full">{t('Reference file (optional, PDF, JPG or PNG up to 5 MB)','参考文件（可选，5 MB 内的 PDF、JPG 或 PNG）')}<input name="attachment" type="file" accept="application/pdf,image/jpeg,image/png"/></label>
    <label hidden aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
    <label className="full checkbox"><input name="consent" type="checkbox" required/><span>{t('I accept the','我同意')} <a href={baseFor(zh)+'/privacy'}>{t('privacy notice','隐私说明')}</a> {t('and agree to be contacted about this inquiry.','及就本次询盘接受联系。')} *</span></label>
    <label className="full checkbox"><input name="marketing" type="checkbox"/><span>{t('I would like occasional product news.','我愿意接收产品动态。')}</span></label>
    <button className="button primary full">{t('Submit inquiry','提交询盘')}<Icon name="arrow"/></button>
    <div className="full form-status" role="status" data-form-status data-zh={zh?'1':'0'}/>
  </form></section>;
}

const information: Record<string,{title:[string,string], intro:[string,string], rows:[string,string,string,string][]}> = {
  wholesale: {title:['Wholesale & global supply','批发与供应'],intro:['Plan a lectern order around your market, venue and delivery requirements.','按市场、场地和交付要求规划演讲台采购。'],rows:[
    ['Share your requirements','提供采购需求','Send the model, target quantity, branding requirements and destination.','提供型号、意向数量、标识要求和目的地。'],
    ['Review the quotation','审核人工报价','Confirm MOQ, carton specifications, freight and delivery terms for the order.','逐项确认起订量、纸箱规格、运费和交付条款。'],
    ['Request a sample or batch','确认样品或批量订单','Sampling and production are arranged after scope and terms are confirmed.','范围及条款确认后安排样品或批量生产。']
  ]},
  customization: {title:['Built for your brand','为你的品牌而造'],intro:['Start with your space, artwork and desired finish. We’ll review feasibility for your selected model.','提供场地、标识文件和表面效果要求，我们会结合型号确认可行方案。'],rows:[
    ['Logo placement','标识位置','Share artwork and where you would like the identity to appear on the lectern.','提供标识文件与在演讲台上的预期位置。'],
    ['Finish and dimensions','表面与尺寸','Discuss the appearance, reading area and footprint suited to your venue.','沟通所需外观、阅读台面和场地占用尺寸。'],
    ['Packing requirements','包装要求','Confirm how the product needs to travel and be assembled on site.','确认产品运输和现场组装方式。']
  ]},
  about: {title:['About the workshop','关于我们的工厂'],intro:['We produce acrylic lecterns and discuss manufacturing, customization and packing directly with buyers.','我们生产亚克力演讲台，与采购方直接沟通制造、定制及包装需求。'],rows:[]},
  contact: {title:['Contact the workshop','联系工厂'],intro:['Use the inquiry form for wholesale orders, samples, OEM projects and packaging questions.','批发、样品、OEM 项目及包装问题均可通过询盘表单联系。'],rows:[]},
  applications: {title:['Spaces made for speaking','演讲台的应用场景'],intro:['Explore formats for conferences, education and events.','了解会议、教育和活动空间的选型。'],rows:[
    ['Conference rooms','会议场所','Consider the visual balance between the lectern and stage backdrops.','考虑演讲台与舞台背景的视觉关系。'],
    ['Education spaces','教育空间','Review reading surface, shelf access and storage requirements.','考虑阅读台面、置物层和存放需求。'],
    ['Events','活动','Consider packing dimensions and setup requirements before ordering.','采购前确认包装尺寸及现场装配要求。']
  ]},
  faq: {title:['Frequently asked questions','常见问题'], intro:['Details to confirm before you order.','采购前需要确认的事项。'],rows:[
    ['What is the minimum order?','最低起订量是多少？','MOQ depends on the model and customization. Include your target quantity in the inquiry.','起订量取决于型号和定制要求，请在询盘中注明意向数量。'],
    ['Can I request a sample?','可以申请样品吗？','Tell us which model you would like to review and where it needs to ship.','请提供想确认的型号与寄送目的地。'],
    ['Can I add my logo?','可以加 Logo 吗？','Share the artwork and intended placement for review.','请提供设计文件及预期位置以供确认。']
  ]},
  privacy: {title:['Demo privacy notice','演示隐私说明'],intro:['This local preview stores submitted inquiry fields for the demo operator to review. Use fictitious details. No external email, analytics or payment service is connected.','本地演示会保存询盘字段供演示运营人员查看。请使用测试资料。目前未连接外部邮件、网站分析或支付服务。'],rows:[]}
};

export function InfoPage({ name, zh, items }: {name: string; zh: boolean; items: Product[]}) {
  const info=information[name];
  const index=zh?1:0;
  return <section className="section wrap subpage"><Intro kicker={settings().brand} title={info.title[index]} desc={info.intro[index]}/>
    {name==='about' && <div className="notice">{zh?'工厂现场照片待补充':'Workshop photo to be added'}</div>}
    {name==='customization' && <div className="logo-samples">{items.filter(p=>p.photos.includes('clear-brand')||p.photos.includes('white-front')||p.photos.includes('frost-front')).map(p=><Photo key={p.sku} photo={p.photos[1]} alt={zh?'标识定制示例':'Logo customization example'}/>)}</div>}
    {name==='applications' && <MoreSettings zh={zh}/>}
    {name==='faq' ? <div className="faq">{info.rows.map(row=><details key={row[0]}><summary>{row[index]}</summary><p>{row[index+2]}</p></details>)}</div> :
      <div className="info-grid">{info.rows.map((row,i)=><article key={row[0]}><span>0{i+1}</span><h2>{row[index]}</h2><p>{row[index+2]}</p></article>)}</div>}
    {name!=='privacy'&&<a className="button primary" href={baseFor(zh)+'/quote'}>{quoteLabel(zh)}<Icon name="arrow"/></a>}
  </section>;
}

export const informationRoutes=Object.keys(information);
