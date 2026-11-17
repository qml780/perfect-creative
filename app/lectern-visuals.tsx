import Image, { type StaticImageData } from 'next/image';
import summit from '../public/media/summit-stage.webp';
import forum from '../public/media/forum-stage.webp';
import chapel from '../public/media/chapel-lectern.webp';
import overview from '../public/media/acrylic-lectern-overview.webp';
import finishes from '../public/media/lectern-finish-lineup.webp';
import assembly from '../public/media/lectern-assembly-sheet.webp';
import details from '../public/media/lectern-detail-sheet.webp';

function Scene({ image, alt, title, className = '' }: {
  image: StaticImageData; alt: string; title: string; className?: string;
}) {
  return <figure className={'scene-photo ' + className}>
    <Image src={image} alt={alt} unoptimized/>
    <figcaption>{title}</figcaption>
  </figure>;
}

export function StageGallery({ zh }: {zh: boolean}) {
  return <section id="on-stage" className="section wrap stage-section" aria-labelledby="stage-title">
    <div className="section-heading" data-sequence>
      <h2 id="stage-title" data-enter-title>{zh?'演讲台在现场':'Lecterns on stage'}</h2>
      <p className="stage-description" data-enter-body>{zh?'从企业峰会到论坛，看不同台身和标识如何融入舞台。':'From corporate summits to leadership forums, see how different finishes and logos work on stage.'}</p>
    </div>
    <div className="stage-gallery">
      <Scene image={summit} title={zh?'企业峰会 · 透明定制款':'Corporate summit · Clear with custom branding'} alt={zh?'演讲者在带有品牌标识的透明演讲台后发言':'Speaker at a clear acrylic lectern with a custom logo'}/>
      <Scene image={forum} title={zh?'主题论坛 · 白色定制款':'Leadership forum · White with custom branding'} alt={zh?'演讲者站在蓝色舞台背景前的白色演讲台后':'Speaker at a white lectern in front of a blue stage backdrop'}/>
    </div>
    <a className="text-link" href={(zh?'/zh':'/en')+'/applications'}>{zh?'查看更多应用场景':'Explore more settings'} <span aria-hidden="true">↗</span></a>
  </section>;
}

export function MoreSettings({ zh }: {zh: boolean}) {
  return <div className="setting-gallery">
    <Scene image={chapel} title={zh?'礼堂与教堂 · 全透明款':'Chapels & ceremony spaces · Clear acrylic'} alt={zh?'教堂礼台上的全透明亚克力演讲台':'Clear acrylic lectern on a chapel platform'}/>
    <Scene image={overview} className="setting-overview" title={zh?'会议舞台 · 产品使用示意':'Conference stage · Product overview'} alt={zh?'聚光灯下的透明演讲台与英文产品介绍':'Clear lectern under stage lights with an English product overview'}/>
  </div>;
}

export function FinishLineup({ zh }: {zh: boolean}) {
  return <figure className="finish-lineup">
    <a href={finishes.src} aria-label={zh?'查看完整款式对比图':'Open full-size finish comparison'}>
      <Image src={finishes} alt={zh?'五款演讲台并排展示':'Five lectern finishes shown side by side'} unoptimized/>
    </a>
    <figcaption>{zh?'透明、磨砂、白色、黑色与定制标识':'Clear, frosted, white, black and custom logo'}</figcaption>
  </figure>;
}

export function ReferenceSheets({ zh }: {zh: boolean}) {
  const sheets = [
    { image: assembly, title: zh?'拆装步骤与零件图':'Assembly steps & parts', alt: zh?'透明亚克力演讲台的分解结构和装配顺序示意':'Exploded view and illustrated assembly steps for a clear acrylic lectern' },
    { image: details, title: zh?'尺寸与产品细节':'Dimensions & product details', alt: zh?'透明演讲台的参考尺寸及台面、紧固件、底座和置物层特写':'Reference dimensions and close-ups of the top, fasteners, base and shelf' }
  ];
  return <section className="wrap reference-sheets" aria-labelledby="reference-title">
    <div data-sequence>
      <h2 id="reference-title" data-enter-title>{zh?'装配与尺寸图解':'Assembly & dimensions'}</h2>
      <p data-enter-body>{zh?'点击放大查看。图中尺寸为示意，订购前请确认所选型号的规格。':'Open either image to zoom in. Measurements are illustrative; confirm the specifications for your selected model before ordering.'}</p>
    </div>
    <div className="reference-grid">
      {sheets.map(sheet=><figure key={sheet.title}>
        <a href={sheet.image.src}>
          <Image src={sheet.image} alt={sheet.alt} unoptimized/>
          <span className="reference-caption">{sheet.title}<span aria-hidden="true">↗</span></span>
        </a>
      </figure>)}
    </div>
  </section>;
}
