export const products = [
  { slug: 'onyx', sku: 'AC-001', category: 'solid', names: ['Onyx Lectern', '曜黑演讲台'], material: ['Black acrylic', '黑色亚克力'], desc: ['A solid silhouette with a broad reading surface and a clean stage-facing panel.', '开阔的阅读台面与利落的正面面板，适合舞台、会议与发布会。'], photos: ['onyx'] },
  { slug: 'clarity', sku: 'AC-002', category: 'clear', names: ['Clarity Lectern', '透影演讲台'], material: ['Clear acrylic', '透明亚克力'], desc: ['Polished transparent panels give the speaker a light, unobstructed presence.', '抛光透明面板呈现轻盈轮廓，让听众把注意力留给演讲者。'], photos: ['clear', 'clear-brand'] },
  { slug: 'alba', sku: 'AC-003', category: 'solid', names: ['Alba Lectern', '素白演讲台'], material: ['White acrylic', '白色亚克力'], desc: ['A white face with a discreet shelf and open access on the speaker side.', '素白正面简洁，演讲者一侧设有开放空间和内置置物层。'], photos: ['white-back', 'white-front'] },
  { slug: 'frost', sku: 'AC-004', category: 'frosted', names: ['Frost Lectern', '雾面演讲台'], material: ['Frosted acrylic', '磨砂亚克力'], desc: ['Translucent surfaces soften the light. Raised sides frame the reading area.', '半透表面柔化光线，围边界定阅读区域。'], photos: ['frost-back', 'frost-front'] },
  { slug: 'event-stand', sku: 'EV-001', category: 'event', names: ['Event Display Stand', '活动展示支架'], material: ['Acrylic & metal stand', '亚克力面板与金属支架'], desc: ['A tripod-mounted display format for event and retail projects.', '三脚架支撑的展示结构，适用于活动及零售项目。'], photos: ['event-angle', 'event-front'] }
];

export const samplePhotos = [...new Set(products.flatMap(product => product.photos))];
