import { useMemo, useState } from 'react';

type Friend = {
  id: string;
  name: string;
  status: 'online' | 'offline';
  subtitle: string;
  highlight?: string;
};

type Debt = {
  id: string;
  name: string;
  amount: string;
  date: string;
  type: 'paid' | 'received';
};

const friends: Friend[] = [
  {
    id: '1',
    name: 'Aaliyah Flores',
    status: 'online',
    subtitle: 'Planning a movie night',
    highlight: 'Chill and low-key',
  },
  {
    id: '2',
    name: 'Ezra McConnell',
    status: 'offline',
    subtitle: 'Grew your streak to 3 days',
  },
  {
    id: '3',
    name: 'Bianca Zhou',
    status: 'online',
    subtitle: 'Shared “Sunset vibes” album',
    highlight: 'New content',
  },
  {
    id: '4',
    name: 'Liam Ortiz',
    status: 'offline',
    subtitle: 'Last seen 2h ago',
  },
];

const debts: Debt[] = [
  { id: 'a', name: 'Coffee with Bianca', amount: '$6.25', date: 'Today · 9:15 AM', type: 'paid' },
  { id: 'b', name: 'Concert tickets', amount: '$48.00', date: 'Yesterday · 7:40 PM', type: 'received' },
  { id: 'c', name: 'Ride share', amount: '$12.60', date: 'Tue · 5:10 PM', type: 'paid' },
  { id: 'd', name: 'Groceries split', amount: '$24.10', date: 'Sun · 2:25 PM', type: 'received' },
];

