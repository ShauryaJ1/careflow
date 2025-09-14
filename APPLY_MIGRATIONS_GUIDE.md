# How to Apply Requests Table Migration and Seed Data

## Step 1: Apply the Migration

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/wqalfshbrgoitndayhgw/sql/new

2. **Run the Migration**
   - Copy the entire contents of `apply-requests-migration.sql`
   - Paste it into the SQL Editor
   - Click "Run" button
   - You should see a success message: "Requests table and related objects created successfully!"

## Step 2: Add Seed Data

1. **In the same SQL Editor**
   - Clear the editor
   - Copy the entire contents of `seed-requests-data.sql`
   - Paste it into the SQL Editor
   - Click "Run" button
   - You should see a summary of the seeded data

## Step 3: Verify Everything Works

1. **Check the requests table**
   ```sql
   SELECT COUNT(*) FROM requests;
   -- Should return ~60 rows
   ```

2. **Check the heatmap view**
   ```sql
   SELECT * FROM request_heatmap LIMIT 5;
   -- Should return aggregated data
   ```

3. **Test the heatmap function**
   ```sql
   SELECT * FROM get_request_heatmap_data('MD', NULL, 30);
   -- Should return heatmap points
   ```

## Step 4: Install Missing Dependencies

Run this in your terminal:
```bash
npm install leaflet.heat @types/leaflet.heat
```

## What This Creates

- **`requests` table**: Stores patient location requests with geocoding
- **`request_heatmap` view**: Aggregated data for visualization
- **RLS policies**: Secure access control
- **~60 sample requests**: Realistic data across Maryland showing:
  - Urban clusters (Baltimore, Bethesda)
  - Suburban demand (Silver Spring, Rockville)
  - Rural needs (Eastern Shore, Western Maryland)
  - Various care types (ER, urgent care, telehealth, etc.)

## Next Steps

After applying these:
1. The chat agent will automatically log patient locations when provided
2. Providers will see a heatmap when adding new hospitals
3. The heatmap shows demand intensity to guide facility placement
