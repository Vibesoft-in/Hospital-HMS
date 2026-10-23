# TV Queue Sort by Time - Frontend Guide

## 1. Doctor Profile / Settings
Add toggle/dropdown in Doctor Edit/Create Form:
- **Field**: `queueSortBy` (`"token"` | `"time"`, default: `"token"`)
- Send in payload:
  - `POST /api/v3/hms/hospital-doctor/new` $\rightarrow$ `{ ..., "queueSortBy": "token" | "time" }`
  - `PUT /api/v3/hms/hospital-doctor/:doctorId` $\rightarrow$ `{ "queueSortBy": "token" | "time" }`

---

## 2. TV Screen (Only 1 Change Needed)

Initial queue from backend is **already sorted**.

When a **new visit arrives via SSE (`new-visit`)**, place it into the queue based on `queueSortBy`:

```javascript
// On SSE message / new visit:
const queueSortBy = data.queueSortBy || "token"; // "token" or "time"

function sortQueue(queue, queueSortBy) {
  return [...queue].sort((a, b) => {
    // 1. Emergency visits always on top
    if (a.visitType === 'Emergency' && b.visitType !== 'Emergency') return -1;
    if (a.visitType !== 'Emergency' && b.visitType === 'Emergency') return 1;

    // 2. Sort by Time if doctor has "time" mode enabled
    if (queueSortBy === "time") {
      if (a.visitTime && b.visitTime) {
        return a.visitTime.localeCompare(b.visitTime);
      }
      if (a.visitTime && !b.visitTime) return -1;
      if (!a.visitTime && b.visitTime) return 1;
    }

    // 3. Default: Sort by Token Number
    return a.tokenNumber - b.tokenNumber;
  });
}
```
