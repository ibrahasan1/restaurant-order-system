import React from 'react';
import { useNavigate } from 'react-router-dom';

const roles = [
  { id: 'waiter', label: 'Kellner', icon: '📱', desc: 'Bestellungen aufgeben', color: 'from-brand-500 to-orange-600' },
  { id: 'kitchen', label: 'Küche', icon: '👨‍🍳', desc: 'Speisen zubereiten', color: 'from-green-500 to-emerald-600' },
  { id: 'bar', label: 'Bar', icon: '🍺', desc: 'Getränke zubereiten', color: 'from-blue-500 to-indigo-600' },
  { id: 'admin', label: 'Admin', icon: '⚙️', desc: 'System verwalten', color: 'from-purple-500 to-violet-600' },
];

export default function RoleSelect({ onSelect }) {
  const navigate = useNavigate();

  const handleSelect = (roleId) => {
    onSelect(roleId);
    navigate(`/${roleId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">🍽️ Restaurant OS</h1>
          <p className="text-slate-400 text-lg">Wähle deine Rolle</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelect(role.id)}
              className={`
                relative overflow-hidden rounded-2xl p-6 text-left
                bg-gradient-to-br ${role.color}
                transform transition-all duration-200
                hover:scale-105 active:scale-95
                shadow-xl hover:shadow-2xl
              `}
            >
              <span className="text-4xl block mb-3">{role.icon}</span>
              <span className="text-xl font-bold block">{role.label}</span>
              <span className="text-sm opacity-80">{role.desc}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-slate-500 text-xs mt-8">
          Tipp: Speichere die direkte URL (z.B. /kitchen) als Bookmark
        </p>
      </div>
    </div>
  );
}
