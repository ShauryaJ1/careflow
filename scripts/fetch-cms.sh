#!/bin/bash

# Fetch CMS hospital data for a state and save as CSV
# Usage: ./fetch-cms.sh <STATE> [OUTPUT_FILE]
# Example: ./fetch-cms.sh CA
#          ./fetch-cms.sh CA custom_output.csv

if [ $# -eq 0 ]; then
    echo "Usage: $0 <STATE_ABBREVIATION> [OUTPUT_FILE]"
    echo "Example: $0 CA"
    echo "         $0 CA custom_output.csv"
    echo ""
    echo "Default output: data/cms-hospitals/hospitals_<STATE>.csv"
    exit 1
fi

STATE=$1
OUTPUT=$2

if [ -z "$OUTPUT" ]; then
    npx tsx scripts/fetch-cms-hospitals.ts "$STATE"
else
    npx tsx scripts/fetch-cms-hospitals.ts "$STATE" "$OUTPUT"
fi
