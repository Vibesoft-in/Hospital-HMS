"use client";

import { Suspense } from "react";
import TransactionsListComponent from "@/components/pages/finance-accounts/transactions";

export default function TransactionsListPage() {
  return (
    <div>
      <Suspense fallback={<div className="p-4 text-muted">Loading…</div>}>
        <TransactionsListComponent />
      </Suspense>
    </div>
  );
}
