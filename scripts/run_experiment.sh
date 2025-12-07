#!/bin/bash
# Runs all containers and traffic simulations

#==================================================================
# How to RUN these experiments:
# ./scripts/run_experiment.sh static 60 static_run.csv
# ./scripts/run_experiment.sh adaptive 60 adaptive_run.csv
#==================================================================

#!/usr/bin/env bash

set -e

# CONFIG — edit as needed
LABEL=$1
DURATION=$2
OUTFILE=$3

if [ -z "$LABEL" ] || [ -z "$DURATION" ] || [ -z "$OUTFILE" ]; then
  echo "Usage: $0 <label> <duration_sec> <output_csv>"
  exit 1
fi

echo "[*] Starting DNS cluster via docker compose..."
docker compose up -d --build

echo "[*] Waiting 3 seconds for services to initialize..."
sleep 3

echo "[*] Starting metrics collector (${LABEL})..."
python3 scripts/collect_metrics.py \
  --ports 8000,8001,8002 \
  --names dns1,dns2,dns3 \
  --interval 1 \
  --duration $DURATION \
  --label $LABEL \
  --out "$OUTFILE" &
COLLECTOR_PID=$!

echo "[*] Starting attack / traffic generator..."
# IMPORTANT:
# This script DOES NOT generate traffic by itself.
# It simply calls your teammate's simulator.
# For example:
python3 simulator/attack_simulator.py --duration $DURATION &
ATTACK_PID=$!

echo "[*] Running experiment for ${DURATION} seconds..."
wait $ATTACK_PID
wait $COLLECTOR_PID

echo "[*] Experiment finished."
echo "[*] Output saved to ${OUTFILE}"

