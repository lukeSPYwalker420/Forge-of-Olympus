import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

export default function DashboardChart({ userId, liftName }) {
  const [data, setData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  
  useEffect(() => {
    if (!userId || !liftName) return;
    fetch(`/api/1rm-history/${userId}/${encodeURIComponent(liftName)}`)
      .then(res => res.json())
      .then(history => {
        setData(history);
        
        // Calculate 4-week prediction
        if (history.length >= 3) {
          const recent = history.slice(-4);
          const x = recent.map((_, i) => i);
          const y = recent.map(h => h.estimated1RM);
          const n = x.length;
          const sumX = x.reduce((a, b) => a + b, 0);
          const sumY = y.reduce((a, b) => a + b, 0);
          const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
          const sumX2 = x.reduce((a, b) => a + b * b, 0);
          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
          
          const predictions = [];
          for (let i = 1; i <= 4; i++) {
            const nextX = recent.length - 1 + i;
            const predicted = Math.round(slope * nextX + intercept);  // FIXED: was "slope"
            predictions.push({ week: i, predicted });
          }
          setPrediction(predictions);
        }
      })
      .catch(err => console.error(err));
  }, [userId, liftName]);
  
  if (data.length === 0) return <p style={{color:"var(--text-gray)"}}>Log 3+ sessions to see prediction</p>;
  
  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString()} stroke="var(--text-gray)"/>
          <YAxis stroke="var(--text-gray)"/>
          <Tooltip contentStyle={{backgroundColor:"var(--card-bg)", borderColor:"var(--accent)"}}/>
          <Line type="monotone" dataKey="estimated1RM" stroke="var(--accent)" strokeWidth={2}/>
        </LineChart>
      </ResponsiveContainer>
      {prediction && (
        <div style={{ marginTop: 16, padding: 12, background: "var(--card-hover)", borderRadius: 8 }}>
          <strong>📈 4-Week Prediction:</strong>
          <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            {prediction.map(p => (
              <div key={p.week}>
                <span style={{ fontSize: 12, color: "var(--text-gray)" }}>Week {p.week}</span>
                <div style={{ fontWeight: "bold", color: "var(--accent)" }}>{p.predicted} kg</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}