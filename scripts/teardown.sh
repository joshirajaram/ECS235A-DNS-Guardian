#!/bin/bash
# Cleans up Docker environment

#!/usr/bin/env bash

echo "[*] Stopping containers..."
docker compose down

echo "[*] Removing old containers, networks, volumes..."
docker system prune -f

echo "[*] Teardown complete."

