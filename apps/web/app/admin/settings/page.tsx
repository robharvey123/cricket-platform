'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserRole } from '../../../lib/hooks/useUserRole';
import styles from './page.module.css';

interface ClubInfo {
  name: string;
  slug: string;
  brand?: {
    primary?: string;
    secondary?: string;
    logo_url?: string;
  };
  tier?: string;
  billing_status?: string;
}

export default function SettingsPage() {
  const { role } = useUserRole();
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClubInfo();
  }, []);

  async function fetchClubInfo() {
    try {
      const response = await fetch('/api/club/info');
      if (response.ok) {
        const data = await response.json();
        setClub(data.club);
      }
    } catch (error) {
      console.error('Failed to fetch club info:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.loading} />
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  const settingsSections = [
    {
      title: 'Club Management',
      description: 'Core settings for your cricket club',
      icon: '🏏',
      items: [
        {
          title: 'Onboarding',
          description: 'Setup wizard for new clubs',
          href: '/admin/onboarding',
          badge: 'Quick Start',
          badgeColor: 'bg-green-100 text-green-800',
          adminOnly: false,
        },
        {
          title: 'Teams',
          description: 'Manage your cricket teams and squads',
          href: '/admin/teams',
          adminOnly: false,
        },
        {
          title: 'Seasons',
          description: 'Create and manage playing seasons',
          href: '/admin/seasons',
          adminOnly: false,
        },
        {
          title: 'Players',
          description: 'Manage player profiles and roster',
          href: '/admin/players',
          adminOnly: false,
        },
      ],
    },
    {
      title: 'User Management',
      description: 'Manage access and permissions',
      icon: '👥',
      items: [
        {
          title: 'Users & Roles',
          description: 'Manage club members and their permissions',
          href: '/admin/users',
          adminOnly: true,
        },
        {
          title: 'Invite Players',
          description: 'Send email & WhatsApp invitations',
          href: '/admin/players/invite',
          badge: 'New',
          badgeColor: 'bg-blue-100 text-blue-800',
          adminOnly: false,
        },
        {
          title: 'Team Captains',
          description: 'Assign captains to teams',
          href: '/admin/teams',
          adminOnly: false,
        },
        {
          title: 'My Profile',
          description: 'Update your personal information',
          href: '/admin/profile',
          adminOnly: false,
        },
      ],
    },
    {
      title: 'Scoring & Analytics',
      description: 'Configure points system and view insights',
      icon: '📊',
      items: [
        {
          title: 'Scoring Configuration',
          description: 'Customize your points formula',
          href: '/admin/scoring',
          badge: 'Important',
          badgeColor: 'bg-orange-100 text-orange-800',
          adminOnly: true,
        },
        {
          title: 'Leaderboards',
          description: 'View season rankings',
          href: '/admin/leaderboards',
          adminOnly: false,
        },
        {
          title: 'Dashboard',
          description: 'Club analytics and insights',
          href: '/admin',
          adminOnly: false,
        },
      ],
    },
    {
      title: 'Match Management',
      description: 'Upload and manage match scorecards',
      icon: '📄',
      items: [
        {
          title: 'Matches',
          description: 'View all matches and scorecards',
          href: '/admin/matches',
          adminOnly: false,
        },
        {
          title: 'Import PDF Scorecard',
          description: 'Upload Play Cricket scorecards',
          href: '/admin/matches/import-pdf',
          adminOnly: false,
        },
        {
          title: 'Create Match Manually',
          description: 'Enter match data without PDF',
          href: '/admin/matches/new',
          adminOnly: false,
        },
      ],
    },
    {
      title: 'System & Security',
      description: 'Advanced settings and monitoring',
      icon: '⚙️',
      items: [
        {
          title: 'Audit Logs',
          description: 'View system activity and changes',
          href: '/admin/audit',
          adminOnly: true,
        },
        {
          title: 'Club Profile',
          description: 'Update club name, logo, and branding',
          href: '/admin/settings/club-profile',
          badge: 'Coming Soon',
          badgeColor: 'bg-gray-100 text-gray-800',
          adminOnly: true,
        },
        {
          title: 'Billing & Subscription',
          description: 'Manage your subscription plan',
          href: '/admin/settings/billing',
          badge: 'Coming Soon',
          badgeColor: 'bg-gray-100 text-gray-800',
          adminOnly: true,
        },
      ],
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>Club Administration</p>
            <h1 className={styles.title}>Settings</h1>
            <p className={styles.subtitle}>
              Manage {club?.name || 'your club'} settings and configuration
            </p>
            {!isAdmin && (
              <p className={styles.warningText}>
                ⚠️ Some settings are restricted to administrators
              </p>
            )}
          </div>
          {club?.brand?.logo_url && (
            <img
              src={club.brand.logo_url}
              alt={`${club.name} logo`}
              style={{ height: '48px', width: '48px', objectFit: 'contain' }}
            />
          )}
        </div>

        {/* Club Info Card */}
        <div className={styles.clubInfoCard}>
          <div className={styles.clubInfoHeader}>
            <div className={styles.clubInfo}>
              <h2>{club?.name}</h2>
              <div className={styles.clubDetails}>
                <p>
                  <strong>Club Slug:</strong>{' '}
                  <code>{club?.slug}</code>
                </p>
                <p>
                  <strong>Public URL:</strong>{' '}
                  <a
                    href={`/leaderboard/${club?.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {typeof window !== 'undefined' && window.location.origin}/leaderboard/{club?.slug}
                  </a>
                </p>
                {club?.tier && (
                  <p>
                    <strong>Plan:</strong>{' '}
                    <span className={`${styles.badge} ${styles.badgeBlue}`}>
                      {club.tier}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <div className={styles.actionButtons}>
              <Link href="/admin" className={styles.secondaryButton}>
                Dashboard
              </Link>
              <Link href="/admin/onboarding" className={styles.primaryButton}>
                Setup Wizard
              </Link>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <div key={section.title} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>{section.icon}</span>
              <div>
                <h2 className={styles.sectionTitle}>
                  {section.title}
                </h2>
                <p className={styles.sectionDescription}>{section.description}</p>
              </div>
            </div>

            <div className={styles.settingsGrid}>
              {section.items.map((item) => {
                const isDisabled = item.adminOnly && !isAdmin;
                const isComingSoon = item.badge === 'Coming Soon';

                const getBadgeClass = (color: string) => {
                  if (color.includes('green')) return styles.badgeGreen;
                  if (color.includes('orange')) return styles.badgeOrange;
                  if (color.includes('blue')) return styles.badgeBlue;
                  return styles.badgeGray;
                };

                return (
                  <div key={item.title}>
                    {isDisabled || isComingSoon ? (
                      <div className={styles.settingCardDisabled}>
                        <div className={styles.settingCardHeader}>
                          <h3 className={styles.settingTitle}>
                            {item.title}
                          </h3>
                          {item.badge && (
                            <span className={`${styles.settingBadge} ${getBadgeClass(item.badgeColor || '')}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className={styles.settingDescription}>{item.description}</p>
                        {isDisabled && (
                          <span className={styles.lockIcon}>
                            🔒 Admin only
                          </span>
                        )}
                      </div>
                    ) : (
                      <Link href={item.href} className={styles.settingCard}>
                        <div className={styles.settingCardHeader}>
                          <h3 className={styles.settingTitle}>
                            {item.title}
                          </h3>
                          {item.badge && (
                            <span className={`${styles.settingBadge} ${getBadgeClass(item.badgeColor || '')}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className={styles.settingDescription}>{item.description}</p>
                        <span className={styles.settingArrow}>
                          Open →
                        </span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Help Section */}
        <div className={styles.helpSection}>
          <h3>Need Help?</h3>
          <p>
            Check out these resources to get the most out of your cricket platform:
          </p>
          <div className={styles.helpGrid}>
            <div className={styles.helpCard}>
              <h4>📚 Documentation</h4>
              <p>
                Learn how to use all features
              </p>
              <a href="#">
                View docs →
              </a>
            </div>
            <div className={styles.helpCard}>
              <h4>🎥 Video Tutorials</h4>
              <p>
                Watch step-by-step guides
              </p>
              <a href="#">
                Watch now →
              </a>
            </div>
            <div className={styles.helpCard}>
              <h4>💬 Support</h4>
              <p>
                Get help from our team
              </p>
              <a href="mailto:support@cricketplatform.com">
                Contact support →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
