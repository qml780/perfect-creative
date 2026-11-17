import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { database, passwordHash } from '../lib/store.mjs';

test('visitor and employee exchange private messages with a reviewed translation', async ({page,browser,baseURL})=>{
  const label='QA Malay Buyer';
  const email='chat-qa@example.net';
  const password=randomBytes(22).toString('base64url');
  const local=Boolean(process.env.PC_QA_ARGOS_URL);
  const db=database(process.env.PC_E2E_DB);
  try { db.prepare('INSERT INTO employees VALUES (?,?,?)').run(email,passwordHash(password),'owner'); }
  finally { db.close(); }
  const staffContext=await browser.newContext({baseURL});
  try{
    const staffPage=await staffContext.newPage();
    await staffPage.goto('/admin/login');
    await staffPage.getByLabel('邮箱').fill(email);
    await staffPage.getByLabel('密码').fill(password);
    await staffPage.getByRole('button',{name:'登录',exact:true}).click();
    await staffPage.goto('/admin/chat');
    await page.goto('/en/quote?sku=AC-001');
    await expect(page.getByRole('heading',{name:'Request a quote.'})).toBeVisible();
    await expect(page.locator('.quote-product')).toContainText('Onyx Lectern');
    await page.screenshot({path:'docs/screenshots/quote-desktop.png',caret:'initial'});
    await page.getByRole('button',{name:'Chat with us'}).click();
    await page.getByLabel('Name (optional)').fill(label);
    await page.getByLabel('Reply language').selectOption('ms');
    await page.getByRole('button',{name:'Start conversation'}).click();
    await page.getByLabel('Message language').selectOption('ms');
    const original='Kami ingin membeli 20 unit podium.';
    await page.getByLabel('Your message').fill(original);
    const deliveryStart=Date.now();
    await page.getByRole('button',{name:'Send message'}).click();
    await expect(page.getByRole('log')).toContainText(original);
    const other=await page.request.get('/api/v1/support?view=staff');
    expect(other.status()).toBe(401);
    const independent=await staffContext.request.get('/api/v1/support');
    expect((await independent.json()).messages).toEqual([]);
    await staffPage.getByRole('button',{name:new RegExp(label)}).click();
    await expect(staffPage.getByRole('log')).toContainText(original);
    expect(Date.now()-deliveryStart).toBeLessThan(1900);
    if(local) {
      await expect(staffPage.getByRole('log')).toContainText(/20.*讲台/);
    }
    await staffPage.getByLabel('中文回复').fill('可以为 20 台演讲台提供报价。');
    await staffPage.getByRole('button',{name:'预览译文'}).click();
    const translated=staffPage.getByLabel('Bahasa Melayu 译文');
    if(local) {
      await expect(staffPage.getByRole('status')).toContainText('已生成预览');
      await expect(translated).toHaveValue(/20.*podium/i);
    }else{
      await expect(staffPage.getByRole('status')).toContainText('翻译服务未连接');
      await translated.fill('Kami boleh memberikan sebut harga untuk 20 unit podium.');
    }
    const reply=await translated.inputValue();
    const replyStart=Date.now();
    await staffPage.getByRole('button',{name:'确认译文并发送'}).click();
    await expect(page.getByRole('log')).toContainText(reply,{timeout:1600});
    expect(Date.now()-replyStart).toBeLessThan(1900);
    await page.locator('.support-message.theirs').getByText('Show original',{exact:true}).click();
    await expect(page.getByRole('log')).toContainText('可以为 20 台演讲台提供报价。');
    await page.screenshot({path:'docs/screenshots/support-desktop.png'});
    await page.reload();
    await page.getByRole('button',{name:'Chat with us'}).click();
    await expect(page.getByRole('log')).toContainText(original);
  }finally{await staffContext.close();}
});