export default function FriendsPage() {
  const [isOnline, setIsOnline] = useState(true);
  const statusCopy = useMemo(
    () => ({
      online: 'Online',
      offline: 'Offline',
    }),
    []
  );

  return (
    <div className="page">
      <main className="shell">
        <header className="page-header">
          <div className="heading">
            <p className="eyebrow">Social</p>
            <h1>Friends</h1>
            <p className="lede">
              Keep up with the people you care about. Toggle your availability, add new friends, and keep tabs on
              recent balances.
            </p>
          </div>

          <div className="actions">
            <label className="availability" aria-label="Toggle availability">
              <span className="label">Status</span>
              <button
                type="button"
                role="switch"
                aria-checked={isOnline}
                className={`switch ${isOnline ? 'on' : 'off'}`}
                onClick={() => setIsOnline((previous) => !previous)}
              >
                <span className="switch-thumb" />
                <span className="switch-copy">{isOnline ? statusCopy.online : statusCopy.offline}</span>
              </button>
            </label>

            <button className="add-friend" type="button">
              <span className="plus">＋</span>
              Add friend
            </button>
          </div>
        </header>

        <section className="content">
          <div className="friends">
            <div className="section-header">
              <div>
                <p className="eyebrow">Connections</p>
                <h2>Friend list</h2>
              </div>
              <span className="badge subtle">{friends.length} total</span>
            </div>

            <div className="friend-grid">
              {friends.map((friend) => (
                <article key={friend.id} className="friend-card">
                  <div className={`avatar ${friend.status}`} aria-hidden>
                    <span>{friend.name.charAt(0)}</span>
                  </div>
                  <div className="friend-body">
                    <div className="friend-meta">
                      <h3>{friend.name}</h3>
                      <span className={`status-pill ${friend.status}`}>{statusCopy[friend.status]}</span>
                    </div>
                    <p className="subtitle">{friend.subtitle}</p>
                    {friend.highlight && <span className="badge accent">{friend.highlight}</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="sidebar">
            <div className="section-header">
              <div>
                <p className="eyebrow">Balances</p>
                <h2>Debit history</h2>
              </div>
              <span className="badge subtle">{debts.length} items</span>
            </div>

            <ul className="debt-list">
              {debts.map((debt) => (
                <li key={debt.id} className="debt">
                  <div>
                    <p className="debt-title">{debt.name}</p>
                    <p className="debt-date">{debt.date}</p>
                  </div>
                  <span className={`debt-amount ${debt.type}`}>{debt.amount}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </main>

      <style jsx>{`
        :global(body) {
          margin: 0;
          background: radial-gradient(circle at 20% 20%, rgba(188, 227, 255, 0.3), transparent 32%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
          color: #0f172a;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .page {
          min-height: 100vh;
          padding: 56px 20px 72px;
          display: flex;
          justify-content: center;
        }

        .shell {
          width: 100%;
          max-width: 1040px;
          display: grid;
          gap: 28px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          align-items: center;
          flex-wrap: wrap;
        }

        .heading h1 {
          margin: 6px 0 10px;
          font-size: clamp(2rem, 4vw, 2.4rem);
          letter-spacing: -0.02em;
        }

        .lede {
          margin: 0;
          max-width: 620px;
          color: #475569;
          line-height: 1.55;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.8rem;
          color: #94a3b8;
          margin: 0;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .availability {
          display: grid;
          gap: 8px;
          align-items: center;
          color: #475569;
        }

        .availability .label {
          font-size: 0.9rem;
        }

        .switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #0f172a;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          min-width: 150px;
        }

        .switch:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 20px rgba(148, 163, 184, 0.25);
        }

        .switch.on {
          background: linear-gradient(90deg, #f0f9ff 0%, #ecfeff 100%);
          border-color: #bae6fd;
          color: #0f172a;
        }

        .switch.off {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #0f172a;
        }

        .switch-thumb {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
          transform: translateX(0);
          transition: transform 0.2s ease;
        }

        .switch.on .switch-thumb {
          transform: translateX(6px);
          border-color: #bae6fd;
        }

        .switch-copy {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .add-friend {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border-radius: 10px;
          background: #0f172a;
          border: 1px solid #0f172a;
          color: #f8fafc;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .add-friend:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
          background: #111827;
        }

        .add-friend:active {
          transform: translateY(0);
        }

        .plus {
          font-size: 1.2rem;
          line-height: 1;
        }

        .content {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 18px;
        }

        .friends,
        .sidebar {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 16px 18px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        h2 {
          margin: 2px 0 0;
          font-size: 1.05rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #475569;
        }

        .badge.accent {
          border-color: #dbeafe;
          background: #eff6ff;
          color: #1e3a8a;
        }

        .badge.subtle {
          font-weight: 600;
        }

        .friend-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 10px;
        }

        .friend-card {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 10px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .friend-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
          transform: translateY(-1px);
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 700;
          color: #0f172a;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          position: relative;
        }

        .avatar::after {
          content: '';
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          border: 2px solid #ffffff;
          background: #e2e8f0;
        }

        .avatar.online::after {
          background: #22c55e;
        }

        .avatar.offline::after {
          background: #cbd5e1;
        }

        .friend-body {
          display: grid;
          gap: 6px;
        }

        .friend-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .friend-meta h3 {
          margin: 0;
          font-size: 1rem;
          color: #0f172a;
        }

        .subtitle {
          margin: 0;
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
          border: 1px solid #e2e8f0;
        }

        .status-pill.online {
          background: #ecfdf3;
          color: #166534;
          border-color: #bbf7d0;
        }

        .status-pill.offline {
          background: #f8fafc;
          color: #475569;
        }

        .sidebar h2 {
          margin-bottom: 2px;
        }

        .debt-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 6px;
        }

        .debt {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 10px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .debt-title {
          margin: 0;
          font-size: 0.95rem;
          color: #0f172a;
        }

        .debt-date {
          margin: 2px 0 0;
          font-size: 0.83rem;
          color: #64748b;
        }

        .debt-amount {
          font-weight: 700;
          font-size: 0.93rem;
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .debt-amount.paid {
          color: #166534;
          border-color: #bbf7d0;
          background: #ecfdf3;
        }

        .debt-amount.received {
          color: #1d4ed8;
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        @media (max-width: 960px) {
          .content {
            grid-template-columns: 1fr;
          }

          .sidebar {
            order: -1;
          }
        }

        @media (max-width: 640px) {
          .page-header {
            align-items: flex-start;
          }

          .switch {
            width: 100%;
            justify-content: space-between;
          }

          .actions {
            width: 100%;
          }

          .add-friend {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
