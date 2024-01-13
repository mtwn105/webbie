import { Component } from '@angular/core';
import { BotService } from 'src/app/services/bot.service';
import '@cds/core/alert/register.js';
import { ClrLoadingState } from '@clr/angular';
import { FileService } from 'src/app/services/file.service';

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
    dataSource: string,
    textData: string,
  } = {
      name: '',
      description: '',
      sourceLink: '',
      openAiKey: '',
      slackToken: '',
      textData: '',
      dataSource: 'WEB'
    }

  slackNotification = false;
  success = false;
  error = false;
  errorMessage = '';
  successBotLink = '';
  validateBtnState = ClrLoadingState.DEFAULT
  file: File | undefined;

  constructor(
    private botService: BotService,
    private fileService: FileService
  ) { }

  createBot() {

    this.validateBtnState = ClrLoadingState.LOADING;

    this.error = false;
    this.success = false;

    console.log(this.bot);

    // Check if all values are present or not empty
    if (!this.bot.name || !this.bot.description || !this.bot.openAiKey) {
      this.error = true;
      this.errorMessage = "Please fill all the fields";
      this.validateBtnState = ClrLoadingState.ERROR;
      return;
    }

    if (!this.slackNotification) {
      this.bot.slackToken = '';
    }

    if (this.bot.dataSource === 'WEB') {

      if (!this.bot.sourceLink) {
        this.error = true;
        this.errorMessage = "Please enter a valid URL";
        this.validateBtnState = ClrLoadingState.ERROR;
        return;
      }

      // Validate SourceLink as valid url
      try {
        new URL(this.bot.sourceLink);
      } catch (error) {
        this.error = true;
        this.errorMessage = "Please enter a valid URL";
        this.validateBtnState = ClrLoadingState.ERROR;
        return;
      }

      this.saveBotInDb();

    } else if (this.bot.dataSource === 'TEXT') {
      if (!this.bot.textData) {
        this.error = true;
        this.errorMessage = "Please enter valid text data";
        this.validateBtnState = ClrLoadingState.ERROR;
        return;
      }

      // Create txt file from text data
      this.file = new File([this.bot.textData], "data.txt", { type: "text/plain" });

      // Upload file
      this.fileService.uploadFile(this.file).subscribe((response: any) => {
        console.log(response);

        // Set sourceLink
        this.bot.sourceLink = response.fileName;

        this.saveBotInDb();
      }, (error: any) => {
        console.log(error);
        this.error = true;
        this.errorMessage = "Something went wrong. Please Try Again";
        this.validateBtnState = ClrLoadingState.ERROR;
      });

    } else if (this.bot.dataSource === 'CSV') {
      if (!this.file) {
        this.error = true;
        this.errorMessage = "Please select a file";
        this.validateBtnState = ClrLoadingState.ERROR; return;
      }

      // Upload file
      this.fileService.uploadFile(this.file).subscribe((response: any) => {
        console.log(response);

        // Set sourceLink
        this.bot.sourceLink = response.fileName;

        this.saveBotInDb();
      }, (error: any) => {
        console.log(error);
        this.error = true;
        this.errorMessage = "Something went wrong. Please Try Again";
        this.validateBtnState = ClrLoadingState.ERROR;
      });

    }

  }

  saveBotInDb() {
    this.botService.createBot(this.bot).subscribe((response: any) => {

      this.validateBtnState = ClrLoadingState.SUCCESS;
      console.log(response);
      this.success = true;
      this.successBotLink = response.botLink;

    }, (error: any) => {
      this.validateBtnState = ClrLoadingState.ERROR;
      console.log(error);
      this.error = true;
      this.errorMessage = error.error.message || "Something went wrong. Please Try Again";
    });
  }

  onFileSelected(event: any) {
    console.log(event);
    this.file = event.target.files[0];
  }

}
