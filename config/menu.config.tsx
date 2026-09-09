import {
  AlertCircle,
  Award,
  Badge,
  Bell,
  Bitcoin,
  Bolt,
  Book,
  Briefcase,
  Building,
  CalendarCheck,
  Captions,
  CheckCircle,
  Code,
  Codepen,
  Coffee,
  File as DocumentIcon,
  Euro,
  Eye,
  File,
  FileQuestion,
  FileText,
  Flag,
  Ghost,
  Gift,
  Grid,
  Heart,
  HelpCircle,
  Kanban,
  Key,
  Layout,
  LayoutGrid,
  LifeBuoy,
  MessageSquare,
  Monitor,
  Network,
  Users as PeopleIcon,
  Plug,
  Ship,
  Settings,
  Share2,
  Shield,
  ShieldUser,
  ShoppingCart,
  SquareMousePointer,
  Star,
  Theater,
  TrendingUp,
  UserCheck,
  UserCircle,
  Users,
  Briefcase as WorkIcon,
  Zap,
} from 'lucide-react';
import { type MenuConfig } from './types';
import { translateMenuItems } from '@/lib/menu-translation-utils';
import { DMS_MENU_ENTRIES, DMS_MENU_PARENT_TITLE } from '@/lib/dms/menu';

/**
 * ⚠ THIS ARRAY HAS BEEN CUT DOWN FOR DMS, AND WHAT IS MISSING IS MISSING ON
 * PURPOSE. It is a TEMPLATE file, so a sync-kit run restores the full estate
 * menu and silently undoes all of it.
 *
 * THE CRITERION (the deliverable — the list below is only what it produced):
 * every top-level entry belonging to ANOTHER PRODUCT, identified by its paths
 * pointing at another zone's slug, plus template/demo entries belonging to no
 * product, plus any section heading left labelling nothing.
 *
 * Amir asked (msg 204) for his pages under one heading. He was looking at a
 * sidebar carrying twelve other products, because `getTranslatedMenuSidebar`
 * composed the whole estate's menu and appended ours underneath.
 *
 * REMOVED — twelve other products:
 *   Members Information /members · SPM Investment /spm · Credit Rating
 *   /credit-rating · Cash Advance /cash-advance · General Meeting
 *   /general-meeting · Project Management /project · Customer Risk
 *   /customer-risk · Milan Pars /mpf · Persons /person · Companies /company ·
 *   Market /market · System /system
 *
 * REMOVED — two entries belonging to no product:
 *   Sample Dashboard → /dashboard-samples/demo1
 *   Dashboards → '/'  ⚠ NOT removed as "a demo", which is a judgement about
 *     intent. Removed because UNDER OUR basePath '/' RESOLVES TO DMS'S OWN
 *     ROOT, so it duplicated our own `DMS Home` entry. Two links to one page
 *     is a defect whatever the entry was for, and that is checkable where
 *     "it was only a demo" is not.
 *
 * REMOVED — all four section headings, each left labelling nothing:
 *   Systems · Base Information · Settings · Template
 *
 *   `Template` went for a SECOND reason, and it is the one worth keeping: two
 *   of its three children survived, so the mechanical rule would have kept it —
 *   but its NAME had become false. "Template" described the scaffold and now
 *   sat over account chrome, on a surface a customer reads. Removed rather than
 *   renamed, because renaming means choosing a name and `My Account` and
 *   `User Management` are self-labelling.
 *
 * RETAINED: `My Account` and `User Management` — see the exclusion note in
 * `getTranslatedMenuSidebar`, which carries the condition for deciding them.
 */
