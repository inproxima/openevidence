import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App.jsx'
import { AuthBridge } from './auth.jsx'
// Self-hosted faces: STIX Two Text for answers (journal print), Atkinson Hyperlegible Next for UI.
import '@fontsource-variable/stix-two-text/wght.css'
import '@fontsource-variable/stix-two-text/wght-italic.css'
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css'
import './index.css'

const domain = import.meta.env.VITE_AUTH0_DOMAIN
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
const audience = import.meta.env.VITE_AUTH0_AUDIENCE
// Signing in through this app's Auth0 organization gives it its own login page (logo and
// colours) on a tenant whose default login page belongs to other apps.
const organization = import.meta.env.VITE_AUTH0_ORGANIZATION

// Auth0 login is only switched on when the VITE_AUTH0_* variables are set (deployment).
const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    {domain && clientId ? (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{ redirect_uri: window.location.origin, audience, ...(organization && { organization }) }}
        cacheLocation="localstorage"
      >
        <AuthBridge enabled>
          <App />
        </AuthBridge>
      </Auth0Provider>
    ) : (
      <AuthBridge enabled={false}>
        <App />
      </AuthBridge>
    )}
  </React.StrictMode>,
)
