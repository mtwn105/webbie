import { Component } from '@angular/core';
import { BotService } from 'src/app/services/bot.service';
import '@cds/core/alert/register.js';

@Component({
  selector: 'app-create-a-bot',
  templateUrl: './create-a-bot.component.html',
  styleUrls: ['./create-a-bot.component.scss']
})
export class CreateABotComponent {

  bot: {
    name: string,
    sourceLink: string,
    openAiKey: string,
    slackToken: string,
  } = {
      name: '',
      sourceLink: '',
      openAiKey: '',
      slackToken: ''
    }

  success = false;
  error = false;
  errorMessage = '';
  successBotLink = '';

  constructor(
    private botService: BotService
  ) { }

  createBot() {

    this.error = false;
    this.success = false;

    console.log(this.bot);

    // Check if all values are present or not empty
    if (!this.bot.name || !this.bot.sourceLink || !this.bot.openAiKey) {
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


    this.botService.createBot(this.bot).subscribe((response: any) => {
      console.log(response);
      this.success = true;
      this.successBotLink = response.botLink;
    }, (error: any) => {
      console.log(error);
      this.error = true;
      this.errorMessage = "Something went wrong. Please Try Again";
    });

  }

}