export const MENU_SIDEBAR: MenuConfig = [
  {
    title: 'My Account',
    icon: Settings,
    roles: ['SuperAdmin'],
    children: [
      {
        title: 'Account',
        children: [
          { title: 'Get Started', path: '/account/home/get-started' },
          { title: 'User Profile', path: '/account/home/user-profile' },
          { title: 'Company Profile', path: '/account/home/company-profile' },
          {
            title: 'Settings - With Sidebar',
            path: '/account/home/settings-sidebar',
          },
          {
            title: 'Settings - Enterprise',
            path: '/account/home/settings-enterprise',
          },
          { title: 'Settings - Plain', path: '/account/home/settings-plain' },
          { title: 'Settings - Modal', path: '/account/home/settings-modal' },
          { title: 'User Profile - New', path: '/members/add/' },
        ],
      },
      {
        title: 'Billing',
        children: [
          { title: 'Billing - Basic', path: '/account/billing/basic' },
          {
            title: 'Billing - Enterprise',
            path: '/account/billing/enterprise',
          },
          { title: 'Plans', path: '/account/billing/plans' },
          { title: 'Billing History', path: '/account/billing/history' },
        ],
      },
      {
        title: 'Security',
        children: [
          { title: 'Get Started', path: '/account/security/get-started' },
          { title: 'Security Overview', path: '/account/security/overview' },
          {
            title: 'Allowed IP Addresses',
            path: '/account/security/allowed-ip-addresses',
          },
          {
            title: 'Privacy Settings',
            path: '/account/security/privacy-settings',
          },
          {
            title: 'Device Management',
            path: '/account/security/device-management',
          },
          {
            title: 'Backup & Recovery',
            path: '/account/security/backup-and-recovery',
          },
          {
            title: 'Current Sessions',
            path: '/account/security/current-sessions',
          },
          { title: 'Security Log', path: '/account/security/security-log' },
        ],
      },
      {
        title: 'Members & Roles',
        children: [
          { title: 'Teams Starter', path: '/account/members/team-starter' },
          { title: 'Teams', path: '/account/members/teams' },
          { title: 'Team Info', path: '/account/members/team-info' },
          {
            title: 'Members Starter',
            path: '/account/members/members-starter',
          },
          { title: 'Team Members', path: '/account/members/team-members' },
          { title: 'Import Members', path: '/account/members/import-members' },
          { title: 'Roles', path: '/account/members/roles' },
          {
            title: 'Permissions - Toggler',
            path: '/account/members/permissions-toggle',
          },
          {
            title: 'Permissions - Check',
            path: '/account/members/permissions-check',
          },
        ],
      },
      { title: 'Integrations', path: '/account/integrations' },
      { title: 'Notifications', path: '/account/notifications' },
      { title: 'API Keys', path: '/account/api-keys' },
      {
        title: 'More',
        collapse: true,
        collapseTitle: 'Show less',
        expandTitle: 'Show 3 more',
        children: [
          { title: 'Appearance', path: '/account/appearance' },
          { title: 'Invite a Friend', path: '/account/invite-a-friend' },
          { title: 'Activity', path: '/account/activity' },
        ],
      },
    ],
  },
  {
    title: 'User Management',
    icon: ShieldUser,
    roles: ['SuperAdmin'],
    children: [
      {
        title: 'Users',
        path: '/user-management/users',
      },
      {
        title: 'Roles',
        path: '/user-management/roles',
      },
      {
        title: 'Permissions',
        path: '/user-management/permissions',
      },
      {
        title: 'Account',
        path: '/user-management/account',
      },
      {
        title: 'Logs',
        path: '/user-management/logs',
      },
      {
        title: 'Settings',
        path: '/user-management/settings',
      },
    ],
  },
];

export const MENU_SIDEBAR_CUSTOM: MenuConfig = [
  {
    title: 'Store - Client',
    icon: Users,
    children: [
      { title: 'Home', path: '/store-client/home' },
      {
        title: 'Search Results',
        children: [
          {
            title: 'Search Results - Grid',
            path: '/store-client/search-results-grid',
          },
          {
            title: 'Search Results - List',
            path: '/store-client/search-results-list',
          },
        ],
      },
      {
        title: 'Overlays',
        children: [
          { title: 'Product Details', path: '/store-client/product-details' },
          { title: 'Wishlist', path: '/store-client/wishlist' },
        ],
      },
      {
        title: 'Checkout',
        children: [
          {
            title: 'Order Summary',
            path: '/store-client/checkout/order-summary',
          },
          {
            title: 'Shipping Info',
            path: '/store-client/checkout/shipping-info',
          },
          {
            title: 'Payment Method',
            path: '/store-client/checkout/payment-method',
          },
          {
            title: 'Order Placed',
            path: '/store-client/checkout/order-placed',
          },
        ],
      },
      { title: 'My Orders', path: '/store-client/my-orders' },
      { title: 'Order Receipt', path: '/store-client/order-receipt' },
    ],
  },
];

