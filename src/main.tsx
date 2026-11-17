import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { I18n } from 'aws-amplify/utils';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import outputs from '../amplify_outputs.json';
import App from './App';
import Inscripcion from './Inscripcion';
import favicon from './assets/favicon.png';
import logo from './assets/logo-cuentas-conmigo.png';
import './index.css';
import './a11y';
import { showEnvironment } from './entorno';

function AuthLogo() {
  return (
    <header className="top">
      <img src={logo} alt="Cuentas conmigo" width="498" height="96" />
    </header>
  );
}

I18n.putVocabularies(translations);
I18n.setLanguage('es');
document.documentElement.lang = 'es-MX';
document.title = 'Cuentas conmigo';
const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (icon) icon.href = favicon;

showEnvironment();
Amplify.configure(outputs);

// The signup QR opens /?i=TOKEN: a public page, no account, outside the login.
const signupToken = new URLSearchParams(location.search).get('i');
const registerUrl = (outputs as { custom?: { registerUrl?: string } }).custom?.registerUrl ?? '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {signupToken ? (
      <Inscripcion token={signupToken} registerUrl={registerUrl} />
    ) : (
      <Authenticator components={{ Header: AuthLogo }}>{({ signOut }) => <App signOut={signOut} />}</Authenticator>
    )}
  </React.StrictMode>,
);
