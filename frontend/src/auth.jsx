import { createContext, useContext, useMemo } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// One hook for the app whether or not Auth0 is configured.
const AuthContext = createContext({
  enabled: false,
  ready: true,
  isAuthenticated: true,
  user: null,
  login: () => {},
  logout: () => {},
  getToken: async () => null,
})

function Auth0Bridge({ children }) {
  const { isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const value = useMemo(
    () => ({
      enabled: true,
      ready: !isLoading,
      isAuthenticated,
      user,
      login: () => loginWithRedirect(),
      logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
      getToken: () => getAccessTokenSilently(),
    }),
    [isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessTokenSilently],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthBridge({ enabled, children }) {
  // Without Auth0 the context's default value (signed-in, no token) applies.
  return enabled ? <Auth0Bridge>{children}</Auth0Bridge> : children
}

export const useAuth = () => useContext(AuthContext)
