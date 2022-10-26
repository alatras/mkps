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
