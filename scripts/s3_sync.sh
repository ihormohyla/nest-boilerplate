#!/bin/bash

# info:   synchronize current directory with s3
# description: doesnt involve codebuild
# requirements: aws-cli

set -o errexit

S3_IGNORE_FILE=${S3_IGNORE_FILE:=".s3ignore"}
s3_url=$1

if [ -z $s3_url ]; then
  echo "./s3-sync-sh {s3-url}"
  echo "ERROR: {s3-url} is not set"
  exit 1
fi

exclude_commands=$(awk '{print "--exclude=" $0}' $S3_IGNORE_FILE | xargs)

set -o xtrace # enable debug mode
# aws s3 sync {source} {destination} {additional-options}
aws s3 sync . $s3_url $exclude_commands \
  --delete

# if [ $? -ne 0 ]; then
#   echo "S3 sync failed!"
#   exit 1
# fi

set +o xtrace # disable debug mode