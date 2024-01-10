import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BotService } from 'src/app/services/bot.service';
import { ClarityIcons, popOutIcon } from '@cds/core/icon';

ClarityIcons.addIcons(popOutIcon);

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

    const question = this.question;

    this.question = ''

    console.log(question);

    this.conversation.push({
      type: 'user',
      text: question
    });

    // scroll to bottom
    setTimeout(() => {
      const element = document.getElementById('chat-div');
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }, 100);

    this.botService.askQuestion(this.botId, question).subscribe((response: any) => {

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

    }, (error: any) => {
      console.log(error);
      this.conversation.push({
        type: 'error',
        text: 'Sorry, I am not able to answer this question. Please try again later.'
      });
    });


  }

  checkEnter(event: any) {
    if (event.keyCode === 13) {
      this.askQuestion();
    }
  }

  share() {
    if (navigator.share) {
      navigator.share({
        title: 'Bot: ' + this.bot.name,
        text: 'Check out this bot: ' + this.bot.name,
        url: window.location.href
      }).then(() => {
        console.log('Thanks for sharing!');
      })
        .catch(console.error);
    } else {
      console.log('web share not supported');
    }
  }

}
