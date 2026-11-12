/**
 * The services Roga Digital offers. One source for the /services index, the
 * dedicated /services/<slug>/ pages, and the services list on the home page.
 */

/** A dedicated landing page for a service. Only the main offerings get one. */
export interface ServicePage {
	/** URL segment: the page is served at /services/<slug>/. */
	slug: string;
	h1: string;
	seoTitle: string;
	seoDescription: string;
	/** Extra paragraphs shown only on the dedicated page. */
	intro: string[];
	/** Ids of work entries (src/content/work) that show this service in production. */
	work: string[];
}

export interface Service {
	/** Anchor id on /services. */
	id: string;
	title: string;
	/** One line for lists. */
	summary: string;
	lead: string;
	deliverables: string[];
	whenYouReachFor: string[];
	stack: string[];
	example?: { label: string; href: string };
	page?: ServicePage;
}

export const SERVICES: Service[] = [
	{
		id: 'internal-tools',
		title: 'Internal tools & dashboards',
		summary: 'Operations panels, reporting dashboards, and queue managers your team uses all day.',
		lead: 'The interfaces your team uses every day: operations panels, reporting dashboards, queue managers, content tooling. Fast, dense, and kind to power users. Built to save time, not to look impressive in a pitch deck.',
		deliverables: [
			'A working tool deployed in the first week, with no big-bang launch.',
			'Role-aware views (operator, supervisor, admin) from the same codebase.',
			'Filters, sorts, exports, and bulk actions. The boring features that matter.',
			'Reports that go to email, Slack, or wherever the people who need them already are.',
		],
		whenYouReachFor: [
			'Your team does the same manual workaround in spreadsheets every week.',
			'Customer support keeps asking developers for one-off database lookups.',
			"You're hiring more operations staff to cover what software should be doing.",
		],
		stack: ['Operational UI', 'Reporting', 'Bulk actions', 'Workflow tooling'],
		example: { label: 'TC Tools', href: '/work/telus-tc-tools/' },
		page: {
			slug: 'internal-tools',
			h1: 'Internal tools and dashboards, built around how your team works.',
			seoTitle: 'Internal tool & dashboard development · Roga Digital',
			seoDescription:
				'Custom internal tools, operations dashboards, and admin panels for businesses that have outgrown spreadsheets. Designed, built, and maintained by Roga Digital in BC, Canada.',
			intro: [
				'Most internal tools start life as a spreadsheet that worked until the team grew. Then it becomes a shared file nobody trusts, a weekly copy-and-paste ritual, and one person who knows how it all fits together.',
				'I replace that with software shaped to the job: the screens your dispatchers, coordinators, editors, or lot staff need, with the right data on them and nothing else. I work from Vancouver Island with businesses across BC and the rest of Canada.',
			],
			work: ['roga-dispatch', 'telus-tc-tools', 'carevo-logistics'],
		},
	},
	{
		id: 'fullstack',
		title: 'Custom software development',
		summary: 'Production web applications, from first design through deploy and long-term support.',
		lead: "Production web applications, front to back, from design through deploy. TypeScript by default, Svelte or Astro for the front end, Node or Python for the back end, Postgres for state. I pick tools because they suit the job, not because they're trending.",
		deliverables: [
			'A production web application: front end, back end, database, and deploy.',
			'A CI/CD pipeline that catches regressions before they ship.',
			'A test suite scoped to what breaks in practice, not to a coverage number.',
			'Documentation and runbooks written for the team that inherits the code.',
		],
		whenYouReachFor: [
			"You need a real web app and don't have a senior developer in-house.",
			'An existing build is slowing your team down and needs a clean rewrite.',
			'You have a greenfield product and want one person accountable for the whole stack.',
		],
		stack: ['TypeScript', 'Svelte · Astro', 'Node · Python', 'Postgres', 'Vercel · Railway'],
		example: { label: 'E&EO · eaeo.ca', href: '/work/eaeo/' },
		page: {
			slug: 'custom-software',
			h1: 'Custom software development for businesses that run on it.',
			seoTitle: 'Custom software development in BC, Canada · Roga Digital',
			seoDescription:
				'Custom web applications and business software, designed, built, deployed, and maintained by one accountable developer. Roga Digital works from Vancouver Island with clients across Canada.',
			intro: [
				'Off-the-shelf software is the right answer until it forces your business to work the way the vendor imagined. When the workarounds cost more than the licence saves, a system built for your operation pays for itself.',
				'I take a project from the first conversation to production and stay with it afterwards. You deal with the person who designed the data model and wrote the code, not an account manager relaying messages.',
			],
			work: ['telus-techcentral', 'eaeo', 'roga-dispatch'],
		},
	},
	{
		id: 'ai',
		title: 'AI integration & consulting',
		summary: 'LLM features, retrieval, and agents, with a clear read on where AI helps.',
		lead: "LLM features, retrieval, agents, and evaluation. I help you work out what AI changes for your product, where it's worth building, and where it isn't. No vendor lock-in by default, and no AI features for the sake of having AI features.",
		deliverables: [
			"A written assessment of where LLMs help and where they're a distraction.",
			'Prototype features (retrieval, structured output, classification, agents) you can put in front of users.',
			'An evaluation pipeline, so you know if quality regresses with the next model swap.',
			'A provider strategy: when to pin to a vendor and when to stay portable.',
		],
		whenYouReachFor: [
			"Your team wants to ship AI features but isn't sure which ones.",
			"You've shipped an LLM feature and don't trust the output.",
			'Your board is asking about AI strategy and you want a grounded answer.',
		],
		stack: ['OpenAI · Anthropic', 'Vercel AI SDK', 'RAG', 'Eval', 'Agents'],
		example: { label: 'TC Tools', href: '/work/telus-tc-tools/' },
		page: {
			slug: 'ai-integration',
			h1: 'AI features that do real work inside your software.',
			seoTitle: 'AI integration & consulting for business software · Roga Digital',
			seoDescription:
				'Practical AI integration for businesses: LLM features, retrieval, agents, and evaluation built into the tools your team already uses. Consulting and development from Roga Digital in BC, Canada.',
			intro: [
				'The useful AI work in most businesses is unglamorous: drafting, classifying, checking, and summarizing inside a workflow people already follow. It works when it sits in the tool your team uses and when someone has measured that the output is good enough.',
				'I build those features and the evaluation that keeps them reliable. If the answer for your case is that AI will not help yet, I will tell you that before you spend the budget.',
			],
			work: ['telus-tc-tools', 'telus-summit'],
		},
	},
	{
		id: 'integrations',
		title: 'Integrations & workflow automation',
		summary: 'APIs, data pipelines, and scheduled jobs that keep your systems in sync.',
		lead: 'Third-party APIs, ETL pipelines, webhooks, scheduled jobs, and queues. The plumbing between systems that keeps a business running. Less visible than a new product, and often higher leverage.',
		deliverables: [
			'Reliable integrations that handle retries, idempotency, and rate limits.',
			'Background workers and scheduled jobs with monitoring.',
			'A written map of every integration: what it does and what breaks if it stops.',
			'Alerting that pages the right person, not the whole team.',
		],
		whenYouReachFor: [
			'Someone copies data between two systems by hand every day.',
			'A vendor migration is coming and you need a clean handoff.',
			'A scheduled job has been "mostly working" for years and finally broke.',
		],
		stack: ['REST · Webhooks', 'Stripe · QuickBooks', 'ETL', 'Background jobs', 'Cron'],
		example: { label: 'E&EO · eaeo.ca', href: '/work/eaeo/' },
		page: {
			slug: 'workflow-automation',
			h1: 'Integrations and workflow automation that replace the copy and paste.',
			seoTitle: 'Systems integration & workflow automation · Roga Digital',
			seoDescription:
				'API integrations, data pipelines, and workflow automation that connect the systems your business already runs on. Built and monitored by Roga Digital in BC, Canada.',
			intro: [
				'Every business ends up with systems that should talk to each other and do not. The gap gets filled by a person re-keying data, an export someone remembers to run, or a script nobody has looked at in years.',
				'I connect those systems properly: integrations that retry safely, report their own failures, and come with a written map of what depends on what.',
			],
			work: ['eaeo', 'telus-techcentral'],
		},
	},
	{
		id: 'forward-deployed',
		title: 'Embedded discovery & build',
		summary: 'I work inside the team that has the problem, then build the fix with them.',
		lead: "I embed with the team that lives the problem, learn the work by being in it, and design the fix alongside the people who'll use it. Then I build it, front to back. Discovery happens inside your real operation instead of in a spec written at a distance, which is why what ships fits how the work gets done.",
		deliverables: [
			'Real time with the people who do the work, on the floor and not only on a kickoff call.',
			'A solution designed with your stakeholders in their own workflow.',
			'The whole build from one person, from first conversation to production and beyond.',
			'Working software in front of real users early, then refined against how the job is done.',
		],
		whenYouReachFor: [
			'The problem lives inside a specific team or department and nobody has fully written it down.',
			"Past projects missed because whoever wrote the spec wasn't in the room where the work happens.",
			'You want the person who understands the operation to be the one who ships the software.',
		],
		stack: ['Embedded discovery', 'Co-design', 'End-to-end build'],
		example: { label: 'CarEvo · Logistics', href: '/work/carevo-logistics/' },
	},
	{
		id: 'product',
		title: 'Product strategy & scoping',
		summary: 'Discovery, scope, and roadmaps: deciding what to build and what to leave out.',
		lead: 'Most software fails before the first commit. Discovery, scope shaping, and roadmapping is where we work out what to build and, more importantly, what to leave out. I come in early, ask the uncomfortable questions, and write the brief we both work from.',
		deliverables: [
			'A written discovery summary you can share with stakeholders.',
			'Prioritized scope: what ships first, what waits, what gets dropped.',
			'A quarterly roadmap when the engagement runs longer than a quarter.',
			'Light-touch user research where it changes a decision.',
		],
		whenYouReachFor: [
			'You have a vague but real problem and no spec.',
			'Stakeholders disagree on scope and you need a written read.',
			"A previous build didn't land and you're choosing what to do differently.",
		],
		stack: ['Discovery', 'Scoping', 'Roadmaps', 'User research'],
		example: { label: 'TechCentral · TELUS', href: '/work/telus-techcentral/' },
	},
	{
		id: 'architecture',
		title: 'Systems architecture',
		summary: 'Data models, API contracts, and access control that hold up for years.',
		lead: 'Database design, API contracts, service boundaries, identity, role-based access control, and audit logging. The decisions made in the first two weeks of a project are the ones you live with for years, so they should be made deliberately.',
		deliverables: [
			'An architecture diagram and a written rationale for each non-obvious choice.',
			'A data model with explicit role and permission semantics.',
			'API contracts (OpenAPI, GraphQL schema, or typed RPC).',
			'An audit-log strategy and threat model when the data is sensitive.',
		],
		whenYouReachFor: [
			'You have a multi-tenant or multi-role product where access matters.',
			"You're replacing a legacy system that grew organically.",
			"You want a pre-launch check on someone else's design.",
		],
		stack: ['Postgres', 'REST · GraphQL', 'RBAC', 'Audit logs', 'Multi-tenant'],
		example: { label: 'TechCentral · TELUS', href: '/work/telus-techcentral/' },
	},
	{
		id: 'maintenance',
		title: 'Maintenance & ongoing partnership',
		summary: 'Long-term support, audits, and gradual rebuilds of software you already own.',
		lead: 'Long-term support of software you already own, whether I built it or someone else did. Audits, gradual rebuilds, and on-call for the things that matter. Many engagements start as a project and become this.',
		deliverables: [
			'A codebase audit with prioritized findings: security, performance, fragility, and debt.',
			'A monthly retainer covering bug fixes, small features, and operational support.',
			'Gradual modernization through incremental rewrites, never a "big rewrite".',
			"On-call coverage that matches your team's real needs.",
		],
		whenYouReachFor: [
			'Software you depend on has outlasted the developer who wrote it.',
			'The original team has moved on and the docs went with them.',
			"You want senior coverage but don't need a full-time hire.",
		],
		stack: ['Audits', 'Rebuilds', 'On-call', 'Documentation', 'Monitoring'],
	},
	{
		id: 'advisory',
		title: 'Technical advisory',
		summary: 'Architecture reviews, code reviews, and second opinions before a big decision.',
		lead: "Architecture reviews, code review, hiring decisions, vendor evaluations, and second opinions. A senior pair of eyes when the stakes are high and you don't need a full engagement. You need a read.",
		deliverables: [
			'A written architecture review with specific, prioritized recommendations.',
			'A code review of a feature, a refactor, or a whole repo.',
			'Hiring support: technical interviews for senior developers or technical leads.',
			'Vendor evaluations: "should we buy X or build it ourselves?"',
		],
		whenYouReachFor: [
			"You're about to commit to a big architectural decision and want a second opinion.",
			"You're hiring a senior developer and want a technical interviewer.",
			'A vendor pitch sounds too good and you want it stress-tested.',
		],
		stack: ['Code review', 'Architecture review', 'Hiring', 'Vendor evaluation'],
	},
];

/** Services that have a dedicated /services/<slug>/ page. */
export const SERVICE_PAGES = SERVICES.filter(
	(s): s is Service & { page: ServicePage } => s.page !== undefined,
);

/** Where a service's link should point: its own page when it has one, else its anchor on /services. */
export function serviceHref(service: Service): string {
	return service.page ? `/services/${service.page.slug}/` : `/services/#${service.id}`;
}

export const ENGAGEMENT_FORMATS = [
	{
		name: 'Project',
		body: 'A scoped engagement with a fixed outcome: discovery, build, handoff. Two weeks to several months. Best when the problem has clear edges.',
	},
	{
		name: 'Fractional',
		body: 'A recurring monthly retainer, typically one to three days per week. Best when the work is ongoing, evolving, or partly uncertain. Many project clients move here after launch.',
	},
	{
		name: 'Advisory',
		body: 'Short, focused engagements with no code: architecture reviews, hiring support, vendor evaluations, code reviews. Best when you need a read, not a build.',
	},
] as const;
