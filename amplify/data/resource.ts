import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { pey } from '../functions/pey/resource';
import { peyWebhook } from '../functions/pey-webhook/resource';
import { register } from '../functions/register/resource';

const schema = a
  .schema({
    // Where the money lands (a bank account registered in Pey).
    Account: a.model({
      alias: a.string().required(),
      legalName: a.string().required(), // full legal name of the holder
      clabe: a.string().required(),
      entity: a.enum(['PERSON', 'BUSINESS']),
      peyId: a.string(), // Pey bank account id (ULID)
      codiStatus: a.enum(['PENDING', 'PROCESSING', 'ACTIVE', 'ERROR']),
      errorMessage: a.string(),
    }).authorization((allow) => [allow.owner()]),
    Person: a.model({
      name: a.string().required(),
      tel: a.string().required(), // 10 digits, as Pey requires
      note: a.string(),
      // Places. Every field is optional so people created before this existed keep working:
      // no status means "added by hand" (counts as enrolled and never expires).
      status: a.enum(['PENDING', 'ENROLLED', 'WAITLIST', 'RELEASED']),
      heldOn: a.string(), // ISO date the place was held or last extended
      via: a.enum(['QR', 'MANUAL']),
      helpers: a.string().array(), // 10-digit WhatsApp numbers of whoever helps pay (1 to 3)
      regAt: a.string(), // ISO time of the QR signup
      emblem: a.string(), // picture chosen from the bank (src/emblems.ts); unique among people who hold a place
      photo: a.string(), // small JPEG data URL, only when the person agreed (photoConsent)
      photoConsent: a.boolean(),
      projectId: a.id(), // which collection project (taller) they belong to; empty = the collector's first one
      // Whoever helps pay: telephone in `helpers`, and, at the same position, their name and how they are related.
      helperNames: a.string().array(),
      helperRels: a.string().array(),
      sendTo: a.string(), // telephone, among the ones they registered, where codes and receipts should go
      consentShared: a.boolean(), // agreed that the helpers' numbers are shared with the collector
      // Declared on purpose: the public signup function creates rows on the collector's behalf and must set the owner.
      owner: a.string(),
    }).secondaryIndexes((i) => [i('tel')]).authorization((allow) => [allow.owner()]),
    // One row per collector: places settings and the signup link.
    Project: a.model({
      name: a.string(),
      open: a.boolean().required(),
      token: a.string().required(), // random, rotatable; lives in the signup QR
      capacity: a.integer().required(), // 0 = places switched off
      holdDays: a.integer().required(),
      // Optional: the usual monthly fee, so a new person can be charged in one tap after approval.
      monthlyConcept: a.string(),
      monthlyAmount: a.float(),
      accountId: a.string(), // account that receives the monthly fee
      // Charge plans (src/plans.ts) as JSON: up to two, each paid once or monthly for N months. Replaces the fields above.
      plansJson: a.string(),
    }).secondaryIndexes((i) => [i('token')]).authorization((allow) => [allow.owner()]),
    // Rate limit counters for the public signup. Only the signup function can touch them.
    RegAttempt: a.model({
      key: a.string().required(),
      count: a.integer().required(),
    }).identifier(['key'])
      // No row ever gets an owner, so no signed-in person can read these; only the signup function (schema-level rule) can.
      .authorization((allow) => [allow.owner()]),
    Charge: a.model({
      personId: a.id().required(),
      personName: a.string().required(),
      tel: a.string().required(),
      accountId: a.id().required(),
      concept: a.string().required(),
      amount: a.float().required(),
      month: a.string().required(), // YYYY-MM
      via: a.enum(['CODI', 'CASH']),
      status: a.enum(['PENDING', 'PAID']),
      transactionId: a.string(), // Pey transaction id
      numRef: a.string(),
      paidAt: a.datetime(),
      confirmsPlace: a.boolean(), // true for the monthly fee: only that payment confirms a place
      projectId: a.id(),
    }).secondaryIndexes((i) => [i('transactionId')]).authorization((allow) => [allow.owner()]),

    // One entry point for everything that talks to Pey.
    peyAction: a
      .mutation()
      .arguments({
        action: a.string().required(), // registerAccount | refreshAccount | requestCodi
        id: a.string().required(), // Account id or Charge id
      })
      .returns(a.string())
      .authorization((allow) => [allow.authenticated()])
      .handler(a.handler.function(pey)),
  })
  .authorization((allow) => [allow.resource(pey), allow.resource(peyWebhook), allow.resource(register)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
});
