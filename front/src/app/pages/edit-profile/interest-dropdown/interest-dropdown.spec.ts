import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterestDropdown } from './interest-dropdown';

describe('InterestDropdown', () => {
  let component: InterestDropdown;
  let fixture: ComponentFixture<InterestDropdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterestDropdown]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterestDropdown);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
