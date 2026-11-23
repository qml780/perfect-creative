import { Photo } from './components';

export function LecternViewer({ zh, finish = 'clear' }: {zh: boolean; finish?: string}) {
  const materials = [['clear','Clear','透明'],['frosted','Frosted','磨砂'],['white','White','白色'],['black','Black','黑色']];
  return <section id="lectern-3d" className="section wrap viewer-section" data-lectern-viewer data-finish={finish} data-lang={zh?'zh':'en'} aria-labelledby="viewer-title">
    <div className="section-heading" data-sequence>
      <h2 id="viewer-title" data-enter-title>{zh?'换个角度，看讲台。':'A new perspective.'}</h2>
      <p className="viewer-intro" data-enter-body>{zh?'旋转查看台面、支撑与置物层，切换材质，展开板件。':'Explore the reading surface, supports and shelf. Change the finish and separate the panels.'}</p>
    </div>
    <div className="viewer-layout">
      <div className="viewer-stage">
        <div className="viewer-canvas" data-viewer-canvas tabIndex={0} role="img" aria-label={zh?'演讲台 3D 模型，可拖动或使用方向键旋转':'Interactive 3D lectern. Drag or use arrow keys to rotate'} aria-describedby="viewer-help"/>
        <div className="viewer-poster" data-viewer-poster><Photo photo="clear" alt={zh?'透明亚克力演讲台':'Clear acrylic lectern'}/></div>
        <button className="viewer-start button outline" type="button" data-viewer-start>{zh?'加载 3D 展示':'Load 3D view'}</button>
        <p className="viewer-status" data-viewer-status role="status" aria-live="polite"/>
        <div className="viewer-tools" role="group" aria-label={zh?'视图工具':'View controls'}>
          <button type="button" data-viewer-zoom="in" aria-label={zh?'放大':'Zoom in'} disabled>＋</button>
          <button type="button" data-viewer-zoom="out" aria-label={zh?'缩小':'Zoom out'} disabled>−</button>
          <button type="button" data-viewer-reset disabled>{zh?'重置视角':'Reset view'}</button>
        </div>
        <p id="viewer-help" className="viewer-help">{zh?'拖动旋转 · 双指缩放 · 方向键调整视角':'Drag to rotate · Pinch to zoom · Arrow keys to orbit'}</p>
      </div>
      <div className="viewer-settings">
        <p className="kicker">{zh?'亚克力演讲台 · 3D':'Acrylic lectern · 3D'}</p>
        <fieldset className="viewer-materials">
          <legend>{zh?'材质与颜色':'Finish & colour'}</legend>
          <div className="viewer-swatches">{materials.map(([value,en,cn])=><button key={value} type="button" data-viewer-finish={value} aria-pressed={finish===value} disabled><i className={'finish-'+value} aria-hidden="true"/><span>{zh?cn:en}</span></button>)}</div>
        </fieldset>
        <label className="viewer-explode">{zh?'展开结构':'Explore construction'}<input type="range" min="0" max="100" step="1" defaultValue="0" data-viewer-explode disabled/><span className="viewer-range-labels"><span>{zh?'组装':'Assembled'}</span><span>{zh?'拆分':'Separated'}</span></span></label>
        <div className="viewer-views" role="group" aria-label={zh?'预设视角':'Preset views'}>
          <button type="button" data-viewer-view="front" disabled>{zh?'正面':'Front'}</button>
          <button type="button" data-viewer-view="back" disabled>{zh?'背面':'Back'}</button>
          <button type="button" data-viewer-view="top" disabled>{zh?'台面':'Reading surface'}</button>
        </div>
        <p className="viewer-note">{zh?'模型根据产品图片搭建，用于展示外观、材质和结构。具体尺寸及连接方式以确认的型号为准。':'Modelled from product images to illustrate appearance, finishes and construction. Confirm dimensions and fittings for your selected model.'}</p>
      </div>
    </div>
    <noscript><p>{zh?'启用 JavaScript 后可使用 3D 展示。':'Enable JavaScript to use the 3D view.'}</p></noscript>
  </section>;
}
