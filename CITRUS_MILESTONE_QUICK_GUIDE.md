# Citrus Load Milestone Quick Reference

**For:** CEVA Operators (Mahesh)
**Purpose:** How to manually update load milestones

---

## 📍 The 6 Citrus Milestones

| # | Milestone Name | Description |
|---|---------------|-------------|
| 1 | **Loaded at Farm** | Truck loaded and departed Nottingham/Bitebridge |
| 2 | **Bitebridge (BBR Border)** | Load cleared BBR checkpoint |
| 3 | **Johannesburg** | Load passing through or staging in Joburg |
| 4 | **Harrismith** | Load passed through Harrismith on N3 |
| 5 | **Durban Arrival** | Load arrived in Durban metro area |
| 6 | **Delivered — Bayhead** | Load offloaded at K-Hold cold store |

---

## 🎨 Color Coding

- 🟡 **Yellow** = Pending (not yet reached)
- 🟢 **Green** = Completed (passed)
- 🔵 **Blue** = Delivered (final milestone)

---

## 💻 How to Update Milestones

### Method 1: Via Supabase Dashboard (Recommended for now)

1. Log into Supabase: https://supabase.com/dashboard
2. Go to Table Editor → `ceva_loads`
3. Find your load by `load_number`
4. Click to edit the row
5. Update the relevant date field:
   - `date_loaded` → Milestone 1
   - `date_arrived_border_sa` → Milestone 2
   - `date_johannesburg` → Milestone 3
   - `date_harrismith` → Milestone 4
   - `date_durban_arrival` → Milestone 5
   - `date_offloaded` → Milestone 6
6. Set to current date/time or specific timestamp
7. Save

### Method 2: Via SQL (Advanced)

Open Supabase SQL Editor and run:

```sql
-- Find your load first
SELECT id, load_number, client, status
FROM ceva_loads
WHERE load_number = 'L-1234'; -- Replace with your load number

-- Milestone 1: Loaded at Farm
UPDATE ceva_loads
SET
  date_loaded = NOW(),
  status = 'in_transit' -- Update status to in_transit
WHERE load_number = 'L-1234';

-- Milestone 2: Bitebridge Border
UPDATE ceva_loads
SET date_arrived_border_sa = NOW()
WHERE load_number = 'L-1234';

-- Milestone 3: Johannesburg
UPDATE ceva_loads
SET date_johannesburg = NOW()
WHERE load_number = 'L-1234';

-- Milestone 4: Harrismith
UPDATE ceva_loads
SET date_harrismith = NOW()
WHERE load_number = 'L-1234';

-- Milestone 5: Durban Arrival
UPDATE ceva_loads
SET date_durban_arrival = NOW()
WHERE load_number = 'L-1234';

-- Milestone 6: Delivered
UPDATE ceva_loads
SET
  date_offloaded = NOW(),
  status = 'delivered' -- Update status to delivered
WHERE load_number = 'L-1234';
```

**Tips:**
- Use `NOW()` for current timestamp
- Or use specific time: `'2026-03-26 14:30:00'`
- Always update in order (1 → 2 → 3 → 4 → 5 → 6)

---

## 📊 Viewing Milestones

### On Dashboard:
1. Go to: `/admin/citrus-dashboard`
2. Find your load
3. See the visual timeline with colored indicators
4. Check progress percentage

### Full Screen Mode (for Client):
1. On dashboard, click "Full Screen" button
2. Display on premises screen
3. Auto-refreshes every 30 seconds

---

## 📞 Status Updates

When updating milestones, also update the load status:

| Action | Update Status To |
|--------|-----------------|
| Create load | `pending` (automatic) |
| Assign vehicle | `assigned` (automatic when horse is selected) |
| Depart farm (Milestone 1) | `in_transit` |
| Arrive at destination (Milestone 6) | `delivered` |
| Problem/cancellation | `cancelled` |

---

## 🚨 Important Notes

1. **Update milestones in order** - Don't skip ahead
2. **Set status to in_transit** when load departs farm
3. **Set status to delivered** when offloaded at Bayhead
4. **Client can see the dashboard in real-time** - updates show immediately
5. **Phase 2 will automate this** - GPS tracking will auto-update milestones

---

## 📋 Example Workflow

**Scenario:** New citrus load departing today

### Step 1: Create Load
- Go to `/admin/loads` → "Create Load"
- Client: Select client
- Material: **Citrus** (already default ✅)
- Manifest: `I325600001NT`
- RiB Code: `25616711`
- Controller: `Mahesh`
- Origin: `Nottingham Road, KZN`
- Destination: `K-Hold, Bayhead, Durban`
- Select transporter, horse, trailer, driver
- **Status automatically becomes: assigned**

### Step 2: Truck Departs Farm (8:00 AM)
```sql
UPDATE ceva_loads
SET
  date_loaded = '2026-03-26 08:00:00',
  status = 'in_transit'
WHERE load_number = 'L-1234';
```
**Dashboard shows:** 🟢 Milestone 1 complete, 🟡 others pending

### Step 3: Clears Bitebridge Border (2:00 PM)
```sql
UPDATE ceva_loads
SET date_arrived_border_sa = '2026-03-26 14:00:00'
WHERE load_number = 'L-1234';
```
**Dashboard shows:** 🟢 Milestones 1-2 complete, 🟡 others pending

### Step 4: Passes Johannesburg (11:00 PM)
```sql
UPDATE ceva_loads
SET date_johannesburg = '2026-03-26 23:00:00'
WHERE load_number = 'L-1234';
```
**Dashboard shows:** 🟢 Milestones 1-3 complete, 🟡 others pending

### Step 5: Passes Harrismith (2:00 AM next day)
```sql
UPDATE ceva_loads
SET date_harrismith = '2026-03-27 02:00:00'
WHERE load_number = 'L-1234';
```
**Dashboard shows:** 🟢 Milestones 1-4 complete, 🟡 others pending

### Step 6: Arrives Durban (8:00 AM)
```sql
UPDATE ceva_loads
SET date_durban_arrival = '2026-03-27 08:00:00'
WHERE load_number = 'L-1234';
```
**Dashboard shows:** 🟢 Milestones 1-5 complete, 🟡 final pending

### Step 7: Offloaded at K-Hold (11:00 AM)
```sql
UPDATE ceva_loads
SET
  date_offloaded = '2026-03-27 11:00:00',
  status = 'delivered'
WHERE load_number = 'L-1234';
```
**Dashboard shows:** 🟢 Milestones 1-5 complete, 🔵 Delivered

**Progress: 100%** ✅

---

## 🔮 Future Enhancement (Phase 2)

Once Phase 2 is implemented:
- GPS tracking will auto-detect when truck enters geofence zones
- Milestones will update **automatically**
- No manual SQL needed
- You'll just create the load and system handles the rest

**For now:** Manual updates via Supabase or SQL as shown above.

---

**Questions?** Contact: Ash (CEVA Project Sponsor) or MindRift support

**Date:** 26 March 2026
