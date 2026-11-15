import { useEffect, useState, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import Receipt from './Receipt';
import { folioOf } from './comprobante';

const client = generateClient<Schema>();
type Account = Schema['Account']['type'];
type Person = Schema['Person']['type'];
type Charge = Schema['Charge']['type'];

const month = () => new Date().toISOString().slice(0, 7);
const STATUS: Record<string, string> = {
  PENDING: 'Por confirmar',
  PROCESSING: 'En espera de Pey (hasta 5 días hábiles)',
  ACTIVE: 'Lista para cobrar',
  ERROR: 'Con error',
};

export default function App({ signOut }: { signOut?: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [msg, setMsg] = useState('');
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [qr, setQr] = useState<{ id: string; img: string } | null>(null);

  const load = useCallback(async () => {
    const [a, p, c] = await Promise.all([
      client.models.Account.list(),
      client.models.Person.list(),
      client.models.Charge.list(),
    ]);
    setAccounts(a.data);
    setPeople(p.data);
    setCharges(c.data);
  }, []);

  useEffect(() => {
    load();
    // Refresh often so a payment confirmed by the webhook shows up on its own.
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (action: string, id: string) => {
    setMsg('Un momento…');
    try {
      const r = await client.mutations.peyAction({ action, id });
      if (r.errors?.length) throw new Error(r.errors[0].message);
      setMsg('Listo.');
      return r.data ?? null;
    } catch (e) {
      setMsg('No se pudo: ' + (e as Error).message + ' Intenta de nuevo.');
    }
    load();
    return null;
  };

  const showQr = async (id: string) => {
    const out = await act('requestQr', id);
    if (!out) return;
    const img = JSON.parse(out).qrImage as string | null;
    if (img) setQr({ id, img });
    else setMsg('No se pudo generar la imagen del QR. Intenta de nuevo.');
  };

  const addAccount = async (f: FormData) => {
    await client.models.Account.create({
      alias: String(f.get('alias')),
      legalName: String(f.get('legal')),
      clabe: String(f.get('clabe')),
      entity: f.get('entity') === 'BUSINESS' ? 'BUSINESS' : 'PERSON',
    });
    load();
  };

  const addPerson = async (f: FormData) => {
    const tel = String(f.get('tel')).replace(/\D/g, '');
    if (tel.length !== 10) {
      setMsg('El teléfono debe tener 10 números.');
      return;
    }
    await client.models.Person.create({ name: String(f.get('name')), tel });
    load();
  };

  const newCharge = async (p: Person, f: FormData) => {
    const amount = Number(String(f.get('amount')).replace(',', '.'));
    if (!(amount > 0) || !f.get('account')) {
      setMsg('Escribe el monto y elige la cuenta.');
      return;
    }
    await client.models.Charge.create({
      personId: p.id,
      personName: p.name,
      tel: p.tel,
      accountId: String(f.get('account')),
      concept: String(f.get('concept') || 'Cuota'),
      amount,
      month: month(),
      status: 'PENDING',
    });
    load();
  };

  const cash = async (c: Charge) => {
    await client.models.Charge.update({
      id: c.id,
      status: 'PAID',
      via: 'CASH',
      paidAt: new Date().toISOString(),
    });
    load();
  };

  return (
    <main>
      <h1>Cuentas conmigo</h1>
      <div className="row">
        <button className="alt" onClick={signOut}>Salir</button>
      </div>
      {msg && <p className="msg" role="status">{msg}</p>}

      <h2>1. Cuenta que recibe</h2>
      {accounts.map((a) => (
        <div className="card" key={a.id}>
          <strong>{a.alias}</strong>
          <span>{STATUS[a.codiStatus ?? 'PENDING']}</span>
          {!a.peyId && <button onClick={() => act('registerAccount', a.id)}>Registrar en Pey</button>}
          {a.peyId && a.codiStatus !== 'ACTIVE' && (
            <button className="alt" onClick={() => act('refreshAccount', a.id)}>Revisar estado</button>
          )}
          {a.errorMessage && <span>{a.errorMessage}</span>}
        </div>
      ))}
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          addAccount(new FormData(form));
          form.reset();
        }}
      >
        <label>Nombre corto<input name="alias" required /></label>
        <label>Nombre completo del titular<input name="legal" required /></label>
        <label>
          CLABE (18 números)
          <input name="clabe" required inputMode="numeric" pattern="[0-9]{18}" />
        </label>
        <label>
          Es
          <select name="entity">
            <option value="PERSON">Persona</option>
            <option value="BUSINESS">Negocio o institución</option>
          </select>
        </label>
        <button>Agregar cuenta</button>
      </form>

      <h2>2. Personas</h2>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          addPerson(new FormData(form));
          form.reset();
        }}
      >
        <label>Nombre<input name="name" required /></label>
        <label>WhatsApp (10 números)<input name="tel" required inputMode="numeric" /></label>
        <button>Agregar persona</button>
      </form>

      <h2>3. Cobros de {month()}</h2>
      {people.map((p) => {
        const mine = charges.filter((c) => c.personId === p.id && c.month === month());
        return (
          <div className="card" key={p.id}>
            <strong>{p.name}</strong>
            {mine.map((c) => (
              <div key={c.id} className="card">
                <span>{c.concept}: ${c.amount.toFixed(2)}</span>
                <small>Código del cobro (para pruebas): {c.id}</small>
                {c.status === 'PAID' ? (
                  <>
                    <span className="paid">✔ Pagado ({c.via === 'CASH' ? 'efectivo' : 'CoDi'})</span>
                    <button className="alt" onClick={() => setReceiptFor(receiptFor === c.id ? null : c.id)}>
                      {receiptFor === c.id ? 'Ocultar comprobante' : 'Ver y enviar comprobante'}
                    </button>
                    {receiptFor === c.id && (
                      <Receipt
                        tel={c.tel}
                        onClose={() => setReceiptFor(null)}
                        data={{
                          folio: folioOf(c.id),
                          payerName: c.personName,
                          concept: c.concept,
                          amount: c.amount,
                          via: c.via === 'CASH' ? 'CASH' : 'CODI',
                          recipient: accounts.find((a) => a.id === c.accountId)?.alias ?? '',
                          paidAt: c.paidAt ?? new Date().toISOString(),
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <span className="wait">⏳ Falta pagar{c.transactionId ? ' · solicitud enviada' : ''}</span>
                    <div className="row">
                      <button onClick={() => act('requestCodi', c.id)}>Pedir pago por CoDi</button>
                      <button onClick={() => showQr(c.id)}>Mostrar QR de CoDi</button>
                      <button className="alt" onClick={() => cash(c)}>Cobré en efectivo</button>
                    </div>
                  </>
                )}
                {qr?.id === c.id && c.status !== 'PAID' && (
                  <div className="card">
                    <img alt="QR de CoDi para pagar" width={280} height={280} src={`data:image/png;base64,${qr.img}`} />
                    <span>Escanéalo con la app de tu banco (opción CoDi).</span>
                    <button className="alt" onClick={() => setQr(null)}>Cerrar QR</button>
                  </div>
                )}
              </div>
            ))}
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                newCharge(p, new FormData(e.currentTarget));
              }}
            >
              <input name="concept" placeholder="Concepto" />
              <input name="amount" inputMode="decimal" placeholder="Monto" required />
              <select name="account" defaultValue="">
                <option value="" disabled>Cuenta</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.alias}</option>
                ))}
              </select>
              <button className="alt">Crear cobro</button>
            </form>
          </div>
        );
      })}
    </main>
  );
}
