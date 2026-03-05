import { useEffect, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { routes } from 'wasp/client/router'
import { Toaster } from 'react-hot-toast'
import './Main.css'
import NavBar from './components/NavBar/NavBar'
import { navigationItems } from './components/NavBar/constants'
import CookieConsentBanner from './components/cookie-consent/Banner'
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp'

/**
 * use this component to wrap all child components
 * this is useful for templates, themes, and context
 */
export default function App() {
  const location = useLocation()

  const shouldDisplayAppNavBar = useMemo(() => {
    const pathname = location.pathname
    return (
      pathname !== routes.LoginRoute.build() &&
      pathname !== routes.SignupRoute.build()
    )
  }, [location])

  const isAdminDashboard = useMemo(() => {
    return location.pathname.startsWith('/admin')
  }, [location])

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView()
      }
    }
  }, [location])

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-background text-foreground">
        {isAdminDashboard ? (
          <Outlet />
        ) : (
          <>
            {shouldDisplayAppNavBar && (
              <NavBar navigationItems={navigationItems} />
            )}
            <div className="mx-auto max-w-screen-2xl">
              <Outlet />
            </div>
          </>
        )}
      </div>
      <CookieConsentBanner />
      <KeyboardShortcutsHelp />
    </>
  )
}
