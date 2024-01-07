import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateABotComponent } from './create-a-bot.component';

describe('CreateABotComponent', () => {
  let component: CreateABotComponent;
  let fixture: ComponentFixture<CreateABotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateABotComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateABotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
