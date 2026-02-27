describe('RemoteCard (responsive + a11y contract)', () => {
  const viewports: Array<{ w: number; h: number; name: string }> = [
    { w: 320, h: 320, name: 'wear' },
    { w: 375, h: 375, name: 'phone' },
    { w: 480, h: 480, name: 'tablet' },
    { w: 1024, h: 1024, name: 'tv' },
  ];

  viewports.forEach(({ w, h, name }) => {
    it(`renders touch targets and no state text (${name})`, () => {
      cy.viewport(w, h);
      cy.visit('/');

      cy.get('.remote-card').should('exist').within(() => {
        cy.contains('遥控器').should('exist');
        cy.contains('开启').should('not.exist');
        cy.contains('关闭').should('not.exist');
      });

      const ids = ['ir-power', 'ir-mute', 'ir-home', 'ir-up', 'ir-down', 'ir-left', 'ir-right', 'ir-ok'];
      ids.forEach((id) => {
        cy.get(`[data-testid="${id}"]`).then(($el) => {
          expect($el).to.have.attr('aria-label');
          const rect = ($el[0] as HTMLElement).getBoundingClientRect();
          expect(rect.width).to.be.at.least(44);
          expect(rect.height).to.be.at.least(44);
        });
      });
    });
  });

  it('supports dark mode class without breaking layout', () => {
    cy.viewport(375, 375);
    cy.visit('/');
    cy.get('html').invoke('addClass', 'dark');
    cy.get('.remote-card').within(() => {
      cy.contains('遥控器').should('exist');
    });
    cy.get('[data-testid="ir-ok"]').should('exist');
  });

  it('does not navigate to modal when pressing buttons', () => {
    cy.viewport(375, 375);
    cy.visit('/');
    cy.get('[data-testid="ir-power"]').click();
    cy.get('[aria-label="关闭配置"]').should('not.exist');
  });

  it('handles portrait and landscape', () => {
    cy.viewport(375, 812);
    cy.visit('/');
    cy.get('[data-testid="ir-up"]').should('exist');
    cy.viewport(812, 375);
    cy.get('[data-testid="ir-up"]').should('exist');
  });
});
