describe('Trae Dashboard', () => {
  it('loads the application', () => {
    cy.visit('/')
    // Since we might not be authenticated, look for common elements
    // or just check that the root element exists and is not empty
    cy.get('body').should('exist')
    cy.title().should('not.be.empty')
  })
})
