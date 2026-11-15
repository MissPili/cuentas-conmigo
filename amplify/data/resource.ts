import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { pey } from '../functions/pey/resource';
import { peyWebhook } from '../functions/pey-webhook/resource';

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
    }).authorization((allow) => [allow.owner()]),
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
  .authorization((allow) => [allow.resource(pey), allow.resource(peyWebhook)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: { defaultAuthorizationMode: 'userPool' },
});
