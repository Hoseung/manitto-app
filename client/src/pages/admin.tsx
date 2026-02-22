import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Shuffle, Gift, ArrowRight, Sparkles } from "lucide-react";
import type { Group, Participant } from "@shared/schema";
import { useLocation } from "wouter";

export default function AdminPage() {
  const [groupName, setGroupName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["/api/groups", selectedGroupId, "participants"],
    enabled: !!selectedGroupId,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/groups", { name });
      return res.json();
    },
    onSuccess: (group: Group) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      setSelectedGroupId(group.id);
      setGroupName("");
      toast({ title: "그룹이 생성되었습니다!" });
    },
    onError: (err: Error) => {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", `/api/groups/${selectedGroupId}/participants`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroupId, "participants"] });
      setNameInput("");
      toast({ title: "참가자가 추가되었습니다!" });
    },
    onError: (err: Error) => {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    },
  });

  const batchAddMutation = useMutation({
    mutationFn: async (names: string[]) => {
      const res = await apiRequest("POST", `/api/groups/${selectedGroupId}/participants/batch`, { names });
      return res.json();
    },
    onSuccess: (data: { created: any[]; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroupId, "participants"] });
      setNameInput("");
      if (data.errors.length > 0) {
        toast({ title: `${data.created.length}명 추가 완료`, description: data.errors.join(", "), variant: "destructive" });
      } else {
        toast({ title: `${data.created.length}명이 추가되었습니다!` });
      }
    },
    onError: (err: Error) => {
      toast({ title: "오류", description: err.message, variant: "destructive" });
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      await apiRequest("DELETE", `/api/groups/${selectedGroupId}/participants/${participantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroupId, "participants"] });
      toast({ title: "참가자가 삭제되었습니다." });
    },
  });

  const matchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/groups/${selectedGroupId}/match`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", selectedGroupId, "participants"] });
      toast({ title: "매칭이 완료되었습니다!", description: "참가자들에게 로그인하여 확인하라고 알려주세요." });
    },
    onError: (err: Error) => {
      toast({ title: "매칭 오류", description: err.message, variant: "destructive" });
    },
  });

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const handleSubmitNames = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !selectedGroupId) return;

    if (trimmed.includes(",")) {
      const names = trimmed.split(",").map(n => n.trim()).filter(Boolean);
      if (names.length > 0) {
        batchAddMutation.mutate(names);
      }
    } else {
      addParticipantMutation.mutate(trimmed);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-page-title">
            마니또 관리
          </h1>
          <p className="text-muted-foreground mt-2 text-base sm:text-lg">
            그룹을 만들고 참가자를 등록하여 마니또를 매칭하세요
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/")}
            data-testid="link-login"
          >
            참가자 로그인 페이지로 이동
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="w-5 h-5" />
                  새 그룹 만들기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (groupName.trim()) createGroupMutation.mutate(groupName.trim());
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="그룹 이름 (예: 우리팀 마니또)"
                    data-testid="input-group-name"
                  />
                  <Button type="submit" disabled={!groupName.trim() || createGroupMutation.isPending} data-testid="button-create-group">
                    생성
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  그룹 목록
                </CardTitle>
                <CardDescription>
                  그룹을 선택하여 참가자를 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>아직 그룹이 없습니다</p>
                    <p className="text-sm">위에서 새 그룹을 만들어보세요</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        className={`w-full text-left p-3 rounded-md border transition-colors ${
                          selectedGroupId === group.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover-elevate"
                        }`}
                        data-testid={`button-group-${group.id}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate">{group.name}</span>
                          <Badge variant={group.isMatched ? "default" : "secondary"}>
                            {group.isMatched ? "매칭 완료" : "대기 중"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {selectedGroup ? (
              <>
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="w-5 h-5" />
                      {selectedGroup.name} - 참가자
                    </CardTitle>
                    <CardDescription>
                      쉼표(,)로 구분하여 여러 명을 한번에 추가할 수 있습니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedGroup.isMatched && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSubmitNames();
                        }}
                        className="flex gap-2 mb-4"
                      >
                        <Input
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="이름 (예: 홍길동, 김철수, 이영희)"
                          data-testid="input-participant-name"
                        />
                        <Button
                          type="submit"
                          disabled={!nameInput.trim() || addParticipantMutation.isPending}
                          data-testid="button-add-participant"
                        >
                          추가
                        </Button>
                      </form>
                    )}

                    {participants.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>아직 참가자가 없습니다</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {participants.map((p, idx) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                            data-testid={`participant-${p.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                                {idx + 1}
                              </div>
                              <span className="font-medium">{p.name}</span>
                            </div>
                            {!selectedGroup.isMatched && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeParticipantMutation.mutate(p.id)}
                                disabled={removeParticipantMutation.isPending}
                                data-testid={`button-remove-${p.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!selectedGroup.isMatched && participants.length >= 2 && (
                  <Card className="border-primary/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Shuffle className="w-8 h-8 mx-auto mb-3 text-primary" />
                        <h3 className="font-semibold text-lg mb-1">마니또 매칭 시작</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          {participants.length}명의 참가자를 랜덤으로 매칭합니다
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                          <span>A</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>B</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>C</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>A (순환 매칭)</span>
                        </div>
                        <Button
                          onClick={() => matchMutation.mutate()}
                          disabled={matchMutation.isPending}
                          className="w-full"
                          data-testid="button-match"
                        >
                          {matchMutation.isPending ? "매칭 중..." : "매칭하기"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedGroup.isMatched && (
                  <Card className="border-green-500/30 dark:border-green-400/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                          <Gift className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">매칭이 완료되었습니다!</h3>
                        <p className="text-muted-foreground text-sm">
                          참가자들에게 로그인 페이지에서 자신의 마니또를 확인하라고 알려주세요
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-muted-foreground">
                    <ArrowRight className="w-10 h-10 mx-auto mb-3 opacity-30 rotate-180 md:rotate-0" />
                    <p>왼쪽에서 그룹을 선택하세요</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
