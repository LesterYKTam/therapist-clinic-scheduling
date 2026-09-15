import {DatabaseSync} from 'node:sqlite';
import {fixture, validate, interval, DEMO_NOW} from './schedule.mjs';

export class ClinicStore {
  constructor(path = ':memory:', seed = fixture()) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS clinic (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL)');
    this.db.prepare('INSERT OR IGNORE INTO clinic(id,body) VALUES(1,?)').run(JSON.stringify(validate(seed)));
    this.read();
  }
  read() { return validate(JSON.parse(this.db.prepare('SELECT body FROM clinic WHERE id=1').get().body)); }
  change(action, roomId) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const data = this.read();
      let message;
      if (action === 'add') {
        const numbers = data.rooms.map(r => Number(r.id.replace('room-', ''))).filter(Number.isFinite);
        const number = Math.max(0, ...numbers) + 1;
        data.rooms.push({id: `room-${number}`, name: `Room ${number}`, active: true});
        message = `Room ${number} added.`;
      } else if (action === 'remove') {
        const room = data.rooms.find(r => r.id === roomId && r.active);
        if (!room) throw new Error('Room is no longer active. Refresh and try again.');
        const bookings = data.sessions.filter(s => s.room === room.id && interval(s)[1] > DEMO_NOW);
        if (bookings.length) throw new Error(`${room.name} cannot be removed: ${bookings.map(s => `${s.date} ${s.time} (${s.minutes} min)`).join('; ')}. Move these bookings first.`);
        room.active = false;
        message = `${room.name} removed from active inventory.`;
      } else throw new Error('Unknown room action');
      validate(data);
      this.db.prepare('UPDATE clinic SET body=? WHERE id=1').run(JSON.stringify(data));
      this.db.exec('COMMIT');
      return message;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
