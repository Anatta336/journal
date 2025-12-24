#!/bin/bash

# Check if a name was provided
if [ -z "$1" ]; then
    echo "Usage: $0 <name>"
    exit 1
fi

# Get all arguments in one string, so calling with multiple words works (ideally you'd call it with quotes)
NAME="$*"

# Transform the name to kebab-case:
# 1. Replace spaces with -
# 2. Make it lowercase
# 3. Remove anything that's not a letter a-z, number 0-9, or hyphen
DIR_NAME=$(echo "$NAME" | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')

# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$0")
TARGET_DIR="$SCRIPT_DIR/$DIR_NAME"

# If there's already a directory with the name this would use, exit without making any changes.
if [ -d "$TARGET_DIR" ]; then
    exit 0
fi

# Create the directory and the requirements.md file
mkdir -p "$TARGET_DIR"
echo "# $NAME" > "$TARGET_DIR/requirements.md"
