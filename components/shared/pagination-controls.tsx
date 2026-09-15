"use client";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  total: number;
  label?: string;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

export function PaginationControls({
  page,
  totalPages,
  total,
  label = "items",
  onPrev,
  onNext,
  className = "",
}: PaginationControlsProps) {
  if (total === 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="font-mono text-[11px] text-niko-muted">
        Page {page} of {totalPages} ({total} {label})
      </p>
      <div className="flex w-full gap-2 sm:w-auto">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrev}
          className="flex-1 cursor-pointer rounded-md border border-niko-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-niko-well/60 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="flex-1 cursor-pointer rounded-md border border-niko-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-niko-well/60 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export const TABLE_PAGE_SIZE = 10;
export const REVIEW_PAGE_SIZE = 8;
