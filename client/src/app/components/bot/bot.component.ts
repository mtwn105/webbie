import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BotService } from 'src/app/services/bot.service';

@Component({
  selector: 'app-bot',
  templateUrl: './bot.component.html',
  styleUrls: ['./bot.component.scss']
})
export class BotComponent implements OnInit {

  botId: any;
  bot: any;
  question: any;
  conversation: any[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private botService: BotService
  ) {
    this.botId = this.activatedRoute.snapshot.paramMap.get('id');
  }

  ngOnInit(): void {

    this.botService.getBot(this.botId).subscribe((response: any) => {
      console.log(response);
      this.bot = response;
    });

  }

  askQuestion() {
    console.log(this.question);

    this.conversation.push({
      type: 'user',
      text: this.question
    });

    // scroll to bottom
    setTimeout(() => {
      const element = document.getElementById('chat-div');
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }, 100);

    this.botService.askQuestion(this.botId, this.question).subscribe((response: any) => {

      this.question = ''

      console.log(response);

      this.conversation.push({
        type: 'bot',
        text: response.answer
      });

      // scroll to bottom
      setTimeout(() => {
        const element = document.getElementById('chat-div');
        if (element) {
          element.scrollTop = element.scrollHeight;
        }
      }, 100);

    });

  }

}
