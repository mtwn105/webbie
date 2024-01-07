import { Component } from '@angular/core';
import '@cds/core/icon/register.js';
import { ClarityIcons, chatBubbleIcon } from '@cds/core/icon';

ClarityIcons.addIcons(chatBubbleIcon);



@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {

}
