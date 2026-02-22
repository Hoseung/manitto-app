import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Gift, LogIn, Eye, EyeOff, Settings } from "lucide-react";
import type { Group } from "@shared/schema";
import { useLocation } from "wouter";

export default function LoginPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [name, setName] = useState("");
  const [manitto, setManitto] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
  });

  const matchedGroups = groups.filter((g) => g.isMatched);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/groups/${selectedGroupId}/reveal`, {
        name: name.trim(),
      });
      return res.json();
    },
    onSuccess: (data: { manitto: string }) => {
      setManitto(data.manitto);
      setRevealed(false);
    },
    onError: (err: Error) => {
      toast({
        title: "확인 실패",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !name.trim()) return;
    loginMutation.mutate();
  };

  const handleReset = () => {
    setManitto(null);
    setName("");
    setRevealed(false);
    setSelectedGroupId("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-5">
            <Gift className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-page-title">
            마니또
          </h1>
          <p className="text-muted-foreground mt-2">
            내 마니또가 누구인지 확인해보세요
          </p>
        </div>

        {manitto ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2" data-testid="text-greeting">
                  {name}님의 마니또
                </h2>

                <div className="relative my-6">
                  <div
                    className={`py-6 px-4 rounded-md bg-muted/60 transition-all duration-300 ${
                      !revealed ? "blur-lg select-none" : ""
                    }`}
                    data-testid="text-manitto-name"
                  >
                    <p className="text-3xl font-bold text-primary">
                      {manitto}
                    </p>
                  </div>
                  {!revealed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        onClick={() => setRevealed(true)}
                        variant="outline"
                        className="gap-2"
                        data-testid="button-reveal"
                      >
                        <Eye className="w-4 h-4" />
                        터치하여 확인
                      </Button>
                    </div>
                  )}
                </div>

                {revealed && (
                  <p className="text-sm text-muted-foreground mb-4">
                    이 사람에게 몰래 선물을 준비해주세요!
                  </p>
                )}

                <div className="flex gap-2">
                  {revealed && (
                    <Button
                      variant="secondary"
                      className="flex-1 gap-2"
                      onClick={() => setRevealed(false)}
                      data-testid="button-hide"
                    >
                      <EyeOff className="w-4 h-4" />
                      숨기기
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleReset}
                    data-testid="button-back"
                  >
                    돌아가기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                마니또 확인
              </CardTitle>
              <CardDescription>
                그룹을 선택하고 이름을 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">그룹 선택</label>
                  {isLoading ? (
                    <div className="h-9 rounded-md bg-muted animate-pulse" />
                  ) : matchedGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">
                      아직 매칭된 그룹이 없습니다. 관리자에게 문의하세요.
                    </p>
                  ) : (
                    <Select
                      value={selectedGroupId}
                      onValueChange={setSelectedGroupId}
                    >
                      <SelectTrigger data-testid="select-group">
                        <SelectValue placeholder="그룹을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {matchedGroups.map((g) => (
                          <SelectItem key={g.id} value={String(g.id)}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">이름</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="등록된 이름을 입력하세요"
                    data-testid="input-login-name"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={!selectedGroupId || !name.trim() || loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "확인 중..." : "내 마니또 확인하기"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-2"
            onClick={() => navigate("/admin")}
            data-testid="link-admin"
          >
            <Settings className="w-4 h-4" />
            관리자 페이지
          </Button>
        </div>
      </div>
    </div>
  );
}
