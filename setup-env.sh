#!/bin/bash

AWS_SECRET_ID_AWS=arn:aws:secretsmanager:us-east-2:696165561482:secret:/dev/service/aws-4Fcto5
AWS_SECRET_ID_MONGO=arn:aws:secretsmanager:us-east-2:696165561482:secret:/dev/service/mongo-Phyaef
AWS_SECRET_ID_AUTH0=arn:aws:secretsmanager:us-east-2:696165561482:secret:/dev/service/auth0-3vMlMB
AWS_SECRET_ID_STRIPE=arn:aws:secretsmanager:us-east-2:696165561482:secret:/dev/service/stripe-kNZrUe
AWS_SECRET_ID_BACKEND=arn:aws:secretsmanager:us-east-2:696165561482:secret:/dev/service/backend-k69qUy

AWS_NFTUS_SECRET_ID_BACKEND=arn:aws:secretsmanager:us-east-2:610677954218:secret:/uat/service/backend-T4Vqqa

KEY_MAP=(
  'bucket_assets::AWS_S3_BUCKET_NAME_ASSETS'
  'bucket_nft::AWS_S3_BUCKET_NAME_NFT_ORIG'
  'region::AWS_S3_BUCKET_REGION'
  'name::MONGODB_NAME'
  'url::MONGODB_URI'
  'clientId::AUTH0_CLIENT_ID'
  'clientSecret::AUTH0_CLIENT_SECRET'
  'audience::AUTH0_AUDIENCE'
  'domain::AUTH0_DOMAIN'
  'api_url::AUTH0_API_URL'
  'secret::STRIPE_SECRET_KEY'
  'webhook::STRIPE_WEBHOOK_SECRET_KEY'
  'aws_cf_distribution_assets::AWS_CF_DISTRIBUTION_ASSETS'
  'royalties_value::ROYALTIES'
  'aws_sqs_avn_transactions_url::AWS_SQS_AVN_TRANSACTIONS_URL'
  'aws_sqs_eth_events_url::AWS_SQS_ETH_EVENTS_URL'
  'original_content_public::ORIGINAL_CONTENT_PUBLIC'
)

KEYS_EXTRA=(
  'get_id_api_key'
  'get_id_api_url'
  'get_id_sign_key'
  'get_id_flow_name'
  'is_kyc_enabled'
  'cybavo_api_url'
  'cybavo_api_code'
  'cybavo_api_secret'
  'cybavo_wallet_id'
)

getJsonSecrets() {
  SECRETS=$(aws secretsmanager get-secret-value --secret-id $1 --query SecretString --output text)
  echo $SECRETS | jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]' >> .env.tmp
}

assumeRole() {
  export AWS_ACCESS_KEY_ID=""
  export AWS_SECRET_ACCESS_KEY=""
  export AWS_SESSION_TOKEN=""
  export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s" \
    $(aws sts assume-role --role-arn $1 --role-session-name secret-manager-marketplace \
      --query "Credentials.[AccessKeyId,SecretAccessKey,SessionToken]" \
      --output text))
}

decodeKeys() {
  for index in "${KEY_MAP[@]}" ; do
    KEY="${index%%::*}"
    VALUE="${index##*::}"
    LINE=$(sed -n -e "/^$KEY=/p" .env.tmp)
    LINE=$(echo ${LINE//$KEY/$VALUE})

    # Need to tranform Mongo URI
    if [ $KEY == 'url' ]
    then
      LINE="${LINE%%\?*}"
      LINE="$LINE?tls=true&tlsCAFile=rds-combined-ca-bundle.pem"
    fi
    echo $LINE >> .env
  done
}

decodeExtras() {
  for key in "${KEYS_EXTRA[@]}" ; do
    KEY=$key
    VALUE=$(echo $key | tr '[:lower:]' '[:upper:]')
    echo $KEY
    echo $VALUE
    LINE=$(sed -n -e "/^$KEY=/p" .env.tmp)
    echo $LINE
    LINE=$(echo ${LINE//$KEY/$VALUE})
    echo $LINE >> .env
  done
}

# EOS DEV
aws configure set region us-east-2
assumeRole arn:aws:iam::696165561482:role/developer

echo "" > .env.tmp
getJsonSecrets $AWS_SECRET_ID_AWS
getJsonSecrets $AWS_SECRET_ID_MONGO
getJsonSecrets $AWS_SECRET_ID_AUTH0
getJsonSecrets $AWS_SECRET_ID_STRIPE
getJsonSecrets $AWS_SECRET_ID_BACKEND

echo "# Auto-Generated" > .env
decodeKeys

if [ .$1 == ".nftus" ]
then
  echo "" > .env.tmp
  # NFTUS UAT
  assumeRole arn:aws:iam::610677954218:role/developer
  getJsonSecrets $AWS_NFTUS_SECRET_ID_BACKEND
  decodeExtras
fi

# CLEANUP and EXTRA
echo "PORT=5002" >> .env
echo "ENVIRONMENT=local" >> .env
echo "WEB_APP_URL=http://localhost:4001" >> .env
echo "IS_SQS_DISABLED=1" >> .env
rm -f .env.tmp
