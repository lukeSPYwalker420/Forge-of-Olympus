import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function ProgressLog({ userId }) {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/progress-comparison/${userId}`)
      .then(res => res.json())
      .then(data => {
        setComparison(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <p>Loading progress data…</p>;
  if (!comparison || !comparison.weeks || comparison.weeks.length < 2)
    return <p>Log at least two full weeks to see your progress.</p>;

  // Transform data for Recharts
  const chartData = comparison.lifts.map(lift => ({
    name: lift.name,
    "Week 1": lift.firstWeight,
    [`Week ${comparison.weeks.length}`]: lift.lastWeight,
  }));

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: "0.9rem", color: "var(--accent)", marginBottom: 12 }}>
        📈 Week 1 vs Week {comparison.weeks.length} – Weight Used
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="name" stroke="var(--text-gray)" tick={{ fontSize: 12 }} />
          <YAxis stroke="var(--text-gray)" tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: "var(--card-bg)", borderColor: "var(--accent)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Week 1" fill="#8884d8" radius={[4, 4, 0, 0]} />
          <Bar dataKey={`Week ${comparison.weeks.length}`} fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12, fontSize: "0.8rem", color: "var(--text-gray)" }}>
        Positive change = stronger 💪 | Negative = lighter (likely due to auto‑regulation)
      </div>
    </div>
  );
}