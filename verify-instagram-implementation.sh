#!/bin/bash

# Instagram Import Flow - File Inventory
# This script can be used to verify all files were created correctly

set -e

echo "🔍 Verifying Instagram Import Implementation Files..."
echo "================================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter
TOTAL=0
FOUND=0

# Function to check file
check_file() {
    TOTAL=$((TOTAL + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        FOUND=$((FOUND + 1))
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
    fi
}

# Function to check directory
check_dir() {
    TOTAL=$((TOTAL + 1))
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/ (directory)"
        FOUND=$((FOUND + 1))
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
    fi
}

echo ""
echo "📦 SERVICES"
echo "================================================================"
check_dir "src/services/instagram"
check_file "src/services/instagram/instagramService.ts"
check_file "src/services/instagram/index.ts"

echo ""
echo "🪝 HOOKS"
echo "================================================================"
check_dir "src/hooks/instagram"
check_file "src/hooks/instagram/useInstagramAuth.ts"
check_file "src/hooks/instagram/useInstagramMedia.ts"
check_file "src/hooks/instagram/useInstagramImport.ts"
check_file "src/hooks/instagram/index.ts"

echo ""
echo "🎨 COMPONENTS"
echo "================================================================"
check_dir "src/components/social"
check_file "src/components/social/InstagramAuthButton.tsx"
check_file "src/components/social/InstagramMediaCard.tsx"
check_file "src/components/social/InstagramMediaGrid.tsx"
check_file "src/components/social/index.ts"

check_dir "src/components/journal/imports"
check_file "src/components/journal/imports/InstagramImportModal.tsx"
check_file "src/components/journal/imports/index.ts"

echo ""
echo "🔗 API ROUTES"
echo "================================================================"
check_dir "src/app/api/auth/instagram"
check_file "src/app/api/auth/instagram/callback/route.ts"
check_file "src/app/api/auth/instagram/start/route.ts"

check_dir "src/app/api/instagram"
check_file "src/app/api/instagram/connection/route.ts"
check_file "src/app/api/instagram/media/route.ts"
check_file "src/app/api/instagram/import/route.ts"

echo ""
echo "📝 UPDATED FILES"
echo "================================================================"
check_file "src/types/index.ts"
check_file "src/lib/journalService.ts"

echo ""
echo "📚 DOCUMENTATION"
echo "================================================================"
check_file "INSTAGRAM_SETUP.md"
check_file "INSTAGRAM_IMPORT_GUIDE.md"
check_file "INSTAGRAM_INTEGRATION_EXAMPLE.tsx"
check_file "INSTAGRAM_IMPLEMENTATION_SUMMARY.md"
check_file "INSTAGRAM_DB_MIGRATION.sql"

echo ""
echo "================================================================"
echo "📊 VERIFICATION SUMMARY"
echo "================================================================"
echo "Files found: $FOUND / $TOTAL"

if [ $FOUND -eq $TOTAL ]; then
    echo -e "${GREEN}✓ All files present and accounted for!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some files are missing!${NC}"
    exit 1
fi

# Print file tree if tree command available
echo ""
echo "================================================================"
echo "📁 FULL FILE TREE"
echo "================================================================"

if command -v tree &> /dev/null; then
    tree -I 'node_modules|.next' -L 3 src/services src/hooks src/components/social src/components/journal/imports src/app/api/auth/instagram src/app/api/instagram
else
    echo "Tree command not available. Use 'brew install tree' to install."
fi

# Count lines of code
echo ""
echo "================================================================"
echo "📊 CODE STATISTICS"
echo "================================================================"

total_lines=0

for file in \
    src/services/instagram/instagramService.ts \
    src/hooks/instagram/useInstagramAuth.ts \
    src/hooks/instagram/useInstagramMedia.ts \
    src/hooks/instagram/useInstagramImport.ts \
    src/components/social/InstagramAuthButton.tsx \
    src/components/social/InstagramMediaCard.tsx \
    src/components/social/InstagramMediaGrid.tsx \
    src/components/journal/imports/InstagramImportModal.tsx \
    src/app/api/auth/instagram/callback/route.ts \
    src/app/api/auth/instagram/start/route.ts \
    src/app/api/instagram/connection/route.ts \
    src/app/api/instagram/media/route.ts \
    src/app/api/instagram/import/route.ts; do
    
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        total_lines=$((total_lines + lines))
        printf "%-50s %5d lines\n" "$file" "$lines"
    fi
done

echo "================================================================"
printf "%-50s %5d lines\n" "TOTAL IMPLEMENTATION CODE" "$total_lines"
echo "================================================================"

echo ""
echo "✨ Implementation complete! Run 'npm run dev' to get started."
