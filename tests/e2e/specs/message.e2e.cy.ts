describe('Authentication', () => {
  it('logs in successfully', () => {
    cy.visit('/auth');
    cy.get('input[type="email"]').type(Cypress.env('TEST_USER_EMAIL'));
    cy.get('input[type="password"]').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.contains('form ion-button', 'Login').click();
    cy.url({ timeout: 10000 }).should('include', '/users');
  });
});

describe('Chat Navigation', () => {
  beforeEach(() => {
    // Always start logged in
    cy.visit('/auth');
    cy.get('input[type="email"]').type(Cypress.env('TEST_USER_EMAIL'));
    cy.get('input[type="password"]').type(Cypress.env('TEST_USER_PASSWORD'));
    cy.contains('form ion-button', 'Login').click();
    cy.url({ timeout: 10000 }).should('include', '/users');
  });

  it('opens a chat with the recipient', () => {
    cy.contains('ion-item', Cypress.env('TEST_RECIPIENT_EMAIL'), { timeout: 10000 }).click();
    cy.url({ timeout: 10000 }).should('include', '/chat');
    cy.get('ion-title').should('contain', Cypress.env('TEST_RECIPIENT_EMAIL'));
  });

  it('shows existing messages in the chat', () => {
    cy.contains('ion-item', Cypress.env('TEST_RECIPIENT_EMAIL'), { timeout: 10000 }).click();
    // Wait for loading to finish (no more skeletons)
    cy.get('ion-skeleton-text', { timeout: 10000 }).should('not.exist');
    // There should be at least one message (ion-item in ion-list)
    cy.get('ion-list ion-item').should('exist');
  });

  it('sends a message in the chat', () => {
    cy.contains('ion-item', Cypress.env('TEST_RECIPIENT_EMAIL'), { timeout: 10000 }).click();
    cy.get('input[placeholder="Type a message"]').type('Cake for breakfast!');
    cy.contains('ion-button', 'Send').click();
    cy.contains('ion-item', 'Cake for breakfast!', { timeout: 10000 }).should('exist');
  });
});

// describe('Logout and Protection', () => {
//   beforeEach(() => {
//     cy.visit('/auth');
//     cy.get('input[type="email"]').type(Cypress.env('TEST_USER_EMAIL'));
//     cy.get('input[type="password"]').type(Cypress.env('TEST_USER_PASSWORD'));
//     cy.contains('form ion-button', 'Login').click();
//     cy.url({ timeout: 10000 }).should('include', '/users');
//     cy.contains('ion-item', Cypress.env('TEST_RECIPIENT_EMAIL'), { timeout: 10000 }).click();
//     cy.url({ timeout: 10000 }).should('include', '/chat');
//   });

//   it('logs out from chat page and is protected from going back', () => {
//     // Click the logout icon
//     cy.get('ion-header ion-toolbar ion-buttons[slot="end"] ion-button').click();
//     cy.url({ timeout: 10000 }).should('include', '/auth');
//     cy.go('back');
//     cy.url({ timeout: 10000 }).should('include', '/auth');
//   });
// });