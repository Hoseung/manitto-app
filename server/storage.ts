import {
  type Group, type InsertGroup,
  type Participant, type InsertParticipant,
  type User, type InsertUser,
  groups, participants, users,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getGroups(): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroupMatched(id: number, isMatched: boolean): Promise<Group | undefined>;

  getParticipants(groupId: number): Promise<Participant[]>;
  getParticipantByName(groupId: number, name: string): Promise<Participant | undefined>;
  createParticipant(participant: InsertParticipant): Promise<Participant>;
  deleteParticipant(id: number): Promise<void>;
  updateParticipantAssignment(id: number, assignedTo: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getGroups(): Promise<Group[]> {
    return db.select().from(groups);
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [created] = await db.insert(groups).values(group).returning();
    return created;
  }

  async updateGroupMatched(id: number, isMatched: boolean): Promise<Group | undefined> {
    const [updated] = await db
      .update(groups)
      .set({ isMatched })
      .where(eq(groups.id, id))
      .returning();
    return updated || undefined;
  }

  async getParticipants(groupId: number): Promise<Participant[]> {
    return db.select().from(participants).where(eq(participants.groupId, groupId));
  }

  async getParticipantByName(groupId: number, name: string): Promise<Participant | undefined> {
    const all = await this.getParticipants(groupId);
    return all.find((p) => p.name === name);
  }

  async createParticipant(participant: InsertParticipant): Promise<Participant> {
    const [created] = await db.insert(participants).values(participant).returning();
    return created;
  }

  async deleteParticipant(id: number): Promise<void> {
    await db.delete(participants).where(eq(participants.id, id));
  }

  async updateParticipantAssignment(id: number, assignedTo: number): Promise<void> {
    await db.update(participants).set({ assignedTo }).where(eq(participants.id, id));
  }
}

export const storage = new DatabaseStorage();
