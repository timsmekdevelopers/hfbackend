import React from 'react';

const branches = [
  { name: 'Central Branch', city: 'Port Harcourt' },
  { name: 'North Branch', city: 'Port Harcourt' },
  { name: 'East Branch', city: 'Lagos' },
  { name: 'West Branch', city: 'Lagos' },
  { name: 'South Branch', city: 'Abuja' },
];

function LocateBranch({ city }) {
  const filtered = branches.filter(b => b.city === city);
  return (
    <div style={{ padding: 24 }}>
      <h2>Branches in {city}</h2>
      <ul>
        {filtered.length ? filtered.map(b => (
          <li key={b.name}>{b.name}</li>
        )) : <li>No branches found in this city.</li>}
      </ul>
    </div>
  );
}

export default LocateBranch;
