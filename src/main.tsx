import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { I18n } from 'aws-amplify/utils';
import { Authenticator, translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import outputs from '../amplify_outputs.json';
import App from './App';
import favicon from './assets/favicon.png';
import logo from './assets/logo-cuentas-conmigo.png';
import './index.css';

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

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Authenticator components={{ Header: AuthLogo }}>{({ signOut }) => <App signOut={signOut} />}</Authenticator>
  </React.StrictMode>,
);
