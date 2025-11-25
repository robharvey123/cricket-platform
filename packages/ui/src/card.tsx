import { type JSX, type ReactNode } from "react";

interface CardProps {
  className?: string;
  title: string;
  children: ReactNode;
  href: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/**
 * Safely constructs a URL with UTM parameters
 */
function buildUrlWithParams(
  baseHref: string,
  utmSource?: string,
  utmMedium?: string,
  utmCampaign?: string
): string {
  try {
    const url = new URL(baseHref);
    if (utmSource) url.searchParams.set("utm_source", utmSource);
    if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
    if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
    return url.toString();
  } catch (error) {
    console.error("Invalid URL provided to Card component:", baseHref);
    return baseHref;
  }
}

export function Card({
  className,
  title,
  children,
  href,
  utmSource = "create-turbo",
  utmMedium = "basic",
  utmCampaign = "create-turbo",
}: CardProps): JSX.Element {
  const safeHref = buildUrlWithParams(href, utmSource, utmMedium, utmCampaign);

  return (
    <a
      className={className}
      href={safeHref}
      rel="noopener noreferrer"
      target="_blank"
      aria-label={`${title} - opens in new tab`}
    >
      <h2>
        {title} <span aria-hidden="true">-&gt;</span>
      </h2>
      <p>{children}</p>
    </a>
  );
}
