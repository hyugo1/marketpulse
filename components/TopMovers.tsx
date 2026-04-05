'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import WatchlistButton from "@/components/WatchlistButton";
import { getTopMovers, type TopMover } from "@/lib/actions/finnhub.actions";
import { getCurrentUserWatchlist } from "@/lib/actions/watchlist.actions";

function formatPercent(value: number) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
    return `$${value.toFixed(2)}`;
}

function MoverRow({
    stock,
    isInWatchlist,
    onWatchlistChange,
}: {
    stock: TopMover;
    isInWatchlist: boolean;
    onWatchlistChange: (symbol: string, isAdded: boolean) => void;
}) {
    const isPositive = stock.changePercent >= 0;

    return (
        <li className="flex items-center justify-between rounded-lg border border-border/50 bg-card/60 p-3">
            <Link href={`/stocks/${stock.symbol}`} className="flex min-w-0 flex-1 items-center justify-between pr-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{stock.symbol}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(stock.price)}</p>
                </div>
                <p className={`text-sm font-semibold ${isPositive ? "text-growth-emerald" : "text-alert-red"}`}>
                    {formatPercent(stock.changePercent)}
                </p>
            </Link>

            <WatchlistButton
                symbol={stock.symbol}
                company={stock.symbol}
                isInWatchlist={isInWatchlist}
                type="icon"
                disableRefresh={true}
                onWatchlistChange={onWatchlistChange}
            />
        </li>
    );
}

export default function TopMovers() {
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [gainers, setGainers] = useState<TopMover[]>([]);
    const [losers, setLosers] = useState<TopMover[]>([]);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async (showSkeleton = false) => {
        try {
            if (showSkeleton) setIsLoading(true);
            setIsRefreshing(!showSkeleton);
            setError(null);

            const [movers, symbols] = await Promise.all([
                getTopMovers(),
                getCurrentUserWatchlist(),
            ]);

            setGainers(movers.gainers || []);
            setLosers(movers.losers || []);
            setUpdatedAt(movers.updatedAt || Date.now());
            setWatchlistSymbols(symbols || []);
        } catch (e) {
            console.error("Error loading top movers:", e);
            setError("Failed to load top movers.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData(true);
    }, []);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            loadData(false);
        }, 300_000);

        const handleWindowFocus = () => {
            loadData(false);
        };

        window.addEventListener("focus", handleWindowFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleWindowFocus);
        };
    }, []);

    const onWatchlistChange = (symbol: string, isAdded: boolean) => {
        setWatchlistSymbols((prev) => {
            if (isAdded) {
                return prev.includes(symbol) ? prev : [...prev, symbol];
            }
            return prev.filter((s) => s !== symbol);
        });
    };

    const watchlistSet = useMemo(() => new Set(watchlistSymbols), [watchlistSymbols]);

    const topWatchlistMovers = useMemo(() => {
        const combined = [...gainers, ...losers];
        return combined.filter((stock) => watchlistSet.has(stock.symbol)).slice(0, 5);
    }, [gainers, losers, watchlistSet]);

    const LoadingRows = () => (
        <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
                <li
                    key={`loading-row-${idx}`}
                    className="h-15.5 animate-pulse rounded-lg border border-border/40 bg-background/40"
                />
            ))}
        </ul>
    );

    if (isLoading) {
        return (
            <section className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs text-muted-foreground">Top movers are loading...</p>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="rounded-xl border border-border/50 bg-card p-5 xl:col-span-1">
                        <h2 className="mb-3 text-base font-semibold text-foreground">Your Watchlist Movers</h2>
                        <LoadingRows />
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card p-5 xl:col-span-1">
                        <h2 className="mb-3 text-base font-semibold text-foreground">Top Gainers</h2>
                        <LoadingRows />
                    </div>

                    <div className="rounded-xl border border-border/50 bg-card p-5 xl:col-span-1">
                        <h2 className="mb-3 text-base font-semibold text-foreground">Top Losers</h2>
                        <LoadingRows />
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-alert-red/30 bg-alert-red/10 p-6">
                <p className="text-sm text-alert-red">{error}</p>
                <button
                    type="button"
                    onClick={() => loadData(true)}
                    className="mt-3 rounded-md border border-border/60 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
                >
                    Retry
                </button>
            </div>
        );
    }

    const updatedAtLabel = updatedAt
        ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "--:--:--";

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
                <p className="text-xs text-muted-foreground">
                    Last updated: <span className="text-foreground">{updatedAtLabel}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                    {isRefreshing ? "Updating movers..." : "Auto-refresh every 5m"}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {topWatchlistMovers.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-5 xl:col-span-1">
                    <h2 className="mb-3 text-base font-semibold text-foreground">Your Watchlist Movers</h2>
                    <ul className="space-y-2">
                        {topWatchlistMovers.map((stock) => (
                            <MoverRow
                                key={`watchlist-${stock.symbol}`}
                                stock={stock}
                                isInWatchlist={watchlistSet.has(stock.symbol)}
                                onWatchlistChange={onWatchlistChange}
                            />
                        ))}
                    </ul>
                </div>
            )}

            <div className="rounded-xl border border-border/50 bg-card p-5 xl:col-span-1">
                <h2 className="mb-3 text-base font-semibold text-foreground">Top Gainers</h2>
                <ul className="space-y-2">
                    {gainers.length === 0 ? (
                        <li className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                            No top gainers found.
                        </li>
                    ) : (
                        gainers.map((stock) => (
                            <MoverRow
                                key={`gainer-${stock.symbol}`}
                                stock={stock}
                                isInWatchlist={watchlistSet.has(stock.symbol)}
                                onWatchlistChange={onWatchlistChange}
                            />
                        ))
                    )}
                </ul>
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-5 xl:col-span-1">
                <h2 className="mb-3 text-base font-semibold text-foreground">Top Losers</h2>
                <ul className="space-y-2">
                    {losers.length === 0 ? (
                        <li className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                            No top losers found.
                        </li>
                    ) : (
                        losers.map((stock) => (
                            <MoverRow
                                key={`loser-${stock.symbol}`}
                                stock={stock}
                                isInWatchlist={watchlistSet.has(stock.symbol)}
                                onWatchlistChange={onWatchlistChange}
                            />
                        ))
                    )}
                </ul>
            </div>
            </div>
        </section>
    );
}