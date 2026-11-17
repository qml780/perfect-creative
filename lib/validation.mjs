import { z } from 'zod';

const text = (limit) => z.string().trim().max(limit);
const required = (limit) => text(limit).min(1);
export const inquirySchema = z.object({
  name: required(100), company: required(150), email: text(254).pipe(z.email()), country: required(100),
  sku: text(50), qty: z.coerce.number().int().min(1).max(100000), purpose: required(180),
  custom: z.enum(['yes', 'no', 'unsure']), phone: text(60), whatsapp: text(60),
  language: z.enum(['en', 'zh', 'ms']), destination: text(180), delivery: text(20),
  trade: text(20), message: text(2500), consent: z.literal('on'), marketing: text(6), website: z.literal('')
});

export const productSchema = z.object({
  sku: required(40).regex(/^[A-Za-z0-9-]+$/), slug: required(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  en: required(120), zh: required(120), materialEn: required(100), materialZh: required(100),
  descEn: text(1000), descZh: text(1000), category: z.enum(['solid','clear','frosted','event']),
  photo: text(100), photos: text(300), moq: text(80), dimensions: text(100), thickness: text(80),
  packing: text(100), grossWeight: text(80), netWeight: text(80), lead: text(80),
  status: z.enum(['draft','published','archived'])
});

export const inquiryStates = ['NEW','ASSIGNED','CONTACTED','QUALIFIED','QUOTED','NEGOTIATING','WON','LOST'];
