import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { database, passwordHash } from '../lib/store.mjs';

test('desktop product gallery and deep-linked assembly panels stay in sync', async ({page})=>{
  await page.goto('/en');
  await expect(page.getByRole('heading',{name:'Acrylic lecterns.'})).toBeVisible();
  await expect(page.locator('.hero img')).toHaveJSProperty('complete',true);
  mkdirSync('docs/screenshots',{recursive:true});
  await page.screenshot({path:'docs/screenshots/home-desktop.png'});
  await page.getByRole('button',{name:'Show Frost Lectern'}).click();
  await expect(page.getByRole('button',{name:'Show Frost Lectern'})).toHaveAttribute('aria-current','true');
  await page.getByRole('link',{name:'02 Disassembled'}).click();
  await expect(page).toHaveURL(/#disassembled$/);
  await expect(page.locator('#disassembled')).toBeVisible();
  await page.getByRole('link',{name:'03 Flat-packed'}).click();
  await expect(page.locator('#flat-pack')).toBeVisible();
  await page.reload();
  await expect(page.locator('#flat-pack')).toBeVisible();
  await expect(page.getByRole('link',{name:'03 Flat-packed'})).toHaveAttribute('aria-current','step');
  await page.screenshot({path:'docs/screenshots/assembly-desktop.png'});
  await page.goBack();
  await expect(page.locator('#disassembled')).toBeVisible();
});

test('375 / 768 / 1440 layouts fit and mobile menu supports Escape', async ({page})=>{
  for (const width of [375,768,1440]) {
    await page.setViewportSize({width,height: width===375?812:900});
    await page.goto('/zh');
    await expect(page.getByRole('heading',{level:1,name:'亚克力演讲台'})).toBeVisible();
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    if(width===375) {
      await page.screenshot({path:'docs/screenshots/home-mobile.png'});
      const trigger=page.getByRole('button',{name:'打开菜单'});
      await trigger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await page.goto('/zh/quote');
      await expect(page.getByRole('heading',{name:'获取批发报价。'})).toBeVisible();
      await expect(page.getByLabel('工作邮箱')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({path:'docs/screenshots/quote-mobile.png'});
    }
  }
  await page.getByRole('link',{name:'EN',exact:true}).click();
  await expect(page).toHaveURL(/\/en$/);
});

test('scrolling into materials reveals the whole heading before its description', async ({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/en');
  const material=page.getByRole('heading',{name:'Materials, up close.'});
  const group=page.locator('.material-heading');
  const description=group.getByText('A closer look at the polished surfaces',{exact:false});
  await expect(group).toHaveClass(/\bsequence-ready\b/);
  await expect(group).not.toHaveClass(/sequence-visible/);
  await expect(material).toHaveCSS('opacity','0');
  await expect(description).toHaveCSS('opacity','0');
  const top=await material.evaluate(element=>element.getBoundingClientRect().top+scrollY);
  await page.mouse.wheel(0,top-175);
  await expect(group).toHaveClass(/sequence-visible/);
  const order=await group.evaluate(element=>{
    const title = element.querySelector('h2')!;
    const body = element.querySelector('p')!;
    const headingMotion = getComputedStyle(title);
    const bodyMotion = getComputedStyle(body);
    return {headingReady:Number.parseFloat(headingMotion.animationDuration),bodyStarts:Number.parseFloat(bodyMotion.animationDelay),characterWrappers:title.childElementCount};
  });
  expect(order.characterWrappers).toBe(0);
  expect(order.bodyStarts).toBeGreaterThan(order.headingReady);
  await expect(description).toHaveCSS('opacity','1');
  await expect(page.locator('.material-view img')).toHaveCount(2);
  await page.screenshot({path:'docs/screenshots/materials-desktop.png',animations:'disabled'});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/en');
  await expect(material).toHaveCSS('opacity','1');
  await expect(description).toHaveCSS('opacity','1');
});

test('inquiry appears in authenticated admin and unpublished product disappears', async ({page,request,baseURL})=>{
  const email='qa-owner@example.net';
  const password=randomBytes(21).toString('base64url');
  const db=database(process.env.PC_E2E_DB);
  try { db.prepare('INSERT INTO employees VALUES (?,?,?)').run(email,passwordHash(password),'owner'); } finally { db.close(); }
  const blocked=await request.post('/api/v1/admin/inquiries',{headers:{origin:baseURL!},form:{id:'demo'}});
  expect(blocked.status()).toBe(401);
  const checkout=await request.post('/api/v1/checkout');
  expect(checkout.status()).toBe(403);
  await page.goto('/en/products/onyx');
  await page.getByRole('link',{name:'Get wholesale quote'}).click();
  await expect(page.getByLabel('Product / model')).toHaveValue('AC-001');
  await page.getByLabel('Contact name').fill('QA Buyer');
  await page.getByLabel('Work email').fill('buyer@example.net');
  await page.getByRole('textbox',{name:'Company *',exact:true}).fill('QA Only');
  await page.getByLabel('Country / region').fill('Canada');
  await page.getByLabel('Intended use').fill('Classroom');
  await page.getByLabel(/Reference file/).setInputFiles('public/media/onyx.jpg');
  await page.getByRole('checkbox',{name:/I accept/}).check();
  await page.getByRole('button',{name:'Submit inquiry'}).click();
  await expect(page.getByRole('status')).toContainText(/RFQ-[\w-]{20}/);
  const reference=(await page.getByRole('status').innerText()).match(/RFQ-[\w-]{20}/)![0];
  expect((await request.get('/api/v1/inquiry-file/'+reference)).status()).toBe(401);
  await page.goto('/admin/inquiries');
  await expect(page).toHaveURL(/admin\/login$/);
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page.getByRole('heading',{name:'运营总览'})).toBeVisible();
  await page.goto('/admin/inquiries/'+reference);
  await expect(page.getByText('QA Only')).toBeVisible();
  await expect(page.getByRole('link',{name:'onyx.jpg'})).toBeVisible();
  expect((await page.request.get('/api/v1/inquiry-file/'+reference)).status()).toBe(200);
  await page.getByLabel('状态').selectOption('ASSIGNED');
  await page.getByLabel('负责人').fill('QA Sales');
  await page.getByRole('button',{name:'保存跟进'}).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.goto('/admin/products/new');
  for(const [label,value] of [['型号 / SKU','QA-001'],['URL 标识','qa-test'],['英文名称','QA Lectern'],['中文名称','测试讲台'],['英文材质','Acrylic'],['中文材质','亚克力']]) {
    await page.getByLabel(label,{exact:true}).fill(value);
  }
  await page.getByRole('combobox',{name:'主图',exact:true}).selectOption('onyx');
  await page.getByLabel('状态').selectOption('published');
  await page.getByRole('button',{name:'保存商品'}).click();
  await expect(page.getByRole('status')).toContainText('商品已保存');
  await page.goto('/en/products/qa-test');
  await expect(page.getByRole('heading',{name:'QA Lectern'})).toBeVisible();
  await page.goto('/admin/products/qa-test');
  await page.getByLabel('状态').selectOption('archived');
  await page.getByRole('button',{name:'保存商品'}).click();
  await expect(page.getByRole('status')).toContainText('商品已保存');
  expect((await page.goto('/en/products/qa-test'))?.status()).toBe(404);
});
