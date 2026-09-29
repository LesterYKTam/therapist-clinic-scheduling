// Repeatable isolated Sprint 4 walkthrough. It never opens or changes data/clinic.sqlite.
import {makeServer} from '../app.mjs';
import {ClinicStore} from '../store.mjs';
import {initialState} from '../scheduling.mjs';

makeServer(new ClinicStore(':memory:', initialState())).listen(3003, '127.0.0.1', () =>
  console.log('S4 isolated demo: http://127.0.0.1:3003'));
