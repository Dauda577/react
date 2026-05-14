import { memo } from "react";
import { useListings, isBoostActive, boostDaysLeft } from "@/context/ListingContext";
import { Link } from "react-router-dom";

const AccountAnalytics = memo(() => {
  const { listings, loading } = useListings();

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading...</p>;

  const total = listings.length;
  const active = listings.filter((l) => l.status === "active").length;
  const sold = listings.filter((l) => l.status === "sold").length;
  const boosted = listings.filter((l) => isBoostActive(l)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total listings", value: total },
          { label: "Active", value: active },
          { label: "Sold", value: sold },
          { label: "Boosted", value: boosted },
        ].map(({ label, value }) => (
          <div key={label} className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Your listings
        </p>
        <div className="rounded-xl border divide-y divide-border">
          {listings.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No listings yet.</p>
          ) : (
            listings.map((listing) => {
              const active = isBoostActive(listing);
              const daysLeft = active ? boostDaysLeft(listing) : 0;
              return (
                <Link
                  key={listing.id}
                  to={`/product/${listing.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  {listing.images?.[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.name}
                      className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{listing.name}</p>
                    <p className="text-xs text-muted-foreground">
                      GHS {listing.price} · {listing.category}
                    </p>
                  </div>
                  <StatusBadge
                    status={listing.status}
                    boosted={active}
                    daysLeft={daysLeft}
                  />
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});

function StatusBadge({
  status,
  boosted,
  daysLeft,
}: {
  status: string;
  boosted: boolean;
  daysLeft: number;
}) {
  if (boosted)
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 whitespace-nowrap">
        Boosted · {daysLeft}d
      </span>
    );
  if (status === "sold")
    return (
      <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
        Sold
      </span>
    );
  return (
    <span className="text-xs px-2 py-0.5 rounded-md bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
      Active
    </span>
  );
}

AccountAnalytics.displayName = "AccountAnalytics";
export default AccountAnalytics;