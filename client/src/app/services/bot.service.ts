import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BotService {

  url = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) { }

  createBot(bot: any) {
    return this.http.post(this.url + "/bot", bot);
  }

  getBot(botId: string) {
    return this.http.get(`${this.url}/bot/${botId}`);
  }

  askQuestion(botId: string, question: string) {
    return this.http.post(`${this.url}/bot/question/${botId}`, { question });
  }

}
