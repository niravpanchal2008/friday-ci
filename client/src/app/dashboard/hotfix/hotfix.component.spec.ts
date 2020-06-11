import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HotfixComponent } from './hotfix.component';

describe('HotfixComponent', () => {
  let component: HotfixComponent;
  let fixture: ComponentFixture<HotfixComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HotfixComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HotfixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
