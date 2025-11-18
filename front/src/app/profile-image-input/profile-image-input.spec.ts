import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileImageInput } from './profile-image-input';

describe('ProfileImageInput', () => {
  let component: ProfileImageInput;
  let fixture: ComponentFixture<ProfileImageInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileImageInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileImageInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
