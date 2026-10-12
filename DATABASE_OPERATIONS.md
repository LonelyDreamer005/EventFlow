# EventFlow — Database Operations & Quick Deletion Guide

This reference document provides copy-paste commands to inspect, delete, and reset records in EventFlow during development and live testing.

---

## 1. Quick Data Inspection

### View All Registered Users
```powershell
.\scripts\dev.ps1 list-users
```
*Or direct Python:*
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); [print(f'ID: {r[0]} | Name: {r[1]} | Email: {r[2]} | Role: {r[3]} | Joined: {r[4]}') for r in conn.cursor().execute('SELECT id, name, email, role, created_at FROM users').fetchall()]"
```

### View All Bookings & Order Totals
```powershell
.\scripts\dev.ps1 list-bookings
```
*Or direct Python:*
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); [print(f'Booking #{r[0]} | User: {r[1]} | Status: {r[2]} | Total: ₹{r[3]} | Time: {r[4]}') for r in conn.cursor().execute('SELECT b.id, u.name, b.status, b.total_amount, b.created_at FROM bookings b JOIN users u ON b.user_id = u.id').fetchall()]"
```

### View All Events
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); [print(f'Event #{r[0]} | Title: {r[1]} | Venue: {r[2]} | Status: {r[3]}') for r in conn.cursor().execute('SELECT id, title, venue, status FROM events').fetchall()]"
```

---

## 2. Targeted Record Deletions

### A. Delete a Specific User by ID
*Note: Foreign key cascading automatically deletes all bookings created by this user.*

Replace `<USER_ID>` with the actual ID (e.g., `3`):
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); conn.execute('DELETE FROM users WHERE id = <USER_ID>'); conn.commit(); print('User deleted successfully!')"
```
**Example (Delete User #3):**
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); conn.execute('DELETE FROM users WHERE id = 3'); conn.commit(); print('User deleted!')"
```

---

### B. Delete a Specific Booking by ID
Replace `<BOOKING_ID>` with the actual ID (e.g., `2`):
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); conn.execute('DELETE FROM booking_items WHERE booking_id = <BOOKING_ID>'); conn.execute('DELETE FROM bookings WHERE id = <BOOKING_ID>'); conn.commit(); print('Booking deleted successfully!')"
```
**Example (Delete Booking #2):**
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); conn.execute('DELETE FROM booking_items WHERE booking_id = 2'); conn.execute('DELETE FROM bookings WHERE id = 2'); conn.commit(); print('Booking deleted!')"
```

---

### C. Delete a Specific Event by ID
Replace `<EVENT_ID>` with the actual ID (e.g., `4`):
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); conn.execute('DELETE FROM ticket_types WHERE event_id = <EVENT_ID>'); conn.execute('DELETE FROM events WHERE id = <EVENT_ID>'); conn.commit(); print('Event deleted successfully!')"
```

---

### D. Clear ALL Test Bookings (Keeps Users & Events)
Clears all reservation history, resetting inventory counts without deleting user accounts or events:
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); conn.execute('DELETE FROM booking_items'); conn.execute('DELETE FROM bookings'); conn.commit(); print('All test bookings cleared!')"
```

---

### E. Delete ALL Customer Accounts (Keeps Admin Account)
Removes all registered test customers while preserving your `admin@eventflow.dev` account:
```powershell
python -c "import sqlite3; conn = sqlite3.connect('backend/instance/eventflow.db'); conn.execute('DELETE FROM users WHERE role = \'customer\''); conn.commit(); print('All customer accounts removed!')"
```

---

## 3. Complete Database Reset (Fresh Slate)

If you want to completely wipe all local data and restore the database to an empty, freshly seeded state:

```powershell
# 1. Stop backend if running, then remove database file:
Remove-Item backend\instance\eventflow.db -ErrorAction SilentlyContinue

# 2. Re-create all tables with latest schema:
.\scripts\dev.ps1 migrate

# 3. Create administrator account:
.\scripts\dev.ps1 create-admin
```

---

## 4. Docker Compose Database Reset

If running via Docker Compose with PostgreSQL:

```powershell
# Stop containers and destroy the persistent postgres_data volume:
.\scripts\dev.ps1 docker-reset

# Re-launch fresh database and services:
.\scripts\dev.ps1 docker-up
```
