/**
 * JSON-LD structured data builders.
 *
 * Every builder returns a plain schema.org object; the caller passes it to
 * `Base`/`BaseHead` via the `jsonLd` prop, which serialises it into a
 * `<script type="application/ld+json">` tag.
 *
 * URLs must be absolute and must carry a trailing slash so they match the
 * canonical form emitted by `<link rel="canonical">` and the sitemap.
 */

import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_LOCATION, SITE_TITLE, SOCIAL } from '../consts';

/** Canonical absolute URL for a path, always trailing-slashed. */
export function abs(path: string, site: URL | undefined): string {
	const base = site ?? new URL('https://rogadigital.com');
	const withSlash = path.endsWith('/') ? path : `${path}/`;
	return new URL(withSlash, base).href;
}

/**
 * The studio itself. Emitted once, on the home page — this is what feeds
 * brand-search knowledge panels for "Roga Digital".
 */
export function organizationSchema(site: URL | undefined) {
	return {
		'@context': 'https://schema.org',
		'@type': 'ProfessionalService',
		'@id': `${abs('/', site)}#organization`,
		name: 'Roga Digital',
		alternateName: SITE_TITLE,
		description: SITE_DESCRIPTION,
		url: abs('/', site),
		founder: {
			'@type': 'Person',
			name: SITE_AUTHOR,
			url: abs('/about', site),
		},
		areaServed: SITE_LOCATION,
		sameAs: [SOCIAL.github, SOCIAL.linkedin],
	};
}

/** A person, for /resume and /about. */
export function personSchema(site: URL | undefined, jobTitle: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: SITE_AUTHOR,
		jobTitle,
		url: abs('/resume', site),
		address: {
			'@type': 'PostalAddress',
			addressRegion: 'British Columbia',
			addressCountry: 'CA',
		},
		worksFor: {
			'@type': 'Organization',
			name: 'Roga Digital',
			url: abs('/', site),
		},
		sameAs: [SOCIAL.github, SOCIAL.linkedin],
	};
}

/** An article. Without this, insight posts cannot earn article rich results. */
export function blogPostingSchema(opts: {
	site: URL | undefined;
	path: string;
	title: string;
	description: string;
	pubDate: Date;
	updatedDate?: Date;
	imageUrl?: string;
}) {
	const url = abs(opts.path, opts.site);
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: opts.title,
		description: opts.description,
		url,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		datePublished: opts.pubDate.toISOString(),
		dateModified: (opts.updatedDate ?? opts.pubDate).toISOString(),
		author: {
			'@type': 'Person',
			name: SITE_AUTHOR,
			url: abs('/about', opts.site),
		},
		publisher: {
			'@type': 'Organization',
			name: 'Roga Digital',
			url: abs('/', opts.site),
		},
		...(opts.imageUrl ? { image: opts.imageUrl } : {}),
	};
}

/**
 * Breadcrumbs. Turns the URL line in a search result into a clickable trail.
 * Pass the trail without the home crumb — it is prepended here.
 */
export function breadcrumbSchema(
	site: URL | undefined,
	trail: Array<{ name: string; path: string }>,
) {
	const items = [{ name: 'Home', path: '/' }, ...trail];
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((crumb, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: crumb.name,
			item: abs(crumb.path, site),
		})),
	};
}
