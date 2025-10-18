#!/bin/bash
# MCP Docker Connection Script
# This script connects to the MCP server running in Docker

# Check if container is running
if ! docker ps | grep -q mcp_server; then
  echo "❌ MCP server container is not running!" >&2
  echo "Start it with: docker-compose up -d" >&2
  exit 1
fi

# Connect to the MCP server via docker exec
docker exec -i mcp_server node build/index.js
