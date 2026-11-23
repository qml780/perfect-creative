import { test, expect } from '@playwright/test';

test('3D lectern rotates, changes finish, separates and resets on desktop and mobile', async ({page})=>{
  const errors: string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  for (const [locale,width] of [['en',1440],['zh',390]] as const) {
    await page.setViewportSize({width,height:1000});
    await page.goto('/'+locale);
    const viewer=page.locator('[data-lectern-viewer]');
    await viewer.scrollIntoViewIfNeeded();
    await expect(viewer).toHaveAttribute('data-viewer-state','ready',{timeout:45000});
    await expect(viewer.locator('canvas')).toBeVisible();
    await expect(viewer.locator('[data-viewer-poster]')).toBeHidden();
    const camera=await viewer.getAttribute('data-camera');
    await viewer.locator('[data-viewer-canvas]').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(viewer).not.toHaveAttribute('data-camera',camera!);
    const initialImage=await viewer.locator('canvas').screenshot();
    await viewer.locator('[data-viewer-finish=black]').click();
    await expect(viewer.locator('[data-viewer-finish=black]')).toHaveAttribute('aria-pressed','true');
    await expect(viewer.locator('[data-viewer-finish=clear]')).toHaveAttribute('aria-pressed','false');
    expect((await viewer.locator('canvas').screenshot()).equals(initialImage)).toBe(false);
    await viewer.locator('[data-viewer-explode]').fill('100');
    await expect(viewer).toHaveAttribute('data-exploded','1.000');
    await viewer.locator('[data-viewer-view=back]').click();
    await expect.poll(()=>viewer.getAttribute('data-camera')).toMatch(/,-2\.650$/);
    const back=await viewer.getAttribute('data-camera');
    await viewer.locator('[data-viewer-zoom=in]').click();
    await expect(viewer).not.toHaveAttribute('data-camera',back!);
    await viewer.locator('[data-viewer-reset]').click();
    await expect(viewer).toHaveAttribute('data-exploded','0.000');
    await expect(viewer).toHaveAttribute('data-camera','1.450,1.250,2.000');
    await viewer.locator('[data-viewer-finish=clear]').click();
    const stage=await viewer.locator('canvas').boundingBox();
    await page.mouse.move(stage!.x+stage!.width/2,stage!.y+stage!.height/2);
    await page.mouse.down();
    await page.mouse.move(stage!.x+stage!.width/2+70,stage!.y+stage!.height/2+20,{steps:8});
    await page.mouse.up();
    await expect(viewer).not.toHaveAttribute('data-camera','1.450,1.250,2.000');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await viewer.locator('[data-viewer-reset]').click();
    await viewer.screenshot({path:`docs/screenshots/lectern-3d-${width===1440?'desktop':'mobile'}.png`});
  }
  expect(errors).toEqual([]);
});

test('failed 3D downloads retain photography and offer retry',async ({page})=>{
  await page.route('**/lectern-viewer.js*',route=>route.abort());
  await page.goto('/en');
  const viewer=page.locator('[data-lectern-viewer]');
  await viewer.scrollIntoViewIfNeeded();
  await expect(viewer.getByRole('button',{name:'Retry 3D view'})).toBeVisible();
  await expect(viewer.locator('[data-viewer-poster] img')).toBeVisible();
  await page.unroute('**/lectern-viewer.js*');
  await viewer.getByRole('button',{name:'Retry 3D view'}).click();
  await expect(viewer).toHaveAttribute('data-viewer-state','ready',{timeout:45000});
});
