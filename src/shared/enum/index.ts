export enum AvnTransactionType {
  // Single NFTs
  OpenSingleNftListing = 'OpenSingleNftListing',
  MintSingleNft = 'MintSingleNft',
  // Batch NFTs
  AvnListBatch = 'AvnListBatch',
  AvnMintFiatBatchNft = 'AvnMintFiatBatchNft',
  AvnCreateBatch = 'AvnCreateBatch',
  AvnEndFiatBatchSale = 'AvnEndFiatBatchSale',
  // Sales
  AvnProcessFiatSale = 'AvnProcessFiatSale',
  AvnCancelFiatSale = 'AvnCancelFiatSale',
  // Events sent from Highlander
  AvnCancelNftListing = 'AvnCancelNftListing',
  AvnEndBatchListing = 'AvnEndBatchListing',
  AvnTransferTo = 'AvnTransferTo',
  AvnMintTo = 'AvnMintTo',
  // Transactions sent to API Gateway
  MintSingleNftApiGateway = 'MintSingleNftApiGateway',
  ListSingleNftListingApiGateway = 'ListSingleNftApiGateway',
  CancelListingSingleNftApiGateway = 'CancelListingSingleNftApiGateway'
}

export enum AvnTransactionState {
  NEW = 'NEW',
  PROCESSING_COMPLETE = 'PROCESSING_COMPLETE',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  AVN_REJECTED = 'AVN_REJECTED',
  AVN_LOST = 'AVN_LOST'
}

export enum AuctionStatus {
  unconfirmed = 'Unconfirmed',
  open = 'Open',
  closing = 'Closing',
  sold = 'Sold',
  withdraw = 'Withdraw',
  error = 'Error',
  bidChargeFailed = 'bidChargeFailed'
}

export enum AuctionType {
  highestBid = 'highestBid',
  fixedPrice = 'fixedPrice',
  airdrop = 'airdrop',
  freeClaim = 'freeClaim'
}

export enum Currency {
  ETH = 'ETH',
  USD = 'USD',
  ADA = 'ADA',
  NONE = 'NONE'
}

export enum Market {
  Ethereum = 'Ethereum',
  Fiat = 'Fiat'
}

export enum DbCollections {
  AvnTransactions = 'AvnTransactions',
  Users = 'users',
  NFTs = 'nfts',
  NftHistory = 'nftHistory',
  Editions = 'editions',
  EditionListings = 'editionListings',
  Auctions = 'auctions'
}

export enum NftStatus {
  draft = 'Draft',
  minting = 'Minting',
  minted = 'Minted',
  saleOpening = 'Sale opening',
  forSale = 'For sale',
  saleClosing = 'Sale closing',
  owned = 'Owned'
}

export enum EditionListingStatus {
  open = 'Open',
  withdraw = 'Withdraw',
  closing = 'Closing',
  unconfirmed = 'Unconfirmed',
  ended = 'Ended',
  error = 'Error'
}

export enum HistoryType {
  minted = 'minted',
  listed = 'listed',
  bid = 'bid',
  purchased = 'purchased',
  cancelled = 'cancelled',
  transferred = 'transferred',
  unlockableContentClaimed = 'unlockableContentClaimed',
  editionListed = 'editionListed',
  editionListingCancelled = 'editionListingCancelled'
}

export enum PaymentStatus {
  pending = 'pending',
  failed = 'failed',
  successful = 'successful'
}

export enum PaymentProviders {
  stripe = 'stripe',
  ethereum = 'ethereum',
  cardano = 'cardano'
}

export enum NftPropertyTypes {
  singleLineText = 'singleLineText',
  multiLineText = 'multiLineText',
  markdownText = 'markdownText',
  radioButton = 'radioButton',
  number = 'number',
  select = 'select',
  switch = 'switch',
  box = 'box',
  datePicker = 'datePicker',
  dateTimePicker = 'dateTimePicker'
}

export enum PresignedUrlUploadType {
  nftOriginal = 'nftOriginal',
  nftThumbnail = 'nftThumbnail'
}

export enum PollingTransactionStatus {
  pending = 'Pending',
  processed = 'Processed',
  rejected = 'Rejected'
}

export enum SecondarySaleMode {
  match_primary = 'match_primary',
  none = 'none'
}

export enum ApiGateWayPollingOption {
  mintSingleNft = 'mintSingleNft',
  listSingleNft = 'listSingleNft',
  cancelListingSingleNft = 'cancelListingSingleNft'
}

export enum BidStatus {
  processing = 'Processing',
  success = 'Success',
  failed = 'Failed'
}
