import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  url = environment.apiUrl;

  constructor(
    private http: HttpClient
  ) { }


  uploadFile(file: any) {

    let formData = new FormData();
    formData.append('file', file);

    return this.http.post(this.url + "/file/upload", formData);
  }



}
