import { NavItem, PortalLayout } from './PortalLayout';

const navItems: readonly NavItem[] = [{ to: '/sponsor/ambassadors', label: 'Ambassadors' }];

export function SponsorLayout() {
  return <PortalLayout navItems={navItems} />;
}
