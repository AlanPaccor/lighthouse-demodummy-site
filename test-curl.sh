#!/bin/bash
# Test the SDK endpoint directly

curl -X POST http://localhost:8080/api/sdk/traces \
  -H "Content-Type: application/json" \
  -H "X-API-Key: lh_83513bd689b44ab9b53b679d689b50a9" \
  -d '{
    "prompt": "Hello, this is a test!",
    "response": "This is a test response from the SDK",
    "tokensUsed": 50,
    "costUsd": 0.0001,
    "latencyMs": 150,
    "provider": "test"
  }'

