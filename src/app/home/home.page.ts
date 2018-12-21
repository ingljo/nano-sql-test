import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { getMode } from '../../../plugins/cordova-plugin-nano-sqlite/lib/sqlite-adapter';
import { nSQL } from 'nano-sql';
import { ObserverSubscriber } from 'nano-sql/lib/observable';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  private subscription: ObserverSubscriber;
  todoItems = [];
  result = '';
  text: string;

  constructor(private ngZone: NgZone) {

  }

  async ngOnInit(): Promise<void> {
    await this.configureDb();
    this.subscription = nSQL().observable<{ id: string, text: string }[]>(() => {
      return nSQL().table('todo').query('select').emit();
    }).subscribe((items) => {
      this.ngZone.run(() => {
        this.todoItems = items;
      });
    });
  }

  private async configureDb() {
    await nSQL().config({
      id: 'testdb',
      mode: getMode()
    }).table('todo').model([
      { key: 'id', type: 'string', props: ['pk'] },
      { key: 'secondaryIndex', type: 'string', props: ['idx'] },
      { key: '*', type: '*' },
    ]).connect();
    const adapter = await nSQL().extend('get_adapter');
    console.log(adapter[0]);
    const name = (<any>adapter[0]).constructor.name;
    this.result = `NanoSQL conencted. Using adapter: ${name}`;
  }

  async insertNewTodoItem() {
    const newId = this.createGuid();
    const insertResult = await nSQL().table('todo').query('upsert',
      {
        id: newId,
        secondaryIndex: newId,
        text: this.text,
        timestamp: new Date().getTime(),
      }).exec();
    this.result = JSON.stringify(insertResult);
    this.text = '';
  }

  async deleteTodoItem(id: string) {
    // This does not work on SQL Lite Adapter
    const deleteResult = await nSQL().table('todo').query('delete').where(['secondaryIndex', '=', id]).exec();
    // The line below work on SQL Lite Adapter
    // const deleteResult = await nSQL().table('todo').query('delete').where(['id', '=', id]).exec();

    this.result = JSON.stringify(deleteResult);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private createGuid() {
    return (this.S4() + this.S4() + '-' + this.S4() + '-4' + this.S4().substr(0, 3)
      + '-' + this.S4() + '-' + this.S4() + this.S4() + this.S4()).toLowerCase();
  }

  private S4() {
    // tslint:disable-next-line:no-bitwise
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }
}
