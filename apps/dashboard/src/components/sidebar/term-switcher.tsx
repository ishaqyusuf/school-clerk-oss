import { useQuery } from "@tanstack/react-query";
import { _trpc } from "../static-trpc";
import { Button } from "@school-clerk/ui/button";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";
import { useAsyncMemo } from "use-async-memo";
import {
  getAuthCookie,
  switchSessionTerm,
} from "@/actions/cookies/auth-cookie";
import { useSiteNav } from "@school-clerk/site-nav";

export function TermSwitcher() {
  const { data: dashboardData } = useQuery(
    _trpc.academics.dashboard.queryOptions({}),
  );
  const profile = useAsyncMemo(async () => {
    return await getAuthCookie();
  }, []);
  const currentTerm = dashboardData?.sessions
    ?.flatMap((s) => s.terms.map((t) => ({ ...t, sessionName: s.name })))
    .find((t) => t.id === profile?.termId);
  const sb = useSiteNav();
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" className="whitespace-nowrap my-4 p-0 px-1">
          {sb?.isExpanded
            ? `${currentTerm ? currentTerm.sessionName + " - " + currentTerm.title : "Select Term"}`
            : currentTerm
              ? currentTerm.title
              : "Select Term"}
          {/* {`${currentTerm ? currentTerm.sessionName + " - " + currentTerm.title : "Select Term"}`} */}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content className="w-56">
        {dashboardData?.sessions?.map((session) => (
          <DropdownMenu.Group>
            <DropdownMenu.Label>{session.name}</DropdownMenu.Label>
            {session.terms?.map((term) => (
              <DropdownMenu.Item
                key={term.id}
                onSelect={() => {
                  switchSessionTerm({
                    termId: term.id,
                    sessionId: session.id,
                    termTitle: term.title,
                    sessionTitle: session.name,
                  }).then(() => {
                    window.location.reload();
                  });
                }}
              >
                {term.title}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
