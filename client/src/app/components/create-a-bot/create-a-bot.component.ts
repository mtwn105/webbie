import { Component } from '@angular/core';
import { BotService } from 'src/app/services/bot.service';
import '@cds/core/alert/register.js';
import { ClrLoadingState } from '@clr/angular';

@Component({
  selector: 'app-create-a-bot',
  templateUrl: './create-a-bot.component.html',
  styleUrls: ['./create-a-bot.component.scss']
})
export class CreateABotComponent {

  bot: {
    name: string,
    description: string,
    sourceLink: string,
    openAiKey: string,
    slackToken: string,
  } = {
      name: '',
      description: '',
      sourceLink: '',
      openAiKey: '',
      slackToken: ''
    }

  slackNotification = false;
  success = false;
  error = false;
  errorMessage = '';
  successBotLink = '';
  validateBtnState = ClrLoadingState.DEFAULT

  constructor(
    private botService: BotService
  ) { }

  createBot() {

    this.validateBtnState = ClrLoadingState.LOADING;

    this.error = false;
    this.success = false;

    console.log(this.bot);

    // Check if all values are present or not empty
    if (!this.bot.name || !this.bot.description || !this.bot.sourceLink || !this.bot.openAiKey) {
      this.error = true;
      this.errorMessage = "Please fill all the fields";
      return;
    }

    // Validate SourceLink as valid url
    try {
      new URL(this.bot.sourceLink);
    } catch (error) {
      this.error = true;
      this.errorMessage = "Please enter a valid URL";
      return;
    }

    if (!this.slackNotification) {
      this.bot.slackToken = '';
    }

    this.botService.createBot(this.bot).subscribe((response: any) => {

      this.validateBtnState = ClrLoadingState.SUCCESS;
      console.log(response);
      this.success = true;
      this.successBotLink = response.botLink;

    }, (error: any) => {
      this.validateBtnState = ClrLoadingState.ERROR;
      console.log(error);
      this.error = true;
      this.errorMessage = "Something went wrong. Please Try Again";
    });

  }

}