export const MENU_SIDEBAR_COMPACT: MenuConfig = [
  {
    title: 'Dashboards',
    icon: LayoutGrid,
    path: '/',
  },
  {
    title: 'Public Profile',
    icon: UserCircle,
    children: [
      {
        title: 'Profiles',
        children: [
          { title: 'Default', path: '/public-profile/profiles/default' },
          { title: 'Creator', path: '/public-profile/profiles/creator' },
          { title: 'Company', path: '/public-profile/profiles/company' },
          { title: 'NFT', path: '/public-profile/profiles/nft' },
          { title: 'Blogger', path: '/public-profile/profiles/blogger' },
          { title: 'CRM', path: '/public-profile/profiles/crm' },
          {
            title: 'More',
            collapse: true,
            collapseTitle: 'Show less',
            expandTitle: 'Show 4 more',
            children: [
              { title: 'Gamer', path: '/public-profile/profiles/gamer' },
              { title: 'Feeds', path: '/public-profile/profiles/feeds' },
              { title: 'Plain', path: '/public-profile/profiles/plain' },
              { title: 'Modal', path: '/public-profile/profiles/modal' },
            ],
          },
        ],
      },
      {
        title: 'Projects',
        children: [
          { title: '3 Columns', path: '/public-profile/projects/3-columns' },
          { title: '2 Columns', path: '/public-profile/projects/2-columns' },
        ],
      },
      { title: 'Works', path: '/public-profile/works' },
      { title: 'Teams', path: '/public-profile/teams' },
      { title: 'Network', path: '/public-profile/network' },
      { title: 'Activity', path: '/public-profile/activity' },
      {
        title: 'More',
        collapse: true,
        collapseTitle: 'Show less',
        expandTitle: 'Show 3 more',
        children: [
          { title: 'Campaigns - Card', path: '/public-profile/campaigns/card' },
          { title: 'Campaigns - List', path: '/public-profile/campaigns/list' },
          { title: 'Empty', path: '/public-profile/empty' },
        ],
      },
    ],
  },
  {
    title: 'My Account',
    icon: Settings,
    children: [
      {
        title: 'Account',
        children: [
          { title: 'Get Started', path: '/account/home/get-started' },
          { title: 'User Profile', path: '/account/home/user-profile' },
          { title: 'Company Profile', path: '/account/home/company-profile' },
          {
            title: 'Settings - With Sidebar',
            path: '/account/home/settings-sidebar',
          },
          {
            title: 'Settings - Enterprise',
            path: '/account/home/settings-enterprise',
          },
          { title: 'Settings - Plain', path: '/account/home/settings-plain' },
          { title: 'Settings - Modal', path: '/account/home/settings-modal' },
        ],
      },
      {
        title: 'Billing',
        children: [
          { title: 'Billing - Basic', path: '/account/billing/basic' },
          {
            title: 'Billing - Enterprise',
            path: '/account/billing/enterprise',
          },
          { title: 'Plans', path: '/account/billing/plans' },
          { title: 'Billing History', path: '/account/billing/history' },
        ],
      },
      {
        title: 'Security',
        children: [
          { title: 'Get Started', path: '/account/security/get-started' },
          { title: 'Security Overview', path: '/account/security/overview' },
          {
            title: 'Allowed IP Addresses',
            path: '/account/security/allowed-ip-addresses',
          },
          {
            title: 'Privacy Settings',
            path: '/account/security/privacy-settings',
          },
          {
            title: 'Device Management',
            path: '/account/security/device-management',
          },
          {
            title: 'Backup & Recovery',
            path: '/account/security/backup-and-recovery',
          },
          {
            title: 'Current Sessions',
            path: '/account/security/current-sessions',
          },
          { title: 'Security Log', path: '/account/security/security-log' },
        ],
      },
      {
        title: 'Members & Roles',
        children: [
          { title: 'Teams Starter', path: '/account/members/team-starter' },
          { title: 'Teams', path: '/account/members/teams' },
          { title: 'Team Info', path: '/account/members/team-info' },
          {
            title: 'Members Starter',
            path: '/account/members/members-starter',
          },
          { title: 'Team Members', path: '/account/members/team-members' },
          { title: 'Import Members', path: '/account/members/import-members' },
          { title: 'Roles', path: '/account/members/roles' },
          {
            title: 'Permissions - Toggler',
            path: '/account/members/permissions-toggle',
          },
          {
            title: 'Permissions - Check',
            path: '/account/members/permissions-check',
          },
        ],
      },
      { title: 'Integrations', path: '/account/integrations' },
      { title: 'Notifications', path: '/account/notifications' },
      { title: 'API Keys', path: '/account/api-keys' },
      {
        title: 'More',
        collapse: true,
        collapseTitle: 'Show less',
        expandTitle: 'Show 3 more',
        children: [
          { title: 'Appearance', path: '/account/appearance' },
          { title: 'Invite a Friend', path: '/account/invite-a-friend' },
          { title: 'Activity', path: '/account/activity' },
        ],
      },
    ],
  },
  {
    title: 'Network',
    icon: Users,
    children: [
      { title: 'Get Started', path: '/network/get-started' },
      {
        title: 'User Cards',
        children: [
          { title: 'Mini Cards', path: '/network/user-cards/mini-cards' },
          { title: 'Team Crew', path: '/network/user-cards/team-crew' },
          { title: 'Author', path: '/network/user-cards/author' },
          { title: 'NFT', path: '/network/user-cards/nft' },
          { title: 'Social', path: '/network/user-cards/social' },
        ],
      },
      {
        title: 'User Table',
        children: [
          { title: 'Team Crew', path: '/network/user-table/team-crew' },
          { title: 'App Roster', path: '/network/user-table/app-roster' },
          {
            title: 'Market Authors',
            path: '/network/user-table/market-authors',
          },
          { title: 'SaaS Users', path: '/network/user-table/saas-users' },
          { title: 'Store Clients', path: '/network/user-table/store-clients' },
          { title: 'Visitors', path: '/network/user-table/visitors' },
        ],
      },
      { title: 'Cooperations', path: '/network/cooperations', disabled: true },
      { title: 'Leads', path: '/network/leads', disabled: true },
      { title: 'Donators', path: '/network/donators', disabled: true },
    ],
  },
  {
    title: 'Store - Client',
    icon: ShoppingCart,
    children: [
      { title: 'Home', path: '/store-client/home' },
      {
        title: 'Search Results - Grid',
        path: '/store-client/search-results-grid',
      },
      {
        title: 'Search Results - List',
        path: '/store-client/search-results-list',
      },
      { title: 'Product Details', path: '/store-client/product-details' },
      { title: 'Wishlist', path: '/store-client/wishlist' },
      {
        title: 'Checkout',
        children: [
          {
            title: 'Order Summary',
            path: '/store-client/checkout/order-summary',
          },
          {
            title: 'Shipping Info',
            path: '/store-client/checkout/shipping-info',
          },
          {
            title: 'Payment Method',
            path: '/store-client/checkout/payment-method',
          },
          {
            title: 'Order Placed',
            path: '/store-client/checkout/order-placed',
          },
        ],
      },
      { title: 'My Orders', path: '/store-client/my-orders' },
      { title: 'Order Receipt', path: '/store-client/order-receipt' },
    ],
  },
  {
    title: 'User Management',
    icon: ShieldUser,
    children: [
      {
        title: 'Users',
        path: '/user-management/users',
      },
      {
        title: 'Roles',
        path: '/user-management/roles',
      },
      {
        title: 'Permissions',
        path: '/user-management/permissions',
      },
      {
        title: 'Account',
        path: '/user-management/account',
      },
      {
        title: 'Logs',
        path: '/user-management/logs',
      },
      {
        title: 'Settings',
        path: '/user-management/settings',
      },
    ],
  },
  {
    title: 'Authentication',
    icon: Shield,
    children: [
      {
        title: 'Sign In',
        path: '/signin',
      },
      {
        title: 'Check Email',
        path: '/signup',
      },
      {
        title: 'Reset Password',
        path: '/reset-password',
      },
      {
        title: '2FA',
        path: '/2fa',
      },
      { title: 'Welcome Message', path: '/auth/welcome-message' },
      { title: 'Account Deactivated', path: '/auth/account-deactivated' },
      { title: 'Error 404', path: '/error/404' },
      { title: 'Error 500', path: '/error/500' },
    ],
  },
];

