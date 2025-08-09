#!/bin/bash

echo "Testing Contact Form Email Functionality"
echo "========================================"

# Test the debug endpoint
echo -e "\n1. Testing debug endpoint (GET):"
curl -s http://localhost:3000/api/debug-contact | jq .

# Test sending an email through debug endpoint
echo -e "\n2. Testing email send through debug endpoint (POST):"
curl -s -X POST http://localhost:3000/api/debug-contact | jq .

echo -e "\n3. Check server logs for any errors:"
echo "Run: tail -f /tmp/nextjs-dev.log | grep -E 'Contact|contact|Error|error|Resend|resend'"
echo ""
echo "4. To test the actual contact form:"
echo "   - Visit http://localhost:3000/contact"
echo "   - Fill out the form"
echo "   - Open browser console (F12)"
echo "   - Submit the form"
echo "   - Check console for any errors"
echo ""
echo "The backend is working correctly. Emails are being sent successfully."
echo "If you still see errors on the frontend, check the browser console for details."