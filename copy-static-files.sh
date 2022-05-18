#!/bin/bash

git clone git@github.com:AveNFT/marketplace-be.git

cp -R marketplace-be/config/nftProperties ./config/nftProperties
cp -R marketplace-be/locales ./locales

cp marketplace-be/src/utils/nftProperties/nftPropertiesCommon.json ./src/utils/nftProperties/common.json

rm -rf marketplace-be
