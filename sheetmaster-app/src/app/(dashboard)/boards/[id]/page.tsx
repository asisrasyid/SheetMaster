"use client";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useBoard } from "@/hooks/useBoard";
import { useBoardStore } from "@/store/boardStore";
import { getStoredUser } from "@/lib/auth";

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

export default function BoardPage({ params }: BoardPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: boardData, isLoading, isError } = useBoard(id);
  const setBoardData = useBoardStore((s) => s.setBoardData);
  const storedBoardData = useBoardStore((s) => s.boardData);
  const user = getStoredUser();

  useEffect(() => {
    if (boardData) setBoardData(boardData);
  }, [boardData, setBoardData]);

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Failed to load board. You may not have access.</p>
        <Button variant="outline" onClick={() => router.push("/boards")}>
          Go back
        </Button>
      </div>
    );
  }

  const displayData = (storedBoardData?.board?.id === id ? storedBoardData : boardData) as typeof boardData;

  return (
    <>
      <Topbar
        title={displayData?.board?.name ?? "Loading…"}
        actions={
          <>
            {displayData?.board?.myRole === "owner" && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/boards/${id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="flex-1 overflow-hidden">
        {isLoading && !displayData ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayData ? (
          <KanbanBoard
            boardData={displayData}
            myRole={displayData!.board.myRole}
          />
        ) : null}
      </div>
    </>
  );
}
