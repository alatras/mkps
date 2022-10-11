import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { EditionListingService } from './edition-listing.service'
import { EditionListing } from '../edition-listing/schemas/edition-listing.schema'
import { getEditionListing } from '../nft/test/mocks'

describe('EditionListingService', () => {
  let service: EditionListingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditionListingService,
        { provide: getModelToken(EditionListing.name), useValue: getEditionListing() },
      ],
    }).compile();

    service = module.get<EditionListingService>(EditionListingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
