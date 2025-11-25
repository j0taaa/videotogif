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
          background: #0b1220;
          color: #e2e8f0;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .page {
          min-height: 100vh;
          background: radial-gradient(120% 120% at 20% 0%, rgba(94, 234, 212, 0.08), transparent 55%),
            radial-gradient(120% 120% at 90% 0%, rgba(168, 85, 247, 0.08), transparent 55%),
            linear-gradient(180deg, #0b1220 0%, #0b1220 100%);
          padding: 64px 24px 72px;
          display: flex;
          justify-content: center;
        }

        .shell {
          width: 100%;
          max-width: 1080px;
          display: grid;
          gap: 32px;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: center;
          flex-wrap: wrap;
        }

        .heading h1 {
          margin: 6px 0 10px;
          font-size: clamp(2rem, 4vw, 2.6rem);
          letter-spacing: -0.02em;
        }

        .lede {
          margin: 0;
          max-width: 620px;
          color: #cbd5e1;
          line-height: 1.6;
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
          color: #cbd5e1;
        }

        .availability .label {
          font-size: 0.9rem;
        }

        .switch {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px 6px 8px;
          border-radius: 999px;
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.35);
          color: #cbd5e1;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          min-width: 148px;
        }

        .switch:hover {
          border-color: rgba(148, 163, 184, 0.6);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.45);
        }

        .switch.on {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12));
          border-color: rgba(52, 211, 153, 0.5);
          color: #a7f3d0;
        }

        .switch.off {
          background: rgba(15, 23, 42, 0.85);
          border-color: rgba(148, 163, 184, 0.35);
          color: #e2e8f0;
        }

        .switch-thumb {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #ffffff, #cbd5e1 65%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 6px 18px rgba(0, 0, 0, 0.25);
          transform: translateX(0);
          transition: transform 0.2s ease;
        }

        .switch.on .switch-thumb {
          transform: translateX(10px);
          background: radial-gradient(circle at 25% 25%, #ecfeff, #34d399 70%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 10px 30px rgba(34, 197, 94, 0.25);
        }

        .switch-copy {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .add-friend {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(94, 234, 212, 0.12), rgba(59, 130, 246, 0.18));
          border: 1px solid rgba(59, 130, 246, 0.45);
          color: #e2f3ff;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .add-friend:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.25);
          border-color: rgba(59, 130, 246, 0.6);
        }

        .plus {
          font-size: 1.2rem;
          line-height: 1;
        }

        .content {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 20px;
        }

        .friends,
        .sidebar {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          padding: 18px 18px 20px;
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(10px);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        h2 {
          margin: 2px 0 0;
          font-size: 1.1rem;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(148, 163, 184, 0.08);
          color: #cbd5e1;
        }

        .badge.accent {
          border-color: rgba(94, 234, 212, 0.45);
          background: rgba(45, 212, 191, 0.12);
          color: #99f6e4;
        }

        .badge.subtle {
          font-weight: 600;
        }

        .friend-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }

        .friend-card {
          display: grid;
          grid-template-columns: 52px 1fr;
          gap: 10px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(17, 24, 39, 0.9));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
        }

        .friend-card:hover {
          border-color: rgba(94, 234, 212, 0.4);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
          transform: translateY(-1px);
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-weight: 700;
          color: #e2e8f0;
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border: 1px solid rgba(148, 163, 184, 0.25);
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
          border: 2px solid #0f172a;
          background: #cbd5e1;
        }

        .avatar.online::after {
          background: #34d399;
        }

        .avatar.offline::after {
          background: #94a3b8;
        }

        .friend-body {
          display: grid;
          gap: 6px;
        }

        .friend-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .friend-meta h3 {
          margin: 0;
          font-size: 1rem;
          color: #f8fafc;
        }

        .subtitle {
          margin: 0;
          color: #cbd5e1;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.8rem;
          letter-spacing: 0.02em;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        .status-pill.online {
          background: rgba(34, 197, 94, 0.12);
          color: #86efac;
          border-color: rgba(34, 197, 94, 0.35);
        }

        .status-pill.offline {
          background: rgba(148, 163, 184, 0.1);
          color: #cbd5e1;
        }

        .sidebar h2 {
          margin-bottom: 4px;
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
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(15, 23, 42, 0.7);
        }

        .debt-title {
          margin: 0;
          font-size: 0.95rem;
          color: #e2e8f0;
        }

        .debt-date {
          margin: 2px 0 0;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .debt-amount {
          font-weight: 700;
          font-size: 0.95rem;
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .debt-amount.paid {
          color: #86efac;
          border-color: rgba(34, 197, 94, 0.35);
          background: rgba(34, 197, 94, 0.12);
        }

        .debt-amount.received {
          color: #bfdbfe;
          border-color: rgba(59, 130, 246, 0.35);
          background: rgba(59, 130, 246, 0.12);
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
