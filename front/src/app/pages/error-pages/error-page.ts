import { Component, input } from '@angular/core';

@Component({
  selector: 'app-error-404-page',
  imports: [],
  template: `
    <div style="display: flex; flex-direction: column; align-content: center; width: 100%;">
      <h1>ERROR 404</h1>
      <h2>Page not found</h2>
    </div>
  `,
  styleUrl: './error-page.scss'
})
export class Error404Page {}

@Component({
  selector: 'app-error-403-page',
  imports: [],
  template: `
    <div style="display: flex; flex-direction: column; align-content: center; width: 100%;">
      <h1>ERROR 403</h1>
      <h2>Forbiden</h2>
    </div>
  `,
  styleUrl: './error-page.scss'
})
export class Error403Page {}

@Component({
  selector: 'app-error-503-page',
  imports: [],
  template: `
    <div style="display: flex; flex-direction: column; align-content: center; width: 100%;">
      <h1>ERROR 503</h1>
      <h2>Server could not be reached</h2>
    </div>
  `,
  styleUrl: './error-page.scss'
})
export class Error503Page {}
