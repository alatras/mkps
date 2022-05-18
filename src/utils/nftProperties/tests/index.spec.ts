import { getNftProperties } from '..'

describe('Nft Properties', () => {
  describe('Get Nft Properties', () => {
    it('should return a list of filters', () => {
      const properties = getNftProperties()
      expect(properties).not.toBeNull()

      expect(properties).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'name',
            type: 'singleLineText'
          }),
          expect.objectContaining({
            key: 'description',
            type: 'markdownText'
          }),
          expect.objectContaining({
            key: 'unlockableEnabled',
            type: 'switch'
          }),
          expect.objectContaining({
            key: 'supply',
            type: 'number'
          }),
          expect.not.objectContaining({
            key: 'ThisIsSoRandom',
            type: 'number'
          })
        ])
      )
    })
  })
})
