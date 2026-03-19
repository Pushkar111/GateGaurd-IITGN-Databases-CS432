export default function GateSelectField({ gates, value, onChange }) {
  return (
    <select className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select gate...</option>
      {gates.map((gate) => {
        const gateId = gate.GateID || gate.gateid;
        const name = gate.Name || gate.name || `Gate ${gateId}`;
        return (
          <option key={gateId} value={gateId}>
            {name}
          </option>
        );
      })}
    </select>
  );
}
