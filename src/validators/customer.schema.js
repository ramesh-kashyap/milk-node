const { z } = require('zod');

const basisEnum = z.enum(['fat','rate','fatSnf']);
const typeEnum  = z.enum(['Seller','Purchaser']);
const alertEnum = z.enum(['No Alerts','SMS','WhatsApp','Phone Call']);
const slipEnum  = z.enum(['Default','Compact','Detailed','None']);

const customerCreateSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  phone: z.string().max(20).optional().or(z.literal('')),   // ✅ this is fine
  customerType: typeEnum,
  basis: basisEnum,
  buffalo: z.object({
    enabled: z.boolean(),
    value: z.string().optional().nullable(),
  }),
  cow: z.object({
    enabled: z.boolean(),
    value: z.string().optional().nullable(),
  }),
  alertMethod: alertEnum,
  printSlip: slipEnum,
});

const customerListSchema = z.object({
  type: typeEnum.optional(),
  q: z.string().max(120).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

module.exports = { customerCreateSchema, customerListSchema };
