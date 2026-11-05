import { NavItem, PortalLayout } from './PortalLayout';

// One entry per area in the sponsor's brief.
const navItems: readonly NavItem[] = [
  { to: '/ambassador/profile', label: 'Profile' },
  { to: '/ambassador/progress', label: 'Progress' },
  { to: '/ambassador/sales', label: 'Sales' },
  { to: '/ambassador/marketplace', label: 'Marketplace' },
];

export function AmbassadorLayout() {
  return <PortalLayout navItems={navItems} />;
}
