# CMS Hospital Data Fetcher

This directory contains scripts to fetch hospital data from the CMS (Centers for Medicare & Medicaid Services) API and save it as CSV files.

## Scripts

### fetch-cms-hospitals.ts / fetch-cms-hospitals.js

Fetches hospital data from the CMS Provider Data API for a specified state and saves it as a CSV file matching the hospital database schema.

**Data Source:** CMS Provider Data dataset (https://data.cms.gov/provider-data/dataset/yv7e-xc69)

**Mappings:**
- `OP_22` → `wait_score` (ED wait time to be seen by healthcare professional)
- `OP_18b` → `cooldown` (ED time from arrival to departure)

## Usage

### Method 1: Using npm script (TypeScript)
```bash
# Fetch data for California (saves to data/cms-hospitals/hospitals_CA.csv)
npm run fetch-cms CA

# Save to custom location
npm run fetch-cms CA my-custom-file.csv
```

### Method 2: Using tsx directly (TypeScript)
```bash
# Fetch data for New York (saves to data/cms-hospitals/hospitals_NY.csv)
npx tsx scripts/fetch-cms-hospitals.ts NY

# Save to custom location
npx tsx scripts/fetch-cms-hospitals.ts NY custom_output.csv
```

### Method 3: Using Node.js (JavaScript)
```bash
# Fetch data for Texas (saves to data/cms-hospitals/hospitals_TX.csv)
node scripts/fetch-cms-hospitals.js TX

# Save to custom location
node scripts/fetch-cms-hospitals.js TX custom_output.csv
```

**Default Output Location:** `data/cms-hospitals/hospitals_<STATE>.csv`

## Output Format

The script outputs CSV with the following columns:
- `id` - Auto-generated UUID
- `name` - Hospital facility name
- `address` - Street address
- `city` - City
- `state` - State (2-letter abbreviation)
- `zip_code` - ZIP code
- `type_of_care` - Default: "ER"
- `wait_score` - OP_22 metric value (minutes)
- `cooldown` - OP_18b metric value (minutes)
- `op_22` - Raw OP_22 value (duplicate for reference)
- `website` - Empty (to be filled manually if needed)
- `email` - Empty (to be filled manually if needed)
- `phone_number` - Empty (to be filled manually if needed)
- `description` - Empty (to be filled manually if needed)
- `open_time` - Empty (JSONB field for hours of operation)
- `created_at` - Current timestamp
- `updated_at` - Current timestamp
- `start_at` - Current timestamp
- `end_at` - Empty (for temporary/pop-up facilities)
- `location` - Empty (geography field, needs geocoding)

## Examples

```bash
# Fetch individual states (automatically saves to data/cms-hospitals/)
npm run fetch-cms CA
npm run fetch-cms NY
npm run fetch-cms TX
npm run fetch-cms FL

# Or fetch multiple states in a loop (bash)
for state in CA NY TX FL IL PA OH GA NC MI; do
  npm run fetch-cms $state
  echo "Fetched data for $state"
done

# Use the batch script to fetch multiple states at once
node scripts/fetch-all-states.js CA NY TX FL
```

## Notes

- The script automatically saves CSV files to `data/cms-hospitals/` directory
- The directory is created automatically if it doesn't exist
- You can specify a custom output file as the second argument
- The CMS API may take a few seconds to respond depending on the state size
- Some hospitals may not have wait time data (OP_22/OP_18b metrics)
- The script will try the Provider Data API first, then fall back to SODA API if needed

## Import to Database

After generating the CSV files, you can import them into your Supabase database:

```sql
-- Example: Import CSV data into hospitals table
COPY hospitals (
  id, name, address, city, state, zip_code, type_of_care,
  wait_score, cooldown, op_22, website, email, phone_number,
  description, open_time, created_at, updated_at, start_at, end_at
)
FROM '/path/to/hospitals_CA.csv'
WITH (FORMAT csv, HEADER true);
```

Or use Supabase's web interface to upload CSV files directly.
