#!/bin/bash
# Uptime monitoring script for PlanMyBudget API
# This script pings the API every 5 minutes to prevent cold starts
# Use with: crontab -e
# Add: */5 * * * * /path/to/monitor.sh >> /tmp/monitor.log 2>&1
# Or use a free service like Better Stack: https://betterstack.com/uptime

API_URL="${API_URL:-https://saveit-r1gc.onrender.com/api/status}"

response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")

if [ "$response" = "200" ]; then
    echo "$(date): API is healthy (HTTP $response)"
    exit 0
else
    echo "$(date): API returned HTTP $response"
    exit 1
fi
