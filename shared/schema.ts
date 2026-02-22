import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const groups = pgTable("groups", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  isMatched: boolean("is_matched").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const participants = pgTable("participants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  groupId: integer("group_id").notNull(),
  assignedTo: integer("assigned_to"),
});

export const groupsRelations = relations(groups, ({ many }) => ({
  participants: many(participants),
}));

export const participantsRelations = relations(participants, ({ one }) => ({
  group: one(groups, {
    fields: [participants.groupId],
    references: [groups.id],
  }),
  assignedParticipant: one(participants, {
    fields: [participants.assignedTo],
    references: [participants.id],
  }),
}));

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  name: true,
  groupId: true,
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Participant = typeof participants.$inferSelect;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
