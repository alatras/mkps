#!/bin/bash

if [ -z "$1" ]; then
  echo "You must pass the version as the fist param (X.X.X) e.g. 1.1.3"
  exit 0
fi

IS_MAC=0
OS="$(uname -s)"
case "$OS" in
 Darwin) IS_MAC=1;;
esac

git pull

SED_ARG=(-i -E)
if [[ $IS_MAC == 1 ]]
then
  SED_ARG=(-i '' -E)
fi

sed "${SED_ARG[@]}" 's/"version": "[^"]*"/"version": "'$1'"/g' tsoa.json
npm version $1 --git-tag-version false

read -p "Creating version remotely $1, Are you sure? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  git checkout -b "bump/$1"
  git commit -am "Bump to version $1"
  git push --set-upstream origin "bump/$1"

  URL="https://github.com/AveNFT/marketplace-be/pull/new/bump/$1"
  if [[ $IS_MAC == 1 ]]
  then
    open $URL
  else
    xdg-open $URL
  fi
fi
