# Fix Status Enum - in-transit to in_transit

## Files That Need Updating

The following files still use `"in-transit"` (hyphen) instead of `"in_transit"` (underscore):

1. ✅ components/load-booking.tsx - FIXED
2. components/portal-home.tsx
3. types/planning.ts
4. components/vehicle-tracking.tsx
5. components/dispatch-planning/load-detail-dialog.tsx
6. components/dispatch-planning/load-card.tsx
7. components/client-portal.tsx
8. components/analytics-reports.tsx
9. app/api/ctrack/record-positions/route.ts
10. app/admin/page.tsx

## Quick Fix

Run this command in your terminal to fix all at once:

```bash
# On Windows (PowerShell)
Get-ChildItem -Path . -Include *.ts,*.tsx -Recurse | ForEach-Object {
    (Get-Content $_.FullName) -replace '"in-transit"', '"in_transit"' | Set-Content $_.FullName
}

# On Mac/Linux
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/"in-transit"/"in_transit"/g' {} +
```

OR manually find and replace in VS Code:
1. Press Ctrl+Shift+H (Find and Replace in Files)
2. Find: `"in-transit"`
3. Replace: `"in_transit"`
4. Files to include: `**/*.ts,**/*.tsx`
5. Click "Replace All"

## Why This Happened

The database enum was created as:
```sql
CREATE TYPE ceva_load_status AS ENUM ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled');
```

But the frontend code was using `'in-transit'` (hyphen) which doesn't match.

## After Fixing

The app should work correctly with:
- ✅ Status updates working
- ✅ Dashboard stats showing correctly
- ✅ Status filters working
- ✅ All status badges showing correctly
