import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  url: text('url').notNull(),
  category: varchar('category', { length: 40 }).notNull(),
  buildWith: jsonb('build_with').$type<string[]>().notNull().default([]),
  isOpenSource: boolean('is_open_source').notNull().default(false),
  githubUrl: text('github_url'),
  description: text('description').notNull(),
  logoUrl: text('logo_url'),
  launched: boolean('launched').notNull().default(false),
  avgRating: integer('avg_rating').notNull().default(0),
  ratingCount: integer('rating_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const projectImages = pgTable('project_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  width: integer('width'),
  height: integer('height'),
  position: integer('position').notNull().default(0),
});

export const launchFeedback = pgTable('launch_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull().default(0),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});