export const MENU_MEGA: MenuConfig = [
  { title: 'Home', path: '/' },
  { title: 'Site', path: 'https://seba.ir' },
  { title: 'Sazesh', path: 'https://sazesh.seba.ir' },
  { title: 'LMS', path: 'https://lms.seba.ir' },
];

export const MENU_MEGA_MOBILE: MenuConfig = [
  { title: 'Home', path: '/' },
  {
    title: 'Profiles',
    children: [
      {
        title: 'Profiles',
        children: [
          {
            title: 'Default',
            icon: Badge,
            path: '/public-profile/profiles/default',
          },
          {
            title: 'Creator',
            icon: Coffee,
            path: '/public-profile/profiles/creator',
          },
          {
            title: 'Company',
            icon: Building,
            path: '/public-profile/profiles/company',
          },
          { title: 'NFT', icon: Bitcoin, path: '/public-profile/profiles/nft' },
          {
            title: 'Blogger',
            icon: MessageSquare,
            path: '/public-profile/profiles/blogger',
          },
          { title: 'CRM', icon: Monitor, path: '/public-profile/profiles/crm' },
          {
            title: 'Gamer',
            icon: Ghost,
            path: '/public-profile/profiles/gamer',
          },
          {
            title: 'Feeds',
            icon: Book,
            path: '/public-profile/profiles/feeds',
          },
          {
            title: 'Plain',
            icon: File,
            path: '/public-profile/profiles/plain',
          },
          {
            title: 'Modal',
            icon: SquareMousePointer,
            path: '/public-profile/profiles/modal',
          },
          { title: 'Freelancer', icon: Briefcase, path: '#', disabled: true },
          { title: 'Developer', icon: Code, path: '#', disabled: true },
          { title: 'Team', icon: Users, path: '#', disabled: true },
          { title: 'Events', icon: CalendarCheck, path: '#', disabled: true },
        ],
      },
      {
        title: 'Other Pages',
        children: [
          {
            title: 'Projects - 3 Cols',
            icon: Layout,
            path: '/public-profile/projects/3-columns',
          },
          {
            title: 'Projects - 2 Cols',
            icon: Grid,
            path: '/public-profile/projects/2-columns',
          },
          { title: 'Works', icon: WorkIcon, path: '/public-profile/works' },
          { title: 'Teams', icon: PeopleIcon, path: '/public-profile/teams' },
          { title: 'Network', icon: Network, path: '/public-profile/network' },
          {
            title: 'Activity',
            icon: TrendingUp,
            path: '/public-profile/activity',
          },
          {
            title: 'Campaigns - Card',
            icon: LayoutGrid,
            path: '/public-profile/campaigns/card',
          },
          {
            title: 'Campaigns - List',
            icon: Kanban,
            path: '/public-profile/campaigns/list',
          },
          { title: 'Empty', icon: FileText, path: '/public-profile/empty' },
          { title: 'Documents', icon: DocumentIcon, path: '#', disabled: true },
          { title: 'Badges', icon: Award, path: '#', disabled: true },
          { title: 'Awards', icon: Gift, path: '#', disabled: true },
        ],
      },
    ],
  },
  {
    title: 'My Account',
    children: [
      {
        title: 'General Pages',
        children: [
          { title: 'Integrations', icon: Plug, path: '/account/integrations' },
          {
            title: 'Notifications',
            icon: Bell,
            path: '/account/notifications',
          },
          { title: 'API Keys', icon: Key, path: '/account/api-keys' },
          { title: 'Appearance', icon: Eye, path: '/account/appearance' },
          {
            title: 'Invite a Friend',
            icon: UserCheck,
            path: '/account/invite-a-friend',
          },
          { title: 'Activity', icon: LifeBuoy, path: '/account/activity' },
          { title: 'Brand', icon: CheckCircle, disabled: true },
          { title: 'Get Paid', icon: Euro, disabled: true },
        ],
      },
      {
        title: 'Other pages',
        children: [
          {
            title: 'Account Home',
            children: [
              { title: 'Get Started', path: '/account/home/get-started' },
              { title: 'User Profile', path: '/account/home/user-profile' },
              {
                title: 'Company Profile',
                path: '/account/home/company-profile',
              },
              { title: 'With Sidebar', path: '/account/home/settings-sidebar' },
              {
                title: 'Enterprise',
                path: '/account/home/settings-enterprise',
              },
              { title: 'Plain', path: '/account/home/settings-plain' },
              { title: 'Modal', path: '/account/home/settings-modal' },
            ],
          },
          {
            title: 'Billing',
            children: [
              { title: 'Basic Billing', path: '/account/billing/basic' },
              { title: 'Enterprise', path: '/account/billing/enterprise' },
              { title: 'Plans', path: '/account/billing/plans' },
              { title: 'Billing History', path: '/account/billing/history' },
              { title: 'Tax Info', disabled: true },
              { title: 'Invoices', disabled: true },
              { title: 'Gateaways', disabled: true },
            ],
          },
          {
            title: 'Security',
            children: [
              { title: 'Get Started', path: '/account/security/get-started' },
              {
                title: 'Security Overview',
                path: '/account/security/overview',
              },
              {
                title: 'IP Addresses',
                path: '/account/security/allowed-ip-addresses',
              },
              {
                title: 'Privacy Settings',
                path: '/account/security/privacy-settings',
              },
              {
                title: 'Device Management',
                path: '/account/security/device-management',
              },
              {
                title: 'Backup & Recovery',
                path: '/account/security/backup-and-recovery',
              },
              {
                title: 'Current Sessions',
                path: '/account/security/current-sessions',
              },
              { title: 'Security Log', path: '/account/security/security-log' },
            ],
          },
          {
            title: 'Members & Roles',
            children: [
              { title: 'Teams Starter', path: '/account/members/team-starter' },
              { title: 'Teams', path: '/account/members/teams' },
              { title: 'Team Info', path: '/account/members/team-info' },
              {
                title: 'Members Starter',
                path: '/account/members/members-starter',
              },
              { title: 'Team Members', path: '/account/members/team-members' },
              {
                title: 'Import Members',
                path: '/account/members/import-members',
              },
              { title: 'Roles', path: '/account/members/roles' },
              {
                title: 'Permissions - Toggler',
                path: '/account/members/permissions-toggle',
              },
              {
                title: 'Permissions - Check',
                path: '/account/members/permissions-check',
              },
            ],
          },
          {
            title: 'Other Pages',
            children: [
              { title: 'Integrations', path: '/account/integrations' },
              { title: 'Notifications', path: '/account/notifications' },
              { title: 'API Keys', path: '/account/api-keys' },
              { title: 'Appearance', path: '/account/appearance' },
              { title: 'Invite a Friend', path: '/account/invite-a-friend' },
              { title: 'Activity', path: '/account/activity' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Network',
    children: [
      {
        title: 'General Pages',
        children: [
          { title: 'Get Started', icon: Flag, path: '/network/get-started' },
          { title: 'Colleagues', icon: Users, path: '#', disabled: true },
          { title: 'Donators', icon: Heart, path: '#', disabled: true },
          { title: 'Leads', icon: Zap, path: '#', disabled: true },
        ],
      },
      {
        title: 'Other pages',
        children: [
          {
            title: 'User Cards',
            children: [
              { title: 'Mini Cards', path: '/network/user-cards/mini-cards' },
              { title: 'Team Members', path: '/network/user-cards/team-crew' },
              { title: 'Authors', path: '/network/user-cards/author' },
              { title: 'NFT Users', path: '/network/user-cards/nft' },
              { title: 'Social Users', path: '/network/user-cards/social' },
              { title: 'Gamers', path: '#', disabled: true },
            ],
          },
          {
            title: 'User Base',
            badge: 'Datatables',
            children: [
              { title: 'Team Crew', path: '/network/user-table/team-crew' },
              { title: 'App Roster', path: '/network/user-table/app-roster' },
              {
                title: 'Market Authors',
                path: '/network/user-table/market-authors',
              },
              { title: 'SaaS Users', path: '/network/user-table/saas-users' },
              {
                title: 'Store Clients',
                path: '/network/user-table/store-clients',
              },
              { title: 'Visitors', path: '/network/user-table/visitors' },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'User Management',
    icon: Users,
    children: [
      {
        title: 'Users',
        path: '/user-management/users',
      },
      {
        title: 'Roles',
        path: '/user-management/roles',
      },
      {
        title: 'Permissions',
        path: '/user-management/permissions',
      },
      {
        title: 'Account',
        path: '/user-management/account',
      },
      {
        title: 'Logs',
        path: '/user-management/logs',
      },
      {
        title: 'Settings',
        path: '/user-management/settings',
      },
    ],
  },
  {
    title: 'Store - Client',
    children: [
      { title: 'Home', path: '/store-client/home' },
      {
        title: 'Search Results - Grid',
        path: '/store-client/search-results-grid',
      },
      {
        title: 'Search Results - List',
        path: '/store-client/search-results-list',
      },
      { title: 'Product Details', path: '/store-client/product-details' },
      { title: 'Wishlist', path: '/store-client/wishlist' },
      {
        title: 'Checkout',
        children: [
          {
            title: 'Order Summary',
            path: '/store-client/checkout/order-summary',
          },
          {
            title: 'Shipping Info',
            path: '/store-client/checkout/shipping-info',
          },
          {
            title: 'Payment Method',
            path: '/store-client/checkout/payment-method',
          },
          {
            title: 'Order Placed',
            path: '/store-client/checkout/order-placed',
          },
        ],
      },
      { title: 'My Orders', path: '/store-client/my-orders' },
      { title: 'Order Receipt', path: '/store-client/order-receipt' },
    ],
  },
];

export const MENU_HELP: MenuConfig = [
  {
    title: 'Getting Started',
    icon: Coffee,
    path: 'https://keenthemes.com/metronic/tailwind/docs/getting-started/installation',
  },
  {
    title: 'Support Forum',
    icon: AlertCircle,
    children: [
      {
        title: 'All Questions',
        icon: FileQuestion,
        path: 'https://devs.keenthemes.com',
      },
      {
        title: 'Popular Questions',
        icon: Star,
        path: 'https://devs.keenthemes.com/popular',
      },
      {
        title: 'Ask Question',
        icon: HelpCircle,
        path: 'https://devs.keenthemes.com/question/create',
      },
    ],
  },
  {
    title: 'Licenses & FAQ',
    icon: Captions,
    path: 'https://keenthemes.com/metronic/tailwind/docs/getting-started/license',
  },
  {
    title: 'Documentation',
    icon: FileQuestion,
    path: 'https://keenthemes.com/metronic/tailwind/docs',
  },
  { separator: true },
  { title: 'Contact Us', icon: Share2, path: 'https://keenthemes.com/contact' },
];

export const MENU_ROOT: MenuConfig = [
  {
    title: 'Public Profile',
    icon: UserCircle,
    rootPath: '/public-profile/',
    path: '/public-profile/profiles/default',
    childrenIndex: 2,
  },
  {
    title: 'Account',
    icon: Settings,
    rootPath: '/account/',
    path: '/',
    childrenIndex: 3,
  },
  {
    title: 'Network',
    icon: Users,
    rootPath: '/network/',
    path: '/network/get-started',
    childrenIndex: 4,
  },
  {
    title: 'Authentication',
    icon: Shield,
    rootPath: '/authentication/',
    path: '/authentication/get-started',
    childrenIndex: 5,
  },
  {
    title: 'Store - Client',
    icon: ShoppingCart,
    rootPath: '/store-client/',
    path: '/store-client/home',
    childrenIndex: 6,
  },
  {
    title: 'User Management',
    icon: ShieldUser,
    rootPath: '/user-management/',
    path: '/user-management/users',
    childrenIndex: 7,
    roles: ['SuperAdmin'],
  },
];

// Functions to generate translated menu configurations
export function getTranslatedMenuSidebar(t: (key: string) => string): MenuConfig {
  // ⚠ THIS IS THE MENU THAT RENDERS, WHICH IS WHY THE DMS ENTRIES ARE HERE.
  //
  // They were appended to getTranslatedMenuRoot first. That was wrong, and it
  // was wrong in a way nothing reported: `menuRoot` has NO CONSUMER — the only
  // references to it in the whole repo are its own definition in
  // lib/use-translated-menu.ts and a doc comment beside it. The sidebar renders
  // `menuSidebar`, built from this function.
  //
  // So the entries were correct, type-checked, pointing at real routes, and
  // appended to a menu nothing reads. "Every entry resolves to a real route"
  // was true — and it was a fact about the DESTINATION, not about whether
  // anyone could see the link.
  //
  // THE CHECK THAT SETTLES THIS IS WHICH SYMBOL THE RENDERING COMPONENT
  // IMPORTS, not which symbol the entries were added to:
  //   app/components/layouts/demo1/components/sidebar-menu.tsx:23
  //     const { menuSidebar } = useTranslatedMenu();
  //   ...:223  buildMenu(menuSidebar)
  //
  // MENU_DMS is declared below this function. That is safe: this body only runs
  // when the menu is built, long after module evaluation, so there is no
  // temporal-dead-zone problem.
  //
  // Spread BEFORE translation on purpose — the DMS entries carry English labels
  // and must not be looked up in a key map they are deliberately absent from.
  // (That was true when they were appended after; moving them first does not
  // change it, because translateMenuItems is applied to MENU_SIDEBAR alone.)
  //
  // ─── ORDER: DMS FIRST. REMOVING AN ACCIDENT, NOT ADDING A PREFERENCE ────────
  // The DMS entries used to come last, and only because this line appended them
  // after everything else. Nobody chose that arrangement for the customer — it
  // is an artefact of how the composition was written. In the application built
  // for him, his own pages sat beneath account settings.
  //
  // ─── WHAT SURVIVES FROM MENU_SIDEBAR, AND WHY IT IS NOT AN OVERSIGHT ────────
  // Only `My Account` and `User Management`. Every other top-level entry
  // belonged to a different product — its paths pointed at another zone's slug —
  // and a DMS user has no business seeing them. The section headings went with
  // their children.
  //
  // ⛔ THESE TWO ARE DELIBERATELY RETAINED. DO NOT TIDY THEM AWAY.
  // They are account chrome, not a product: sign-out and account access
  // plausibly live in here. Whether the Shell already provides that chrome
  // CANNOT BE READ FROM THIS CONFIG — it is a property of the rendered page.
  //
  // Removing sign-out or account access blind is the one way this change harms a
  // real user, and it would not fail a build, a type-check or a lint. It would
  // simply leave someone unable to sign out.
  //
  // ⚠ MEASURED AFTER WRITING THE ABOVE, AND IT NARROWS IT — REPORTED, NOT ACTED
  // ON. Both entries carry `roles: ['SuperAdmin']`, so `filterMenuByRole`
  // already hides them from everyone else. A DMS operator, vessel supervisor or
  // project-control user sees NEITHER — their DMS roles are not Auth roles — and
  // the sidebar they get is this file's DMS group alone.
  //
  // So these two are not the sign-out route for an ordinary user; they cannot
  // be, because an ordinary user never sees them. Nor is sign-out among their
  // children: the subtree is `/account/*` pages (profile, billing, security,
  // members, integrations, notifications, api-keys, appearance, activity) and
  // there is no logout entry anywhere in it.
  //
  // THAT DOES NOT MAKE THEM SAFE TO CUT, and the condition is unchanged: it
  // narrows who could be harmed to a SuperAdmin, and it still cannot tell us
  // what chrome the Shell renders around this sidebar. The decision remains
  // Christina's after someone looks at a rendered page.
  //
  // THE CONDITION FOR DECIDING THEM IS ONE LOOK AT A RENDERED PAGE, and nobody
  // has looked yet. Nobody removes them before that. An incomplete-looking list
  // with no explanation is exactly what the next person deletes as an obvious
  // omission, which is why the reason is here and not in a report.
  //
  // Their INTERIORS are equally untouched — `Billing`, `Security`, and the rest
  // are inside `My Account`, not top level.
  //
  // ⚠ ONE KNOWN WART, RECORDED HERE BECAUSE THE INTERIOR MAY NOT BE ANNOTATED.
  // `My Account > Account > User Profile New` points at `/members/add/` — a link
  // into the Members product, inside an entry we are keeping. It is the only
  // cross-product path left in the sidebar, and it survives this change because
  // the instruction was to leave retained entries alone, not because it is
  // correct. Reported rather than cut: it sits behind account chrome nobody has
  // rendered yet, and cutting it is the same decision as cutting its parents.
  return [...buildMenuDms(t), ...translateMenuItems(MENU_SIDEBAR, t)];
}

export function getTranslatedMenuSidebarCustom(t: (key: string) => string): MenuConfig {
  return translateMenuItems(MENU_SIDEBAR_CUSTOM, t);
}

export function getTranslatedMenuSidebarCompact(t: (key: string) => string): MenuConfig {
  return translateMenuItems(MENU_SIDEBAR_COMPACT, t);
}

export function getTranslatedMenuMega(t: (key: string) => string): MenuConfig {
  return translateMenuItems(MENU_MEGA, t);
}

export function getTranslatedMenuMegaMobile(t: (key: string) => string): MenuConfig {
  return translateMenuItems(MENU_MEGA_MOBILE, t);
}

export function getTranslatedMenuHelp(t: (key: string) => string): MenuConfig {
  return translateMenuItems(MENU_HELP, t);
}

/**
 * --- DMS --------------------------------------------------------------------
 *
 * WARNING: THIS FILE IS A TEMPLATE FILE. sync-kit force-overwrites it, so any
 * sync-kit run on this zone silently restores the Template menu and removes
 * every DMS entry below. The routes stay gated by middleware.ts (which is NOT
 * a template file and survives), so the failure is asymmetric: DMS would still
 * refuse the wrong role while the menu advertises other zones’ routes and none
 * of its own — guarded and lying at once. Post-sync verification must include
 * "the menu still names DMS routes" alongside the two eslint probes.
 *
 * WARNING: NO `roles:` PROPERTY ON THESE ENTRIES, DELIBERATELY. The estate’s
 * `filterMenuByRole` compares `item.roles` against `session.user.roles` from
 * next-auth — the AUTH service’s roles. DMS’s three roles do not exist there,
 * so tagging an entry `roles: [‘Operator’]` would find no overlap and hide it
 * from EVERYONE, permanently. Gating here would not be weak; it would be a
 * blank menu.
 *
 * So the menu is not the control and does not pretend to be: middleware.ts
 * gates the routes, and that is build-verified. This is the inverse of
 * CustomerRisk, which gates its menu by role and has no route guard at all —
 * and it is the right way round, because nobody-can-find-it is not a control.
 *
 * ⛔ THE ENTRIES ARE TRANSLATED WITH `t('dms:<key>')` AND MUST NEVER BE PASSED
 * THROUGH `translateMenuItems`. The bypass below is a CONTROL, not an omission,
 * and it reads exactly like an omission — which is why the reason is here.
 *
 * (This paragraph previously said the `dms` namespace was not registered, so
 * `t('dms:...')` could not work. That is no longer true — `i18n/namespaces.ts`
 * imports it and `DOMAIN_NAMESPACES` carries it into i18next. A comment stating a
 * condition that has since been met reads as a live prohibition.)
 *
 * `translateMenuItems` looks a title up in MENU_TRANSLATION_KEYS, a map keyed by
 * ENGLISH TITLE STRING across the whole estate — one global namespace, ~294
 * entries, and no field for which product is asking. It also RECURSES INTO
 * CHILDREN, so routing our group through it would look up all ten titles.
 *
 * Nine would miss and stay English — visibly unfinished, and harmless.
 * `'Approvals'` would HIT, and resolve to «مجوزهای فنی» — "technical permits",
 * from the brokerage product whose neighbours in that map are `tradingOffices`
 * and `boardCommittees`. That entry is not wrong; it is the correct translation
 * for its owner. Ours would be confidently, plausibly wrong in the customer's
 * own language, where we are least able to see it.
 *
 * ⚠ SO THE ONE THAT 'WORKS' IS THE ONLY ONE THAT HARMS US. And adding
 * `'Approvals'` to that map for DMS would silently change the brokerage menu:
 * it is not a missing entry, it is a namespace that cannot express the
 * distinction. DMS therefore carries its own keys in `i18n/dms/`.
 *
 * The English title travels as `defaultValue`, so a missing key renders readable
 * English rather than a raw key string.
 *
 * THESE RENDER PERSIAN. Measured on mkoffice.ir, where `localStorage.language`
 * is already `"fa"` and the Shell renders داشبوردها / اطلاعات اعضا; and
 * confirmed from source here — `lookupLocalStorage: 'language'` reads that exact
 * key, and `/dms` is the same origin as the Shell on that host, so the zone
 * reads the value that was measured rather than one merely like it.
 *
 * ⚠ SEPARATELY, AND NOT A QUALIFICATION OF THE ABOVE: that value is `"fa"`
 * because a human picked the flag. `navigator.languages` ranks `en` above `fa` on
 * that machine, so the detector left to itself writes `"en"` — a fresh browser
 * profile, or a different host, starts in English until someone notices.
 * That is a recorded decision of the CTO's with a condition attached, and the
 * detector order is deliberately unchanged. DO NOT 'fix' it here and do not
 * build around it.
 *
 * The one string this must not contain is the customer-facing system name,
 * which has exactly one home in `i18n/dms/fa.json`. "DMS Home" is a menu
 * label, not that name.
 */
/**
 * ─── WHAT NESTING DID TO THE SECONDARY NAVBAR: NOTHING VISIBLE, TODAY ───────
 *
 * MEASURED, not reasoned about. `navItemsForPathPrefix` recurses into
 * `children` and returns the first group whose direct children match a prefix,
 * so nesting DOES change what it returns. Running it over the whole tree
 * before and after, across every prefix reachable from any entry (163 of them):
 *
 *   8 prefixes change — /admin, /approvals, /daily-report and the four
 *     /admin/* leaves — each going from `undefined` to the nine.
 *   155 unchanged. NO template prefix moves, so no other zone's navbar is
 *     disturbed by this. That negative is the point of testing all 163
 *     rather than the handful we expected to matter.
 *
 * ⚠ AND IT REACHES NO SCREEN, WHICH IS A SEPARATE FACT FROM THE ONE ABOVE.
 * `navItemsForPathPrefix` has ZERO importers in this repo, and `NavbarMenu`
 * — the only component that could render the result — is defined, exported and
 * never used. Searched with ripgrep across every .ts/.tsx/.js/.jsx in the repo.
 * Dms therefore has no secondary navbar for the nine to appear in.
 *
 * So this is NOT a suppressed side effect; it is one that does not occur, and
 * nothing shared was touched to make that true. The distinction matters,
 * because the two have different futures:
 *
 * ⛔ IF ANYONE LATER WIRES A SECONDARY NAVBAR INTO THIS ZONE, THE NINE WILL
 * POPULATE IT — as a consequence of this nesting, not of their change. Whoever
 * does it inherits a UI change the customer did not ask for, and the diff they
 * are reviewing will not contain it.
 *
 * Note the SPM comment further up this file asserts the opposite outcome for
 * its own group. Both are correct: that zone has a navbar consumer and this one
 * does not. It is a claim about a zone, not about the helper.
 */
const buildMenuDms = (
  t: (key: string, opts?: { defaultValue: string }) => string,
): MenuConfig => [
  {
    // Amir, msg 204: the nine entries under one heading. The heading string
    // is DERIVED from his own bytes with one deliberate character changed —
    // see DMS_MENU_PARENT_TITLE in lib/dms/menu.ts, which carries the raw-file
    // path, its sha256, and why the ZWNJ substitution was made. Do not inline
    // the string here; it has one home.
    //
    // NO `path` ON THE PARENT, DELIBERATELY. It is a grouping, not a
    // destination; DMS Home stays a child so the route it points at keeps
    // exactly one entry. A parent with a path would give the same screen two.
    //
    // NO `roles:` HERE EITHER, for the reason given above — and note the new
    // consequence of nesting: `filterMenuByRole` drops a childless parent, so
    // a `roles:` tag on ANY future parent would take all nine down with it,
    // not just itself. Executed and confirmed at this depth, not assumed from
    // the top-level result.
    // NOT translated: it is Amir's own string, already in his language, with
    // its provenance and sha256 recorded at the constant. Routing it through
    // t() would give it a second home and a way to drift from his bytes.
    title: DMS_MENU_PARENT_TITLE,
    icon: Ship,
    children: DMS_MENU_ENTRIES.map((entry) => ({
      title: t('dms:' + entry.titleKey, { defaultValue: entry.title }),
      path: entry.path,
    })),
  },
];

export function getTranslatedMenuRoot(t: (key: string) => string): MenuConfig {
  // NO DMS ENTRIES HERE, DELIBERATELY. `menuRoot` has no consumer in this repo
  // — see the note on getTranslatedMenuSidebar. Adding them back would put them
  // somewhere that renders nothing, which is where they spent their first hours.
  return translateMenuItems(MENU_ROOT, t);
}
