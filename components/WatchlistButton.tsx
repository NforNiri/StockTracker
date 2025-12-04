"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { toggleWatchlist } from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WatchlistButtonProps {
  symbol: string;
  company: string;
  initialIsInWatchlist: boolean;
  className?: string;
}

export default function WatchlistButton({
  symbol,
  company,
  initialIsInWatchlist,
  className,
}: WatchlistButtonProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(initialIsInWatchlist);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const result = await toggleWatchlist(symbol, company);
      setIsInWatchlist(result.added);
      toast.success(
        result.added
          ? `${symbol} added to watchlist`
          : `${symbol} removed from watchlist`
      );
    } catch {
      toast.error("Failed to update watchlist");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={isLoading}
      variant="outline"
      className={cn(
        "w-full gap-2 font-semibold",
        isInWatchlist
          ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/50"
          : "hover:text-yellow-500",
        className
      )}
    >
      <Star
        className={cn("h-4 w-4", isInWatchlist && "fill-yellow-500 text-yellow-500")}
      />
      {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
    </Button>
  );
}

