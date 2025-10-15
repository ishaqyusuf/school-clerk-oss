"use client";

import { useClassroomParams } from "@/hooks/use-classroom-params";

import { Button } from "@school-clerk/ui/button";

export function EmptyState() {
  const { setParams } = useClassroomParams();

  return (
    <div className="flex items-center justify-center ">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No invoices</h2>
          <p className="text-sm text-[#606060]">
            You haven't created any invoices yet. <br />
            Go ahead and create your first one.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            setParams({
              // type: "create",
            })
          }
        >
          Create invoice
        </Button>
      </div>
    </div>
  );
}

export function NoResults() {
  const { setParams } = useClassroomParams();

  return (
    <div className="flex items-center justify-center ">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No results</h2>
          <p className="text-sm text-[#606060]">
            Try another search, or adjusting the filters
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setParams(null, { shallow: false })}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
}
