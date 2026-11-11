#!/usr/bin/env bash

# For debugging only, start the runner with a manually fetched grant token. If no broker, wait until available.

for i in {1..30}; do
    GRANT_TOKEN=$(curl -s -X POST http://127.0.0.1:5679/runners/auth -H "Content-Type: application/json" -d '{"token":"test"}' | jq -r '.data.token')
    if [ -n "$GRANT_TOKEN" ] && [ "$GRANT_TOKEN" != "null" ]; then
        PONG_RUNNERS_GRANT_TOKEN="$GRANT_TOKEN" pnpm start
        exit 0
    fi
    [ $i -eq 1 ] && echo "Waiting for pong task broker server at http://127.0.0.1:5679..."
    sleep 1
done
echo "Error: Could not connect to pong task broker server after 30 seconds"
exit 1
