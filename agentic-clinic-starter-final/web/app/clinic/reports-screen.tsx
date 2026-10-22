"use client";

import { today } from "./dates";
import type { ClinicState } from "./types";

// Monthly report of committed sessions for one staff member.
export function ReportsScreen({
  state,
  report,
  onGenerate,
}: {
  state: ClinicState;
  report: any;
  onGenerate: () => void;
}) {
  return (
    <>
      <header>
        <p className="eyebrow">Committed sessions only</p>
        <h1>Staff monthly report</h1>
      </header>
      <section className="card report">
        <label>
          Staff
          <select id="reportStaff">
            {state.therapists.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · Therapist{item.active ? "" : " · Inactive"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Month
          <input id="month" type="month" defaultValue={today(state.config.timezone).slice(0, 7)} />
        </label>
        <button className="primary" onClick={onGenerate}>
          Generate report
        </button>
        {report && (
          <>
            <h2>
              {report.staff.name} · Therapist · {report.month}
            </h2>
            {report.sessions.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Client</th>
                    <th>Duration</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sessions.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.time}</td>
                      <td>{item.clientName} · Client</td>
                      <td>{item.minutes} minutes</td>
                      <td>{item.locationName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No committed sessions for this month.</p>
            )}
            <p>
              <strong>Total: {report.totalMinutes} minutes</strong>
            </p>
            <a
              className="report-download"
              href={`/api/clinic/report?staff=${encodeURIComponent(report.staff.id)}&month=${encodeURIComponent(report.month)}`}
            >
              Download PDF
            </a>
            <button onClick={() => window.print()}>Print / save PDF</button>
          </>
        )}
      </section>
    </>
  );
}
