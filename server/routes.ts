import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUncachableGitHubClient } from "./github";
import { insertGroupSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";

const revealSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").transform(s => s.trim()),
});

const batchParticipantsSchema = z.object({
  names: z.array(z.string().min(1)).min(1, "최소 1명 이상의 이름을 입력해주세요"),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/groups", async (_req, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const parsed = insertGroupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "잘못된 입력" });
      }
      const group = await storage.createGroup({ name: parsed.data.name.trim() });
      res.json(group);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/groups/:id/participants", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) return res.status(400).json({ message: "잘못된 그룹 ID" });

      const participants = await storage.getParticipants(groupId);
      res.json(participants);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups/:id/participants", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) return res.status(400).json({ message: "잘못된 그룹 ID" });

      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: "그룹을 찾을 수 없습니다" });
      if (group.isMatched) return res.status(400).json({ message: "이미 매칭이 완료된 그룹입니다" });

      const parsed = insertParticipantSchema.safeParse({ name: req.body.name, groupId });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "이름을 입력해주세요" });
      }

      const trimmedName = parsed.data.name.trim();
      const existing = await storage.getParticipantByName(groupId, trimmedName);
      if (existing) return res.status(400).json({ message: "이미 등록된 이름입니다" });

      const participant = await storage.createParticipant({ name: trimmedName, groupId });
      res.json(participant);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups/:id/participants/batch", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) return res.status(400).json({ message: "잘못된 그룹 ID" });

      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: "그룹을 찾을 수 없습니다" });
      if (group.isMatched) return res.status(400).json({ message: "이미 매칭이 완료된 그룹입니다" });

      const parsed = batchParticipantsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "잘못된 입력" });
      }

      const results = [];
      const errors = [];
      for (const rawName of parsed.data.names) {
        const name = rawName.trim();
        if (!name) continue;
        const existing = await storage.getParticipantByName(groupId, name);
        if (existing) {
          errors.push(`'${name}' 은(는) 이미 등록되어 있습니다`);
          continue;
        }
        const p = await storage.createParticipant({ name, groupId });
        results.push(p);
      }

      res.json({ created: results, errors });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/groups/:groupId/participants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "잘못된 참가자 ID" });

      await storage.deleteParticipant(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups/:id/match", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) return res.status(400).json({ message: "잘못된 그룹 ID" });

      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: "그룹을 찾을 수 없습니다" });
      if (group.isMatched) return res.status(400).json({ message: "이미 매칭이 완료된 그룹입니다" });

      const participants = await storage.getParticipants(groupId);
      if (participants.length < 2) {
        return res.status(400).json({ message: "최소 2명 이상의 참가자가 필요합니다" });
      }

      const shuffled = [...participants].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffled.length; i++) {
        const nextIndex = (i + 1) % shuffled.length;
        await storage.updateParticipantAssignment(shuffled[i].id, shuffled[nextIndex].id);
      }

      await storage.updateGroupMatched(groupId, true);

      res.json({ success: true, message: "매칭이 완료되었습니다" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/groups/:id/reveal", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) return res.status(400).json({ message: "잘못된 그룹 ID" });

      const group = await storage.getGroup(groupId);
      if (!group) return res.status(404).json({ message: "그룹을 찾을 수 없습니다" });
      if (!group.isMatched) return res.status(400).json({ message: "아직 매칭이 진행되지 않았습니다" });

      const parsed = revealSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message || "이름을 입력해주세요" });
      }

      const participant = await storage.getParticipantByName(groupId, parsed.data.name);
      if (!participant) {
        return res.status(404).json({ message: "등록되지 않은 이름입니다" });
      }

      if (!participant.assignedTo) {
        return res.status(400).json({ message: "매칭 정보를 찾을 수 없습니다" });
      }

      const allParticipants = await storage.getParticipants(groupId);
      const assigned = allParticipants.find((p) => p.id === participant.assignedTo);

      if (!assigned) {
        return res.status(500).json({ message: "매칭 대상을 찾을 수 없습니다" });
      }

      res.json({ manitto: assigned.name });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/github/create-repo", async (req, res) => {
    try {
      const { repoName, description } = req.body;
      const octokit = await getUncachableGitHubClient();

      const { data: user } = await octokit.users.getAuthenticated();

      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: repoName || "manitto-app",
        description: description || "Manitto (Secret Santa) matching application",
        private: false,
        auto_init: true,
      });

      res.json({
        success: true,
        url: repo.html_url,
        fullName: repo.full_name,
        owner: user.login,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
