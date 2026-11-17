import { notFound } from 'next/navigation';
import { Footer, Header, type Product } from '../../components';
import { HomePage, CatalogPage, ProductPage, QuotePage, InfoPage, informationRoutes } from '../../storefront';
import { catalog, enabled, settings } from '@/lib/store.mjs';
import { SupportChat } from '../../support-chat';

export const dynamic = 'force-dynamic';
type Props = {params: Promise<{locale: string; parts?: string[]}>; searchParams: Promise<Record<string,string|string[]|undefined>>};

export async function generateMetadata({params}: Props) {
  const {locale, parts=[]}=await params;
  const suffix=parts.length?'/'+parts.join('/'):'';
  const product=parts[0]==='products' && parts[1] ? (catalog() as Product[]).find(item=>item.slug===parts[1]) : null;
  const title=product?.names[locale==='zh'?1:0] || (parts.length ? parts[0].replaceAll('-',' ').replace(/^./,value=>value.toUpperCase()) : (locale==='zh'?'亚克力演讲台 · 工厂直供':'Acrylic Lecterns · Factory Direct'));
  return {title:{absolute:title+' | '+settings().brand}, alternates:{languages:{en:'/en'+suffix,'zh-CN':'/zh'+suffix}}};
}

export default async function Storefront({params,searchParams}: Props) {
  const {locale,parts=[]}=await params;
  if(locale!=='en'&&locale!=='zh') notFound();
  const zh=locale==='zh';
  const query=await searchParams;
  const items=catalog() as Product[];
  const [page, slug]=parts;
  const actual=page==='custom'?'customization':page;
  let content: React.ReactNode;
  if (!parts.length) content=<HomePage zh={zh} items={items}/>;
  else if (parts.length===1&&page==='products') content=<CatalogPage zh={zh} items={items} query={query}/>;
  else if (parts.length===2&&page==='products') {
    const item=items.find(product=>product.slug===slug);
    if (!item) notFound();
    content=<ProductPage zh={zh} item={item}/>;
  } else if (parts.length===1&&(page==='quote'||page==='cart')) content=<QuotePage zh={zh} items={items} sku={typeof query.sku==='string'?query.sku:''}/>;
  else if (parts.length===1&&informationRoutes.includes(actual)) content=<InfoPage name={actual} zh={zh} items={items}/>;
  else notFound();
  const suffix=parts.length?'/'+parts.join('/'):'';
  const selectedSku=(page==='quote'||page==='cart')&&typeof query.sku==='string' ? '?sku='+encodeURIComponent(query.sku) : '';
  return <div className="storefront" lang={zh?'zh-CN':'en'}><Header zh={zh} current={actual} suffix={suffix+selectedSku}/><main id="content" tabIndex={-1}>{content}</main><Footer zh={zh}/>{enabled()&&<SupportChat zh={zh}/>}</div>;
}
