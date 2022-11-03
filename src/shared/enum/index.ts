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
  AvnMintTo = 'AvnMintTo'
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
  EditionListings = 'editionListings'
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
