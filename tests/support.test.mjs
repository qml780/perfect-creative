import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from '../lib/support.mjs';

test('translation preserves SKU and quantities, and rejects mangled placeholders', async t=>{
  const originalKey=process.env.TRANSLATION_API_KEY;
  process.env.TRANSLATION_API_KEY='test-provider';
  t.after(()=>{
    if(originalKey===undefined) delete process.env.TRANSLATION_API_KEY;
    else process.env.TRANSLATION_API_KEY=originalKey;
  });
  let match=true;
  t.mock.method(globalThis,'fetch',async (_url,options)=>{
    const payload=JSON.parse(options.body);
    assert.equal(payload.q,'Need ⟦1⟧ units of ⟦2⟧');
    assert.equal(payload.source,undefined);
    assert.equal(payload.target,'zh-CN');
    return Response.json({data:{translations:[{detectedSourceLanguage:'en',translatedText:match?'需要 ⟦1⟧ 台 ⟦2⟧':'需要 19 台 ⟦2⟧'}]}});
  });
  assert.equal((await translate('Need 20 units of AC-001','auto','zh')).text,'需要 20 台 AC-001');
  match=false;
  assert.equal((await translate('Need 20 units of AC-001','auto','zh')).status,'failed');
});
