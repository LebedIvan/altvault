"use client";

import { useMemo } from "react";
import type { LegoSetRecord } from "@/lib/legoSetRecord";
import { PriceHistoryChart } from "@/components/asset/PriceHistoryChart";
import type { Asset } from "@/types/asset";

interface Props {
  set: LegoSetRecord;
  gbpToUsd: number;
}

export function LegoSetPriceChart({ set, gbpToUsd }: Props) {
  // Build a fake Asset so PriceHistoryChart can use its Brownian-bridge algorithm.
  // Anchors: MSRP at launch → current market price.
  // No noisy eBay per-sale points — those live in the EbaySoldPanel below.
  const fakeAsset = useMemo((): Asset => {
    const marketUsdCents = set.marketPriceGbp
      ? Math.round(set.marketPriceGbp * gbpToUsd * 100)
      : null;
    const msrpCents = set.msrpUsd
      ? Math.round(set.msrpUsd * 100)
      : (marketUsdCents ?? 10_000);
    const currentPriceCents = marketUsdCents ?? msrpCents;

    // Stable ID → deterministic Brownian bridge (same curve on every render)
    const stableId = `lego-${set.setNumber}-0000-0000-0000-000000000000`;
    const launchDate = set.launchDate ?? "2021-01-01";

    return {
      id:                stableId,
      name:              `${set.setNumber} — ${set.name}`,
      assetClass:        "lego",
      currency:          "USD",
      currentPriceCents,
      priceSnapshots:    [],   // no noisy eBay anchors — keep the bridge smooth
      liquidityDays:     30,
      riskScore:         40,
      platformFeeRate:   0.1,
      holdingCostCents:  0,
      tags:              [],
      createdAt:         new Date(launchDate),
      updatedAt:         new Date(),
      transactions: [
        {
          id:                `lego-tx-${set.setNumber}-000000000000`,
          assetId:           stableId,
          type:              "buy",
          pricePerUnitCents: msrpCents,
          quantity:          1,
          currency:          "USD",
          feeCents:          0,
          otherCostsCents:   0,
          date:              new Date(launchDate + "T00:00:00Z"),
          platform:          "LEGO Store",
        },
      ],
    };
  }, [set, gbpToUsd]);

  return <PriceHistoryChart asset={fakeAsset} />;
}
