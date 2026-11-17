import test from 'node:test';
import assert from 'node:assert/strict';
import { database, readProducts, saveProduct, recordInquiry, passwordHash, verifyPassword, createSession, revokeSession, allowAttempt } from '../lib/store.mjs';
import { inquirySchema } from '../lib/validation.mjs';

test('seeded products are published, additions follow publication state', () => {
  const db=database(':memory:');
  try {
    const existing=readProducts(db,true).length;
    const input={sku:'QA-001',slug:'qa',en:'Test',zh:'测试',materialEn:'Acrylic',materialZh:'亚克力',descEn:'',descZh:'',category:'solid',photo:'onyx',photos:'',status:'draft'};
    saveProduct(db,input,'','tester');
    assert.equal(readProducts(db,true).length,existing);
    saveProduct(db,{...input,status:'published'},'qa','tester');
    assert.equal(readProducts(db,true).length,existing+1);
    saveProduct(db,{...input,status:'archived'},'qa','tester');
    assert.equal(readProducts(db,true).length,existing);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit').get().n,3);
  } finally { db.close(); }
});

test('valid RFQ receives a random reference, persists and starts in NEW', () => {
  const db=database(':memory:');
  try {
    const input={name:'Example buyer',company:'Example company',email:'buyer@example.net',country:'Canada',sku:'AC-001',qty:'20',purpose:'Training',custom:'yes',phone:'',whatsapp:'',language:'en',destination:'',delivery:'',trade:'',message:'',consent:'on',marketing:'',website:''};
    assert.equal(inquirySchema.safeParse({...input,qty:'-1'}).success,false);
    assert.equal(inquirySchema.safeParse({...input,consent:''}).success,false);
    assert.equal(inquirySchema.safeParse({...input,website:'bot'}).success,false);
    const valid=inquirySchema.parse(input);
    const ref=recordInquiry(db,valid);
    assert.match(ref,/^RFQ-[A-Za-z0-9_-]{20}$/);
    const row=db.prepare('SELECT * FROM inquiries WHERE id=?').get(ref);
    assert.equal(row.status,'NEW');
    assert.equal(JSON.parse(row.payload).qty,20);
    assert.notEqual(recordInquiry(db,valid),ref);
  } finally { db.close(); }
});

test('owner secrets are hashed, tokens can be revoked, requests are rate limited', () => {
  const db=database(':memory:');
  try {
    const secret=passwordHash('example test password only');
    assert.equal(verifyPassword(secret,'example test password only'),true);
    assert.equal(verifyPassword(secret,'wrong'),false);
    db.prepare('INSERT INTO employees VALUES (?,?,?)').run('test@example.net',secret,'owner');
    const token=createSession(db,'test@example.net');
    assert.match(token,/^[\w-]{43}$/);
    assert.notEqual(db.prepare('SELECT id FROM sessions').get().id,token);
    revokeSession(db,token);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
    assert.equal(allowAttempt(db,'test',2,1000),true);
    assert.equal(allowAttempt(db,'test',2,1000),true);
    assert.equal(allowAttempt(db,'test',2,1000),false);
  } finally { db.close(); }
});
