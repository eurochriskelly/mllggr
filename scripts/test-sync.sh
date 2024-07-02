#!/bin/bash
#
echo "Syncing scripts in sandbox folder"

# if switch --conitunues exists in any position then remove sandbox folder
if [[ "$@" == *"--continue"* ]]; then
  # Resume will not delete the folder and will try to pickup by downloading as little as possible
  echo "Resuming log sync"
else
  # Clear the folder and let mllggr pull a fresh copy of all todays logs
  echo "Starting with fresh log"
  rm -rf sandbox
fi

mkdir sandbox
npm run build
cd sandbox
node ../dist

