import { routes } from 'wasp/client/router';
import type { NavigationItem } from './NavBar';

// Base items visible to everyone
export const navigationItems: NavigationItem[] = [
  { name: 'My Cards', to: routes.ProfileRoute.to },
  { name: 'Create Card', to: routes.CreateContactRoute.to },
  { name: 'Buy Credits', to: routes.PricingPageRoute.to },
] as const;