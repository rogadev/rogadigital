import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const insights = defineCollection({
	loader: glob({ base: './src/content/insights', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			tags: z.array(z.string()).default([]),
			readingTime: z.string().optional(),
			draft: z.boolean().default(false),
		}),
});

const work = defineCollection({
	loader: glob({ base: './src/content/work', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			id: z.string(),
			/** Short system name: the title on cards, the /work table, and the case study. */
			name: z.string(),
			/** One fact that sizes the project. Must be stated in a case study body. */
			metric: z.object({ value: z.string(), label: z.string() }).optional(),
			client: z.string(),
			industry: z.string(),
			headline: z.string(),
			outcome: z.string(),
			tags: z.array(z.string()),
			period: z.string(),
			role: z.string(),
			status: z.enum(['live', 'in-development', 'archived', 'draft']),
			featured: z.boolean().default(false),
			order: z.number().default(99),
			heroImage: z.optional(image()),
			liveUrl: z.url().optional(),
			repoUrl: z.url().optional(),
			highlight: z.string().optional(),
		}),
});

export const collections = { insights, work };
