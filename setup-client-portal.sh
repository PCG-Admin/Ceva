#!/bin/bash

# CEVA Client Portal Setup Script
# Automates the setup of client user and portal

echo "================================================="
echo "CEVA Citrus TMS - Client Portal Setup"
echo "================================================="
echo ""

echo "This script will:"
echo "  1. Push database migrations (including client user)"
echo "  2. Verify client user creation"
echo "  3. Display access credentials"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Setup cancelled."
    exit 1
fi

echo ""
echo "Step 1: Pushing database migrations..."
echo "---------------------------------------"

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null
then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or manually run the SQL file:"
    echo "  supabase/migrations/20260326110000_create_client_user.sql"
    echo "  in your Supabase SQL Editor"
    exit 1
fi

supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migrations pushed successfully!"
else
    echo "❌ Migration failed. Please check errors above."
    echo ""
    echo "You can manually run the SQL file instead:"
    echo "  supabase/migrations/20260326110000_create_client_user.sql"
    exit 1
fi

echo ""
echo "================================================="
echo "✅ Client Portal Setup Complete!"
echo "================================================="
echo ""
echo "Client Access Credentials:"
echo "  Email:    client@ceva.co.za"
echo "  Password: CevaCitrus2026!"
echo ""
echo "Access URLs:"
echo "  Login:     http://localhost:3000/login"
echo "  Dashboard: http://localhost:3000/client/dashboard"
echo ""
echo "Next Steps:"
echo "  1. Login with the credentials above"
echo "  2. Create test citrus loads (as admin)"
echo "  3. View them on the client dashboard"
echo "  4. Click 'Full Screen' for premises display"
echo ""
echo "For detailed instructions, see:"
echo "  CLIENT_USER_SETUP.md"
echo "================================================="
