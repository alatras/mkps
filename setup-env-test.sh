#!/bin/bash

if [ "$1" = "" ]; then
  echo "Please pass the environment: 'dev' or 'qa'"
  exit
fi

assumeRole() {
  export AWS_ACCESS_KEY_ID=""
  export AWS_SECRET_ACCESS_KEY=""
  export AWS_SESSION_TOKEN=""
  export $(printf "AWS_ACCESS_KEY_ID=%s AWS_SECRET_ACCESS_KEY=%s AWS_SESSION_TOKEN=%s" \
    $(aws sts assume-role --role-arn $1 --role-session-name secret-manager-marketplace \
      --query "Credentials.[AccessKeyId,SecretAccessKey,SessionToken]" \
      --output text))
}


ACCOUNT=$(aws sts get-caller-identity --query "Account" --output text)
if [ .$ACCOUNT != ".696165561482" ]
then
  # EOS DEV
  aws configure set region us-east-2
  assumeRole arn:aws:iam::696165561482:role/developer
fi



ENV=$1
REGION="us-east-2"
ACCOUNT_ID=`aws sts get-caller-identity --query Account --output text`

AWS_SECRET_ID="arn:aws:secretsmanager:$REGION:$ACCOUNT_ID:secret:/$ENV/service/test_auth0"
AWS_SECRET_STRIPE_ID="arn:aws:secretsmanager:$REGION:$ACCOUNT_ID:secret:/$ENV/service/stripe"

FILENAME=".env.test.$ENV"

if [ -n "$AWS_SECRET_ID" ]; then
  SECRETS=`aws secretsmanager get-secret-value --region $REGION --secret-id $AWS_SECRET_ID --query SecretString --output text`
  echo $SECRETS | jq -r 'to_entries|map("\(.key|ascii_upcase)=\(.value|tostring)")|.[]' > $FILENAME
fi


if [ -n "$AWS_SECRET_STRIPE_ID" ]; then
  SECRETS=`aws secretsmanager get-secret-value --region $REGION --secret-id $AWS_SECRET_STRIPE_ID --query SecretString --output text`
  SECRETS=$(echo ${SECRETS//secret/stripe_secret_key})
  echo $SECRETS | jq -r 'to_entries|map("\(.key|ascii_upcase)=\(.value|tostring)")|.[]' >> $FILENAME
fi
