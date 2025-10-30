#!/bin/bash

LOADBALANCER_CMD="cloud-provider-kind"

if ! command -v $LOADBALANCER_CMD &> /dev/null; then
  echo "$LOADBALANCER_CMD could not be found. installing..."
  brew install $LOADBALANCER_CMD
fi

sudo $LOADBALANCER_CMD --gateway-channel standard