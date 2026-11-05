import { NavItem, PortalLayout } from './PortalLayout';

const navItems: readonly NavItem[] = [
  { to: '/sponsor/ambassadors', label: 'Ambassadors' },
  { to: '/sponsor/payouts', label: 'Payouts' },
];

export function SponsorLayout() {
  return <PortalLayout navItems={navItems} />;
}
